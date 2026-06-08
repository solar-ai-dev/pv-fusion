from app.config.settings import Settings
from app.infrastructure.storage.object_storage_adapter import ObjectStorageAdapter


class FakeBody:
    def __init__(self, data: bytes):
        self._data = data

    def read(self) -> bytes:
        return self._data


class FakeS3Client:
    def __init__(self):
        self.get_calls = []
        self.put_calls = []

    def get_object(self, **kwargs):
        self.get_calls.append(kwargs)
        return {"Body": FakeBody(b"image-bytes")}

    def put_object(self, **kwargs):
        self.put_calls.append(kwargs)


def build_settings(**overrides) -> Settings:
    payload = {
        "awsRegion": "ap-northeast-2",
        "storageRegion": None,
        "storageEndpointUrl": None,
        "storageAccessKey": None,
        "storageSecretKey": None,
        "storageDefaultBucket": None,
    }
    payload.update(overrides)
    return Settings(**payload)


def test_read_object_returns_body_bytes():
    client = FakeS3Client()
    adapter = ObjectStorageAdapter(build_settings(), s3_client=client)

    payload = adapter.read_object("source-bucket", "images/1.jpg")

    assert payload == b"image-bytes"
    assert client.get_calls == [{"Bucket": "source-bucket", "Key": "images/1.jpg"}]


def test_write_object_returns_object_key():
    client = FakeS3Client()
    adapter = ObjectStorageAdapter(build_settings(), s3_client=client)

    object_key = adapter.write_object("result-bucket", "results/1.png", b"png", "image/png")

    assert object_key == "results/1.png"
    assert client.put_calls == [
        {
            "Bucket": "result-bucket",
            "Key": "results/1.png",
            "Body": b"png",
            "ContentType": "image/png",
        }
    ]


def test_read_object_uses_default_bucket_when_bucket_name_is_empty():
    client = FakeS3Client()
    adapter = ObjectStorageAdapter(build_settings(storageDefaultBucket="fallback-bucket"), s3_client=client)

    adapter.read_object("", "images/1.jpg")

    assert client.get_calls == [{"Bucket": "fallback-bucket", "Key": "images/1.jpg"}]


def test_read_object_raises_when_bucket_name_is_not_available():
    client = FakeS3Client()
    adapter = ObjectStorageAdapter(build_settings(), s3_client=client)

    try:
        adapter.read_object("", "images/1.jpg")
    except ValueError as exc:
        assert str(exc) == "Storage bucket name is not configured."
    else:
        raise AssertionError("Expected ValueError when bucket name is missing.")


def test_build_client_includes_endpoint_and_static_credentials(monkeypatch):
    captured = {}

    class FakeBoto3:
        @staticmethod
        def client(**kwargs):
            captured.update(kwargs)
            return object()

    monkeypatch.setattr("app.infrastructure.storage.object_storage_adapter.boto3", FakeBoto3)

    ObjectStorageAdapter(
        build_settings(
            storageRegion="us-east-1",
            storageEndpointUrl="http://localhost:9000",
            storageAccessKey="minio",
            storageSecretKey="miniopass",
        )
    )

    assert captured == {
        "service_name": "s3",
        "region_name": "us-east-1",
        "endpoint_url": "http://localhost:9000",
        "aws_access_key_id": "minio",
        "aws_secret_access_key": "miniopass",
    }


def test_build_client_omits_static_credentials_when_one_value_is_missing(monkeypatch):
    captured = {}

    class FakeBoto3:
        @staticmethod
        def client(**kwargs):
            captured.update(kwargs)
            return object()

    monkeypatch.setattr("app.infrastructure.storage.object_storage_adapter.boto3", FakeBoto3)

    ObjectStorageAdapter(
        build_settings(
            storageEndpointUrl="http://localhost:9000",
            storageAccessKey="minio",
            storageSecretKey=None,
        )
    )

    assert captured == {
        "service_name": "s3",
        "region_name": "ap-northeast-2",
        "endpoint_url": "http://localhost:9000",
    }
