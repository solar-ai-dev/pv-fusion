from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.domain.enums import ActionCandidate, ModelType, ResultStatus


class AnalysisResultDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    analysisJobId: int
    modelType: ModelType
    modelName: str
    modelVersion: str
    modelFormat: str
    runtime: str
    inputSize: int
    threshold: Decimal
    resultStatus: ResultStatus
    anomalyCount: int
    maxConfidence: Decimal | None = None
    areaRatio: Decimal | None = None
    severityScore: Decimal | None = None
    actionCandidate: ActionCandidate
    bboxBucketName: str | None = None
    bboxObjectKey: str | None = None
    bboxFileUrl: str | None = None
    heatmapBucketName: str | None = None
    heatmapObjectKey: str | None = None
    heatmapFileUrl: str | None = None
    maskBucketName: str | None = None
    maskObjectKey: str | None = None
    maskFileUrl: str | None = None
    analyzedAt: datetime
