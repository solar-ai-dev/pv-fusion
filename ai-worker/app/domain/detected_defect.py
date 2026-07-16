from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.domain.enums import ActionCandidate


class DetectedDefectDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    defectType: str
    defectSource: str
    confidence: Decimal | None = None
    areaRatio: Decimal | None = None
    bboxX: int | None = None
    bboxY: int | None = None
    bboxWidth: int | None = None
    bboxHeight: int | None = None
    maskBucketName: str | None = None
    maskObjectKey: str | None = None
    maskFileUrl: str | None = None
    severityScore: Decimal | None = None
    actionCandidate: ActionCandidate
    modelClassId: int | None = None
    modelClassName: str | None = None
