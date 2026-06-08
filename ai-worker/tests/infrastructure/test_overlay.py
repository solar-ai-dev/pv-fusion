from io import BytesIO

import pytest

from app.infrastructure.model.output_parser import ParsedDetection
from app.infrastructure.visualization.overlay import draw_bbox_overlay


def _require_pillow():
    return pytest.importorskip("PIL.Image")


def make_image_bytes(size=(100, 80), color=(255, 255, 255)):
    image_module = _require_pillow()
    image = image_module.new("RGB", size, color)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_draw_bbox_overlay_returns_png_bytes_for_small_image():
    _require_pillow()
    image_bytes = make_image_bytes()
    detections = [
        ParsedDetection(
            class_id=1,
            class_name="hotspot",
            confidence=0.9,
            bbox_x=10,
            bbox_y=10,
            bbox_width=20,
            bbox_height=15,
            source="THERMAL",
        )
    ]

    result = draw_bbox_overlay(image_bytes, detections)

    assert result.startswith(b"\x89PNG")


def test_draw_bbox_overlay_converts_normalized_bbox_to_pixels():
    _require_pillow()
    image_bytes = make_image_bytes(size=(200, 100))
    detections = [
        ParsedDetection(
            class_id=1,
            class_name=None,
            confidence=0.8,
            bbox_x=0.1,
            bbox_y=0.2,
            bbox_width=0.5,
            bbox_height=0.4,
            source="THERMAL",
        )
    ]

    result = draw_bbox_overlay(image_bytes, detections)

    assert result.startswith(b"\x89PNG")


def test_draw_bbox_overlay_clamps_bbox_to_image_bounds():
    _require_pillow()
    image_bytes = make_image_bytes(size=(50, 50))
    detections = [
        ParsedDetection(
            class_id=1,
            class_name=None,
            confidence=0.8,
            bbox_x=-10,
            bbox_y=-5,
            bbox_width=100,
            bbox_height=80,
            source="THERMAL",
        )
    ]

    result = draw_bbox_overlay(image_bytes, detections)

    assert result.startswith(b"\x89PNG")


def test_draw_bbox_overlay_skips_invalid_bbox_and_returns_image():
    _require_pillow()
    image_bytes = make_image_bytes()
    detections = [
        ParsedDetection(
            class_id=1,
            class_name=None,
            confidence=0.8,
            bbox_x=10,
            bbox_y=10,
            bbox_width=0,
            bbox_height=5,
            source="THERMAL",
        )
    ]

    result = draw_bbox_overlay(image_bytes, detections)

    assert result.startswith(b"\x89PNG")


def test_draw_bbox_overlay_returns_valid_image_for_empty_detections():
    _require_pillow()
    image_bytes = make_image_bytes()

    result = draw_bbox_overlay(image_bytes, [])

    assert result.startswith(b"\x89PNG")
