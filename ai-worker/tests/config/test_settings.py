from app.config.settings import Settings


def test_settings_accepts_backend_style_endpoint_aliases():
    settings = Settings(
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
        AWS_ACCESS_KEY_ID="minio",
        AWS_SECRET_ACCESS_KEY="miniopass",
        S3_BUCKET_NAME="pv-insight-local",
        S3_PATH_STYLE_ACCESS_ENABLED=True,
    )

    assert settings.storageAccessKey == "minio"
    assert settings.storageSecretKey == "miniopass"
    assert settings.storageDefaultBucket == "pv-insight-local"
    assert settings.storagePathStyleEnabled is True
