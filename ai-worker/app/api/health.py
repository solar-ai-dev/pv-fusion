from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
def health(request: Request) -> dict[str, str]:
    return {
        "status": "ok",
        "service": request.app.title,
    }


@router.get("/internal/health")
def internal_health(request: Request) -> dict[str, str]:
    runtime = getattr(request.app.state, "worker_runtime", None)
    worker_status = "disabled" if not request.app.state.worker_enabled else "stopped"
    if runtime is not None:
        worker_status = runtime.status

    return {
        "status": "ok",
        "service": request.app.title,
        "worker": worker_status,
    }
