from io import BytesIO

import numpy as np
from PIL import Image

from app.infrastructure.model import preprocess


def test_preprocess_passes_decode_resize_and_tensor_steps(monkeypatch):
    calls = []
    decoded = np.zeros((4, 5, 3), dtype=np.uint8)
    resized = np.zeros((640, 640, 3), dtype=np.uint8)

    def fake_decode(image_bytes):
        calls.append(("decode", image_bytes))
        return decoded

    def fake_resize(image, input_size):
        calls.append(("resize", image, input_size))
        return resized

    def fake_tensor(image):
        calls.append(("tensor", image))
        return "tensor"

    monkeypatch.setattr(preprocess, "decode_image_bytes", fake_decode)
    monkeypatch.setattr(preprocess, "resize_image", fake_resize)
    monkeypatch.setattr(preprocess, "to_batched_chw_tensor", fake_tensor)

    result = preprocess.preprocess_image_bytes(b"abc", 640)

    assert result.tensor == "tensor"
    assert calls[0] == ("decode", b"abc")
    assert calls[1][0] == "resize"
    assert calls[1][1] is decoded
    assert calls[1][2] == 640
    assert calls[2][0] == "tensor"
    assert calls[2][1] is resized


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
