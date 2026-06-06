from collections.abc import Callable
from typing import Any

from app.config.settings import Settings


def create_connection_factory(settings: Settings) -> Callable[[], Any]:
    def factory() -> Any:
        database_url = settings.databaseUrl.strip()
        if not database_url:
            raise ValueError("Database URL is not configured.")

        try:
            import psycopg
        except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
            raise ModuleNotFoundError("psycopg is required to create a PostgreSQL connection.") from exc

        return psycopg.connect(database_url)

    return factory
