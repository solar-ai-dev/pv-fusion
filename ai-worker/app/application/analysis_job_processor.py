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
from app.domain.enums import ActionCandidate, InputType, JobStatus, ModelType, RequestedModelType, ResultStatus
from app.domain.image_input import PairedImageInput, SingleImageInput
from app.domain.inference_result import InferenceResult, VisualizationPaths
from app.domain.model import ModelInfo
from app.domain.worker_message import WorkerMessage
from app.infrastructure.model.output_parser import ParsedDetection
from app.infrastructure.visualization.overlay import draw_bbox_overlay, draw_mask_overlay


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
        image_input: SingleImageInput | PairedImageInput,
    ) -> tuple[InferenceResult, dict[str, object]]:
        if message.inputType is InputType.RGB_THERMAL_PAIR:
            return self._run_fusion_inference(message, image_input)

        if not isinstance(image_input, SingleImageInput):
            raise ProcessingError("IMAGE_METADATA_INVALID", "Single-image metadata was invalid.")

        model_info = self._build_model_info(message.inputType, message.requestedModelType)
        image_bytes = self._storage.read_object(image_input.bucketName, image_input.objectKey)
        inference_result = self._model_runner.run(image_input, model_info, image_bytes)
        return inference_result, {
            "bucket_name": image_input.bucketName,
            "image_bytes": image_bytes,
            "input_type": message.inputType,
            "inference_result": inference_result,
        }

    def _run_fusion_inference(
        self,
        message: WorkerMessage,
        image_input: SingleImageInput | PairedImageInput,
    ) -> tuple[InferenceResult, dict[str, object]]:
        if not isinstance(image_input, PairedImageInput):
            raise ProcessingError("PAIR_METADATA_INVALID", "Pair metadata was invalid.")

        rgb_bytes = self._storage.read_object(image_input.rgbImage.bucketName, image_input.rgbImage.objectKey)
        thermal_bytes = self._storage.read_object(
            image_input.thermalImage.bucketName,
            image_input.thermalImage.objectKey,
        )

        rgb_result = self._model_runner.run(
            image_input.rgbImage,
            self._build_model_info(InputType.RGB_SINGLE, RequestedModelType.RGB_ONLY),
            rgb_bytes,
        )
        thermal_result = self._model_runner.run(
            image_input.thermalImage,
            self._build_model_info(InputType.THERMAL_SINGLE, RequestedModelType.THERMAL_ONLY),
            thermal_bytes,
        )
        fusion_result = self._merge_fusion_results(message, rgb_result, thermal_result)
        overlay_input = self._build_fusion_overlay_input(
            rgb_image=image_input.rgbImage,
            rgb_bytes=rgb_bytes,
            rgb_result=rgb_result,
            thermal_image=image_input.thermalImage,
            thermal_bytes=thermal_bytes,
            thermal_result=thermal_result,
        )
        return fusion_result, overlay_input

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
        return ModelType.FUSION

    def _merge_fusion_results(
        self,
        message: WorkerMessage,
        rgb_result: InferenceResult,
        thermal_result: InferenceResult,
    ) -> InferenceResult:
        defects = [*rgb_result.defects, *thermal_result.defects]
        max_confidence = self._max_decimal(rgb_result.maxConfidence, thermal_result.maxConfidence)
        severity_score = self._max_decimal(rgb_result.severityScore, thermal_result.severityScore)
        area_ratio = rgb_result.areaRatio if rgb_result.areaRatio is not None else thermal_result.areaRatio
        action_candidate = self._select_fusion_action_candidate(rgb_result, thermal_result)

        return InferenceResult(
            modelInfo=ModelInfo(
                modelPath="",
                modelType=ModelType.FUSION,
                requestedModelType=message.requestedModelType,
                modelName=f"fusion:{rgb_result.modelInfo.modelName}+{thermal_result.modelInfo.modelName}",
                modelVersion=f"{rgb_result.modelInfo.modelVersion}+{thermal_result.modelInfo.modelVersion}",
                modelFormat=rgb_result.modelInfo.modelFormat,
                runtime=rgb_result.modelInfo.runtime,
                inputSize=max(rgb_result.modelInfo.inputSize, thermal_result.modelInfo.inputSize),
                threshold=min(rgb_result.modelInfo.threshold, thermal_result.modelInfo.threshold),
            ),
            resultStatus=self._merge_result_status(rgb_result.resultStatus, thermal_result.resultStatus),
            anomalyCount=len(defects),
            maxConfidence=max_confidence,
            areaRatio=area_ratio,
            severityScore=severity_score,
            actionCandidate=action_candidate,
            defects=defects,
            visualizationPaths=VisualizationPaths(),
            restoredMasks=rgb_result.restoredMasks,
        )

    def _build_fusion_overlay_input(
        self,
        rgb_image: SingleImageInput,
        rgb_bytes: bytes,
        rgb_result: InferenceResult,
        thermal_image: SingleImageInput,
        thermal_bytes: bytes,
        thermal_result: InferenceResult,
    ) -> dict[str, object]:
        if rgb_result.defects:
            return {
                "bucket_name": rgb_image.bucketName,
                "image_bytes": rgb_bytes,
                "input_type": InputType.RGB_SINGLE,
                "inference_result": rgb_result,
            }
        return {
            "bucket_name": thermal_image.bucketName,
            "image_bytes": thermal_bytes,
            "input_type": InputType.THERMAL_SINGLE,
            "inference_result": thermal_result,
        }

    def _merge_result_status(
        self,
        rgb_status: ResultStatus,
        thermal_status: ResultStatus,
    ) -> ResultStatus:
        if ResultStatus.ANOMALY in {rgb_status, thermal_status}:
            return ResultStatus.ANOMALY
        if ResultStatus.LOW_CONFIDENCE in {rgb_status, thermal_status}:
            return ResultStatus.LOW_CONFIDENCE
        return ResultStatus.NORMAL

    def _select_fusion_action_candidate(
        self,
        rgb_result: InferenceResult,
        thermal_result: InferenceResult,
    ) -> ActionCandidate:
        if rgb_result.defects:
            return rgb_result.actionCandidate
        if thermal_result.defects:
            return thermal_result.actionCandidate
        if rgb_result.actionCandidate is not ActionCandidate.CLEANING:
            return rgb_result.actionCandidate
        return thermal_result.actionCandidate

    def _max_decimal(self, *values: Decimal | None) -> Decimal | None:
        available = [value for value in values if value is not None]
        if not available:
            return None
        return max(available)

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


class ProcessingError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
