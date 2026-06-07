from fastapi import APIRouter

from app.config.settings import get_settings

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.appName,
    }


@router.get("/internal/health")
def internal_health() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.appName,
        "worker": "ready" if settings.workerEnabled else "disabled",
    }
