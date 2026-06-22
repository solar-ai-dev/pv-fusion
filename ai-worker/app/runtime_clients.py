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


def create_storage_client(settings: Settings) -> Any:
    if boto3 is None:
        raise ModuleNotFoundError("boto3 is required to create the object storage client.")
    if _is_local_environment(settings) and settings.storagePathStyleEnabled and Config is None:
        raise ModuleNotFoundError("botocore is required to configure path-style S3 access.")

    kwargs: dict[str, Any] = {
        "service_name": "s3",
        "region_name": settings.storageRegion or settings.awsRegion,
    }

    if _is_local_environment(settings):
        if settings.storageEndpointUrl:
            kwargs["endpoint_url"] = settings.storageEndpointUrl
        if settings.storagePathStyleEnabled:
            kwargs["config"] = Config(s3={"addressing_style": "path"})

        access_key = (settings.storageAccessKey or "").strip()
        secret_key = (settings.storageSecretKey or "").strip()
        if access_key and secret_key:
            kwargs["aws_access_key_id"] = access_key
            kwargs["aws_secret_access_key"] = secret_key

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
