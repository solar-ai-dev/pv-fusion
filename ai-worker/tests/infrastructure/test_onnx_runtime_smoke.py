from pathlib import Path

import pytest

from app.config.settings import Settings
from app.domain.enums import RequestedModelType, ResultStatus
from app.domain.image_input import SingleImageInput
from app.domain.model import ModelInfo
from app.infrastructure.model.model_registry import ModelRegistry
from app.infrastructure.model.onnx_model_runner import OnnxModelRunner
from app.infrastructure.model.onnx_session import OnnxSessionProvider


AI_WORKER_ROOT = Path(__file__).resolve().parents[2]
RGB_MODEL_PATH = AI_WORKER_ROOT / "models" / "rgb" / "rgb-only-yolo26s-seg-768-e10-dev.onnx"
THERMAL_MODEL_PATH = AI_WORKER_ROOT / "models" / "thermal" / "thermal-only-yolo26n-det-dev-untrained-640.onnx"


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
        rgbModelPath=_relative_model_path(RGB_MODEL_PATH),
        rgbModelName="rgb-only-yolo26s-seg-768-e10-dev",
        rgbModelVersion="dev-e10",
        rgbModelInputSize=768,
        rgbModelConfidenceThreshold="0.25",
        thermalModelPath=_relative_model_path(THERMAL_MODEL_PATH),
        thermalModelName="thermal-only-yolo26n-det-dev-untrained",
        thermalModelVersion="dev-untrained-001",
        thermalModelInputSize=640,
        thermalModelConfidenceThreshold="0.25",
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
        rgbModelPath=_relative_model_path(RGB_MODEL_PATH),
        rgbModelName="rgb-only-yolo26s-seg-768-e10-dev",
        rgbModelVersion="dev-e10",
        rgbModelInputSize=768,
        rgbModelConfidenceThreshold="0.25",
        thermalModelPath=_relative_model_path(THERMAL_MODEL_PATH),
        thermalModelName="thermal-only-yolo26n-det-dev-untrained",
        thermalModelVersion="dev-untrained-001",
        thermalModelInputSize=640,
        thermalModelConfidenceThreshold="0.25",
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


def _build_settings(**overrides) -> Settings:
    payload = {
        "rgbModelPath": "",
        "rgbModelName": "pv-rgb",
        "rgbModelVersion": "v0.0.0",
        "rgbModelInputSize": 640,
        "rgbModelConfidenceThreshold": "0.50",
        "thermalModelPath": "",
        "thermalModelName": "pv-thermal",
        "thermalModelVersion": "v0.0.0",
        "thermalModelInputSize": 640,
        "thermalModelConfidenceThreshold": "0.50",
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
