from fastapi.testclient import TestClient

from app.main import create_app


def test_health_returns_ok():
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "ai-worker",
    }


def test_internal_health_returns_ok():
    client = TestClient(create_app())

    response = client.get("/internal/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "ai-worker",
        "worker": "ready",
    }


def test_predict_endpoint_is_not_defined():
    client = TestClient(create_app())

    response = client.get("/predict")

    assert response.status_code == 404
