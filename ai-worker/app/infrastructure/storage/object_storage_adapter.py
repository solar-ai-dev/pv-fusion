from typing import Any

try:
    import boto3
except ModuleNotFoundError:  # pragma: no cover - environment dependent
    boto3 = None
try:
    from botocore.config import Config
except ModuleNotFoundError:  # pragma: no cover - environment dependent
    Config = None

from app.application.ports import StoragePort
from app.config.settings import Settings


class ObjectStorageAdapter(StoragePort):
    def __init__(self, settings: Settings, s3_client: Any | None = None) -> None:
        self._settings = settings
        self._s3_client = s3_client or self._build_client(settings)

    def read_object(self, bucket_name: str, object_key: str) -> bytes:
        response = self._s3_client.get_object(
            Bucket=self._resolve_bucket_name(bucket_name),
            Key=object_key,
        )
        return response["Body"].read()

    def write_object(
        self,
        bucket_name: str,
        object_key: str,
        data: bytes,
        content_type: str,
    ) -> str:
        self._s3_client.put_object(
            Bucket=self._resolve_bucket_name(bucket_name),
            Key=object_key,
            Body=data,
            ContentType=content_type,
        )
        return object_key

    def _resolve_bucket_name(self, bucket_name: str) -> str:
        resolved_bucket_name = bucket_name.strip() if bucket_name else ""
        if not resolved_bucket_name:
            resolved_bucket_name = (self._settings.storageDefaultBucket or "").strip()
        if not resolved_bucket_name:
            raise ValueError("Storage bucket name is not configured.")
        return resolved_bucket_name

    @staticmethod
    def _build_client(settings: Settings) -> Any:
        if boto3 is None:
            raise ModuleNotFoundError("boto3 is required to create the object storage client.")
        if settings.storagePathStyleEnabled and Config is None:
            raise ModuleNotFoundError("botocore is required to configure path-style S3 access.")

        kwargs: dict[str, Any] = {
            "service_name": "s3",
            "region_name": settings.storageRegion or settings.awsRegion,
        }
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
