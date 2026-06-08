from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.application.errors import JobStateTransitionError
from app.application.ports import (
    ImageMetadataPort,
    JobRepositoryPort,
    ModelRunnerPort,
    ResultRepositoryPort,
    StoragePort,
)
from app.domain.analysis_result import AnalysisResultDraft
from app.domain.enums import InputType, JobStatus, ModelType
from app.domain.inference_result import InferenceResult
from app.domain.model import ModelInfo
from app.domain.worker_message import WorkerMessage
from app.infrastructure.model.output_parser import ParsedDetection
from app.infrastructure.visualization.overlay import draw_bbox_overlay


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
        storage: StoragePort,
        model_runner: ModelRunnerPort,
        result_repository: ResultRepositoryPort,
    ) -> None:
        self._job_repository = job_repository
        self._image_metadata = image_metadata
        self._storage = storage
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
            image_bytes = self._load_image_bytes(message, image_input)
            inference_result = self._model_runner.run(image_input, model_info, image_bytes)
            bbox_bucket_name, bbox_object_key = self._store_bbox_overlay(
                message.jobId,
                image_input.bucketName,
                image_bytes,
                inference_result,
            )
            result_draft = self._to_result_draft(
                message,
                inference_result,
                bbox_bucket_name=bbox_bucket_name,
                bbox_object_key=bbox_object_key,
            )
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
            modelPath="",
            modelType=model_type,
            requestedModelType=message.requestedModelType,
            modelName=f"{model_type.value.lower()}-placeholder",
            modelVersion="v0.0.0",
            modelFormat="onnx",
            runtime="onnxruntime",
            inputSize=640,
            threshold=Decimal("0.50"),
        )

    def _load_image_bytes(self, message: WorkerMessage, image_input) -> bytes:
        if message.inputType is InputType.RGB_THERMAL_PAIR:
            raise ProcessingError(
                "PAIR_INFERENCE_UNSUPPORTED",
                "RGB_THERMAL_PAIR inference is not supported yet.",
            )
        return self._storage.read_object(image_input.bucketName, image_input.objectKey)

    def _store_bbox_overlay(
        self,
        job_id: int,
        bucket_name: str,
        image_bytes: bytes,
        inference_result: InferenceResult,
    ) -> tuple[str, str]:
        overlay_bytes = draw_bbox_overlay(
            image_bytes=image_bytes,
            detections=self._defects_to_detections(inference_result),
            image_format="PNG",
        )
        object_key = self._build_bbox_object_key(job_id)
        stored_object_key = self._storage.write_object(
            bucket_name,
            object_key,
            overlay_bytes,
            "image/png",
        )
        return bucket_name, stored_object_key

    def _to_result_draft(
        self,
        message: WorkerMessage,
        inference_result,
        bbox_bucket_name: str | None,
        bbox_object_key: str | None,
    ) -> AnalysisResultDraft:
        model_info = inference_result.modelInfo
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
            bboxBucketName=bbox_bucket_name,
            bboxObjectKey=bbox_object_key,
            bboxFileUrl=None,
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

    def _build_bbox_object_key(self, job_id: int) -> str:
        return f"analysis-results/{job_id}/bbox_overlay.png"

    def _defects_to_detections(self, inference_result: InferenceResult) -> list[ParsedDetection]:
        detections: list[ParsedDetection] = []
        for defect in inference_result.defects:
            if defect.bboxX is None or defect.bboxY is None or defect.bboxWidth is None or defect.bboxHeight is None:
                continue
            detections.append(
                ParsedDetection(
                    class_id=-1,
                    class_name=defect.defectType,
                    confidence=defect.confidence or Decimal("0"),
                    bbox_x=float(defect.bboxX),
                    bbox_y=float(defect.bboxY),
                    bbox_width=float(defect.bboxWidth),
                    bbox_height=float(defect.bboxHeight),
                    source=defect.defectSource,
                )
            )
        return detections


class ProcessingError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
