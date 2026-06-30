from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

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
            modelStatus=_require_string(parsed, "model_status"),
            inputType=InputType[_require_string(parsed, "input_type")],
            modelType=ModelType[_require_string(parsed, "model_type")],
            task=_require_string(parsed, "task"),
            modelFormat=_require_string(parsed, "format"),
            precision=_require_string(parsed, "precision"),
            runtime=_require_string(parsed, "runtime"),
            inputSize=int(_require_string(parsed, "input_size")),
            confidenceThreshold=Decimal(_require_string(parsed, "confidence_threshold")),
            nmsIouThreshold=Decimal(_require_string(parsed, "nms_iou_threshold")),
            modelPath=_require_string(parsed, "model_path"),
            classNames=_require_list(parsed, "class_names"),
        )
    except KeyError as exc:
        raise ValueError(f"Unsupported manifest enum value in {path}: {exc}") from exc


def _parse_manifest(path: Path) -> dict[str, object]:
    data: dict[str, object] = {}
    lines = path.read_text(encoding="utf-8").splitlines()

    in_first_model = False
    current_list_key: str | None = None
    current_list_indent = 0

    for raw_line in lines:
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue

        indent = len(raw_line) - len(raw_line.lstrip(" "))
        stripped = raw_line.strip()

        if stripped == "models:":
            continue

        if stripped.startswith("- "):
            if not in_first_model:
                in_first_model = True
                remainder = stripped[2:]
                if remainder:
                    key, value = _split_key_value(remainder, path)
                    data[key] = value
                continue

            if current_list_key is not None and indent > current_list_indent:
                items = data.setdefault(current_list_key, [])
                if not isinstance(items, list):
                    raise ValueError(f"Manifest list field is malformed: {path} -> {current_list_key}")
                items.append(stripped[2:].strip())
                continue

            break

        if not in_first_model:
            continue

        if current_list_key is not None and indent <= current_list_indent:
            current_list_key = None

        if ":" not in stripped:
            continue

        key, value = _split_key_value(stripped, path)
        if key == "note":
            break

        if value == "":
            if key == "class_names":
                data[key] = []
                current_list_key = key
                current_list_indent = indent
            else:
                data[key] = {}
            continue

        data[key] = value

    if not data:
        raise ValueError(f"Unable to parse model manifest: {path}")

    return data


def _split_key_value(text: str, path: Path) -> tuple[str, str]:
    if ":" not in text:
        raise ValueError(f"Invalid manifest line in {path}: {text}")
    key, value = text.split(":", 1)
    return key.strip(), value.strip()


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
