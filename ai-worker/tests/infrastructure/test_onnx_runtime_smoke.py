from io import BytesIO
from pathlib import Path

import pytest

from app.application.analysis_job_processor import AnalysisJobProcessor
from app.domain.analysis_job import AnalysisJob
from app.domain.detected_defect import DetectedDefectDraft
from app.domain.enums import ActionCandidate, InputType, JobStatus, ModelType, RequestedModelType, ResultStatus
from app.domain.image_input import SingleImageInput
from app.config.settings import Settings
from app.domain.model import ModelInfo
from app.domain.worker_message import WorkerMessage
from app.infrastructure.model.model_registry import ModelRegistry
from app.infrastructure.model.onnx_model_runner import OnnxModelRunner
from app.infrastructure.model.output_parser import ParsedDetection, parse_inference_output
from app.infrastructure.model.onnx_session import OnnxSessionProvider
from app.infrastructure.visualization.overlay import draw_bbox_overlay, draw_mask_overlay


AI_WORKER_ROOT = Path(__file__).resolve().parents[2]
RGB_MODEL_PATH = AI_WORKER_ROOT / "models" / "rgb" / "rgb-only-yolo26s-seg-768-e10-dev.onnx"
THERMAL_MODEL_PATH = AI_WORKER_ROOT / "models" / "thermal" / "thermal-only-yolo26n-det-dev-untrained-640.onnx"
RGB_MANIFEST_PATH = AI_WORKER_ROOT / "models" / "rgb" / "model-manifest.dev.yaml"
THERMAL_MANIFEST_PATH = AI_WORKER_ROOT / "models" / "thermal" / "model-manifest.dev.yaml"


def test_rgb_onnx_runtime_smoke():
    ort = pytest.importorskip("onnxruntime")
    np = pytest.importorskip("numpy")
    _skip_if_missing(RGB_MODEL_PATH)

    session = ort.InferenceSession(str(RGB_MODEL_PATH), providers=["CPUExecutionProvider"])
    inputs = session.get_inputs()
    outputs = session.get_outputs()

    assert len(inputs) == 1
    assert inputs[0].name == "images"
    assert list(inputs[0].shape) == [1, 3, 768, 768]
    assert inputs[0].type == "tensor(float)"
    assert [output.name for output in outputs] == ["output0", "output1"]
    assert [list(output.shape) for output in outputs] == [[1, 300, 38], [1, 32, 192, 192]]

    tensor = np.zeros((1, 3, 768, 768), dtype=np.float32)
    result = session.run(None, {"images": tensor})

    assert isinstance(result, list)
    assert len(result) == 2
    assert tuple(result[0].shape) == (1, 300, 38)
    assert tuple(result[1].shape) == (1, 32, 192, 192)


def test_thermal_onnx_runtime_smoke():
    ort = pytest.importorskip("onnxruntime")
    np = pytest.importorskip("numpy")
    _skip_if_missing(THERMAL_MODEL_PATH)

    session = ort.InferenceSession(str(THERMAL_MODEL_PATH), providers=["CPUExecutionProvider"])
    inputs = session.get_inputs()
    outputs = session.get_outputs()

    assert len(inputs) == 1
    assert inputs[0].name == "images"
    assert list(inputs[0].shape) == [1, 3, 640, 640]
    assert inputs[0].type == "tensor(float)"
    assert [output.name for output in outputs] == ["output0"]
    assert [list(output.shape) for output in outputs] == [[1, 300, 6]]

    tensor = np.zeros((1, 3, 640, 640), dtype=np.float32)
    result = session.run(None, {"images": tensor})

    assert isinstance(result, list)
    assert len(result) == 1
    assert tuple(result[0].shape) == (1, 300, 6)


