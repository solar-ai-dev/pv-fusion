from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from app.domain.detected_defect import DetectedDefectDraft
from app.domain.enums import ActionCandidate, ResultStatus
from app.domain.inference_result import InferenceResult, RestoredMask, VisualizationPaths
from app.domain.model import ModelInfo


@dataclass(frozen=True)
class ParsedDetection:
    class_id: int
    class_name: str | None
    confidence: Decimal
    bbox_x: float
    bbox_y: float
    bbox_width: float
    bbox_height: float
    source: str


def parse_inference_output(raw_output: Any, model_info: ModelInfo) -> InferenceResult:
    restored_masks: list[RestoredMask] = []
    if isinstance(raw_output, dict):
        result_status = ResultStatus(raw_output.get("resultStatus", ResultStatus.NORMAL.value))
        anomaly_count = int(raw_output.get("anomalyCount", 0))
        max_confidence = _to_decimal(raw_output.get("maxConfidence"))
        area_ratio = _to_decimal(raw_output.get("areaRatio"))
        severity_score = _to_decimal(raw_output.get("severityScore"))
        action_candidate = ActionCandidate(
            raw_output.get("actionCandidate", ActionCandidate.CLEANING.value)
        )
        defects = list(raw_output.get("defects", []))
        visualization_paths = VisualizationPaths(
            bboxObjectKey=raw_output.get("bboxObjectKey"),
            heatmapObjectKey=raw_output.get("heatmapObjectKey"),
            maskObjectKey=raw_output.get("maskObjectKey"),
        )
    else:
        detections, restored_masks = _extract_detections_and_masks(raw_output, model_info)
        defects = detections_to_defects(detections)
        anomaly_count = len(defects)
        max_confidence = _max_confidence(detections)
        result_status = ResultStatus.ANOMALY if defects else ResultStatus.NORMAL
        area_ratio = None
        severity_score = None
        action_candidate = ActionCandidate.CLEANING
        visualization_paths = VisualizationPaths()

    return InferenceResult(
        modelInfo=model_info,
        resultStatus=result_status,
        anomalyCount=anomaly_count,
        maxConfidence=max_confidence,
        areaRatio=area_ratio,
        severityScore=severity_score,
        actionCandidate=action_candidate,
        defects=defects,
        visualizationPaths=visualization_paths,
        restoredMasks=restored_masks,
    )


def extract_detections(raw_output: Any, model_info: ModelInfo) -> list[ParsedDetection]:
    detections, _ = _extract_detections_and_masks(raw_output, model_info)
    return detections


def restore_rgb_instance_masks(raw_output: Any, model_info: ModelInfo) -> list[RestoredMask]:
    _, restored_masks = _extract_detections_and_masks(raw_output, model_info)
    return restored_masks


def _extract_detections_and_masks(
    raw_output: Any,
    model_info: ModelInfo,
) -> tuple[list[ParsedDetection], list[RestoredMask]]:
    if _looks_like_rgb_outputs(raw_output):
        return _parse_rgb_outputs(
            output0=raw_output[0],
            output1=raw_output[1],
            threshold=model_info.threshold,
            input_size=model_info.inputSize,
        )
    return (
        _parse_detection_rows(
            rows=_flatten_rows(raw_output),
            threshold=model_info.threshold,
            source="THERMAL",
        ),
        [],
    )


def detections_to_defects(detections: list[ParsedDetection]) -> list[DetectedDefectDraft]:
    defects: list[DetectedDefectDraft] = []
    for detection in detections:
        defects.append(
            DetectedDefectDraft(
                defectType=detection.class_name or _fallback_defect_type(detection),
                defectSource=detection.source,
                confidence=detection.confidence,
                areaRatio=None,
                bboxX=int(round(detection.bbox_x)),
                bboxY=int(round(detection.bbox_y)),
                bboxWidth=int(round(detection.bbox_width)),
                bboxHeight=int(round(detection.bbox_height)),
                severityScore=None,
                actionCandidate=ActionCandidate.CLEANING,
            )
        )
    return defects


