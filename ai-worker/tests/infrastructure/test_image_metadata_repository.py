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


def test_get_paired_image_maps_rgb_and_thermal_images():
    cursor = FakeCursor(
        [
            {
                "id": 21,
                "equipment_id": None,
                "target_type": "ZONE",
                "rgb_image_id": 101,
                "thermal_image_id": 102,
            },
            {
                "id": 101,
                "equipment_id": None,
                "target_type": "ZONE",
                "image_type": "RGB",
                "bucket_name": "rgb-bucket",
                "object_key": "rgb/101.jpg",
                "file_url": None,
            },
            {
                "id": 102,
                "equipment_id": None,
                "target_type": "ZONE",
                "image_type": "THERMAL",
                "bucket_name": "thermal-bucket",
                "object_key": "thermal/102.jpg",
                "file_url": None,
            },
        ]
    )
    repository = PostgresImageMetadataRepository(lambda: FakeConnection(cursor))

    pair = repository.get_paired_image(21)

    assert pair is not None
    assert pair.imagePairId == 21
    assert pair.targetType == "ZONE"
    assert pair.rgbImage.imageId == 101
    assert pair.rgbImage.imageType == "RGB"
    assert pair.thermalImage.imageId == 102
    assert pair.thermalImage.imageType == "THERMAL"


def test_get_paired_image_returns_none_when_pair_is_missing():
    repository = PostgresImageMetadataRepository(lambda: FakeConnection(FakeCursor([None])))

    pair = repository.get_paired_image(21)

    assert pair is None


def test_get_paired_image_returns_none_when_rgb_image_is_missing():
    cursor = FakeCursor(
        [
            {
                "id": 21,
                "equipment_id": 5,
                "target_type": "MODULE",
                "rgb_image_id": 101,
                "thermal_image_id": 102,
            },
            None,
            {
                "id": 102,
                "equipment_id": 5,
                "target_type": "MODULE",
                "image_type": "THERMAL",
                "bucket_name": "thermal-bucket",
                "object_key": "thermal/102.jpg",
                "file_url": None,
            },
        ]
    )
    repository = PostgresImageMetadataRepository(lambda: FakeConnection(cursor))

    pair = repository.get_paired_image(21)

    assert pair is None


def test_get_paired_image_returns_none_when_thermal_image_is_missing():
    cursor = FakeCursor(
        [
            {
                "id": 21,
                "equipment_id": 5,
                "target_type": "MODULE",
                "rgb_image_id": 101,
                "thermal_image_id": 102,
            },
            {
                "id": 101,
                "equipment_id": 5,
                "target_type": "MODULE",
                "image_type": "RGB",
                "bucket_name": "rgb-bucket",
                "object_key": "rgb/101.jpg",
                "file_url": None,
            },
            None,
        ]
    )
    repository = PostgresImageMetadataRepository(lambda: FakeConnection(cursor))

    pair = repository.get_paired_image(21)

    assert pair is None
