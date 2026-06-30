from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import ModelType, RequestedModelType


class ModelInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    modelPath: str
    modelType: ModelType
    requestedModelType: RequestedModelType
    modelName: str
    modelVersion: str
    modelFormat: str
    runtime: str
    inputSize: int
    threshold: Decimal
    classNames: list[str] = Field(default_factory=list)
