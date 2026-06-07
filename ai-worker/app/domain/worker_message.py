from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.domain.enums import InputType, RequestedModelType


class WorkerMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    jobId: int
    inputType: InputType
    imageId: int | None = None
    imagePairId: int | None = None
    requestedModelType: RequestedModelType
    requestedByUserId: int
    traceId: str
    createdAt: datetime

    @field_validator("jobId", "requestedByUserId")
    @classmethod
    def validate_positive_int(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("must be a positive integer")
        return value

    @field_validator("traceId")
    @classmethod
    def validate_trace_id(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("traceId must not be blank")
        return value

    @model_validator(mode="after")
    def validate_target_fields(self) -> "WorkerMessage":
        if self.inputType in {InputType.RGB_SINGLE, InputType.THERMAL_SINGLE}:
            if self.imageId is None or self.imagePairId is not None:
                raise ValueError("single-image input requires imageId and imagePairId must be null")
        if self.inputType is InputType.RGB_THERMAL_PAIR:
            if self.imageId is not None or self.imagePairId is None:
                raise ValueError("pair input requires imagePairId and imageId must be null")
        return self
