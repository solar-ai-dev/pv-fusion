from app.infrastructure.db.image_metadata_repository import PostgresImageMetadataRepository


class FakeCursor:
    def __init__(self, fetchone_results: list[dict | None]):
        self._fetchone_results = list(fetchone_results)
        self.executed = []

    def execute(self, query, params):
        self.executed.append((query, params))

    def fetchone(self):
        if not self._fetchone_results:
            return None
        return self._fetchone_results.pop(0)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class FakeConnection:
    def __init__(self, cursor: FakeCursor):
        self._cursor = cursor

    def cursor(self):
        return self._cursor

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def test_get_single_image_maps_row_to_single_image_input():
    cursor = FakeCursor(
        [
            {
                "id": 11,
                "equipment_id": 7,
                "target_type": "PANEL",
                "image_type": "RGB",
                "bucket_name": "images",
                "object_key": "rgb/11.jpg",
                "file_url": "http://example.com/rgb/11.jpg",
            }
        ]
    )
    repository = PostgresImageMetadataRepository(lambda: FakeConnection(cursor))

    image = repository.get_single_image(11)

    assert image is not None
    assert image.imageId == 11
    assert image.equipmentId == 7
    assert image.targetType == "PANEL"
    assert image.imageType == "RGB"
    assert image.bucketName == "images"
    assert image.objectKey == "rgb/11.jpg"
    assert image.fileUrl == "http://example.com/rgb/11.jpg"


def test_get_single_image_returns_none_when_row_is_missing():
    repository = PostgresImageMetadataRepository(lambda: FakeConnection(FakeCursor([None])))

    image = repository.get_single_image(999)

    assert image is None


def test_repository_queries_inspection_images_only():
    cursor = FakeCursor([None])
    repository = PostgresImageMetadataRepository(lambda: FakeConnection(cursor))

    repository.get_single_image(999)

    assert len(cursor.executed) == 1
    assert "FROM inspection_images" in cursor.executed[0][0]
    assert "image_pairs" not in cursor.executed[0][0]
