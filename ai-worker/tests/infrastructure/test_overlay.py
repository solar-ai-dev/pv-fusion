from io import BytesIO

import pytest

from app.infrastructure.model.output_parser import ParsedDetection
from app.domain.inference_result import RestoredMask
from app.infrastructure.visualization.overlay import (
    MASK_ALPHA,
    RGB_BBOX_COLOR_BGR,
    RGB_BBOX_WIDTH,
    RGB_CLASS_PALETTE,
    RGB_MASK_CONTOUR_WIDTH,
    THERMAL_BBOX_COLOR,
    THERMAL_BBOX_WIDTH,
    draw_bbox_overlay,
    draw_mask_overlay,
)


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


def test_draw_bbox_overlay_uses_rgb_class_palette():
    image_module = _require_pillow()
    image_bytes = make_image_bytes(size=(80, 80))
    detections = [
        ParsedDetection(
            class_id=1,
            class_name="bitki",
            confidence=0.8,
            bbox_x=10,
            bbox_y=10,
            bbox_width=20,
            bbox_height=20,
            source="RGB",
        )
    ]

    result = draw_bbox_overlay(image_bytes, detections)

    image = image_module.open(BytesIO(result)).convert("RGB")
    assert image.getpixel((10, 10)) == (255, 0, 0)


def test_draw_bbox_overlay_draws_red_rgb_bbox_with_label(monkeypatch):
    _require_pillow()
    cv2 = pytest.importorskip("cv2")
    image_draw_module = pytest.importorskip("PIL.ImageDraw")
    image_bytes = make_image_bytes(size=(80, 80))
    detections = [
        ParsedDetection(
            class_id=1,
            class_name="bitki",
            confidence=0.8,
            bbox_x=20,
            bbox_y=20,
            bbox_width=30,
            bbox_height=30,
            source="RGB",
        )
    ]

    rectangle_calls = []
    text_calls = []
    original_rectangle = cv2.rectangle
    original_put_text = cv2.putText

    def record_rectangle(img, pt1, pt2, color, thickness=1, *args, **kwargs):
        rectangle_calls.append((pt1, pt2, color, thickness))
        return original_rectangle(img, pt1, pt2, color, thickness, *args, **kwargs)

    def record_put_text(img, text, org, font_face, font_scale, color, thickness=1, *args, **kwargs):
        text_calls.append((text, org, color, thickness))
        return original_put_text(img, text, org, font_face, font_scale, color, thickness, *args, **kwargs)

    monkeypatch.setattr(cv2, "rectangle", record_rectangle)
    monkeypatch.setattr(cv2, "putText", record_put_text)

    result = draw_bbox_overlay(image_bytes, detections)

    assert result.startswith(b"\x89PNG")
    assert rectangle_calls[0] == ((20, 20), (50, 50), RGB_BBOX_COLOR_BGR, RGB_BBOX_WIDTH)
    assert text_calls == [("bitki", text_calls[0][1], (255, 255, 255), 1)]
    assert "0.8" not in text_calls[0][0]


def test_draw_bbox_overlay_renders_all_valid_rgb_candidates(monkeypatch):
    _require_pillow()
    cv2 = pytest.importorskip("cv2")
    image_bytes = make_image_bytes(size=(100, 100))
    detections = [
        ParsedDetection(
            class_id=0,
            class_name="broken",
            confidence=0.91,
            bbox_x=10,
            bbox_y=10,
            bbox_width=20,
            bbox_height=20,
            source="RGB",
        ),
        ParsedDetection(
            class_id=2,
            class_name="dusty",
            confidence=0.81,
            bbox_x=40,
            bbox_y=40,
            bbox_width=30,
            bbox_height=25,
            source="RGB",
        ),
    ]

    rectangle_calls = []
    original_rectangle = cv2.rectangle

    def record_rectangle(img, pt1, pt2, color, thickness=1, *args, **kwargs):
        rectangle_calls.append((pt1, pt2, color, thickness))
        return original_rectangle(img, pt1, pt2, color, thickness, *args, **kwargs)

    monkeypatch.setattr(cv2, "rectangle", record_rectangle)

    result = draw_bbox_overlay(image_bytes, detections)

    assert result.startswith(b"\x89PNG")
    bbox_calls = [call for call in rectangle_calls if call[2] == RGB_BBOX_COLOR_BGR and call[3] == RGB_BBOX_WIDTH]
    assert bbox_calls == [
        ((10, 10), (30, 30), RGB_BBOX_COLOR_BGR, RGB_BBOX_WIDTH),
        ((40, 40), (70, 65), RGB_BBOX_COLOR_BGR, RGB_BBOX_WIDTH),
    ]


def test_draw_bbox_overlay_keeps_thermal_color():
    image_module = _require_pillow()
    image_bytes = make_image_bytes(size=(80, 80))
    detections = [
        ParsedDetection(
            class_id=1,
            class_name="HOTSPOT",
            confidence=0.8,
            bbox_x=10,
            bbox_y=10,
            bbox_width=20,
            bbox_height=20,
            source="THERMAL",
        )
    ]

    result = draw_bbox_overlay(image_bytes, detections)

    image = image_module.open(BytesIO(result)).convert("RGB")
    assert image.getpixel((10, 10)) == THERMAL_BBOX_COLOR


