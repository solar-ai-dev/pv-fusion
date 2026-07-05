from datetime import datetime, timedelta, timezone

from app.application.analysis_job_processor import AnalysisJobProcessor
from app.application.errors import JobStateTransitionError
from app.domain.analysis_job import AnalysisJob
from app.domain.detected_defect import DetectedDefectDraft
from app.domain.enums import (
    ActionCandidate,
    InputType,
    JobStatus,
    ModelType,
    RequestedModelType,
    ResultStatus,
)
from app.domain.image_input import SingleImageInput
from app.domain.inference_result import InferenceResult, RestoredMask, VisualizationPaths
from app.domain.model import ModelInfo
from app.domain.worker_message import WorkerMessage

_NOW = datetime.now(timezone.utc)
_STALE_THRESHOLD = 900  # seconds — matches _DEFAULT_STALE_RUNNING_THRESHOLD_SECONDS


def build_message(**overrides) -> WorkerMessage:
    payload = {
        "jobId": 1000,
        "inputType": "RGB_SINGLE",
        "imageId": 201,
        "requestedModelType": "RGB_ONLY",
        "requestedByUserId": 1,
        "traceId": "req-20260607-0001",
        "createdAt": "2026-06-07T10:00:00+09:00",
    }
    payload.update(overrides)
    return WorkerMessage(**payload)


def build_job(status: JobStatus, **overrides) -> AnalysisJob:
    payload = {
        "jobId": 1000,
        "inputType": InputType.RGB_SINGLE,
        "imageId": 201,
        "requestedModelType": RequestedModelType.RGB_ONLY,
        "modelType": None,
        "jobStatus": status,
        "requestedByUserId": 1,
        "traceId": "req-20260607-0001",
        "failureCode": None,
        "failureMessage": None,
        "startedAt": None,
        "updatedAt": None,
    }
    payload.update(overrides)
    return AnalysisJob(**payload)


class FakeJobRepository:
    def __init__(
        self,
        job: AnalysisJob | None,
        running_error: Exception | None = None,
        failed_error: Exception | None = None,
        get_by_id_error: Exception | None = None,
    ):
        self.job = job
        self.running_error = running_error
        self.failed_error = failed_error
        self.get_by_id_error = get_by_id_error
        self.running_ids: list[int] = []
        self.succeeded_ids: list[int] = []
        self.failed_calls: list[tuple[int, str, str]] = []

    def get_by_id(self, job_id: int) -> AnalysisJob | None:
        if self.get_by_id_error:
            raise self.get_by_id_error
        return self.job if self.job and self.job.jobId == job_id else None

    def mark_running(self, job_id: int) -> None:
        if self.running_error:
            raise self.running_error
        self.running_ids.append(job_id)

    def mark_succeeded(self, job_id: int) -> None:
        self.succeeded_ids.append(job_id)

    def mark_failed(self, job_id: int, failure_code: str, failure_message: str) -> None:
        if self.failed_error:
            raise self.failed_error
        self.failed_calls.append((job_id, failure_code, failure_message))


class FakeImageMetadata:
    def __init__(self, single_image: SingleImageInput | None = None):
        self.single_image = single_image

    def get_single_image(self, image_id: int) -> SingleImageInput | None:
        return self.single_image


class FakeModelRunner:
    def __init__(self, result: InferenceResult | None = None, error: Exception | None = None):
        self.result = result or build_inference_result()
        self.error = error
        self.calls: list[tuple[object, ModelInfo, bytes]] = []

    def run(self, input_data, model_info: ModelInfo, image_bytes: bytes) -> InferenceResult:
        self.calls.append((input_data, model_info, image_bytes))
        if self.error:
            raise self.error
        return self.result


