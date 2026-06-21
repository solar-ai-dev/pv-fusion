from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/health")
def health(request: Request) -> dict[str, str]:
    return {
        "status": "ok",
        "service": request.app.title,
    }


@router.get("/internal/health")
def internal_health(request: Request) -> JSONResponse:
    runtime = getattr(request.app.state, "worker_runtime", None)
    worker_status = "disabled" if not request.app.state.worker_enabled else "stopped"
    if runtime is not None:
        worker_status = runtime.status

    ready = worker_status in {"disabled", "running"}
    return JSONResponse(
        status_code=200 if ready else 503,
        content={
            "status": "ok" if ready else "not_ready",
            "service": request.app.title,
            "worker": worker_status,
        },
    )