def test_draw_bbox_overlay_keeps_thermal_bbox_and_skips_label(monkeypatch):
    _require_pillow()
    cv2 = pytest.importorskip("cv2")
    image_bytes = make_image_bytes()
    detections = [
        ParsedDetection(
            class_id=1,
            class_name="HOTSPOT",
            confidence=0.92,
            bbox_x=10,
            bbox_y=10,
            bbox_width=20,
            bbox_height=15,
            source="THERMAL",
        )
    ]

    rectangle_calls = []
    original_rectangle = cv2.rectangle
    original_put_text = cv2.putText

    def record_rectangle(img, pt1, pt2, color, thickness=1, *args, **kwargs):
        rectangle_calls.append((pt1, pt2, color, thickness))
        return original_rectangle(img, pt1, pt2, color, thickness, *args, **kwargs)

    def fail_if_called(*args, **kwargs):
        raise AssertionError("thermal bbox should not render label text")

    monkeypatch.setattr(cv2, "rectangle", record_rectangle)
    monkeypatch.setattr(cv2, "putText", fail_if_called)

    result = draw_bbox_overlay(image_bytes, detections)

    assert result.startswith(b"\x89PNG")
    assert rectangle_calls == [((10, 10), (30, 25), (0, 0, 255), THERMAL_BBOX_WIDTH)]
    monkeypatch.setattr(cv2, "putText", original_put_text)


def test_draw_mask_overlay_returns_png_bytes():
    _require_pillow()
    image_bytes = make_image_bytes()
    masks = [
        RestoredMask(
            bboxX=10,
            bboxY=10,
            bboxWidth=20,
            bboxHeight=20,
            data=[[1 if 20 <= x < 60 and 20 <= y < 60 else 0 for x in range(100)] for y in range(80)],
        )
    ]

    result = draw_mask_overlay(image_bytes, masks)

    assert result.startswith(b"\x89PNG")


def test_draw_mask_overlay_uses_rgb_class_palette():
    image_module = _require_pillow()
    image_bytes = make_image_bytes(size=(40, 40), color=(255, 255, 255))
    masks = [
        RestoredMask(
            bboxX=5,
            bboxY=5,
            bboxWidth=20,
            bboxHeight=20,
            classId=4,
            className="shading",
            confidence=0.9,
            data=[[1 if 10 <= x < 30 and 10 <= y < 30 else 0 for x in range(40)] for y in range(40)],
        )
    ]

    result = draw_mask_overlay(image_bytes, masks)

    image = image_module.open(BytesIO(result)).convert("RGB")
    pixel = image.getpixel((15, 15))
    expected = tuple(
        int(round(((255 - MASK_ALPHA) * 255 + MASK_ALPHA * value) / 255.0))
        for value in RGB_CLASS_PALETTE["shading"]
    )
    for actual, channel_expected in zip(pixel, expected):
        assert abs(actual - channel_expected) <= 1


def test_draw_mask_overlay_draws_class_contour_with_width_4(monkeypatch):
    _require_pillow()
    cv2 = pytest.importorskip("cv2")
    image_bytes = make_image_bytes(size=(40, 40), color=(255, 255, 255))
    masks = [
        RestoredMask(
            bboxX=5,
            bboxY=5,
            bboxWidth=20,
            bboxHeight=20,
            classId=4,
            className="shading",
            confidence=0.9,
            data=[[1 if 10 <= x < 30 and 10 <= y < 30 else 0 for x in range(40)] for y in range(40)],
        )
    ]

    contour_calls = []
    original_draw_contours = cv2.drawContours

    def record_draw_contours(image, contours, contour_idx, color, thickness=1, *args, **kwargs):
        contour_calls.append((len(contours), contour_idx, color, thickness))
        return original_draw_contours(image, contours, contour_idx, color, thickness, *args, **kwargs)

    monkeypatch.setattr(cv2, "drawContours", record_draw_contours)

    result = draw_mask_overlay(image_bytes, masks)

    assert result.startswith(b"\x89PNG")
    assert contour_calls == [(1, -1, (178, 114, 0), RGB_MASK_CONTOUR_WIDTH)]


def test_draw_mask_overlay_keeps_multi_component_contours(monkeypatch):
    _require_pillow()
    cv2 = pytest.importorskip("cv2")
    image_bytes = make_image_bytes(size=(50, 50), color=(255, 255, 255))
    masks = [
        RestoredMask(
            bboxX=0,
            bboxY=0,
            bboxWidth=50,
            bboxHeight=50,
            classId=1,
            className="bitki",
            confidence=0.5,
            data=[
                [
                    1
                    if (5 <= x < 15 and 5 <= y < 15) or (30 <= x < 40 and 30 <= y < 40)
                    else 0
                    for x in range(50)
                ]
                for y in range(50)
            ],
        )
    ]

    contour_calls = []
    original_draw_contours = cv2.drawContours

    def record_draw_contours(image, contours, contour_idx, color, thickness=1, *args, **kwargs):
        contour_calls.append((len(contours), contour_idx))
        return original_draw_contours(image, contours, contour_idx, color, thickness, *args, **kwargs)

    monkeypatch.setattr(cv2, "drawContours", record_draw_contours)

    result = draw_mask_overlay(image_bytes, masks)

    assert result.startswith(b"\x89PNG")
    assert contour_calls == [(2, -1)]
