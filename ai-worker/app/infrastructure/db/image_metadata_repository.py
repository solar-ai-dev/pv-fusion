import logging
import time
from collections.abc import Callable
from typing import Any

from app.application.ports import ImageMetadataPort
from app.domain.image_input import SingleImageInput

logger = logging.getLogger(__name__)


def _ms(t0: float) -> int:
    return int((time.perf_counter() - t0) * 1000)


class PostgresImageMetadataRepository(ImageMetadataPort):
    def __init__(self, connection_factory: Callable[[], Any]) -> None:
        self._connection_factory = connection_factory

    def get_single_image(self, image_id: int) -> SingleImageInput | None:
        operation = "image_metadata.get_by_id"
        logger.info("db.acquire.before operation=%s imageId=%s", operation, image_id)
        t_acquire = time.perf_counter()
        row = None
        try:
            with self._connection_factory() as connection:
                logger.info(
                    "db.acquire.after operation=%s imageId=%s elapsedMs=%s",
                    operation, image_id, _ms(t_acquire),
                )
                logger.info("db.execute.before operation=%s imageId=%s", operation, image_id)
                t_exec = time.perf_counter()
                with connection.cursor() as cursor:
                    cursor.execute(_IMAGE_QUERY, (image_id,))
                    row = cursor.fetchone()
                logger.info(
                    "db.execute.after operation=%s rowCount=%s elapsedMs=%s",
                    operation, 0 if row is None else 1, _ms(t_exec),
                )
        finally:
            logger.info("db.release.after operation=%s imageId=%s", operation, image_id)

        if row is None:
            return None
        return _map_single_image(row)


_IMAGE_QUERY = """
    SELECT
        id,
        equipment_id,
        target_type,
        image_type,
        bucket_name,
        object_key,
        file_url
    FROM inspection_images
    WHERE id = %s
"""


def _map_single_image(row: dict[str, Any]) -> SingleImageInput:
    return SingleImageInput(
        imageId=row["id"],
        imageType=row["image_type"],
        bucketName=row["bucket_name"],
        objectKey=row["object_key"],
        fileUrl=row["file_url"],
        targetType=row["target_type"],
        equipmentId=row["equipment_id"],
    )
