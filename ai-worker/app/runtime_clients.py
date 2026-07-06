from typing import Any

try:
    import boto3
except ModuleNotFoundError:  # pragma: no cover - environment dependent
    boto3 = None

try:
    from botocore.config import Config
except ModuleNotFoundError:  # pragma: no cover - environment dependent
    Config = None

from app.config.settings import Settings


_STORAGE_CONNECT_TIMEOUT_SECONDS = 10
_STORAGE_READ_TIMEOUT_SECONDS = 60


def create_storage_client(settings: Settings) -> Any:
    if boto3 is None:
        raise ModuleNotFoundError("boto3 is required to create the object storage client.")
    if Config is None:
        raise ModuleNotFoundError("botocore is required to configure the object storage client.")

    kwargs: dict[str, Any] = {
        "service_name": "s3",
        "region_name": settings.storageRegion or settings.awsRegion,
    }

    if _is_local_environment(settings):
        if settings.storageEndpointUrl:
            kwargs["endpoint_url"] = settings.storageEndpointUrl

        access_key = (settings.storageAccessKey or "").strip()
        secret_key = (settings.storageSecretKey or "").strip()
        if access_key and secret_key:
            kwargs["aws_access_key_id"] = access_key
            kwargs["aws_secret_access_key"] = secret_key

    # path-style + timeout 를 함께 적용한다.
    # connect_timeout: MinIO/S3 연결 수립 최대 대기
    # read_timeout: get_object Body.read() 포함 응답 수신 최대 대기
    # retries.max_attempts=1: 타임아웃 후 boto3 자동 재시도 비활성화
    s3_config: dict[str, Any] = {
        "connect_timeout": _STORAGE_CONNECT_TIMEOUT_SECONDS,
        "read_timeout": _STORAGE_READ_TIMEOUT_SECONDS,
        "retries": {"max_attempts": 1},
    }
    if _is_local_environment(settings) and settings.storagePathStyleEnabled:
        s3_config["s3"] = {"addressing_style": "path"}

    kwargs["config"] = Config(**s3_config)

    return boto3.client(**kwargs)


def create_sqs_client(settings: Settings) -> Any:
    if boto3 is None:
        raise ModuleNotFoundError("boto3 is required to create the SQS client.")

    kwargs: dict[str, Any] = {
        "service_name": "sqs",
        "region_name": settings.awsRegion,
    }

    if _is_local_environment(settings):
        if settings.sqsEndpointUrl:
            kwargs["endpoint_url"] = settings.sqsEndpointUrl

        access_key = (settings.sqsAccessKey or "").strip()
        secret_key = (settings.sqsSecretKey or "").strip()
        if access_key and secret_key:
            kwargs["aws_access_key_id"] = access_key
            kwargs["aws_secret_access_key"] = secret_key

    return boto3.client(**kwargs)


def _is_local_environment(settings: Settings) -> bool:
    return settings.environment.strip().lower() != "prod"
