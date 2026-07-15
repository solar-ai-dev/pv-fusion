import logging
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from app.domain.detected_defect import DetectedDefectDraft
from app.domain.enums import ActionCandidate, ResultStatus
from app.domain.inference_result import InferenceResult, RestoredMask, VisualizationPaths
from app.domain.model import ModelInfo

logger = logging.getLogger(__name__)

ALLOWED_DEFECT_TYPES = {
    "CONTAMINATION",
    "DUST",
    "LEAF",
    "BIRD_DROPPING",
    "SHADING",
    "VEGETATION",
    "APPEARANCE_DAMAGE",
    "HOTSPOT",
    "OVERHEATING",
    "ABNORMAL_HEAT",
    "HotSpot",
    "Diode_ByPassed",
    "String_Fault",
    "UNKNOWN",
}

DEFECT_TYPE_ALIASES = {
    "HotSpot": "HOTSPOT",
    "Diode_ByPassed": "UNKNOWN",
    "String_Fault": "UNKNOWN",
}

LOWERCASE_DEFECT_TYPE_ALIASES = {
    "bitki": "VEGETATION",
    "broken": "APPEARANCE_DAMAGE",
    "dusty": "DUST",
    "electrical-damage": "APPEARANCE_DAMAGE",
    "missing": "APPEARANCE_DAMAGE",
    "shading": "SHADING",
}

FIELD_INSPECTION_DEFECT_TYPES = {
    "HOTSPOT",
    "OVERHEATING",
    "ABNORMAL_HEAT",
    "APPEARANCE_DAMAGE",
}


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
    model_class_id: int | None = None
    model_class_name: str | None = None


@dataclass(frozen=True)
class _RgbDetectionCandidate:
    detection: ParsedDetection
    coefficients: list[float]


def parse_inference_output(raw_output: Any, model_info: ModelInfo, image_context: Any | None = None) -> InferenceResult:
    restored_masks: list[RestoredMask] = []
    if isinstance(raw_output, dict):
        result_status = ResultStatus(raw_output.get("resultStatus", ResultStatus.NORMAL.value))
        anomaly_count = int(raw_output.get("anomalyCount", 0))
        max_confidence = _to_decimal(raw_output.get("maxConfidence"))
        area_ratio = _to_decimal(raw_output.get("areaRatio"))
        severity_score = _to_decimal(raw_output.get("severityScore"))
        defects = _normalize_structured_defects(raw_output.get("defects", []))
        action_candidate = ActionCandidate(
            raw_output.get("actionCandidate", _resolve_result_action_candidate(defects).value)
        )
        visualization_paths = VisualizationPaths(
            bboxObjectKey=raw_output.get("bboxObjectKey"),
            heatmapObjectKey=raw_output.get("heatmapObjectKey"),
            maskObjectKey=raw_output.get("maskObjectKey"),
        )
    else:
        detections, restored_masks, area_ratios, area_ratio = _extract_detections_and_masks(
            raw_output,
            model_info,
            image_context=image_context,
        )
        defects = detections_to_defects(detections, area_ratios=area_ratios)
        anomaly_count = len(defects)
        max_confidence = _max_confidence(detections)
        result_status = ResultStatus.ANOMALY if defects else ResultStatus.NORMAL
        severity_score = None
        action_candidate = _resolve_result_action_candidate(defects)
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


def extract_detections(raw_output: Any, model_info: ModelInfo, image_context: Any | None = None) -> list[ParsedDetection]:
    detections, _, _, _ = _extract_detections_and_masks(raw_output, model_info, image_context=image_context)
    return detections


def restore_rgb_instance_masks(
    raw_output: Any,
    model_info: ModelInfo,
    image_context: Any | None = None,
) -> list[RestoredMask]:
    _, restored_masks, _, _ = _extract_detections_and_masks(raw_output, model_info, image_context=image_context)
    return restored_masks


