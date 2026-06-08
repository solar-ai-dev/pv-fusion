from typing import Any


def preprocess_image_bytes(image_bytes: bytes, input_size: int) -> Any:
    image = decode_image_bytes(image_bytes)
    resized = resize_image(image, input_size)
    return to_batched_chw_tensor(resized)


def decode_image_bytes(image_bytes: bytes) -> Any:
    if not image_bytes:
        raise ValueError("Image bytes are empty.")
    try:
        from io import BytesIO

        import numpy as np
        from PIL import Image
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("Pillow and numpy are required to decode image bytes.") from exc

    with Image.open(BytesIO(image_bytes)) as image:
        return np.array(image.convert("RGB"))


def resize_image(image: Any, input_size: int) -> Any:
    try:
        import numpy as np
        from PIL import Image
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("Pillow and numpy are required to resize image data.") from exc

    return np.array(Image.fromarray(image).resize((input_size, input_size)))


def to_batched_chw_tensor(image: Any) -> Any:
    try:
        import numpy as np
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("numpy is required to build the model input tensor.") from exc

    tensor = image.astype("float32") / 255.0
    tensor = np.transpose(tensor, (2, 0, 1))
    return np.expand_dims(tensor, axis=0)
