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


def test_read_object_returns_body_bytes():
    client = FakeS3Client()
    adapter = ObjectStorageAdapter(s3_client=client)

    payload = adapter.read_object("source-bucket", "images/1.jpg")

    assert payload == b"image-bytes"
    assert client.get_calls == [{"Bucket": "source-bucket", "Key": "images/1.jpg"}]


def test_write_object_returns_object_key():
    client = FakeS3Client()
    adapter = ObjectStorageAdapter(s3_client=client)

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
    adapter = ObjectStorageAdapter(s3_client=client, default_bucket_name="fallback-bucket")

    adapter.read_object("", "images/1.jpg")

    assert client.get_calls == [{"Bucket": "fallback-bucket", "Key": "images/1.jpg"}]


def test_read_object_raises_when_bucket_name_is_not_available():
    client = FakeS3Client()
    adapter = ObjectStorageAdapter(s3_client=client)

    try:
        adapter.read_object("", "images/1.jpg")
    except ValueError as exc:
        assert str(exc) == "Storage bucket name is not configured."
    else:
        raise AssertionError("Expected ValueError when bucket name is missing.")