def test_onnx_model_runner_smoke_for_rgb():
    pytest.importorskip("onnxruntime")
    np = pytest.importorskip("numpy")
    _skip_if_missing(RGB_MODEL_PATH)

    settings = _build_settings(
        rgbModelManifestPath=_relative_model_path(RGB_MANIFEST_PATH),
        thermalModelManifestPath=_relative_model_path(THERMAL_MANIFEST_PATH),
    )
    runner = OnnxModelRunner(
        ModelRegistry(settings),
        OnnxSessionProvider(),
        preprocess=lambda image_bytes, input_size: np.zeros((1, 3, input_size, input_size), dtype=np.float32),
    )

    result = runner.run(
        _build_single_image("RGB"),
        _build_placeholder_model(RequestedModelType.RGB_ONLY),
        b"synthetic-rgb-bytes",
    )

    assert result.modelInfo.modelName == "rgb-only-yolo26s-seg-768-e10-dev"
    assert result.modelInfo.inputSize == 768
    assert result.resultStatus is ResultStatus.NORMAL
    assert result.anomalyCount == 0


def test_onnx_model_runner_smoke_for_thermal():
    pytest.importorskip("onnxruntime")
    np = pytest.importorskip("numpy")
    _skip_if_missing(THERMAL_MODEL_PATH)

    settings = _build_settings(
        rgbModelManifestPath=_relative_model_path(RGB_MANIFEST_PATH),
        thermalModelManifestPath=_relative_model_path(THERMAL_MANIFEST_PATH),
    )
    runner = OnnxModelRunner(
        ModelRegistry(settings),
        OnnxSessionProvider(),
        preprocess=lambda image_bytes, input_size: np.zeros((1, 3, input_size, input_size), dtype=np.float32),
    )

    result = runner.run(
        _build_single_image("THERMAL"),
        _build_placeholder_model(RequestedModelType.THERMAL_ONLY),
        b"synthetic-thermal-bytes",
    )

    assert result.modelInfo.modelName == "thermal-only-yolo26n-det-dev-untrained"
    assert result.modelInfo.inputSize == 640
    assert result.resultStatus is ResultStatus.NORMAL
    assert result.anomalyCount == 0


def test_rgb_runtime_output_parser_smoke():
    np = pytest.importorskip("numpy")
    raw_output = _run_rgb_runtime_output(np.zeros((1, 3, 768, 768), dtype=np.float32))
    model_info = _build_settings(
        rgbModelManifestPath=_relative_model_path(RGB_MANIFEST_PATH),
    )
    parsed = parse_inference_output(
        raw_output,
        ModelRegistry(model_info).resolve(InputType.RGB_SINGLE, RequestedModelType.RGB_ONLY),
    )

    assert parsed.modelInfo.modelType is ModelType.RGB_ONLY
    assert parsed.anomalyCount >= 0
    assert len(parsed.restoredMasks) <= len(parsed.defects)


def test_rgb_runtime_output_coefficients_match_prototype_channels():
    np = pytest.importorskip("numpy")
    output0, output1 = _run_rgb_runtime_output(np.zeros((1, 3, 768, 768), dtype=np.float32))

    assert output0.shape[-1] == 38
    assert output1.shape[1] == 32
    assert output0.shape[-1] - 6 == output1.shape[1]


def test_rgb_runtime_output_overlay_smoke():
    image_module = pytest.importorskip("PIL.Image")
    np = pytest.importorskip("numpy")
    raw_output = _run_rgb_runtime_output(np.zeros((1, 3, 768, 768), dtype=np.float32))
    model_info = ModelRegistry(
        _build_settings(
            rgbModelManifestPath=_relative_model_path(RGB_MANIFEST_PATH),
        )
    ).resolve(InputType.RGB_SINGLE, RequestedModelType.RGB_ONLY)
    parsed = parse_inference_output(raw_output, model_info)
    image_bytes = _make_png_bytes(image_module, size=(768, 768))

    bbox_overlay = draw_bbox_overlay(image_bytes, _defects_to_detections(parsed.defects))
    assert bbox_overlay.startswith(b"\x89PNG")

    if not parsed.restoredMasks:
        pytest.skip("Actual RGB ONNX output did not yield restored masks for the zero tensor input.")

    mask_overlay = draw_mask_overlay(image_bytes, parsed.restoredMasks)
    assert mask_overlay.startswith(b"\x89PNG")
    image_module.open(BytesIO(mask_overlay)).load()


