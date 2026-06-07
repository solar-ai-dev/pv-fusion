from app.config.settings import Settings
from app.domain.enums import InputType, ModelType, RequestedModelType
from app.domain.model import ModelInfo


class ModelRegistry:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def resolve(self, input_type: InputType, requested_model_type: RequestedModelType) -> ModelInfo:
        if input_type is InputType.RGB_SINGLE:
            return ModelInfo(
                modelPath=self._settings.rgbModelPath,
                modelType=ModelType.RGB_ONLY,
                requestedModelType=requested_model_type,
                modelName=self._settings.rgbModelName,
                modelVersion=self._settings.rgbModelVersion,
                modelFormat="onnx",
                runtime="onnxruntime",
                inputSize=self._settings.rgbModelInputSize,
                threshold=self._settings.rgbModelConfidenceThreshold,
            )

        if input_type is InputType.THERMAL_SINGLE:
            return ModelInfo(
                modelPath=self._settings.thermalModelPath,
                modelType=ModelType.THERMAL_ONLY,
                requestedModelType=requested_model_type,
                modelName=self._settings.thermalModelName,
                modelVersion=self._settings.thermalModelVersion,
                modelFormat="onnx",
                runtime="onnxruntime",
                inputSize=self._settings.thermalModelInputSize,
                threshold=self._settings.thermalModelConfidenceThreshold,
            )

        raise NotImplementedError("RGB_THERMAL_PAIR inference is not supported yet.")
