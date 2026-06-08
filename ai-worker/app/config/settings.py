from functools import lru_cache
from typing import ClassVar

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DEFAULT_SQS_WAIT_TIME_SECONDS: ClassVar[int] = 5

    model_config = SettingsConfigDict(
        env_file=(".env.local", ".env"),
        env_file_encoding="utf-8",
        env_prefix="AI_WORKER_",
        extra="ignore",
        populate_by_name=True,
    )

    appName: str = "ai-worker"
    environment: str = "local"
    workerEnabled: bool = True
    workerPollIntervalSeconds: int = DEFAULT_SQS_WAIT_TIME_SECONDS
    workerMaxMessages: int = 1
    databaseUrl: str = Field(default="", validation_alias=AliasChoices("databaseUrl", "DATABASE_URI", "DATABASE_URL"))
    awsRegion: str = Field(default="ap-northeast-2", validation_alias=AliasChoices("awsRegion", "AWS_REGION"))
    sqsQueueUrl: str = Field(default="", validation_alias=AliasChoices("sqsQueueUrl", "SQS_QUEUE_URL"))
    sqsEndpointUrl: str | None = Field(default=None, validation_alias=AliasChoices("sqsEndpointUrl", "SQS_ENDPOINT_URL"))
    sqsWaitTimeSeconds: int = Field(default=DEFAULT_SQS_WAIT_TIME_SECONDS, validation_alias=AliasChoices("sqsWaitTimeSeconds", "SQS_WAIT_TIME_SECONDS"))
    sqsVisibilityTimeoutSeconds: int | None = Field(default=None, validation_alias=AliasChoices("sqsVisibilityTimeoutSeconds", "SQS_VISIBILITY_TIMEOUT_SECONDS"))
    storageEndpointUrl: str | None = Field(default=None, validation_alias=AliasChoices("storageEndpointUrl", "STORAGE_ENDPOINT_URL"))
    storageRegion: str | None = Field(default=None, validation_alias=AliasChoices("storageRegion", "STORAGE_REGION"))
    storageAccessKey: str | None = Field(default=None, validation_alias=AliasChoices("storageAccessKey", "STORAGE_ACCESS_KEY"))
    storageSecretKey: str | None = Field(default=None, validation_alias=AliasChoices("storageSecretKey", "STORAGE_SECRET_KEY"))
    storageDefaultBucket: str | None = Field(default=None, validation_alias=AliasChoices("storageDefaultBucket", "STORAGE_DEFAULT_BUCKET"))
    rgbModelManifestPath: str = Field(
        default="models/rgb/model-manifest.dev.yaml",
        validation_alias=AliasChoices("rgbModelManifestPath", "RGB_MODEL_MANIFEST_PATH"),
    )
    thermalModelManifestPath: str = Field(
        default="models/thermal/model-manifest.dev.yaml",
        validation_alias=AliasChoices("thermalModelManifestPath", "THERMAL_MODEL_MANIFEST_PATH"),
    )

    @field_validator("sqsWaitTimeSeconds", mode="before")
    @classmethod
    def default_wait_time(cls, value: object) -> object:
        if value in ("", None):
            return cls.DEFAULT_SQS_WAIT_TIME_SECONDS
        return value

    @field_validator("sqsVisibilityTimeoutSeconds", mode="before")
    @classmethod
    def empty_visibility_timeout_to_none(cls, value: object) -> object:
        if value == "":
            return None
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
