from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

import yaml

from app.domain.enums import InputType, ModelType, RequestedModelType
from app.domain.model import ModelInfo


@dataclass(frozen=True)
class ModelManifest:
    modelName: str
    modelVersion: str
    modelStatus: str
    inputType: InputType
    modelType: ModelType
    task: str
    modelFormat: str
    precision: str
    runtime: str
    inputSize: int
    confidenceThreshold: Decimal
    nmsIouThreshold: Decimal
    preprocessId: str | None
    modelPath: str
    classNames: list[str]

    def to_model_info(self, requested_model_type: RequestedModelType) -> ModelInfo:
        return ModelInfo(
            modelPath=self.modelPath,
            modelType=self.modelType,
            requestedModelType=requested_model_type,
            modelName=self.modelName,
            modelVersion=self.modelVersion,
            modelFormat=self.modelFormat.lower(),
            runtime=self.runtime.lower(),
            inputSize=self.inputSize,
            threshold=self.confidenceThreshold,
            nmsIouThreshold=self.nmsIouThreshold,
            preprocessId=self.preprocessId,
            classNames=self.classNames,
        )


def load_model_manifest(manifest_path: str) -> ModelManifest:
    path = Path(manifest_path)
    if not path.is_file():
        raise FileNotFoundError(f"Model manifest file is not available: {path}")

    parsed = _parse_manifest(path)

    try:
        return ModelManifest(
            modelName=_require_string(parsed, "model_name"),
            modelVersion=_require_string(parsed, "model_version"),
            modelStatus=_optional_string(parsed, "model_status", "READY"),
            inputType=InputType[_require_string(parsed, "input_type")],
            modelType=ModelType[_require_string(parsed, "model_type")],
            task=_require_string(parsed, "task"),
            modelFormat=_require_string(parsed, "format"),
            precision=_optional_string(parsed, "precision", "FP32"),
            runtime=_require_string(parsed, "runtime"),
            inputSize=int(_require_number_like(parsed, "input_size")),
            confidenceThreshold=Decimal(_require_number_like(parsed, "confidence_threshold")),
            nmsIouThreshold=Decimal(_require_number_like(parsed, "nms_iou_threshold")),
            preprocessId=_optional_string(parsed, "preprocess_id", None),
            modelPath=_resolve_model_path(path, _require_string(parsed, "model_path")),
            classNames=_require_list(parsed, "class_names"),
        )
    except KeyError as exc:
        raise ValueError(f"Unsupported manifest enum value in {path}: {exc}") from exc


def _parse_manifest(path: Path) -> dict[str, object]:
    loaded = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(loaded, dict):
        raise ValueError(f"Unable to parse model manifest: {path}")
    if "models" in loaded:
        models = loaded.get("models")
        if not isinstance(models, list) or not models or not isinstance(models[0], dict):
            raise ValueError(f"Manifest models section is malformed: {path}")
        source = dict(models[0])
    else:
        source = dict(loaded)

    threshold = source.get("threshold")
    if isinstance(threshold, dict):
        source.setdefault("confidence_threshold", threshold.get("conf"))
        source.setdefault("nms_iou_threshold", threshold.get("iou"))

    preprocess = source.get("preprocess")
    if isinstance(preprocess, dict):
        source.setdefault("preprocess_id", preprocess.get("id"))

    source["class_names"] = _normalize_class_names(source.get("class_names"))
    return source


def _require_string(parsed: dict[str, object], key: str) -> str:
    value = parsed.get(key)
    if not isinstance(value, str) or not value:
        raise ValueError(f"Required manifest field is missing or empty: {key}")
    return value


def _require_list(parsed: dict[str, object], key: str) -> list[str]:
    value = parsed.get(key)
    if not isinstance(value, list) or not value:
        raise ValueError(f"Required manifest list field is missing or empty: {key}")
    normalized = [str(item).strip() for item in value if str(item).strip()]
    if not normalized:
        raise ValueError(f"Required manifest list field is missing or empty: {key}")
    return normalized


def _optional_string(parsed: dict[str, object], key: str, default: str | None) -> str | None:
    value = parsed.get(key)
    if value is None:
        return default
    text = str(value).strip()
    return text or default


def _require_number_like(parsed: dict[str, object], key: str) -> str:
    value = parsed.get(key)
    if value is None or value == "":
        raise ValueError(f"Required manifest field is missing or empty: {key}")
    return str(value)


def _normalize_class_names(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, dict):
        def sort_key(item: tuple[object, object]) -> tuple[int, str]:
            raw_key = str(item[0]).strip()
            if raw_key.isdigit():
                return (0, f"{int(raw_key):08d}")
            return (1, raw_key)

        return [str(item).strip() for _, item in sorted(value.items(), key=sort_key) if str(item).strip()]
    return []


def _resolve_model_path(manifest_path: Path, model_path: str) -> str:
    candidate = Path(model_path)
    if candidate.is_absolute():
        return str(candidate)
    return str(_resolve_relative_model_path(manifest_path.parent, candidate).resolve())


def _resolve_relative_model_path(manifest_dir: Path, candidate: Path) -> Path:
    direct_path = manifest_dir / candidate
    if direct_path.exists():
        return direct_path

    overlapping_parts = _count_overlapping_parts(manifest_dir, candidate)
    if overlapping_parts > 0:
        anchor = manifest_dir
        for _ in range(overlapping_parts):
            anchor = anchor.parent
        deduplicated_path = anchor.joinpath(*candidate.parts)
        if deduplicated_path.exists():
            return deduplicated_path

    return direct_path


def _count_overlapping_parts(manifest_dir: Path, candidate: Path) -> int:
    manifest_parts = manifest_dir.parts
    candidate_parts = candidate.parts
    max_overlap = min(len(manifest_parts), len(candidate_parts))
    for overlap in range(max_overlap, 0, -1):
        if manifest_parts[-overlap:] == candidate_parts[:overlap]:
            return overlap
    return 0
