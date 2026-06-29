from app.config.settings import Settings
from app.domain.enums import InputType, ModelType, RequestedModelType
from app.domain.model import ModelInfo
from app.infrastructure.model.model_manifest import ModelManifest, load_model_manifest


class ModelRegistry:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._rgb_manifest = load_model_manifest(settings.rgbModelManifestPath)
        self._thermal_manifest = load_model_manifest(settings.thermalModelManifestPath)

    def resolve(self, input_type: InputType, requested_model_type: RequestedModelType) -> ModelInfo:
        if input_type is InputType.RGB_SINGLE:
            return self._resolve_from_manifest(self._rgb_manifest, input_type, ModelType.RGB_ONLY, requested_model_type)

        if input_type is InputType.THERMAL_SINGLE:
            return self._resolve_from_manifest(self._thermal_manifest, input_type, ModelType.THERMAL_ONLY, requested_model_type)

        raise ValueError(f"Unsupported input type: {input_type.value}")

    def _resolve_from_manifest(
        self,
        manifest: ModelManifest,
        input_type: InputType,
        expected_model_type: ModelType,
        requested_model_type: RequestedModelType,
    ) -> ModelInfo:
        if manifest.inputType is not input_type:
            raise ValueError(
                f"Manifest input_type mismatch for {input_type.name}: {manifest.inputType.name}"
            )
        if manifest.modelType is not expected_model_type:
            raise ValueError(
                f"Manifest model_type mismatch for {input_type.name}: {manifest.modelType.name}"
            )
        if requested_model_type.value != expected_model_type.value:
            raise ValueError(
                f"Requested model type mismatch for {input_type.name}: {requested_model_type.name}"
            )
        return manifest.to_model_info(requested_model_type)
