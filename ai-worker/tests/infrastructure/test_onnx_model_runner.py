from pathlib import Path

from app.domain.detected_defect import DetectedDefectDraft
from app.domain.enums import ActionCandidate, ModelType, RequestedModelType
from app.domain.image_input import PairedImageInput, SingleImageInput
from app.domain.model import ModelInfo
from app.infrastructure.model.model_registry import ModelRegistry
from app.infrastructure.model.onnx_model_runner import OnnxModelRunner
from app.infrastructure.model.onnx_session import OnnxSessionProvider


class FakeInput:
    def __init__(self, name: str):
        self.name = name


class FakeSession:
    def __init__(self, output):
        self.output = output
        self.calls = []

    def get_inputs(self):
        return [FakeInput("images")]

    def run(self, output_names, feed_dict):
        self.calls.append((output_names, feed_dict))
        return [self.output]


def build_single_image(image_type: str = "RGB") -> SingleImageInput:
    return SingleImageInput(
        imageId=1,
        imageType=image_type,
        bucketName="images",
        objectKey="originals/1.jpg",
        fileUrl=None,
        targetType="PANEL",
        equipmentId=10,
    )


def build_pair_image() -> PairedImageInput:
    return PairedImageInput(
        imagePairId=3,
        targetType="PANEL",
        equipmentId=10,
        rgbImage=build_single_image("RGB"),
        thermalImage=build_single_image("THERMAL"),
    )


def build_placeholder_model(requested: RequestedModelType) -> ModelInfo:
    return ModelInfo(
        modelPath="",
        modelType=ModelType.RGB_ONLY,
        requestedModelType=requested,
        modelName="placeholder",
        modelVersion="v0",
        modelFormat="onnx",
        runtime="onnxruntime",
        inputSize=640,
        threshold="0.50",
    )


def test_runner_routes_rgb_single_to_rgb_model(tmp_path: Path):
    model_path = tmp_path / "rgb.onnx"
    model_path.write_bytes(b"fake")
    registry = ModelRegistry(
        build_settings(
            rgbModelPath=str(model_path),
            thermalModelPath=str(tmp_path / "thermal.onnx"),
        )
    )
    session = FakeSession(
        {
            "resultStatus": "ANOMALY",
            "anomalyCount": 1,
            "maxConfidence": "0.91",
            "actionCandidate": "FIELD_INSPECTION",
            "defects": [
                DetectedDefectDraft(
                    defectType="HOTSPOT",
                    defectSource="RGB",
                    confidence="0.91",
                    areaRatio="0.10",
                    bboxX=1,
                    bboxY=2,
                    bboxWidth=3,
                    bboxHeight=4,
                    severityScore="0.7",
                    actionCandidate=ActionCandidate.FIELD_INSPECTION,
                )
            ],
        }
    )
    provider = OnnxSessionProvider(session_factory=lambda _: session)
    runner = OnnxModelRunner(
        registry,
        provider,
        preprocess=lambda image_bytes, input_size: ("tensor", image_bytes, input_size),
    )

    result = runner.run(build_single_image("RGB"), build_placeholder_model(RequestedModelType.RGB_ONLY), b"img")

    assert result.modelInfo.modelType is ModelType.RGB_ONLY
    assert result.modelInfo.modelName == "pv-rgb"
    assert result.anomalyCount == 1
    assert session.calls[0][1]["images"] == ("tensor", b"img", 640)


def test_runner_routes_thermal_single_to_thermal_model(tmp_path: Path):
    thermal_path = tmp_path / "thermal.onnx"
    thermal_path.write_bytes(b"fake")
    registry = ModelRegistry(
        build_settings(
            rgbModelPath=str(tmp_path / "rgb.onnx"),
            thermalModelPath=str(thermal_path),
        )
    )
    session = FakeSession([[[10, 20, 30, 50, 0.8, 1]]])
    provider = OnnxSessionProvider(session_factory=lambda _: session)
    runner = OnnxModelRunner(
        registry,
        provider,
        preprocess=lambda image_bytes, input_size: ("tensor", image_bytes, input_size),
    )

    result = runner.run(
        build_single_image("THERMAL"),
        build_placeholder_model(RequestedModelType.THERMAL_ONLY),
        b"thermal",
    )

    assert result.modelInfo.modelType is ModelType.THERMAL_ONLY
    assert result.modelInfo.modelName == "pv-thermal"
    assert result.anomalyCount == 1


def test_runner_handles_rgb_outputs_with_bbox_and_mask_tensors(tmp_path: Path):
    model_path = tmp_path / "rgb.onnx"
    model_path.write_bytes(b"fake")
    registry = ModelRegistry(
        build_settings(
            rgbModelPath=str(model_path),
            thermalModelPath=str(tmp_path / "thermal.onnx"),
        )
    )
    session = FakeSession(
        [
            [[10, 20, 30, 50, 0.9, 1] + ([0] * 32)],
            [[0]],
        ]
    )
    provider = OnnxSessionProvider(session_factory=lambda _: session)
    runner = OnnxModelRunner(
        registry,
        provider,
        preprocess=lambda image_bytes, input_size: ("tensor", image_bytes, input_size),
    )

    result = runner.run(build_single_image("RGB"), build_placeholder_model(RequestedModelType.RGB_ONLY), b"img")

    assert result.modelInfo.modelType is ModelType.RGB_ONLY
    assert result.anomalyCount == 1


def test_runner_rejects_pair_input(tmp_path: Path):
    model_path = tmp_path / "rgb.onnx"
    model_path.write_bytes(b"fake")
    registry = ModelRegistry(
        build_settings(
            rgbModelPath=str(model_path),
            thermalModelPath=str(tmp_path / "thermal.onnx"),
        )
    )
    provider = OnnxSessionProvider(session_factory=lambda _: FakeSession({}))
    runner = OnnxModelRunner(registry, provider, preprocess=lambda image_bytes, input_size: None)

    try:
        runner.run(build_pair_image(), build_placeholder_model(RequestedModelType.FUSION_AUTO), b"ignored")
    except NotImplementedError as exc:
        assert str(exc) == "RGB_THERMAL_PAIR inference is not supported yet."
    else:
        raise AssertionError("Expected NotImplementedError for pair input.")


def test_session_provider_raises_when_model_file_is_missing(tmp_path: Path):
    provider = OnnxSessionProvider(session_factory=lambda _: object())

    try:
        provider.get_session(str(tmp_path / "missing.onnx"))
    except FileNotFoundError as exc:
        assert "missing.onnx" in str(exc)
    else:
        raise AssertionError("Expected FileNotFoundError for missing model file.")


def build_settings(**overrides):
    from app.config.settings import Settings

    payload = {
        "rgbModelPath": "models/rgb.onnx",
        "rgbModelName": "pv-rgb",
        "rgbModelVersion": "v1.0.0",
        "rgbModelInputSize": 640,
        "rgbModelConfidenceThreshold": "0.50",
        "thermalModelPath": "models/thermal.onnx",
        "thermalModelName": "pv-thermal",
        "thermalModelVersion": "v1.0.0",
        "thermalModelInputSize": 512,
        "thermalModelConfidenceThreshold": "0.60",
    }
    payload.update(overrides)
    return Settings(**payload)