def _to_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))


def _looks_like_rgb_outputs(raw_output: Any) -> bool:
    if not isinstance(raw_output, (list, tuple)) or len(raw_output) != 2:
        return False
    return _last_dimension(raw_output[0]) >= 6


def _flatten_rows(output: Any) -> list[Any]:
    rows = output
    while _dimension_length(rows) == 1 and not _is_row_candidate(rows[0]):
        rows = rows[0]
    return list(rows)


def _parse_detection_rows(rows: list[Any], threshold: Decimal, source: str) -> list[ParsedDetection]:
    detections: list[ParsedDetection] = []
    for row in rows:
        values = _to_sequence(row)
        if len(values) < 6:
            continue

        confidence = _to_decimal(values[4])
        if confidence is None or confidence < threshold:
            continue

        x1 = float(values[0])
        y1 = float(values[1])
        x2 = float(values[2])
        y2 = float(values[3])
        x1, x2 = sorted((x1, x2))
        y1, y2 = sorted((y1, y2))
        width = x2 - x1
        height = y2 - y1
        if width <= 0 or height <= 0:
            continue

        class_id = _safe_int(values[5])
        detections.append(
            ParsedDetection(
                class_id=class_id,
                class_name=None,
                confidence=confidence,
                bbox_x=x1,
                bbox_y=y1,
                bbox_width=width,
                bbox_height=height,
                source=source,
            )
        )
    return detections


def _parse_rgb_outputs(
    output0: Any,
    output1: Any,
    threshold: Decimal,
    input_size: int,
) -> tuple[list[ParsedDetection], list[RestoredMask]]:
    rows = _flatten_rows(output0)
    detections: list[ParsedDetection] = []
    mask_inputs: list[tuple[ParsedDetection, list[float]]] = []

    for row in rows:
        values = _to_sequence(row)
        if len(values) < 6:
            continue

        detection = _parse_detection(values, threshold, "RGB")
        if detection is None:
            continue

        detections.append(detection)
        mask_inputs.append((detection, [float(value) for value in values[6:]]))

    if not detections:
        return detections, []

    prototypes = _extract_mask_prototypes(output1)
    if prototypes is None:
        return detections, []

    prototype_channels = len(prototypes)
    if any(len(coefficients) != prototype_channels for _, coefficients in mask_inputs):
        return detections, []

    restored_masks: list[RestoredMask] = []
    for detection, coefficients in mask_inputs:
        restored_mask = _restore_mask(
            coefficients=coefficients,
            prototypes=prototypes,
            detection=detection,
            input_size=input_size,
        )
        if restored_mask is not None:
            restored_masks.append(restored_mask)

    return detections, restored_masks


def _parse_detection(values: list[Any], threshold: Decimal, source: str) -> ParsedDetection | None:
    confidence = _to_decimal(values[4])
    if confidence is None or confidence < threshold:
        return None

    x1 = float(values[0])
    y1 = float(values[1])
    x2 = float(values[2])
    y2 = float(values[3])
    x1, x2 = sorted((x1, x2))
    y1, y2 = sorted((y1, y2))
    width = x2 - x1
    height = y2 - y1
    if width <= 0 or height <= 0:
        return None

    return ParsedDetection(
        class_id=_safe_int(values[5]),
        class_name=None,
        confidence=confidence,
        bbox_x=x1,
        bbox_y=y1,
        bbox_width=width,
        bbox_height=height,
        source=source,
    )


def _extract_mask_prototypes(output1: Any) -> Any | None:
    try:
        import numpy as np
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("numpy is required to restore RGB instance masks.") from exc

    prototypes = np.asarray(output1, dtype="float32")
    if prototypes.ndim == 4 and prototypes.shape[0] == 1:
        prototypes = prototypes[0]
    if prototypes.ndim != 3:
        return None
    return prototypes


