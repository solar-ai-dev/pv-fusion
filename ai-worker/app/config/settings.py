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
    environment: str = Field(
        default="local",
        validation_alias=AliasChoices("environment", "APP_ENV", "ENVIRONMENT"),
    )
    workerEnabled: bool = True
    workerPollIntervalSeconds: int = DEFAULT_SQS_WAIT_TIME_SECONDS
    workerMaxMessages: int = 1
    databaseUrl: str = Field(default="", validation_alias=AliasChoices("databaseUrl", "DATABASE_URI", "DATABASE_URL"))
    awsRegion: str = Field(default="ap-northeast-2", validation_alias=AliasChoices("awsRegion", "AWS_REGION"))
    sqsQueueUrl: str = Field(default="", validation_alias=AliasChoices("sqsQueueUrl", "SQS_QUEUE_URL"))
    sqsEndpointUrl: str | None = Field(
        default=None,
        validation_alias=AliasChoices("sqsEndpointUrl", "SQS_ENDPOINT_URL", "SQS_ENDPOINT"),
    )
    sqsAccessKey: str | None = Field(
        default=None,
        validation_alias=AliasChoices("sqsAccessKey", "SQS_ACCESS_KEY", "AWS_ACCESS_KEY_ID"),
    )
    sqsSecretKey: str | None = Field(
        default=None,
        validation_alias=AliasChoices("sqsSecretKey", "SQS_SECRET_KEY", "AWS_SECRET_ACCESS_KEY"),
    )
    sqsWaitTimeSeconds: int = Field(default=DEFAULT_SQS_WAIT_TIME_SECONDS, validation_alias=AliasChoices("sqsWaitTimeSeconds", "SQS_WAIT_TIME_SECONDS"))
    sqsVisibilityTimeoutSeconds: int | None = Field(default=None, validation_alias=AliasChoices("sqsVisibilityTimeoutSeconds", "SQS_VISIBILITY_TIMEOUT_SECONDS"))
    storageEndpointUrl: str | None = Field(
        default=None,
        validation_alias=AliasChoices("storageEndpointUrl", "STORAGE_ENDPOINT_URL", "STORAGE_ENDPOINT", "S3_ENDPOINT"),
    )
    storageRegion: str | None = Field(
        default=None,
        validation_alias=AliasChoices("storageRegion", "STORAGE_REGION", "S3_REGION"),
    )
    storageAccessKey: str | None = Field(
        default=None,
        validation_alias=AliasChoices("storageAccessKey", "STORAGE_ACCESS_KEY", "AWS_ACCESS_KEY_ID"),
    )
    storageSecretKey: str | None = Field(
        default=None,
        validation_alias=AliasChoices("storageSecretKey", "STORAGE_SECRET_KEY", "AWS_SECRET_ACCESS_KEY"),
    )
    storageDefaultBucket: str | None = Field(
        default=None,
        validation_alias=AliasChoices("storageDefaultBucket", "STORAGE_DEFAULT_BUCKET", "S3_BUCKET_NAME"),
    )
    storagePathStyleEnabled: bool = Field(
        default=False,
        validation_alias=AliasChoices("storagePathStyleEnabled", "STORAGE_PATH_STYLE_ENABLED", "S3_PATH_STYLE_ACCESS_ENABLED"),
    )
    rgbModelManifestPath: str = Field(
        default="models/rgb/model-manifest.dev.yaml",
        validation_alias=AliasChoices("rgbModelManifestPath", "RGB_MODEL_MANIFEST_PATH"),
    )
    thermalModelManifestPath: str = Field(
        default="models/thermal/model-manifest.yaml",
        validation_alias=AliasChoices("thermalModelManifestPath", "THERMAL_MODEL_MANIFEST_PATH"),
    )

    @field_validator("environment", mode="after")
    @classmethod
    def validate_environment(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"local", "prod"}:
            raise ValueError("APP_ENV must be either 'local' or 'prod'.")
        return normalized

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

    def validate_worker_runtime_contract(self) -> None:
        missing = []

        for field_name, env_name in (
            ("databaseUrl", "DATABASE_URI"),
            ("sqsQueueUrl", "SQS_QUEUE_URL"),
            ("storageDefaultBucket", "STORAGE_DEFAULT_BUCKET"),
        ):
            if not str(getattr(self, field_name) or "").strip():
                missing.append(env_name)

        if self.environment == "local":
            for field_name, env_name in (
                ("sqsEndpointUrl", "SQS_ENDPOINT_URL"),
                ("sqsAccessKey", "SQS_ACCESS_KEY"),
                ("sqsSecretKey", "SQS_SECRET_KEY"),
                ("storageEndpointUrl", "STORAGE_ENDPOINT_URL"),
                ("storageAccessKey", "STORAGE_ACCESS_KEY"),
                ("storageSecretKey", "STORAGE_SECRET_KEY"),
            ):
                if not str(getattr(self, field_name) or "").strip():
                    missing.append(env_name)

        if missing:
            missing_values = ", ".join(sorted(set(missing)))
            raise ValueError(f"Missing required AI Worker settings: {missing_values}")


@lru_cache
def get_settings() -> Settings:
    return Settings()
