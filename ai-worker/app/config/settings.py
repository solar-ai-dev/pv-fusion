from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="AI_WORKER_",
        extra="ignore",
        populate_by_name=True,
    )

    appName: str = "ai-worker"
    environment: str = "local"
    workerEnabled: bool = True
    workerPollIntervalSeconds: int = 5
    workerMaxMessages: int = 1
    databaseUrl: str = Field(default="", validation_alias="DATABASE_URL")
    awsRegion: str = Field(default="ap-northeast-2", validation_alias="AWS_REGION")
    sqsQueueUrl: str = Field(default="", validation_alias="SQS_QUEUE_URL")
    sqsEndpointUrl: str | None = Field(default=None, validation_alias="SQS_ENDPOINT_URL")
    sqsWaitTimeSeconds: int = Field(default=5, validation_alias="SQS_WAIT_TIME_SECONDS")
    sqsVisibilityTimeoutSeconds: int | None = Field(default=None, validation_alias="SQS_VISIBILITY_TIMEOUT_SECONDS")


@lru_cache
def get_settings() -> Settings:
    return Settings()
