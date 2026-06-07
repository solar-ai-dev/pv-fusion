from pydantic import BaseModel, ConfigDict


class SingleImageInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    imageId: int
    imageType: str
    bucketName: str
    objectKey: str
    fileUrl: str | None = None
    targetType: str
    equipmentId: int | None = None


class PairedImageInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    imagePairId: int
    targetType: str
    equipmentId: int | None = None
    rgbImage: SingleImageInput
    thermalImage: SingleImageInput
