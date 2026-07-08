import pytest

from app.config.settings import Settings


def test_settings_accepts_backend_style_endpoint_aliases():
    settings = Settings(
        _env_file=None,
        SQS_ENDPOINT="http://localhost:4566",
        SQS_ACCESS_KEY="test",
        SQS_SECRET_KEY="test",
        STORAGE_ENDPOINT="http://localhost:9000",
    )

    assert settings.sqsEndpointUrl == "http://localhost:4566"
    assert settings.sqsAccessKey == "test"
    assert settings.sqsSecretKey == "test"
    assert settings.storageEndpointUrl == "http://localhost:9000"


def test_settings_accepts_standard_aws_storage_aliases():
    settings = Settings(
        _env_file=None,
        APP_ENV="prod",
        AWS_ACCESS_KEY_ID="minio",
        AWS_SECRET_ACCESS_KEY="miniopass",
        S3_BUCKET_NAME="pv-insight-local",
        S3_PATH_STYLE_ACCESS_ENABLED=True,
    )

    assert settings.environment == "prod"
    assert settings.storageAccessKey == "minio"
    assert settings.storageSecretKey == "miniopass"
    assert settings.storageDefaultBucket == "pv-insight-local"
    assert settings.storagePathStyleEnabled is True


def test_settings_accepts_database_url_alias():
    settings = Settings(
        _env_file=None,
        APP_ENV="prod",
        DATABASE_URL="postgresql://user:pass@db.example.com:5432/pvfusion",
    )

    assert settings.databaseUrl == "postgresql://user:pass@db.example.com:5432/pvfusion"


def test_settings_accepts_thermal_model_manifest_path_alias():
    settings = Settings(
        _env_file=None,
        THERMAL_MODEL_MANIFEST_PATH="/models/thermal/model-manifest.yaml",
    )

    assert settings.thermalModelManifestPath == "/models/thermal/model-manifest.yaml"


def test_settings_rejects_invalid_app_env():
    with pytest.raises(ValueError, match="APP_ENV must be either 'local' or 'prod'"):
        Settings(_env_file=None, APP_ENV="stage")


def test_local_runtime_contract_requires_local_endpoints_and_credentials():
    settings = Settings(
        _env_file=None,
        APP_ENV="local",
        DATABASE_URI="postgresql://pvfusion:pass@localhost:5432/pv_fusion_local",
        SQS_QUEUE_URL="http://localhost:4566/000000000000/analysis-job-queue",
        STORAGE_DEFAULT_BUCKET="pv-insight-local",
    )

    with pytest.raises(ValueError, match="SQS_ENDPOINT_URL"):
        settings.validate_worker_runtime_contract()


def test_prod_runtime_contract_does_not_require_endpoint_overrides_or_static_credentials():
    settings = Settings(
        _env_file=None,
        APP_ENV="prod",
        DATABASE_URI="postgresql://pvfusion:pass@db.example.com:5432/pv_fusion",
        SQS_QUEUE_URL="https://sqs.ap-northeast-2.amazonaws.com/123456789012/analysis-job-queue",
        S3_BUCKET_NAME="pvfusion-prod-bucket",
    )

    settings.validate_worker_runtime_contract()
