from contextlib import asynccontextmanager
from typing import Callable

from fastapi import FastAPI

from app.api.health import router as health_router
from app.config.settings import Settings, get_settings
from app.runtime import WorkerRuntime, create_worker_runtime


def create_app(
    settings: Settings | None = None,
    worker_runtime_factory: Callable[[Settings], WorkerRuntime] = create_worker_runtime,
) -> FastAPI:
    resolved_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        runtime = None
        if resolved_settings.workerEnabled:
            runtime = worker_runtime_factory(resolved_settings)
            app.state.worker_runtime = runtime
            await runtime.start()
        try:
            yield
        finally:
            if runtime is not None:
                await runtime.stop()

    app = FastAPI(title=resolved_settings.appName, lifespan=lifespan)
    app.state.worker_enabled = resolved_settings.workerEnabled
    app.state.worker_runtime = None
    app.include_router(health_router)
    return app


app = create_app()
