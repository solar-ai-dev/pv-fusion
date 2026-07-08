from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.domain.enums import InputType, JobStatus, ModelType, RequestedModelType


class AnalysisJob(BaseModel):
    model_config = ConfigDict(extra="forbid")

    jobId: int
    inputType: InputType
    imageId: int
    requestedModelType: RequestedModelType
    modelType: ModelType | None = None
    jobStatus: JobStatus
    requestedByUserId: int
    traceId: str | None = None
    failureCode: str | None = None
    failureMessage: str | None = None
    startedAt: datetime | None = None
    updatedAt: datetime | None = None
