from decimal import Decimal
import logging
import time
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
from app.domain.enums import ActionCandidate, InputType, JobStatus, ModelType, RequestedModelType, ResultStatus
from app.domain.image_input import SingleImageInput
from app.domain.inference_result import InferenceResult, VisualizationPaths
from app.domain.model import ModelInfo
from app.domain.worker_message import WorkerMessage
from app.infrastructure.model.output_parser import ParsedDetection
from app.infrastructure.visualization.overlay import draw_bbox_overlay, draw_mask_overlay

logger = logging.getLogger(__name__)


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
        started_at = time.perf_counter()
        job = self._job_repository.get_by_id(message.jobId)
        if job is None:
            logger.warning(
                "Analysis job was not found. jobId=%s traceId=%s",
                message.jobId,
                message.traceId,
            )
            return ProcessingResult(
                status="failed",
                jobId=message.jobId,
                message="Analysis job was not found.",
                failureCode="JOB_NOT_FOUND",
                failureMessage="Analysis job was not found.",
            )

        if job.jobStatus is JobStatus.SUCCEEDED:
            logger.info("Skipping analysis job. jobId=%s traceId=%s jobStatus=%s", message.jobId, message.traceId, job.jobStatus.value)
            return ProcessingResult(status="skipped", jobId=message.jobId, message="Job already succeeded.")
        if job.jobStatus is JobStatus.RUNNING:
            logger.info("Skipping analysis job. jobId=%s traceId=%s jobStatus=%s", message.jobId, message.traceId, job.jobStatus.value)
            return ProcessingResult(status="skipped", jobId=message.jobId, message="Job is already running.")
        if job.jobStatus is JobStatus.FAILED:
            logger.info("Skipping analysis job. jobId=%s traceId=%s jobStatus=%s", message.jobId, message.traceId, job.jobStatus.value)
            return ProcessingResult(status="skipped", jobId=message.jobId, message="Job is already failed.")

        try:
            self._job_repository.mark_running(message.jobId)
        except JobStateTransitionError:
            logger.warning(
                "Analysis job state transition to RUNNING was not applied. jobId=%s traceId=%s",
                message.jobId,
                message.traceId,
            )
            return ProcessingResult(
                status="skipped",
                jobId=message.jobId,
                message="Job state transition to RUNNING was not applied.",
            )

        logger.info(
            "Started analysis job. jobId=%s traceId=%s inputType=%s requestedModelType=%s",
            message.jobId,
            message.traceId,
            message.inputType.value,
            message.requestedModelType.value,
        )
        try:
            image_input = self._load_image_input(message)
            logger.info(
                "Loaded image metadata. jobId=%s traceId=%s imageId=%s imageType=%s",
                message.jobId,
                message.traceId,
                image_input.imageId,
                image_input.imageType,
            )
            inference_result, overlay_input = self._run_inference(message, image_input)
            bbox_bucket_name, bbox_object_key = self._store_bbox_overlay(
                message.jobId,
                overlay_input["bucket_name"],
                overlay_input["image_bytes"],
                overlay_input["inference_result"],
            )
            mask_bucket_name, mask_object_key = self._store_mask_overlay(
                message.jobId,
                overlay_input["input_type"],
                overlay_input["bucket_name"],
                overlay_input["image_bytes"],
                overlay_input["inference_result"],
            )
            result_draft = self._to_result_draft(
                message,
                inference_result,
                bbox_bucket_name=bbox_bucket_name,
                bbox_object_key=bbox_object_key,
                mask_bucket_name=mask_bucket_name,
                mask_object_key=mask_object_key,
            )
            analysis_result_id = self._result_repository.save_completed_result(
                result_draft,
                inference_result.defects,
            )
            logger.info(
                "Saved analysis result and finalized job. jobId=%s traceId=%s analysisResultId=%s anomalyCount=%s defectCount=%s",
                message.jobId,
                message.traceId,
                analysis_result_id,
                inference_result.anomalyCount,
                len(inference_result.defects),
            )
            logger.info(
                "Completed analysis job. jobId=%s traceId=%s modelType=%s anomalyCount=%s durationMs=%s",
                message.jobId,
                message.traceId,
                inference_result.modelInfo.modelType.value,
                inference_result.anomalyCount,
                self._duration_ms(started_at),
            )
            return ProcessingResult(status="processed", jobId=message.jobId, message="Job processed successfully.")
        except ProcessingError as error:
            logger.warning(
                "Analysis job failed. jobId=%s traceId=%s inputType=%s errorCode=%s durationMs=%s",
                message.jobId,
                message.traceId,
                message.inputType.value,
                error.code,
                self._duration_ms(started_at),
            )
            return self._fail_job(message.jobId, error.code, error.message)
        except Exception:
            logger.exception(
                "Analysis job failed with unexpected error. jobId=%s traceId=%s inputType=%s durationMs=%s",
                message.jobId,
                message.traceId,
                message.inputType.value,
                self._duration_ms(started_at),
            )
            return self._fail_job(message.jobId, "UNKNOWN_WORKER_ERROR", "Unexpected worker processing error.")

    def _load_image_input(self, message: WorkerMessage):
        image_input = self._image_metadata.get_single_image(message.imageId)
        if image_input is None:
            raise ProcessingError("IMAGE_METADATA_NOT_FOUND", "Image metadata was not found.")
        self._validate_image_type(message.inputType, image_input.imageType)
        return image_input

    def _build_model_info(
        self,
        input_type: InputType,
        requested_model_type: RequestedModelType,
    ) -> ModelInfo:
        model_type = self._resolve_model_type(input_type)
        return ModelInfo(
            modelPath="",
            modelType=model_type,
            requestedModelType=requested_model_type,
            modelName=f"{model_type.value.lower()}-placeholder",
            modelVersion="v0.0.0",
            modelFormat="onnx",
            runtime="onnxruntime",
            inputSize=640,
            threshold=Decimal("0.50"),
        )

    def _run_inference(
        self,
        message: WorkerMessage,
        image_input: SingleImageInput,
    ) -> tuple[InferenceResult, dict[str, object]]:
        model_info = self._build_model_info(message.inputType, message.requestedModelType)
        image_bytes = self._storage.read_object(image_input.bucketName, image_input.objectKey)
        logger.info(
            "Downloaded source image. jobId=%s imageId=%s bucket=%s objectKey=%s",
            message.jobId,
            image_input.imageId,
            image_input.bucketName,
            image_input.objectKey,
        )
        logger.info(
            "Starting inference. jobId=%s imageId=%s modelType=%s requestedModelType=%s",
            message.jobId,
            image_input.imageId,
            model_info.modelType.value,
            model_info.requestedModelType.value,
        )
        inference_result = self._model_runner.run(image_input, model_info, image_bytes)
        logger.info(
            "Inference completed. jobId=%s imageId=%s resultStatus=%s anomalyCount=%s",
            message.jobId,
            image_input.imageId,
            inference_result.resultStatus.value,
            inference_result.anomalyCount,
        )
        return inference_result, {
            "bucket_name": image_input.bucketName,
            "image_bytes": image_bytes,
            "input_type": message.inputType,
            "inference_result": inference_result,
        }

    def _store_bbox_overlay(
        self,
        job_id: int,
        bucket_name: str,
        image_bytes: bytes,
        inference_result: InferenceResult,
    ) -> tuple[str | None, str | None]:
        detections = self._defects_to_detections(inference_result)
        if not detections:
            return None, None

        overlay_bytes = draw_bbox_overlay(
            image_bytes=image_bytes,
            detections=detections,
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
        mask_bucket_name: str | None,
        mask_object_key: str | None,
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
            maskBucketName=mask_bucket_name,
            maskObjectKey=mask_object_key,
            maskFileUrl=None,
            heatmapObjectKey=inference_result.visualizationPaths.heatmapObjectKey,
            analyzedAt=message.createdAt,
        )

    def _resolve_model_type(self, input_type: InputType) -> ModelType:
        if input_type is InputType.RGB_SINGLE:
            return ModelType.RGB_ONLY
        if input_type is InputType.THERMAL_SINGLE:
            return ModelType.THERMAL_ONLY
        raise ProcessingError("UNSUPPORTED_INPUT_TYPE", f"Unsupported inputType: {input_type.value}")

    def _max_decimal(self, *values: Decimal | None) -> Decimal | None:
        available = [value for value in values if value is not None]
        if not available:
            return None
        return max(available)

    def _validate_image_type(self, input_type: InputType, image_type: str) -> None:
        if input_type is InputType.RGB_SINGLE and image_type != "RGB":
            raise ProcessingError("IMAGE_TYPE_MISMATCH", "RGB inputType requires RGB image metadata.")
        if input_type is InputType.THERMAL_SINGLE and image_type != "THERMAL":
            raise ProcessingError("IMAGE_TYPE_MISMATCH", "THERMAL inputType requires THERMAL image metadata.")

    def _fail_job(self, job_id: int, failure_code: str, failure_message: str) -> ProcessingResult:
        try:
            self._job_repository.mark_failed(job_id, failure_code, failure_message)
            logger.warning(
                "Marked analysis job as FAILED. jobId=%s failureCode=%s",
                job_id,
                failure_code,
            )
        except JobStateTransitionError:
            logger.warning(
                "Failed to mark analysis job as FAILED because state transition was not applied. jobId=%s failureCode=%s",
                job_id,
                failure_code,
            )
        return ProcessingResult(
            status="failed",
            jobId=job_id,
            message=failure_message,
            failureCode=failure_code,
            failureMessage=failure_message,
        )

    def _build_bbox_object_key(self, job_id: int) -> str:
        return f"analysis-results/{job_id}/bbox_overlay.png"

    def _build_mask_object_key(self, job_id: int) -> str:
        return f"analysis-results/{job_id}/mask_overlay.png"

    def _store_mask_overlay(
        self,
        job_id: int,
        input_type: InputType,
        bucket_name: str,
        image_bytes: bytes,
        inference_result: InferenceResult,
    ) -> tuple[str | None, str | None]:
        if input_type is not InputType.RGB_SINGLE or not inference_result.restoredMasks:
            return None, None

        overlay_bytes = draw_mask_overlay(
            image_bytes=image_bytes,
            masks=inference_result.restoredMasks,
            image_format="PNG",
        )
        object_key = self._build_mask_object_key(job_id)
        stored_object_key = self._storage.write_object(
            bucket_name,
            object_key,
            overlay_bytes,
            "image/png",
        )
        return bucket_name, stored_object_key

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

    def _duration_ms(self, started_at: float) -> int:
        return int((time.perf_counter() - started_at) * 1000)


class ProcessingError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
