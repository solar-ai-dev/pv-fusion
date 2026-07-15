from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.domain.detected_defect import DetectedDefectDraft
from app.domain.enums import ActionCandidate, ResultStatus
from app.domain.model import ModelInfo


class VisualizationPaths(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bboxObjectKey: str | None = None
    heatmapObjectKey: str | None = None
    maskObjectKey: str | None = None


class RestoredMask(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bboxX: float
    bboxY: float
    bboxWidth: float
    bboxHeight: float
    classId: int | None = None
    className: str | None = None
    confidence: float | None = None
    data: list[list[int]]


class InferenceResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    modelInfo: ModelInfo
    resultStatus: ResultStatus
    anomalyCount: int
    maxConfidence: Decimal | None = None
    areaRatio: Decimal | None = None
    severityScore: Decimal | None = None
    actionCandidate: ActionCandidate
    defects: list[DetectedDefectDraft]
    visualizationPaths: VisualizationPaths = VisualizationPaths()
    restoredMasks: list[RestoredMask] = []
