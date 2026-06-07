from app.config.settings import Settings
from app.domain.enums import InputType, ModelType, RequestedModelType
from app.infrastructure.model.model_registry import ModelRegistry


def build_settings(**overrides) -> Settings:
    payload = {
        "rgbModelPath": "models/rgb.onnx",
        "rgbModelName": "pv-rgb",
        "rgbModelVersion": "v1.0.0",
        "rgbModelInputSize": 640,
        "rgbModelConfidenceThreshold": "0.55",
        "thermalModelPath": "models/thermal.onnx",
        "thermalModelName": "pv-thermal",
        "thermalModelVersion": "v1.2.0",
        "thermalModelInputSize": 512,
        "thermalModelConfidenceThreshold": "0.65",
    }
    payload.update(overrides)
    return Settings(**payload)


def test_resolve_returns_rgb_model_for_rgb_single():
    registry = ModelRegistry(build_settings())

    model_info = registry.resolve(InputType.RGB_SINGLE, RequestedModelType.RGB_ONLY)

    assert model_info.modelPath == "models/rgb.onnx"
    assert model_info.modelType is ModelType.RGB_ONLY
    assert model_info.modelName == "pv-rgb"
    assert str(model_info.threshold) == "0.55"


def test_resolve_returns_thermal_model_for_thermal_single():
    registry = ModelRegistry(build_settings())

    model_info = registry.resolve(InputType.THERMAL_SINGLE, RequestedModelType.THERMAL_ONLY)

    assert model_info.modelPath == "models/thermal.onnx"
    assert model_info.modelType is ModelType.THERMAL_ONLY
    assert model_info.modelName == "pv-thermal"
    assert str(model_info.threshold) == "0.65"


def test_resolve_raises_for_pair_input():
    registry = ModelRegistry(build_settings())

    try:
        registry.resolve(InputType.RGB_THERMAL_PAIR, RequestedModelType.FUSION_AUTO)
    except NotImplementedError as exc:
        assert str(exc) == "RGB_THERMAL_PAIR inference is not supported yet."
    else:
        raise AssertionError("Expected NotImplementedError for pair input.")
