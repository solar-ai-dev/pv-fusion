from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from app.domain.detected_defect import DetectedDefectDraft
from app.domain.enums import ActionCandidate, ResultStatus
from app.domain.inference_result import InferenceResult, VisualizationPaths
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
        detections = extract_detections(raw_output, model_info)
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
    )


def extract_detections(raw_output: Any, model_info: ModelInfo) -> list[ParsedDetection]:
    if _looks_like_rgb_outputs(raw_output):
        return _parse_detection_rows(
            rows=_flatten_rows(raw_output[0]),
            threshold=model_info.threshold,
            source="RGB",
        )
    return _parse_detection_rows(
        rows=_flatten_rows(raw_output),
        threshold=model_info.threshold,
        source="THERMAL",
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
