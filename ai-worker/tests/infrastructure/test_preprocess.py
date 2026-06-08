from app.infrastructure.model import preprocess


def test_preprocess_passes_decode_resize_and_tensor_steps(monkeypatch):
    calls = []

    def fake_decode(image_bytes):
        calls.append(("decode", image_bytes))
        return "decoded"

    def fake_resize(image, input_size):
        calls.append(("resize", image, input_size))
        return "resized"

    def fake_tensor(image):
        calls.append(("tensor", image))
        return "tensor"

    monkeypatch.setattr(preprocess, "decode_image_bytes", fake_decode)
    monkeypatch.setattr(preprocess, "resize_image", fake_resize)
    monkeypatch.setattr(preprocess, "to_batched_chw_tensor", fake_tensor)

    result = preprocess.preprocess_image_bytes(b"abc", 640)

    assert result == "tensor"
    assert calls == [
        ("decode", b"abc"),
        ("resize", "decoded", 640),
        ("tensor", "resized"),
    ]


def test_decode_image_bytes_rejects_empty_payload():
    try:
        preprocess.decode_image_bytes(b"")
    except ValueError as exc:
        assert str(exc) == "Image bytes are empty."
    else:
        raise AssertionError("Expected ValueError for empty image bytes.")
