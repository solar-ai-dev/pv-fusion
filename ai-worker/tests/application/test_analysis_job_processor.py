from app.application.analysis_job_processor import AnalysisJobProcessor
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
from app.domain.image_input import PairedImageInput, SingleImageInput
from app.domain.inference_result import InferenceResult, VisualizationPaths
from app.domain.model import ModelInfo
from app.domain.worker_message import WorkerMessage


def build_message(**overrides) -> WorkerMessage:
    payload = {
        "jobId": 1000,
        "inputType": "RGB_SINGLE",
        "imageId": 201,
        "imagePairId": None,
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
        "imagePairId": None,
        "requestedModelType": RequestedModelType.RGB_ONLY,
        "modelType": None,
        "jobStatus": status,
        "requestedByUserId": 1,
        "traceId": "req-20260607-0001",
        "failureCode": None,
        "failureMessage": None,
    }
    payload.update(overrides)
    return AnalysisJob(**payload)


class FakeJobRepository:
    def __init__(self, job: AnalysisJob | None):
        self.job = job
        self.running_ids: list[int] = []
        self.succeeded_ids: list[int] = []
        self.failed_calls: list[tuple[int, str, str]] = []

    def get_by_id(self, job_id: int) -> AnalysisJob | None:
        return self.job if self.job and self.job.jobId == job_id else None

    def mark_running(self, job_id: int) -> None:
        self.running_ids.append(job_id)

    def mark_succeeded(self, job_id: int) -> None:
        self.succeeded_ids.append(job_id)

    def mark_failed(self, job_id: int, failure_code: str, failure_message: str) -> None:
        self.failed_calls.append((job_id, failure_code, failure_message))


class FakeImageMetadata:
    def __init__(self, single_image: SingleImageInput | None = None, paired_image: PairedImageInput | None = None):
        self.single_image = single_image
        self.paired_image = paired_image

    def get_single_image(self, image_id: int) -> SingleImageInput | None:
        return self.single_image

    def get_paired_image(self, image_pair_id: int) -> PairedImageInput | None:
        return self.paired_image


class FakeModelRunner:
    def __init__(self, result: InferenceResult | None = None, error: Exception | None = None):
        self.result = result or build_inference_result()
        self.error = error
        self.calls: list[tuple[object, ModelInfo]] = []

    def run(self, input_data, model_info: ModelInfo) -> InferenceResult:
        self.calls.append((input_data, model_info))
        if self.error:
            raise self.error
        return self.result


class FakeResultRepository:
    def __init__(self, save_result_error: Exception | None = None, save_defects_error: Exception | None = None):
        self.save_result_error = save_result_error
        self.save_defects_error = save_defects_error
        self.saved_results = []
        self.saved_defects = []

    def save_result(self, result):
        if self.save_result_error:
            raise self.save_result_error
        self.saved_results.append(result)
        return 999

    def save_defects(self, analysis_result_id: int, defects: list[DetectedDefectDraft]) -> None:
        if self.save_defects_error:
            raise self.save_defects_error
        self.saved_defects.append((analysis_result_id, defects))


def build_single_image() -> SingleImageInput:
    return SingleImageInput(
        imageId=201,
        imageType="RGB",
        bucketName="images",
        objectKey="originals/201.jpg",
        fileUrl=None,
        targetType="PANEL",
        equipmentId=10,
    )


def build_paired_image() -> PairedImageInput:
    return PairedImageInput(
        imagePairId=301,
        targetType="PANEL",
        equipmentId=10,
        rgbImage=SingleImageInput(
            imageId=201,
            imageType="RGB",
            bucketName="images",
            objectKey="originals/201.jpg",
            fileUrl=None,
            targetType="PANEL",
            equipmentId=10,
        ),
        thermalImage=SingleImageInput(
            imageId=202,
            imageType="THERMAL",
            bucketName="images",
            objectKey="originals/202.jpg",
            fileUrl=None,
            targetType="PANEL",
            equipmentId=10,
        ),
    )


