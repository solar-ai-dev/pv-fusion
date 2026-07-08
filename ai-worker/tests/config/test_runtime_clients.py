from app.config.settings import Settings
from app.runtime_clients import create_sqs_client, create_storage_client


def test_create_storage_client_uses_local_endpoint_and_static_credentials(monkeypatch):
    captured = {}

    class FakeBoto3:
        @staticmethod
        def client(**kwargs):
            captured.update(kwargs)
            return object()

    monkeypatch.setattr("app.runtime_clients.boto3", FakeBoto3)

    settings = Settings(
        APP_ENV="local",
        STORAGE_REGION="us-east-1",
        STORAGE_ENDPOINT_URL="http://localhost:9000",
        STORAGE_ACCESS_KEY="minio",
        STORAGE_SECRET_KEY="miniopass",
        STORAGE_PATH_STYLE_ENABLED=True,
    )

    create_storage_client(settings)

    assert captured["service_name"] == "s3"
    assert captured["region_name"] == "us-east-1"
    assert captured["endpoint_url"] == "http://localhost:9000"
    assert captured["aws_access_key_id"] == "minio"
    assert captured["aws_secret_access_key"] == "miniopass"
    assert captured["config"].s3["addressing_style"] == "path"


def test_create_storage_client_uses_prod_defaults_without_endpoint_override(monkeypatch):
    captured = {}

    class FakeBoto3:
        @staticmethod
        def client(**kwargs):
            captured.update(kwargs)
            return object()

    monkeypatch.setattr("app.runtime_clients.boto3", FakeBoto3)

    settings = Settings(
        APP_ENV="prod",
        AWS_REGION="ap-northeast-2",
        STORAGE_ENDPOINT_URL="http://localhost:9000",
        STORAGE_ACCESS_KEY="minio",
        STORAGE_SECRET_KEY="miniopass",
    )

    create_storage_client(settings)

    assert captured["service_name"] == "s3"
    assert captured["region_name"] == "ap-northeast-2"
    assert "endpoint_url" not in captured
    # timeout Config는 prod에서도 항상 설정된다
    assert captured["config"] is not None
    assert captured["config"].connect_timeout == 10
    assert captured["config"].read_timeout == 60
    # prod + path_style 미설정 → s3 addressing_style 없음
    assert getattr(captured["config"], "s3", None) is None or captured["config"].s3.get("addressing_style") is None


def test_create_sqs_client_uses_local_endpoint_and_static_credentials(monkeypatch):
    captured = {}

    class FakeBoto3:
        @staticmethod
        def client(**kwargs):
            captured.update(kwargs)
            return object()

    monkeypatch.setattr("app.runtime_clients.boto3", FakeBoto3)

    settings = Settings(
        APP_ENV="local",
        AWS_REGION="ap-northeast-2",
        SQS_ENDPOINT_URL="http://localhost:4566",
        SQS_ACCESS_KEY="test",
        SQS_SECRET_KEY="secret",
    )

    create_sqs_client(settings)

    assert captured["service_name"] == "sqs"
    assert captured["region_name"] == "ap-northeast-2"
    assert captured["endpoint_url"] == "http://localhost:4566"
    assert captured["aws_access_key_id"] == "test"
    assert captured["aws_secret_access_key"] == "secret"


def test_create_sqs_client_uses_prod_defaults_without_endpoint_override(monkeypatch):
    captured = {}

    class FakeBoto3:
        @staticmethod
        def client(**kwargs):
            captured.update(kwargs)
            return object()

    monkeypatch.setattr("app.runtime_clients.boto3", FakeBoto3)

    settings = Settings(
        APP_ENV="prod",
        AWS_REGION="ap-northeast-2",
        SQS_ENDPOINT_URL="http://localhost:4566",
        SQS_ACCESS_KEY="test",
        SQS_SECRET_KEY="secret",
    )

    create_sqs_client(settings)

    assert captured == {
        "service_name": "sqs",
        "region_name": "ap-northeast-2",
    }
