from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.application.errors import JobStateTransitionError
from app.application.ports import (
    ImageMetadataPort,
    JobRepositoryPort,
    ModelRunnerPort,
    ResultRepositoryPort,
)
from app.domain.analysis_result import AnalysisResultDraft
from app.domain.enums import InputType, JobStatus, ModelType
from app.domain.model import ModelInfo
from app.domain.worker_message import WorkerMessage


class ProcessingResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["processed", "skipped", "failed"]
    jobId: int
    message: str
    failureCode: str | None = None
    failureMessage: str | None = None


class AnalysisJobProcessor:
    def __init__(
        self,
        job_repository: JobRepositoryPort,
        image_metadata: ImageMetadataPort,
        model_runner: ModelRunnerPort,
        result_repository: ResultRepositoryPort,
    ) -> None:
        self._job_repository = job_repository
        self._image_metadata = image_metadata
        self._model_runner = model_runner
        self._result_repository = result_repository

    def process(self, message: WorkerMessage) -> ProcessingResult:
        job = self._job_repository.get_by_id(message.jobId)
        if job is None:
            return ProcessingResult(
                status="failed",
                jobId=message.jobId,
                message="Analysis job was not found.",
                failureCode="JOB_NOT_FOUND",
                failureMessage="Analysis job was not found.",
            )

        if job.jobStatus is JobStatus.SUCCEEDED:
            return ProcessingResult(status="skipped", jobId=message.jobId, message="Job already succeeded.")
        if job.jobStatus is JobStatus.RUNNING:
            return ProcessingResult(status="skipped", jobId=message.jobId, message="Job is already running.")
        if job.jobStatus is JobStatus.FAILED:
            return ProcessingResult(status="skipped", jobId=message.jobId, message="Job is already failed.")

        try:
            self._job_repository.mark_running(message.jobId)
        except JobStateTransitionError:
            return ProcessingResult(
                status="skipped",
                jobId=message.jobId,
                message="Job state transition to RUNNING was not applied.",
            )

        try:
            image_input = self._load_image_input(message)
            model_info = self._build_model_info(message)
            inference_result = self._model_runner.run(image_input, model_info)
            result_draft = self._to_result_draft(message, model_info, inference_result)
            analysis_result_id = self._result_repository.save_result(result_draft)
            self._result_repository.save_defects(analysis_result_id, inference_result.defects)
            self._job_repository.mark_succeeded(message.jobId)
            return ProcessingResult(status="processed", jobId=message.jobId, message="Job processed successfully.")
        except ProcessingError as error:
            return self._fail_job(message.jobId, error.code, error.message)
        except Exception:
            return self._fail_job(message.jobId, "UNKNOWN_WORKER_ERROR", "Unexpected worker processing error.")

    def _load_image_input(self, message: WorkerMessage):
        if message.inputType in {InputType.RGB_SINGLE, InputType.THERMAL_SINGLE}:
            image_input = self._image_metadata.get_single_image(message.imageId)
            if image_input is None:
                raise ProcessingError("IMAGE_METADATA_NOT_FOUND", "Image metadata was not found.")
            return image_input

        image_input = self._image_metadata.get_paired_image(message.imagePairId)
        if image_input is None:
            raise ProcessingError("PAIR_METADATA_NOT_FOUND", "Pair metadata was not found.")
        return image_input

    def _build_model_info(self, message: WorkerMessage) -> ModelInfo:
        model_type = self._resolve_model_type(message.inputType)
        return ModelInfo(
            modelType=model_type,
            requestedModelType=message.requestedModelType,
            modelName=f"{model_type.value.lower()}-placeholder",
            modelVersion="v0.0.0",
            modelFormat="onnx",
            runtime="onnxruntime",
            inputSize=640,
            threshold=Decimal("0.50"),
        )

    def _to_result_draft(self, message: WorkerMessage, model_info: ModelInfo, inference_result) -> AnalysisResultDraft:
        return AnalysisResultDraft(
            analysisJobId=message.jobId,
            modelType=model_info.modelType,
            modelName=model_info.modelName,
            modelVersion=model_info.modelVersion,
            modelFormat=model_info.modelFormat,
            runtime=model_info.runtime,
            inputSize=model_info.inputSize,
            threshold=model_info.threshold,
            resultStatus=inference_result.resultStatus,
            anomalyCount=inference_result.anomalyCount,
            maxConfidence=inference_result.maxConfidence,
            areaRatio=inference_result.areaRatio,
            severityScore=inference_result.severityScore,
            actionCandidate=inference_result.actionCandidate,
            bboxObjectKey=inference_result.visualizationPaths.bboxObjectKey,
            heatmapObjectKey=inference_result.visualizationPaths.heatmapObjectKey,
            maskObjectKey=inference_result.visualizationPaths.maskObjectKey,
            analyzedAt=message.createdAt,
        )

    def _resolve_model_type(self, input_type: InputType) -> ModelType:
        if input_type is InputType.RGB_SINGLE:
            return ModelType.RGB_ONLY
        if input_type is InputType.THERMAL_SINGLE:
            return ModelType.THERMAL_ONLY
        return ModelType.FUSION

    def _fail_job(self, job_id: int, failure_code: str, failure_message: str) -> ProcessingResult:
        try:
            self._job_repository.mark_failed(job_id, failure_code, failure_message)
        except JobStateTransitionError:
            pass
        return ProcessingResult(
            status="failed",
            jobId=job_id,
            message=failure_message,
            failureCode=failure_code,
            failureMessage=failure_message,
        )


class ProcessingError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