def build_inference_result() -> InferenceResult:
    return InferenceResult(
        modelInfo=ModelInfo(
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
    )


def build_processor(job, single_image=None, paired_image=None, runner_error=None, save_result_error=None, save_defects_error=None):
    return AnalysisJobProcessor(
        FakeJobRepository(job),
        FakeImageMetadata(single_image=single_image, paired_image=paired_image),
        FakeModelRunner(error=runner_error),
        FakeResultRepository(save_result_error=save_result_error, save_defects_error=save_defects_error),
    )


def test_processes_queued_rgb_single_job():
    job_repository = FakeJobRepository(build_job(JobStatus.QUEUED))
    image_metadata = FakeImageMetadata(single_image=build_single_image())
    model_runner = FakeModelRunner()
    result_repository = FakeResultRepository()
    processor = AnalysisJobProcessor(job_repository, image_metadata, model_runner, result_repository)

    result = processor.process(build_message())

    assert result.status == "processed"
    assert job_repository.running_ids == [1000]
    assert job_repository.succeeded_ids == [1000]
    assert not job_repository.failed_calls
    assert len(result_repository.saved_results) == 1
    assert result_repository.saved_defects[0][0] == 999


def test_processes_queued_thermal_single_job():
    job_repository = FakeJobRepository(
        build_job(
            JobStatus.QUEUED,
            inputType=InputType.THERMAL_SINGLE,
            requestedModelType=RequestedModelType.THERMAL_ONLY,
        )
    )
    image_metadata = FakeImageMetadata(single_image=build_single_image())
    model_runner = FakeModelRunner()
    result_repository = FakeResultRepository()
    processor = AnalysisJobProcessor(job_repository, image_metadata, model_runner, result_repository)

    result = processor.process(
        build_message(inputType="THERMAL_SINGLE", requestedModelType="THERMAL_ONLY")
    )

    assert result.status == "processed"
    assert model_runner.calls[0][1].modelType is ModelType.THERMAL_ONLY


def test_processes_pair_job_until_runner():
    job_repository = FakeJobRepository(
        build_job(
            JobStatus.QUEUED,
            inputType=InputType.RGB_THERMAL_PAIR,
            imageId=None,
            imagePairId=301,
            requestedModelType=RequestedModelType.FUSION_AUTO,
        )
    )
    image_metadata = FakeImageMetadata(paired_image=build_paired_image())
    model_runner = FakeModelRunner()
    result_repository = FakeResultRepository()
    processor = AnalysisJobProcessor(job_repository, image_metadata, model_runner, result_repository)

    result = processor.process(
        build_message(
            inputType="RGB_THERMAL_PAIR",
            imageId=None,
            imagePairId=301,
            requestedModelType="FUSION_AUTO",
        )
    )

    assert result.status == "processed"
    assert isinstance(model_runner.calls[0][0], PairedImageInput)
    assert model_runner.calls[0][1].modelType is ModelType.FUSION


def test_returns_failed_when_job_is_missing():
    processor = build_processor(None)

    result = processor.process(build_message())

    assert result.status == "failed"
    assert result.failureCode == "JOB_NOT_FOUND"


def test_returns_skipped_when_job_already_succeeded():
    processor = build_processor(build_job(JobStatus.SUCCEEDED))

    result = processor.process(build_message())

    assert result.status == "skipped"


def test_returns_skipped_when_job_already_running():
    processor = build_processor(build_job(JobStatus.RUNNING))

    result = processor.process(build_message())

    assert result.status == "skipped"


def test_returns_skipped_when_job_already_failed():
    processor = build_processor(build_job(JobStatus.FAILED))

    result = processor.process(build_message())

    assert result.status == "skipped"


def test_marks_failed_when_single_image_metadata_missing():
    job_repository = FakeJobRepository(build_job(JobStatus.QUEUED))
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=None),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert job_repository.failed_calls[0][1] == "IMAGE_METADATA_NOT_FOUND"


def test_marks_failed_when_pair_metadata_missing():
    job_repository = FakeJobRepository(
        build_job(
            JobStatus.QUEUED,
            inputType=InputType.RGB_THERMAL_PAIR,
            imageId=None,
            imagePairId=301,
            requestedModelType=RequestedModelType.FUSION_AUTO,
        )
    )
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(paired_image=None),
        FakeModelRunner(),
        FakeResultRepository(),
    )

    result = processor.process(
        build_message(
            inputType="RGB_THERMAL_PAIR",
            imageId=None,
            imagePairId=301,
            requestedModelType="FUSION_AUTO",
        )
    )

    assert result.status == "failed"
    assert job_repository.failed_calls[0][1] == "PAIR_METADATA_NOT_FOUND"


def test_marks_failed_when_model_runner_raises():
    job_repository = FakeJobRepository(build_job(JobStatus.QUEUED))
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=build_single_image()),
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
        FakeModelRunner(),
        FakeResultRepository(save_result_error=RuntimeError("save failed")),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert job_repository.failed_calls[0][1] == "UNKNOWN_WORKER_ERROR"


def test_marks_failed_when_defect_save_raises():
    job_repository = FakeJobRepository(build_job(JobStatus.QUEUED))
    processor = AnalysisJobProcessor(
        job_repository,
        FakeImageMetadata(single_image=build_single_image()),
        FakeModelRunner(),
        FakeResultRepository(save_defects_error=RuntimeError("save defects failed")),
    )

    result = processor.process(build_message())

    assert result.status == "failed"
    assert job_repository.failed_calls[0][1] == "UNKNOWN_WORKER_ERROR"
