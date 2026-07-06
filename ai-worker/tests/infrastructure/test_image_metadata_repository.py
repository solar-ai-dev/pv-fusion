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
        self.closed = False
        self.rolled_back = False

    def cursor(self):
        return self._cursor

    def close(self):
        self.closed = True

    def rollback(self):
        self.rolled_back = True

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


def test_get_single_image_calls_factory_exactly_once():
    """get_single_image 호출 1회당 factory 도 1회 호출돼야 한다."""
    call_count = [0]

    def counting_factory():
        call_count[0] += 1
        return FakeConnection(FakeCursor([None]))

    repository = PostgresImageMetadataRepository(counting_factory)
    repository.get_single_image(42)

    assert call_count[0] == 1


def test_sequential_calls_do_not_accumulate_connections():
    """
    연속 호출 시 각 호출이 독립적인 connection 을 사용하는지 확인한다.
    factory 호출 횟수 = 호출 횟수가 되어야 한다.
    """
    call_count = [0]

    def counting_factory():
        call_count[0] += 1
        return FakeConnection(FakeCursor([None]))

    repository = PostgresImageMetadataRepository(counting_factory)
    repository.get_single_image(1)
    repository.get_single_image(2)
    repository.get_single_image(3)

    assert call_count[0] == 3, "각 조회마다 factory 가 1회씩 호출돼야 한다."
