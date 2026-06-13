import importlib

from fastapi.testclient import TestClient

from app.config.settings import Settings
from app.main import create_app


class FakeRuntime:
    def __init__(self, status: str = "stopped") -> None:
        self.status = status
        self.start_calls = 0
        self.stop_calls = 0

    async def start(self) -> bool:
        self.start_calls += 1
        self.status = "running"
        return True

    async def stop(self) -> bool:
        self.stop_calls += 1
        self.status = "stopped"
        return True


def test_create_app_does_not_start_worker_until_lifespan_runs():
    runtime = FakeRuntime()
    app = create_app(
        settings=Settings(workerEnabled=True),
        worker_runtime_factory=lambda _: runtime,
    )

    assert runtime.start_calls == 0
    assert app.state.worker_runtime is None


def test_lifespan_starts_and_stops_worker_runtime():
    runtime = FakeRuntime()
    app = create_app(
        settings=Settings(workerEnabled=True),
        worker_runtime_factory=lambda _: runtime,
    )

    with TestClient(app) as client:
        assert runtime.start_calls == 1
        assert runtime.stop_calls == 0
        assert runtime.status == "running"
        assert client.get("/internal/health").json()["worker"] == "running"

    assert runtime.stop_calls == 1
    assert runtime.status == "stopped"


def test_module_import_does_not_start_worker():
    main_module = importlib.import_module("app.main")
    reloaded = importlib.reload(main_module)

    assert reloaded.app.state.worker_runtime is None
