from typing import Any

from app.application.ports import StoragePort


class ObjectStorageAdapter(StoragePort):
    def __init__(self, s3_client: Any, default_bucket_name: str | None = None) -> None:
        self._s3_client = s3_client
        self._default_bucket_name = default_bucket_name

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
            resolved_bucket_name = (self._default_bucket_name or "").strip()
        if not resolved_bucket_name:
            raise ValueError("Storage bucket name is not configured.")
        return resolved_bucket_name
