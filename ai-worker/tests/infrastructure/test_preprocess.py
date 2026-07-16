from io import BytesIO

import numpy as np
from PIL import Image

from app.infrastructure.model import preprocess


def test_preprocess_rgb_applies_letterbox_with_padding_114_for_wide_image():
    image_bytes = _to_png_bytes(np.full((2, 4, 3), 10, dtype=np.uint8), mode="RGB")

    result = preprocess.preprocess_image_bytes(image_bytes, 8, input_type="RGB")

    assert result.tensor.shape == (1, 3, 8, 8)
    assert result.originalWidth == 4
    assert result.originalHeight == 2
    assert result.resizedWidth == 8
    assert result.resizedHeight == 4
    assert result.scaleX == 2.0
    assert result.scaleY == 2.0
    assert result.padX == 0
    assert result.padY == 2
    assert np.allclose(result.tensor[0, :, 0, 0], np.array([114, 114, 114], dtype=np.float32) / 255.0)


def test_preprocess_rgb_applies_letterbox_for_tall_image():
    image_bytes = _to_png_bytes(np.full((4, 2, 3), 20, dtype=np.uint8), mode="RGB")

    result = preprocess.preprocess_image_bytes(image_bytes, 8, input_type="RGB")

    assert result.resizedWidth == 4
    assert result.resizedHeight == 8
    assert result.scaleX == 2.0
    assert result.scaleY == 2.0
    assert result.padX == 2
    assert result.padY == 0
    assert np.allclose(result.tensor[0, :, 0, 0], np.array([114, 114, 114], dtype=np.float32) / 255.0)


def test_decode_image_bytes_rejects_empty_payload():
    try:
        preprocess.decode_image_bytes(b"")
    except ValueError as exc:
        assert str(exc) == "Image bytes are empty."
    else:
        raise AssertionError("Expected ValueError for empty image bytes.")


def test_preprocess_thermal_raw_uint8_normalized_with_uint8_single_channel():
    image_bytes = _to_png_bytes(np.array([[0, 64], [128, 255]], dtype=np.uint8), mode="L")

    result = preprocess.preprocess_image_bytes(
        image_bytes,
        640,
        input_type="THERMAL",
        preprocess_id="RAW_UINT8_NORMALIZED",
    )

    assert result.tensor.shape == (1, 3, 640, 640)
    assert result.tensor.dtype == np.float32
    assert result.originalWidth == 2
    assert result.originalHeight == 2
    assert float(result.tensor.min()) == 0.0
    assert float(result.tensor.max()) == 1.0


def test_preprocess_thermal_raw_uint8_normalized_with_uint16_single_channel():
    image_bytes = _to_png_bytes(np.array([[0, 1024], [4096, 65535]], dtype=np.uint16), mode="I;16")

    result = preprocess.preprocess_image_bytes(
        image_bytes,
        640,
        input_type="THERMAL",
        preprocess_id="RAW_UINT8_NORMALIZED",
    )

    assert result.tensor.shape == (1, 3, 640, 640)
    assert result.tensor.dtype == np.float32
    assert float(result.tensor.min()) == 0.0
    assert float(result.tensor.max()) == 1.0


def test_preprocess_thermal_raw_uint8_normalized_with_three_channel_input():
    rgb = np.array(
        [
            [[0, 0, 0], [255, 0, 0]],
            [[0, 255, 0], [0, 0, 255]],
        ],
        dtype=np.uint8,
    )
    image_bytes = _to_png_bytes(rgb, mode="RGB")

    result = preprocess.preprocess_image_bytes(
        image_bytes,
        640,
        input_type="THERMAL",
        preprocess_id="RAW_UINT8_NORMALIZED",
    )

    assert result.tensor.shape == (1, 3, 640, 640)
    assert result.tensor.dtype == np.float32
    assert result.originalWidth == 2
    assert result.originalHeight == 2


def test_preprocess_thermal_raw_uint8_normalized_handles_flat_image():
    image_bytes = _to_png_bytes(np.full((2, 2), 5, dtype=np.uint16), mode="I;16")

    result = preprocess.preprocess_image_bytes(
        image_bytes,
        640,
        input_type="THERMAL",
        preprocess_id="RAW_UINT8_NORMALIZED",
    )

    assert np.count_nonzero(result.tensor) == 0
    assert result.tensor.shape == (1, 3, 640, 640)
    assert result.tensor.dtype == np.float32


def _to_png_bytes(array: np.ndarray, mode: str) -> bytes:
    image = Image.fromarray(array, mode=mode)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