def _restore_mask(
    coefficients: list[float],
    prototypes: Any,
    detection: ParsedDetection,
    input_size: int,
) -> RestoredMask | None:
    try:
        import numpy as np
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("numpy is required to restore RGB instance masks.") from exc

    logits = np.tensordot(np.asarray(coefficients, dtype="float32"), prototypes, axes=(0, 0))
    probabilities = 1.0 / (1.0 + np.exp(-logits))
    binary_mask = probabilities >= 0.5

    mask_height, mask_width = binary_mask.shape
    x1, y1, x2, y2 = _project_bbox_to_mask(detection, mask_width, mask_height, input_size)
    if x2 <= x1 or y2 <= y1:
        return None

    cropped_mask = np.zeros_like(binary_mask, dtype="uint8")
    cropped_mask[y1:y2, x1:x2] = binary_mask[y1:y2, x1:x2].astype("uint8")

    return RestoredMask(
        bboxX=detection.bbox_x,
        bboxY=detection.bbox_y,
        bboxWidth=detection.bbox_width,
        bboxHeight=detection.bbox_height,
        data=cropped_mask.tolist(),
    )


def _project_bbox_to_mask(
    detection: ParsedDetection,
    mask_width: int,
    mask_height: int,
    input_size: int,
) -> tuple[int, int, int, int]:
    x = detection.bbox_x
    y = detection.bbox_y
    width = detection.bbox_width
    height = detection.bbox_height

    if _looks_normalized(x, y, width, height):
        x1 = x * mask_width
        y1 = y * mask_height
        x2 = (x + width) * mask_width
        y2 = (y + height) * mask_height
    else:
        scale_x = mask_width / float(input_size)
        scale_y = mask_height / float(input_size)
        x1 = x * scale_x
        y1 = y * scale_y
        x2 = (x + width) * scale_x
        y2 = (y + height) * scale_y

    left = max(0, min(mask_width, int(x1)))
    top = max(0, min(mask_height, int(y1)))
    right = max(0, min(mask_width, int(x2)))
    bottom = max(0, min(mask_height, int(y2)))
    return left, top, right, bottom


def _dimension_length(value: Any) -> int | None:
    shape = getattr(value, "shape", None)
    if shape is not None and len(shape) > 0:
        return int(shape[0])
    if isinstance(value, (list, tuple)):
        return len(value)
    return None


def _last_dimension(value: Any) -> int:
    shape = getattr(value, "shape", None)
    if shape is not None and len(shape) > 0:
        return int(shape[-1])
    if isinstance(value, (list, tuple)) and value:
        sample = value
        while isinstance(sample, (list, tuple)) and sample:
            first = sample[0]
            if not isinstance(first, (list, tuple)):
                return len(sample)
            sample = first
    return 0


def _to_sequence(row: Any) -> list[Any]:
    if hasattr(row, "tolist"):
        row = row.tolist()
    return list(row)


def _is_row_candidate(value: Any) -> bool:
    if hasattr(value, "tolist"):
        value = value.tolist()
    if not isinstance(value, (list, tuple)) or len(value) < 6:
        return False
    first = value[0]
    return not isinstance(first, (list, tuple))


def _safe_int(value: Any) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return -1


def _max_confidence(detections: list[ParsedDetection]) -> Decimal | None:
    if not detections:
        return None
    return max(detection.confidence for detection in detections)


def _fallback_defect_type(detection: ParsedDetection) -> str:
    if detection.source == "THERMAL":
        return f"THERMAL_CLASS_{detection.class_id}"
    if detection.source == "RGB":
        return f"RGB_CLASS_{detection.class_id}"
    return f"CLASS_{detection.class_id}"


def _looks_normalized(x: float, y: float, width: float, height: float) -> bool:
    return 0.0 <= x <= 1.0 and 0.0 <= y <= 1.0 and 0.0 <= width <= 1.0 and 0.0 <= height <= 1.0