def test_rgb_processor_smoke_with_actual_runtime_output():
    image_module = pytest.importorskip("PIL.Image")
    np = pytest.importorskip("numpy")
    pytest.importorskip("onnxruntime")
    _skip_if_missing(RGB_MODEL_PATH)

    storage = _SmokeStorage(_make_png_bytes(image_module, size=(768, 768)))
    result_repository = _SmokeResultRepository()
    processor = AnalysisJobProcessor(
        _SmokeJobRepository(),
        _SmokeImageMetadata(),
        storage,
        OnnxModelRunner(
            ModelRegistry(
                _build_settings(
                    rgbModelManifestPath=_relative_model_path(RGB_MANIFEST_PATH),
                    thermalModelManifestPath=_relative_model_path(THERMAL_MANIFEST_PATH),
                )
            ),
            OnnxSessionProvider(),
            preprocess=lambda image_bytes, input_size: np.zeros((1, 3, input_size, input_size), dtype=np.float32),
        ),
        result_repository,
    )

    result = processor.process(_build_worker_message())

    assert result.status == "processed"
    assert storage.write_calls[0][1] == "analysis-results/1000/bbox_overlay.png"
    assert storage.write_calls[0][3] == "image/png"
    assert result_repository.saved_results[0].bboxObjectKey == "analysis-results/1000/bbox_overlay.png"

    if len(storage.write_calls) == 1:
        pytest.skip("Actual RGB ONNX output did not yield restorable masks for the zero tensor input.")

    assert storage.write_calls[1][1] == "analysis-results/1000/mask_overlay.png"
    assert storage.write_calls[1][3] == "image/png"
    assert result_repository.saved_results[0].maskObjectKey == "analysis-results/1000/mask_overlay.png"


def test_thermal_processor_smoke_keeps_mask_fields_null():
    np = pytest.importorskip("numpy")
    pytest.importorskip("onnxruntime")
    _skip_if_missing(THERMAL_MODEL_PATH)

    storage = _SmokeStorage(_make_png_bytes(pytest.importorskip("PIL.Image"), size=(640, 640)))
    result_repository = _SmokeResultRepository()
    processor = AnalysisJobProcessor(
        _SmokeJobRepository(
            AnalysisJob(
                jobId=1000,
                inputType=InputType.THERMAL_SINGLE,
                imageId=201,
                requestedModelType=RequestedModelType.THERMAL_ONLY,
                modelType=None,
                jobStatus=JobStatus.QUEUED,
                requestedByUserId=1,
                traceId="req-20260607-0001",
                failureCode=None,
                failureMessage=None,
            )
        ),
        _SmokeImageMetadata(image_type="THERMAL"),
        storage,
        OnnxModelRunner(
            ModelRegistry(
                _build_settings(
                    rgbModelManifestPath=_relative_model_path(RGB_MANIFEST_PATH),
                    thermalModelManifestPath=_relative_model_path(THERMAL_MANIFEST_PATH),
                )
            ),
            OnnxSessionProvider(),
            preprocess=lambda image_bytes, input_size: np.zeros((1, 3, input_size, input_size), dtype=np.float32),
        ),
        result_repository,
    )

    result = processor.process(_build_worker_message(input_type="THERMAL_SINGLE", requested_model_type="THERMAL_ONLY"))

    assert result.status == "processed"
    assert len(storage.write_calls) == 1
    assert result_repository.saved_results[0].maskBucketName is None
    assert result_repository.saved_results[0].maskObjectKey is None
    assert all(defect.maskObjectKey is None for _, defects in result_repository.saved_defects for defect in defects)


def _build_settings(**overrides) -> Settings:
    payload = {
        "rgbModelManifestPath": _relative_model_path(RGB_MANIFEST_PATH),
        "thermalModelManifestPath": _relative_model_path(THERMAL_MANIFEST_PATH),
    }
    payload.update(overrides)
    return Settings(**payload)


def _build_single_image(image_type: str) -> SingleImageInput:
    return SingleImageInput(
        imageId=1,
        imageType=image_type,
        bucketName="images",
        objectKey="originals/1.jpg",
        fileUrl=None,
        targetType="PANEL",
        equipmentId=10,
    )


def _build_placeholder_model(requested_model_type: RequestedModelType) -> ModelInfo:
    return ModelInfo(
        modelPath="",
        modelType=_resolve_model_type(requested_model_type),
        requestedModelType=requested_model_type,
        modelName="placeholder",
        modelVersion="v0",
        modelFormat="onnx",
        runtime="onnxruntime",
        inputSize=640,
        threshold="0.50",
    )