def _extract_detections_and_masks(
    raw_output: Any,
    model_info: ModelInfo,
    image_context: Any | None,
) -> tuple[list[ParsedDetection], list[RestoredMask], list[Decimal | None], Decimal | None]:
    if _looks_like_rgb_outputs(raw_output):
        return _parse_rgb_outputs(
            output0=raw_output[0],
            output1=raw_output[1],
            threshold=model_info.threshold,
            nms_iou_threshold=model_info.nmsIouThreshold,
            mask_threshold=model_info.maskThreshold,
            input_size=model_info.inputSize,
            class_names=model_info.classNames,
            image_context=image_context,
        )

    detections = _parse_detection_rows(
        rows=_flatten_rows(raw_output),
        threshold=model_info.threshold,
        source="THERMAL",
        class_names=model_info.classNames,
        image_context=image_context,
    )
    return detections, [], [None] * len(detections), None


def detections_to_defects(
    detections: list[ParsedDetection],
    *,
    area_ratios: list[Decimal | None] | None = None,
) -> list[DetectedDefectDraft]:
    defects: list[DetectedDefectDraft] = []
    normalized_area_ratios = area_ratios or []
    for index, detection in enumerate(detections):
        defect_type = _resolve_defect_type(detection.class_name)
        logger.info(
            "Defect type normalized. source=%s, classId=%s, rawClassName=%s, storedDefectType=%s",
            detection.source,
            detection.class_id,
            detection.class_name,
            defect_type,
        )
        defects.append(
            DetectedDefectDraft(
                defectType=defect_type,
                defectSource=detection.source,
                confidence=detection.confidence,
                areaRatio=normalized_area_ratios[index] if index < len(normalized_area_ratios) else None,
                bboxX=int(round(detection.bbox_x)),
                bboxY=int(round(detection.bbox_y)),
                bboxWidth=int(round(detection.bbox_width)),
                bboxHeight=int(round(detection.bbox_height)),
                severityScore=None,
                actionCandidate=_resolve_defect_action_candidate(defect_type),
                modelClassId=detection.model_class_id,
                modelClassName=detection.model_class_name,
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


def _parse_detection_rows(
    rows: list[Any],
    threshold: Decimal,
    source: str,
    class_names: list[str],
    image_context: Any | None,
) -> list[ParsedDetection]:
    detections: list[ParsedDetection] = []
    for row in rows:
        values = _to_sequence(row)
        if len(values) < 6:
            continue

        detection = _parse_detection(
            values,
            threshold=threshold,
            source=source,
            class_names=class_names,
            image_context=image_context,
        )
        if detection is not None:
            detections.append(detection)
    return detections


def _parse_rgb_outputs(
    output0: Any,
    output1: Any,
    threshold: Decimal,
    nms_iou_threshold: Decimal | None,
    mask_threshold: Decimal | None,
    input_size: int,
    class_names: list[str],
    image_context: Any | None,
) -> tuple[list[ParsedDetection], list[RestoredMask], list[Decimal | None], Decimal]:
    prototypes = _extract_mask_prototypes(output1)
    if prototypes is None:
        raise ValueError("RGB output1 prototype tensor shape is invalid.")

    rows = _flatten_rows(output0)
    expected_row_size = 6 + int(prototypes.shape[0])
    candidates: list[_RgbDetectionCandidate] = []

    for row in rows:
        values = _to_sequence(row)
        if len(values) != expected_row_size:
            raise ValueError(
                f"RGB output0 row shape is invalid. Expected {expected_row_size} values, got {len(values)}."
            )

        detection = _parse_detection(
            values,
            threshold=threshold,
            source="RGB",
            class_names=class_names,
            image_context=image_context,
        )
        if detection is None:
            continue

        candidates.append(
            _RgbDetectionCandidate(
                detection=detection,
                coefficients=[float(value) for value in values[6:]],
            )
        )

    if not candidates:
        return [], [], [], Decimal("0.0")

    kept_candidates = _apply_class_aware_nms(candidates, nms_iou_threshold)
    restored_masks: list[RestoredMask] = []
    detections: list[ParsedDetection] = []
    area_ratios: list[Decimal | None] = []

    for candidate in kept_candidates:
        restored_mask = _restore_mask(
            coefficients=candidate.coefficients,
            prototypes=prototypes,
            detection=candidate.detection,
            input_size=input_size,
            image_context=image_context,
            mask_threshold=mask_threshold or Decimal("0.5"),
        )
        if restored_mask is None:
            continue

        finalized = _finalize_rgb_detection(candidate.detection, restored_mask)
        if finalized is None:
            continue

        finalized_detection, finalized_mask = finalized
        detections.append(finalized_detection)
        restored_masks.append(finalized_mask)
        area_ratios.append(_compute_area_ratio(finalized_mask))

    return detections, restored_masks, area_ratios, _compute_union_area_ratio(restored_masks)


def _parse_detection(
    values: list[Any],
    threshold: Decimal,
    source: str,
    class_names: list[str],
    image_context: Any | None,
) -> ParsedDetection | None:
    confidence = _to_decimal(values[4])
    if confidence is None or confidence < threshold:
        return None

    x1 = float(values[0])
    y1 = float(values[1])
    x2 = float(values[2])
    y2 = float(values[3])
    if image_context is not None:
        x1, y1, x2, y2 = _restore_bbox_to_original(x1, y1, x2, y2, image_context)

    x1, x2 = sorted((x1, x2))
    y1, y2 = sorted((y1, y2))
    width = x2 - x1
    height = y2 - y1
    if width <= 0 or height <= 0:
        return None

    class_id = _safe_int(values[5])
    model_class_id = None
    model_class_name = None
    class_name = _resolve_raw_class_name(class_id, class_names)
    if source == "RGB":
        model_class_id, model_class_name = _resolve_rgb_model_class(class_id, class_names)
        class_name = model_class_name

    return ParsedDetection(
        class_id=class_id,
        class_name=class_name,
        confidence=confidence,
        bbox_x=x1,
        bbox_y=y1,
        bbox_width=width,
        bbox_height=height,
        source=source,
        model_class_id=model_class_id,
        model_class_name=model_class_name,
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


def _apply_class_aware_nms(
    candidates: list[_RgbDetectionCandidate],
    iou_threshold: Decimal | None,
) -> list[_RgbDetectionCandidate]:
    if iou_threshold is None:
        return candidates

    grouped_candidates: dict[int, list[_RgbDetectionCandidate]] = {}
    for candidate in candidates:
        grouped_candidates.setdefault(candidate.detection.class_id, []).append(candidate)

    kept_candidates: list[_RgbDetectionCandidate] = []
    threshold = float(iou_threshold)

    for class_candidates in grouped_candidates.values():
        remaining = sorted(
            class_candidates,
            key=lambda item: float(item.detection.confidence),
            reverse=True,
        )
        while remaining:
            current = remaining.pop(0)
            kept_candidates.append(current)
            remaining = [
                candidate
                for candidate in remaining
                if _bbox_iou(current.detection, candidate.detection) <= threshold
            ]

    return sorted(kept_candidates, key=lambda item: float(item.detection.confidence), reverse=True)


def _bbox_iou(left: ParsedDetection, right: ParsedDetection) -> float:
    left_x1 = left.bbox_x
    left_y1 = left.bbox_y
    left_x2 = left.bbox_x + left.bbox_width
    left_y2 = left.bbox_y + left.bbox_height
    right_x1 = right.bbox_x
    right_y1 = right.bbox_y
    right_x2 = right.bbox_x + right.bbox_width
    right_y2 = right.bbox_y + right.bbox_height

    intersection_x1 = max(left_x1, right_x1)
    intersection_y1 = max(left_y1, right_y1)
    intersection_x2 = min(left_x2, right_x2)
    intersection_y2 = min(left_y2, right_y2)

    intersection_width = max(0.0, intersection_x2 - intersection_x1)
    intersection_height = max(0.0, intersection_y2 - intersection_y1)
    intersection_area = intersection_width * intersection_height
    if intersection_area <= 0.0:
        return 0.0

    left_area = left.bbox_width * left.bbox_height
    right_area = right.bbox_width * right.bbox_height
    union_area = left_area + right_area - intersection_area
    if union_area <= 0.0:
        return 0.0
    return intersection_area / union_area


def _restore_mask(
    coefficients: list[float],
    prototypes: Any,
    detection: ParsedDetection,
    input_size: int,
    image_context: Any | None,
    mask_threshold: Decimal,
) -> RestoredMask | None:
    try:
        import numpy as np
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("numpy is required to restore RGB instance masks.") from exc

    logits = np.tensordot(np.asarray(coefficients, dtype="float32"), prototypes, axes=(0, 0))
    probabilities = 1.0 / (1.0 + np.exp(-logits))
    binary_mask = probabilities >= float(mask_threshold)

    if not bool(binary_mask.any()):
        return None

    mask_height, mask_width = binary_mask.shape
    x1, y1, x2, y2 = _project_bbox_to_mask(
        detection,
        mask_width=mask_width,
        mask_height=mask_height,
        input_size=input_size,
        image_context=image_context,
    )
    if x2 <= x1 or y2 <= y1:
        return None

    cropped_mask = np.zeros_like(binary_mask, dtype="uint8")
    cropped_mask[y1:y2, x1:x2] = binary_mask[y1:y2, x1:x2].astype("uint8")
    restored_mask = _restore_letterboxed_mask_to_original(
        cropped_mask,
        input_size=input_size,
        image_context=image_context,
    )
    if restored_mask is None or not bool(restored_mask.any()):
        return None

    return RestoredMask(
        bboxX=detection.bbox_x,
        bboxY=detection.bbox_y,
        bboxWidth=detection.bbox_width,
        bboxHeight=detection.bbox_height,
        classId=detection.class_id,
        className=detection.class_name,
        confidence=float(detection.confidence),
        data=restored_mask.tolist(),
    )


def _finalize_rgb_detection(
    detection: ParsedDetection,
    restored_mask: RestoredMask,
) -> tuple[ParsedDetection, RestoredMask] | None:
    mask_bbox = _compute_mask_bbox(restored_mask.data)
    if mask_bbox is None:
        return None

    bbox_x, bbox_y, bbox_width, bbox_height = mask_bbox
    return (
        ParsedDetection(
            class_id=detection.class_id,
            class_name=detection.class_name,
            confidence=detection.confidence,
            bbox_x=bbox_x,
            bbox_y=bbox_y,
            bbox_width=bbox_width,
            bbox_height=bbox_height,
            source=detection.source,
            model_class_id=detection.model_class_id,
            model_class_name=detection.model_class_name,
        ),
        RestoredMask(
            bboxX=bbox_x,
            bboxY=bbox_y,
            bboxWidth=bbox_width,
            bboxHeight=bbox_height,
            classId=detection.class_id,
            className=detection.class_name,
            confidence=float(detection.confidence),
            data=restored_mask.data,
        ),
    )


def _compute_mask_bbox(mask_data: list[list[int]]) -> tuple[float, float, float, float] | None:
    try:
        import numpy as np
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("numpy is required to calculate RGB mask bounding boxes.") from exc

    mask = np.asarray(mask_data, dtype="uint8")
    if mask.ndim != 2 or mask.size == 0:
        return None

    foreground = np.argwhere(mask > 0)
    if foreground.size == 0:
        return None

    min_y, min_x = foreground.min(axis=0).tolist()
    max_y, max_x = foreground.max(axis=0).tolist()
    image_height, image_width = mask.shape
    x1 = max(0, min(image_width - 1, int(min_x)))
    y1 = max(0, min(image_height - 1, int(min_y)))
    x2 = max(x1 + 1, min(image_width, int(max_x) + 1))
    y2 = max(y1 + 1, min(image_height, int(max_y) + 1))
    return float(x1), float(y1), float(x2 - x1), float(y2 - y1)


def _project_bbox_to_mask(
    detection: ParsedDetection,
    mask_width: int,
    mask_height: int,
    input_size: int,
    image_context: Any | None,
) -> tuple[int, int, int, int]:
    scale_x = float(getattr(image_context, "scaleX", 1.0) or 1.0)
    scale_y = float(getattr(image_context, "scaleY", 1.0) or 1.0)
    pad_x = float(getattr(image_context, "padX", 0.0))
    pad_y = float(getattr(image_context, "padY", 0.0))

    input_x1 = detection.bbox_x * scale_x + pad_x
    input_y1 = detection.bbox_y * scale_y + pad_y
    input_x2 = (detection.bbox_x + detection.bbox_width) * scale_x + pad_x
    input_y2 = (detection.bbox_y + detection.bbox_height) * scale_y + pad_y

    left = max(0, min(mask_width, int(input_x1 * mask_width / float(input_size))))
    top = max(0, min(mask_height, int(input_y1 * mask_height / float(input_size))))
    right = max(0, min(mask_width, int(input_x2 * mask_width / float(input_size))))
    bottom = max(0, min(mask_height, int(input_y2 * mask_height / float(input_size))))
    return left, top, right, bottom


def _restore_letterboxed_mask_to_original(
    mask: Any,
    input_size: int,
    image_context: Any | None,
) -> Any | None:
    try:
        import numpy as np
        from PIL import Image
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("Pillow and numpy are required to restore RGB instance masks.") from exc

    original_width = int(getattr(image_context, "originalWidth", input_size))
    original_height = int(getattr(image_context, "originalHeight", input_size))
    resized_width = int(getattr(image_context, "resizedWidth", input_size))
    resized_height = int(getattr(image_context, "resizedHeight", input_size))
    pad_x = int(getattr(image_context, "padX", 0))
    pad_y = int(getattr(image_context, "padY", 0))

    if original_width <= 0 or original_height <= 0:
        return None

    mask_height, mask_width = mask.shape
    crop_left = max(0, min(mask_width, int(pad_x * mask_width / float(input_size))))
    crop_top = max(0, min(mask_height, int(pad_y * mask_height / float(input_size))))
    crop_right = max(0, min(mask_width, int((pad_x + resized_width) * mask_width / float(input_size))))
    crop_bottom = max(0, min(mask_height, int((pad_y + resized_height) * mask_height / float(input_size))))
    if crop_right <= crop_left or crop_bottom <= crop_top:
        return None

    cropped = mask[crop_top:crop_bottom, crop_left:crop_right].astype("uint8") * 255
    restored = np.asarray(
        Image.fromarray(cropped, mode="L").resize((original_width, original_height), resample=Image.NEAREST),
        dtype="uint8",
    )
    return (restored > 0).astype("uint8")


def _compute_area_ratio(restored_mask: RestoredMask) -> Decimal | None:
    try:
        import numpy as np
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("numpy is required to calculate RGB area ratios.") from exc

    mask = np.asarray(restored_mask.data, dtype="uint8")
    if mask.ndim != 2 or mask.size == 0:
        return None

    total_pixels = int(mask.shape[0] * mask.shape[1])
    if total_pixels <= 0:
        return None

    foreground_pixels = int(mask.sum())
    ratio = foreground_pixels / float(total_pixels)
    return Decimal(str(max(0.0, min(1.0, ratio))))


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


def _compute_union_area_ratio(restored_masks: list[RestoredMask]) -> Decimal:
    try:
        import numpy as np
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("numpy is required to calculate RGB union area ratios.") from exc

    if not restored_masks:
        return Decimal("0.0")

    union_mask = None
    total_pixels = 0
    for restored_mask in restored_masks:
        mask = np.asarray(restored_mask.data, dtype="uint8")
        if mask.ndim != 2 or mask.size == 0:
            continue

        if union_mask is None:
            union_mask = mask.astype(bool)
            total_pixels = int(mask.shape[0] * mask.shape[1])
            continue

        if mask.shape != union_mask.shape:
            raise ValueError("RGB restored masks must share the same original image size.")
        union_mask = np.logical_or(union_mask, mask.astype(bool))

    if union_mask is None or total_pixels <= 0:
        return Decimal("0.0")

    foreground_pixels = int(union_mask.sum())
    ratio = foreground_pixels / float(total_pixels)
    return Decimal(str(max(0.0, min(1.0, ratio))))


def _resolve_raw_class_name(class_id: int, class_names: list[str]) -> str | None:
    if class_id < 0 or class_id >= len(class_names):
        return None
    raw_value = class_names[class_id].strip()
    return raw_value or None


def _resolve_rgb_model_class(class_id: int, class_names: list[str]) -> tuple[int, str]:
    class_name = _resolve_raw_class_name(class_id, class_names)
    if class_id < 0 or class_name is None:
        raise ValueError(
            f"RGB detection class index {class_id} is not valid for manifest class_names size {len(class_names)}."
        )
    return class_id, class_name


def _resolve_defect_type(raw_value: str | None) -> str:
    if raw_value is None:
        return "UNKNOWN"

    normalized = raw_value.strip()
    if normalized in DEFECT_TYPE_ALIASES:
        return DEFECT_TYPE_ALIASES[normalized]
    if normalized in ALLOWED_DEFECT_TYPES:
        return normalized

    uppercase = normalized.upper()
    if uppercase in ALLOWED_DEFECT_TYPES:
        return uppercase

    lowercase = normalized.lower()
    if lowercase in LOWERCASE_DEFECT_TYPE_ALIASES:
        return LOWERCASE_DEFECT_TYPE_ALIASES[lowercase]

    return "UNKNOWN"


def _normalize_structured_defects(raw_defects: Any) -> list[DetectedDefectDraft]:
    normalized: list[DetectedDefectDraft] = []
    for raw_defect in list(raw_defects or []):
        if isinstance(raw_defect, DetectedDefectDraft):
            normalized.append(
                raw_defect.model_copy(update={"defectType": _resolve_defect_type(raw_defect.defectType)})
            )
            continue

        if not isinstance(raw_defect, dict):
            continue

        normalized.append(
            DetectedDefectDraft(
                defectType=_resolve_defect_type(raw_defect.get("defectType")),
                defectSource=str(raw_defect.get("defectSource", "UNKNOWN")),
                confidence=_to_decimal(raw_defect.get("confidence")),
                areaRatio=_to_decimal(raw_defect.get("areaRatio")),
                bboxX=int(raw_defect.get("bboxX", 0)),
                bboxY=int(raw_defect.get("bboxY", 0)),
                bboxWidth=int(raw_defect.get("bboxWidth", 0)),
                bboxHeight=int(raw_defect.get("bboxHeight", 0)),
                maskBucketName=raw_defect.get("maskBucketName"),
                maskObjectKey=raw_defect.get("maskObjectKey"),
                maskFileUrl=raw_defect.get("maskFileUrl"),
                severityScore=_to_decimal(raw_defect.get("severityScore")),
                actionCandidate=ActionCandidate(
                    raw_defect.get(
                        "actionCandidate",
                        _resolve_defect_action_candidate(
                            _resolve_defect_type(raw_defect.get("defectType"))
                        ).value,
                    )
                ),
                modelClassId=_safe_optional_int(raw_defect.get("modelClassId")),
                modelClassName=_normalize_optional_string(raw_defect.get("modelClassName")),
            )
        )
    return normalized


def _safe_optional_int(value: Any) -> int | None:
    if value is None:
        return None
    result = _safe_int(value)
    return None if result < 0 else result


def _normalize_optional_string(value: Any) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def _resolve_defect_action_candidate(defect_type: str) -> ActionCandidate:
    if defect_type in FIELD_INSPECTION_DEFECT_TYPES:
        return ActionCandidate.FIELD_INSPECTION
    return ActionCandidate.CLEANING


def _resolve_result_action_candidate(defects: list[DetectedDefectDraft]) -> ActionCandidate:
    if any(defect.actionCandidate == ActionCandidate.FIELD_INSPECTION for defect in defects):
        return ActionCandidate.FIELD_INSPECTION
    return ActionCandidate.CLEANING


def _restore_bbox_to_original(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    image_context: Any,
) -> tuple[float, float, float, float]:
    scale_x = getattr(image_context, "scaleX", None)
    scale_y = getattr(image_context, "scaleY", None)
    pad_x = float(getattr(image_context, "padX", 0))
    pad_y = float(getattr(image_context, "padY", 0))
    original_width = float(getattr(image_context, "originalWidth", 0))
    original_height = float(getattr(image_context, "originalHeight", 0))
    resized_width = float(getattr(image_context, "resizedWidth", 0))
    resized_height = float(getattr(image_context, "resizedHeight", 0))
    if not scale_x or not scale_y:
        return x1, y1, x2, y2

    restored_x1 = (x1 - pad_x) / float(scale_x)
    restored_y1 = (y1 - pad_y) / float(scale_y)
    restored_x2 = (x2 - pad_x) / float(scale_x)
    restored_y2 = (y2 - pad_y) / float(scale_y)

    if resized_width > 0:
        restored_x1 = max(0.0, min(original_width, restored_x1))
        restored_x2 = max(0.0, min(original_width, restored_x2))
    if resized_height > 0:
        restored_y1 = max(0.0, min(original_height, restored_y1))
        restored_y2 = max(0.0, min(original_height, restored_y2))
    return restored_x1, restored_y1, restored_x2, restored_y2
