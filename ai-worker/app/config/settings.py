from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AI_WORKER_", extra="ignore")

    appName: str = "ai-worker"
    environment: str = "local"
    workerEnabled: bool = True
    workerPollIntervalSeconds: int = 5
    workerMaxMessages: int = 1


@lru_cache
def get_settings() -> Settings:
    return Settings()
