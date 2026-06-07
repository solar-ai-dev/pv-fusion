from decimal import Decimal
from typing import Any

from app.domain.enums import ActionCandidate, ResultStatus
from app.domain.inference_result import InferenceResult, VisualizationPaths
from app.domain.model import ModelInfo


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
        result_status = ResultStatus.NORMAL
        anomaly_count = 0
        max_confidence = None
        area_ratio = None
        severity_score = None
        action_candidate = ActionCandidate.CLEANING
        defects = []
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


def _to_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))
