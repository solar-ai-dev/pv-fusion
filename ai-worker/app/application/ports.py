from typing import Protocol

from pydantic import BaseModel, ConfigDict

from app.domain.analysis_job import AnalysisJob
from app.domain.analysis_result import AnalysisResultDraft
from app.domain.detected_defect import DetectedDefectDraft
from app.domain.image_input import SingleImageInput
from app.domain.inference_result import InferenceResult
from app.domain.model import ModelInfo


class QueueMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    messageId: str
    receiptHandle: str
    body: str


class JobRepositoryPort(Protocol):
    def get_by_id(self, job_id: int) -> AnalysisJob | None:
        """Load a job by its identifier."""

    def mark_running(self, job_id: int) -> None:
        """Mark a job as running."""

    def mark_succeeded(self, job_id: int) -> None:
        """Mark a job as succeeded."""

    def mark_failed(self, job_id: int, failure_code: str, failure_message: str) -> None:
        """Mark a job as failed with a backend-compatible failure code."""


class ImageMetadataPort(Protocol):
    def get_single_image(self, image_id: int) -> SingleImageInput | None:
        """Load metadata for a single RGB or thermal image."""


class StoragePort(Protocol):
    def read_object(self, bucket_name: str, object_key: str) -> bytes:
        """Read object bytes from storage."""

    def write_object(self, bucket_name: str, object_key: str, data: bytes, content_type: str) -> str:
        """Write object bytes and return the stored object key or path."""


class ModelRunnerPort(Protocol):
    def run(
        self,
        input_data: SingleImageInput,
        model_info: ModelInfo,
        image_bytes: bytes,
    ) -> InferenceResult:
        """Run inference for a single image input."""


class ResultRepositoryPort(Protocol):
    def save_result(self, result: AnalysisResultDraft) -> int:
        """Persist a result draft and return the created result identifier."""

    def save_defects(self, analysis_result_id: int, defects: list[DetectedDefectDraft]) -> None:
        """Persist defect drafts for the saved analysis result."""

    def save_completed_result(self, result: AnalysisResultDraft, defects: list[DetectedDefectDraft]) -> int:
        """Persist a completed result bundle and finalize the owning job atomically."""


class QueuePort(Protocol):
    def receive_messages(self, max_number: int = 1) -> list[QueueMessage]:
        """Receive one or more queue messages for worker processing."""

    def delete_message(self, receipt_handle: str) -> None:
        """Delete a successfully processed queue message."""
