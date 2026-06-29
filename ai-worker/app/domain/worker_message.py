from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.domain.enums import InputType, RequestedModelType


class WorkerMessage(BaseModel):
    # Backend 3단계의 임시 호환 필드(imagePairId=null)는 무시한다.
    model_config = ConfigDict(extra="ignore")

    jobId: int
    inputType: InputType
    imageId: int
    requestedModelType: RequestedModelType
    requestedByUserId: int
    traceId: str
    createdAt: datetime

    @field_validator("jobId", "requestedByUserId", "imageId")
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
        allowed_pairs = {
            InputType.RGB_SINGLE: RequestedModelType.RGB_ONLY,
            InputType.THERMAL_SINGLE: RequestedModelType.THERMAL_ONLY,
        }
        expected_model_type = allowed_pairs.get(self.inputType)
        if expected_model_type is None:
            raise ValueError("unsupported inputType")
        if self.requestedModelType is not expected_model_type:
            raise ValueError("inputType and requestedModelType do not match")
        return self
