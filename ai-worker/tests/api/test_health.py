from fastapi.testclient import TestClient

from app.config.settings import Settings
from app.main import create_app


def test_health_returns_ok():
    with TestClient(create_app(settings=Settings(workerEnabled=False))) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "ai-worker",
    }


def test_internal_health_returns_ok():
    with TestClient(create_app(settings=Settings(workerEnabled=False))) as client:
        response = client.get("/internal/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "ai-worker",
        "worker": "disabled",
    }


def test_predict_endpoint_is_not_defined():
    with TestClient(create_app(settings=Settings(workerEnabled=False))) as client:
        response = client.get("/predict")

    assert response.status_code == 404