def _resolve_model_type(requested_model_type: RequestedModelType):
    from app.domain.enums import ModelType

    if requested_model_type is RequestedModelType.THERMAL_ONLY:
        return ModelType.THERMAL_ONLY
    return ModelType.RGB_ONLY


def _relative_model_path(model_path: Path) -> str:
    return model_path.relative_to(AI_WORKER_ROOT).as_posix()


def _skip_if_missing(model_path: Path) -> None:
    if not model_path.exists():
        pytest.skip(f"ONNX model file is not available: {model_path}")


def _run_rgb_runtime_output(tensor):
    ort = pytest.importorskip("onnxruntime")
    _skip_if_missing(RGB_MODEL_PATH)
    session = ort.InferenceSession(str(RGB_MODEL_PATH), providers=["CPUExecutionProvider"])
    return session.run(None, {"images": tensor})


def _make_png_bytes(image_module, size=(64, 64), color=(255, 255, 255)):
    image = image_module.new("RGB", size, color)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _defects_to_detections(defects: list[DetectedDefectDraft]) -> list[ParsedDetection]:
    detections: list[ParsedDetection] = []
    for defect in defects:
        if defect.bboxX is None or defect.bboxY is None or defect.bboxWidth is None or defect.bboxHeight is None:
            continue
        detections.append(
            ParsedDetection(
                class_id=-1,
                class_name=defect.defectType,
                confidence=defect.confidence or 0,
                bbox_x=float(defect.bboxX),
                bbox_y=float(defect.bboxY),
                bbox_width=float(defect.bboxWidth),
                bbox_height=float(defect.bboxHeight),
                source=defect.defectSource,
            )
        )
    return detections


def _build_worker_message(
    input_type: str = "RGB_SINGLE",
    requested_model_type: str = "RGB_ONLY",
) -> WorkerMessage:
    return WorkerMessage(
        jobId=1000,
        inputType=input_type,
        imageId=201,
        requestedModelType=requested_model_type,
        requestedByUserId=1,
        traceId="req-20260607-0001",
        createdAt="2026-06-07T10:00:00+09:00",
    )


class _SmokeJobRepository:
    def __init__(self, job: AnalysisJob | None = None):
        self.job = job or AnalysisJob(
            jobId=1000,
            inputType=InputType.RGB_SINGLE,
            imageId=201,
            requestedModelType=RequestedModelType.RGB_ONLY,
            modelType=None,
            jobStatus=JobStatus.QUEUED,
            requestedByUserId=1,
            traceId="req-20260607-0001",
            failureCode=None,
            failureMessage=None,
        )

    def get_by_id(self, job_id: int) -> AnalysisJob | None:
        return self.job if self.job.jobId == job_id else None

    def mark_running(self, job_id: int) -> None:
        return None

    def mark_succeeded(self, job_id: int) -> None:
        return None

    def mark_failed(self, job_id: int, failure_code: str, failure_message: str) -> None:
        raise AssertionError(f"Processor smoke should not fail: {failure_code} {failure_message}")


class _SmokeImageMetadata:
    def __init__(self, image_type: str = "RGB") -> None:
        self._image = _build_single_image(image_type)

    def get_single_image(self, image_id: int) -> SingleImageInput | None:
        return self._image


class _SmokeStorage:
    def __init__(self, payload: bytes):
        self.payload = payload
        self.write_calls: list[tuple[str, str, bytes, str]] = []

    def read_object(self, bucket_name: str, object_key: str) -> bytes:
        return self.payload

    def write_object(self, bucket_name: str, object_key: str, data: bytes, content_type: str) -> str:
        self.write_calls.append((bucket_name, object_key, data, content_type))
        return object_key


class _SmokeResultRepository:
    def __init__(self) -> None:
        self.saved_results = []
        self.saved_defects = []

    def save_result(self, result):
        self.saved_results.append(result)
        return 999

    def save_defects(self, analysis_result_id: int, defects: list[DetectedDefectDraft]) -> None:
        self.saved_defects.append((analysis_result_id, defects))
