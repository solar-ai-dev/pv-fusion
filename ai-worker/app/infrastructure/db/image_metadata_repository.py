from collections.abc import Callable
from typing import Any

from app.application.ports import ImageMetadataPort
from app.domain.image_input import PairedImageInput, SingleImageInput


class PostgresImageMetadataRepository(ImageMetadataPort):
    def __init__(self, connection_factory: Callable[[], Any]) -> None:
        self._connection_factory = connection_factory

    def get_single_image(self, image_id: int) -> SingleImageInput | None:
        with self._connection_factory() as connection:
            with connection.cursor() as cursor:
                cursor.execute(_IMAGE_QUERY, (image_id,))
                row = cursor.fetchone()
        if row is None:
            return None
        return _map_single_image(row)

    def get_paired_image(self, image_pair_id: int) -> PairedImageInput | None:
        with self._connection_factory() as connection:
            with connection.cursor() as cursor:
                cursor.execute(_IMAGE_PAIR_QUERY, (image_pair_id,))
                pair_row = cursor.fetchone()
                if pair_row is None:
                    return None

                cursor.execute(_IMAGE_QUERY, (pair_row["rgb_image_id"],))
                rgb_row = cursor.fetchone()

                cursor.execute(_IMAGE_QUERY, (pair_row["thermal_image_id"],))
                thermal_row = cursor.fetchone()

        if rgb_row is None or thermal_row is None:
            return None

        return PairedImageInput(
            imagePairId=pair_row["id"],
            targetType=pair_row["target_type"],
            equipmentId=pair_row["equipment_id"],
            rgbImage=_map_single_image(rgb_row),
            thermalImage=_map_single_image(thermal_row),
        )


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


_IMAGE_PAIR_QUERY = """
    SELECT
        id,
        equipment_id,
        target_type,
        rgb_image_id,
        thermal_image_id
    FROM image_pairs
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