class FakeStorage:
    def __init__(self, payload: bytes | None = None, write_error: Exception | None = None, read_error: Exception | None = None):
        self.payload = payload or (
            b"\x89PNG\r\n\x1a\n"
            b"\x00\x00\x00\rIHDR"
            b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00"
            b"\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfeA\x0f\xb1\x8b"
            b"\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        self.write_error = write_error
        self.read_error = read_error
        self.calls: list[tuple[str, str]] = []
        self.write_calls: list[tuple[str, str, bytes, str]] = []

    def read_object(self, bucket_name: str, object_key: str) -> bytes:
        if self.read_error:
            raise self.read_error
        self.calls.append((bucket_name, object_key))
        return self.payload

    def write_object(self, bucket_name: str, object_key: str, data: bytes, content_type: str) -> str:
        if self.write_error:
            raise self.write_error
        self.write_calls.append((bucket_name, object_key, data, content_type))
        return object_key


class FakeResultRepository:
    def __init__(self, save_result_error: Exception | None = None, save_defects_error: Exception | None = None):
        self.save_result_error = save_result_error
        self.save_defects_error = save_defects_error
        self.saved_results = []
        self.saved_defects = []
        self.saved_completed_results: list[tuple[object, list[DetectedDefectDraft]]] = []

    def save_result(self, result):
        if self.save_result_error:
            raise self.save_result_error
        self.saved_results.append(result)
        return 999

    def save_defects(self, analysis_result_id: int, defects: list[DetectedDefectDraft]) -> None:
        if self.save_defects_error:
            raise self.save_defects_error
        self.saved_defects.append((analysis_result_id, defects))

    def save_completed_result(self, result, defects: list[DetectedDefectDraft]) -> int:
        if self.save_result_error:
            raise self.save_result_error
        if self.save_defects_error:
            raise self.save_defects_error
        self.saved_results.append(result)
        self.saved_defects.append((999, defects))
        self.saved_completed_results.append((result, defects))
        return 999


def build_single_image(image_type: str = "RGB", image_id: int = 201, object_key: str | None = None) -> SingleImageInput:
    return SingleImageInput(
        imageId=image_id,
        imageType=image_type,
        bucketName="images",
        objectKey=object_key or f"originals/{image_id}.jpg",
        fileUrl=None,
        targetType="PANEL",
        equipmentId=10,
    )


def build_inference_result() -> InferenceResult:
    return InferenceResult(
        modelInfo=ModelInfo(
            modelPath="models/rgb.onnx",
            modelType=ModelType.RGB_ONLY,
            requestedModelType=RequestedModelType.RGB_ONLY,
            modelName="pv-rgb",
            modelVersion="v1.0.0",
            modelFormat="onnx",
            runtime="onnxruntime",
            inputSize=640,
            threshold="0.5",
        ),
        resultStatus=ResultStatus.ANOMALY,
        anomalyCount=1,
        maxConfidence="0.9",
        areaRatio="0.2",
        severityScore="0.7",
        actionCandidate=ActionCandidate.FIELD_INSPECTION,
        defects=[
            DetectedDefectDraft(
                defectType="HOTSPOT",
                defectSource="RGB",
                confidence="0.9",
                areaRatio="0.2",
                bboxX=1,
                bboxY=2,
                bboxWidth=3,
                bboxHeight=4,
                severityScore="0.7",
                actionCandidate=ActionCandidate.FIELD_INSPECTION,
            )
        ],
        visualizationPaths=VisualizationPaths(
            bboxObjectKey="results/1000/bbox.jpg",
            heatmapObjectKey="results/1000/heatmap.jpg",
            maskObjectKey="results/1000/mask.png",
        ),
        restoredMasks=[
            RestoredMask(
                bboxX=1,
                bboxY=2,
                bboxWidth=3,
                bboxHeight=4,
                data=[[1, 1], [1, 1]],
            )
        ],
    )


def build_thermal_inference_result() -> InferenceResult:
    return InferenceResult(
        modelInfo=ModelInfo(
            modelPath="models/thermal.onnx",
            modelType=ModelType.THERMAL_ONLY,
            requestedModelType=RequestedModelType.THERMAL_ONLY,
            modelName="pv-thermal",
            modelVersion="v1.0.0",
            modelFormat="onnx",
            runtime="onnxruntime",
            inputSize=640,
            threshold="0.5",
        ),
        resultStatus=ResultStatus.ANOMALY,
        anomalyCount=1,
        maxConfidence="0.8",
        areaRatio=None,
        severityScore="0.4",
        actionCandidate=ActionCandidate.CLEANING,
        defects=[
            DetectedDefectDraft(
                defectType="UNKNOWN",
                defectSource="THERMAL",
                confidence="0.8",
                areaRatio=None,
                bboxX=11,
                bboxY=12,
                bboxWidth=13,
                bboxHeight=14,
                severityScore="0.4",
                actionCandidate=ActionCandidate.CLEANING,
            )
        ],
        visualizationPaths=VisualizationPaths(),
        restoredMasks=[],
    )


def build_processor(
    job: AnalysisJob | None = None,
    single_image: SingleImageInput | None = None,
    storage: FakeStorage | None = None,
    model_runner: FakeModelRunner | None = None,
    result_repository: FakeResultRepository | None = None,
    running_error: Exception | None = None,
    failed_error: Exception | None = None,
    get_by_id_error: Exception | None = None,
) -> tuple[AnalysisJobProcessor, FakeJobRepository]:
    job_repository = FakeJobRepository(
        job=job,
        running_error=running_error,
        failed_error=failed_error,
        get_by_id_error=get_by_id_error,
    )
    processor = AnalysisJobProcessor(
        job_repository=job_repository,
        image_metadata=FakeImageMetadata(single_image=single_image or build_single_image()),
        storage=storage or FakeStorage(),
        model_runner=model_runner or FakeModelRunner(),
        result_repository=result_repository or FakeResultRepository(),
    )
    return processor, job_repository


# ---------------------------------------------------------------------------
# 정상 처리 테스트
# ---------------------------------------------------------------------------

def test_processes_queued_rgb_single_job():
    job_repository = FakeJobRepository(build_job(JobStatus.QUEUED))
    image_metadata = FakeImageMetadata(single_image=build_single_image())
    storage = FakeStorage()
    model_runner = FakeModelRunner()
    result_repository = FakeResultRepository()
    processor = AnalysisJobProcessor(job_repository, image_metadata, storage, model_runner, result_repository)

    result = processor.process(build_message())

    assert result.status == "processed"
    assert job_repository.running_ids == [1000]
    assert job_repository.succeeded_ids == []
    assert storage.calls == [("images", "originals/201.jpg")]
    assert storage.write_calls[0][1] == "analysis-results/1000/bbox_overlay.png"
    assert storage.write_calls[1][1] == "analysis-results/1000/mask_overlay.png"
    assert result_repository.saved_results[0].bboxObjectKey == "analysis-results/1000/bbox_overlay.png"
    assert result_repository.saved_results[0].maskObjectKey == "analysis-results/1000/mask_overlay.png"
    assert result_repository.saved_completed_results[0][0].analysisJobId == 1000


def test_processes_queued_thermal_single_job():
    job_repository = FakeJobRepository(
        build_job(
            JobStatus.QUEUED,
            inputType=InputType.THERMAL_SINGLE,
            requestedModelType=RequestedModelType.THERMAL_ONLY,
        )
    )
    image_metadata = FakeImageMetadata(single_image=build_single_image("THERMAL"))
    storage = FakeStorage()
    model_runner = FakeModelRunner(result=build_thermal_inference_result())
    result_repository = FakeResultRepository()
    processor = AnalysisJobProcessor(job_repository, image_metadata, storage, model_runner, result_repository)

    result = processor.process(build_message(inputType="THERMAL_SINGLE", requestedModelType="THERMAL_ONLY"))

    assert result.status == "processed"
    assert model_runner.calls[0][1].modelType is ModelType.THERMAL_ONLY
    assert len(storage.write_calls) == 1
    assert result_repository.saved_results[0].maskBucketName is None
    assert result_repository.saved_results[0].maskObjectKey is None


def test_processed_result_is_not_terminal():
    """정상 처리 완료는 terminal 필드 없이도 deleted 된다 — terminal=False 여도 무방."""
    processor, _ = build_processor(job=build_job(JobStatus.QUEUED))
    result = processor.process(build_message())
    assert result.status == "processed"


# ---------------------------------------------------------------------------
# 스킵 테스트
# ---------------------------------------------------------------------------

def test_returns_skipped_when_job_already_succeeded():
    processor = AnalysisJobProcessor(
        FakeJobRepository(build_job(JobStatus.SUCCEEDED)),
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "skipped"


def test_returns_failed_non_terminal_when_job_is_recently_running():
    """최근 RUNNING job은 다른 worker 처리 가능성이 있으므로 삭제 금지."""
    recent_started_at = _NOW - timedelta(seconds=_STALE_THRESHOLD - 60)
    processor = AnalysisJobProcessor(
        FakeJobRepository(build_job(JobStatus.RUNNING, startedAt=recent_started_at)),
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert result.failureCode == "JOB_ALREADY_RUNNING"
    assert result.terminal is False


def test_stale_running_job_is_marked_failed_and_terminal():
    """stale RUNNING job은 FAILED 처리 후 SQS 메시지를 삭제할 수 있어야 한다."""
    stale_started_at = _NOW - timedelta(seconds=_STALE_THRESHOLD + 60)
    job_repository = FakeJobRepository(build_job(JobStatus.RUNNING, startedAt=stale_started_at))
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert result.failureCode == "STALE_RUNNING_JOB"
    assert result.terminal is True
    assert job_repository.failed_calls[0][1] == "STALE_RUNNING_JOB"


def test_stale_running_job_with_no_timestamps_is_treated_as_stale():
    """startedAt/updatedAt 없는 RUNNING job은 stale로 간주해 FAILED 처리한다."""
    job_repository = FakeJobRepository(build_job(JobStatus.RUNNING, startedAt=None, updatedAt=None))
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert result.failureCode == "STALE_RUNNING_JOB"
    assert result.terminal is True


def test_stale_running_job_uses_updated_at_when_started_at_is_none():
    """startedAt이 없을 때 updatedAt을 stale 판단 기준으로 사용한다."""
    stale_updated_at = _NOW - timedelta(seconds=_STALE_THRESHOLD + 30)
    job_repository = FakeJobRepository(
        build_job(JobStatus.RUNNING, startedAt=None, updatedAt=stale_updated_at)
    )
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert result.failureCode == "STALE_RUNNING_JOB"
    assert result.terminal is True


def test_running_job_is_not_deleted_when_stale_mark_failed_fails():
    """stale RUNNING job의 FAILED 전이가 실패하면 terminal=False로 SQS 삭제하지 않는다."""
    stale_started_at = _NOW - timedelta(seconds=_STALE_THRESHOLD + 60)
    job_repository = FakeJobRepository(
        build_job(JobStatus.RUNNING, startedAt=stale_started_at),
        failed_error=JobStateTransitionError("already closed"),
    )
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert result.failureCode == "STALE_RUNNING_JOB"
    assert result.terminal is False


def test_returns_skipped_when_job_already_failed():
    processor = AnalysisJobProcessor(
        FakeJobRepository(build_job(JobStatus.FAILED)),
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "skipped"


def test_returns_skipped_when_mark_running_transition_fails():
    processor = AnalysisJobProcessor(
        FakeJobRepository(build_job(JobStatus.QUEUED), running_error=JobStateTransitionError("transition failed")),
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "skipped"


# ---------------------------------------------------------------------------
# JOB_NOT_FOUND: terminal=True (무한 재수신 루프 방지)
# ---------------------------------------------------------------------------

def test_returns_failed_when_job_is_missing():
    processor = AnalysisJobProcessor(
        FakeJobRepository(None),
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert result.failureCode == "JOB_NOT_FOUND"


def test_job_not_found_result_is_terminal():
    """JOB_NOT_FOUND 는 재시도해도 의미 없으므로 SQS 메시지를 즉시 삭제해야 한다."""
    processor = AnalysisJobProcessor(
        FakeJobRepository(None),
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.terminal is True


# ---------------------------------------------------------------------------
# get_by_id 예외 처리 (폴링 루프 보호)
# ---------------------------------------------------------------------------

def test_returns_failed_when_get_by_id_raises_unexpected_exception():
    """get_by_id DB 오류는 루프를 죽이지 않고 failed 를 반환해야 한다."""
    processor = AnalysisJobProcessor(
        FakeJobRepository(None, get_by_id_error=RuntimeError("db connection refused")),
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert result.failureCode == "JOB_LOAD_ERROR"
    assert result.terminal is False


def test_get_by_id_error_does_not_call_mark_running():
    """get_by_id 실패 시 mark_running 이 호출되어선 안 된다."""
    processor, job_repository = build_processor(
        get_by_id_error=RuntimeError("db timeout"),
    )

    processor.process(build_message())

    assert job_repository.running_ids == []


# ---------------------------------------------------------------------------
# mark_running 예외 처리 (폴링 루프 보호)
# ---------------------------------------------------------------------------

def test_returns_failed_when_mark_running_raises_unexpected_exception():
    """mark_running 이 JobStateTransitionError 외의 예외를 올리면 failed 를 반환해야 한다."""
    processor = AnalysisJobProcessor(
        FakeJobRepository(build_job(JobStatus.QUEUED), running_error=RuntimeError("db error in mark_running")),
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert result.failureCode == "MARK_RUNNING_ERROR"
    assert result.terminal is False


def test_mark_running_unexpected_error_does_not_proceed_to_inference():
    """mark_running 실패 시 추론이 실행되어선 안 된다."""
    model_runner = FakeModelRunner()
    processor = AnalysisJobProcessor(
        FakeJobRepository(build_job(JobStatus.QUEUED), running_error=RuntimeError("db error")),
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        model_runner,
        FakeResultRepository(),
    )

    processor.process(build_message())

    assert model_runner.calls == []


# ---------------------------------------------------------------------------
# _fail_job: terminal 플래그 검증
# ---------------------------------------------------------------------------

def test_marks_failed_when_single_image_metadata_missing():
    job_repository = FakeJobRepository(build_job(JobStatus.QUEUED))
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=None),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert job_repository.failed_calls[0][1] == "IMAGE_METADATA_NOT_FOUND"


def test_fail_job_result_is_terminal_when_mark_failed_succeeds():
    """_fail_job 이 DB mark_failed 에 성공하면 terminal=True 여야 한다 (SQS 즉시 삭제)."""
    job_repository = FakeJobRepository(build_job(JobStatus.QUEUED))
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=None),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.terminal is True


def test_fail_job_result_is_not_terminal_when_mark_failed_raises_transition_error():
    """mark_failed 상태 전이 실패 시 terminal=False 를 반환해 재시도를 허용해야 한다."""
    job_repository = FakeJobRepository(
        build_job(JobStatus.QUEUED),
        failed_error=JobStateTransitionError("already failed"),
    )
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=None),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert result.terminal is False


def test_marks_failed_when_image_type_mismatches_input_type():
    job_repository = FakeJobRepository(build_job(JobStatus.QUEUED))
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=build_single_image("THERMAL")),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert job_repository.failed_calls[0][1] == "IMAGE_TYPE_MISMATCH"


def test_marks_failed_when_model_runner_raises():
    job_repository = FakeJobRepository(build_job(JobStatus.QUEUED))
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(error=RuntimeError("boom")),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert job_repository.failed_calls[0][1] == "UNKNOWN_WORKER_ERROR"


def test_marks_failed_when_result_save_raises():
    job_repository = FakeJobRepository(build_job(JobStatus.QUEUED))
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(save_result_error=RuntimeError("save failed")),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert job_repository.failed_calls[0][1] == "UNKNOWN_WORKER_ERROR"


def test_marks_failed_when_storage_write_raises():
    job_repository = FakeJobRepository(build_job(JobStatus.QUEUED))
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(write_error=RuntimeError("storage failed")),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert job_repository.failed_calls[0][1] == "UNKNOWN_WORKER_ERROR"


def test_mark_failed_transition_error_does_not_hide_original_failure():
    job_repository = FakeJobRepository(
        build_job(JobStatus.QUEUED),
        failed_error=JobStateTransitionError("failed transition"),
    )
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=build_single_image()),
        FakeStorage(),
        FakeModelRunner(error=RuntimeError("boom")),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert result.failureCode == "UNKNOWN_WORKER_ERROR"


def test_mark_failed_unexpected_exception_does_not_propagate():
    """mark_failed 에서 예상치 못한 예외가 발생해도 process() 가 실패 결과를 반환해야 한다."""
    job_repository = FakeJobRepository(
        build_job(JobStatus.QUEUED),
        failed_error=RuntimeError("db crash during mark_failed"),
    )
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=None),
        FakeStorage(),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert result.failureCode == "IMAGE_METADATA_NOT_FOUND"
    assert result.terminal is False


# ---------------------------------------------------------------------------
# 오버레이 생략 경계 케이스
# ---------------------------------------------------------------------------

def test_skips_mask_overlay_when_rgb_result_has_no_restored_masks():
    result_without_masks = build_inference_result().model_copy(update={"restoredMasks": []})
    job_repository = FakeJobRepository(build_job(JobStatus.QUEUED))
    storage = FakeStorage()
    result_repository = FakeResultRepository()
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=build_single_image()),
        storage,
        FakeModelRunner(result=result_without_masks),
        result_repository,
    )

    result = processor.process(build_message())

    assert result.status == "processed"
    assert len(storage.write_calls) == 1
    assert result_repository.saved_results[0].maskBucketName is None
    assert result_repository.saved_results[0].maskObjectKey is None


def test_skips_bbox_overlay_when_result_has_no_detected_defects():
    result_without_defects = build_inference_result().model_copy(
        update={
            "resultStatus": ResultStatus.NORMAL,
            "anomalyCount": 0,
            "maxConfidence": None,
            "defects": [],
            "restoredMasks": [],
        }
    )
    job_repository = FakeJobRepository(build_job(JobStatus.QUEUED))
    storage = FakeStorage()
    result_repository = FakeResultRepository()
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=build_single_image()),
        storage,
        FakeModelRunner(result=result_without_defects),
        result_repository,
    )

    result = processor.process(build_message())

    assert result.status == "processed"
    assert storage.write_calls == []
    assert result_repository.saved_results[0].bboxBucketName is None
    assert result_repository.saved_results[0].bboxObjectKey is None
    assert result_repository.saved_results[0].maskBucketName is None
    assert result_repository.saved_results[0].maskObjectKey is None
