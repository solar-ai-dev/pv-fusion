from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class PreprocessedImage:
    tensor: Any
    originalWidth: int
    originalHeight: int
    resizedWidth: int
    resizedHeight: int
    scaleX: float
    scaleY: float
    padX: int
    padY: int


def preprocess_image_bytes(
    image_bytes: bytes,
    input_size: int,
    *,
    input_type: str | None = None,
    preprocess_id: str | None = None,
) -> PreprocessedImage:
    if input_type == "THERMAL" and preprocess_id == "RAW_UINT8_NORMALIZED":
        return preprocess_thermal_image_bytes(image_bytes, input_size)

    image = decode_image_bytes(image_bytes)
    resized = resize_image(image, input_size)
    return PreprocessedImage(
        tensor=to_batched_chw_tensor(resized),
        originalWidth=int(image.shape[1]),
        originalHeight=int(image.shape[0]),
        resizedWidth=input_size,
        resizedHeight=input_size,
        scaleX=float(input_size) / float(image.shape[1]),
        scaleY=float(input_size) / float(image.shape[0]),
        padX=0,
        padY=0,
    )


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


def preprocess_thermal_image_bytes(image_bytes: bytes, input_size: int) -> PreprocessedImage:
    try:
        import numpy as np
        from PIL import Image
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("Pillow and numpy are required to preprocess thermal image bytes.") from exc

    grayscale = normalize_thermal_to_uint8(decode_raw_image_bytes(image_bytes))
    rgb_image = np.repeat(grayscale[:, :, None], 3, axis=2)
    letterboxed, resized_width, resized_height, pad_x, pad_y = letterbox_image(rgb_image, input_size)

    return PreprocessedImage(
        tensor=to_batched_chw_tensor(letterboxed),
        originalWidth=int(grayscale.shape[1]),
        originalHeight=int(grayscale.shape[0]),
        resizedWidth=resized_width,
        resizedHeight=resized_height,
        scaleX=float(resized_width) / float(grayscale.shape[1]),
        scaleY=float(resized_height) / float(grayscale.shape[0]),
        padX=pad_x,
        padY=pad_y,
    )


def decode_raw_image_bytes(image_bytes: bytes) -> Any:
    if not image_bytes:
        raise ValueError("Image bytes are empty.")
    try:
        from io import BytesIO

        import numpy as np
        from PIL import Image
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("Pillow and numpy are required to decode image bytes.") from exc

    with Image.open(BytesIO(image_bytes)) as image:
        return np.array(image)


def normalize_thermal_to_uint8(image: Any) -> Any:
    try:
        import numpy as np
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("numpy is required to normalize thermal image data.") from exc

    grayscale = to_grayscale(image).astype("float32", copy=False)
    min_value = float(grayscale.min())
    max_value = float(grayscale.max())
    if max_value > min_value:
        normalized = (grayscale - min_value) / (max_value - min_value) * 255.0
    else:
        normalized = np.zeros_like(grayscale, dtype="float32")
    return np.clip(normalized, 0.0, 255.0).astype("uint8")


def to_grayscale(image: Any) -> Any:
    try:
        import numpy as np
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("numpy is required to convert thermal image data.") from exc

    array = np.asarray(image)
    if array.ndim == 2:
        return array
    if array.ndim != 3:
        raise ValueError("Unsupported thermal image shape.")

    channels = array.shape[2]
    if channels == 1:
        return array[:, :, 0]
    if channels >= 3:
        rgb = array[:, :, :3].astype("float32", copy=False)
        return (0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]).astype(array.dtype)
    raise ValueError("Unsupported thermal image channel count.")


def letterbox_image(image: Any, input_size: int) -> tuple[Any, int, int, int, int]:
    try:
        import numpy as np
        from PIL import Image
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("Pillow and numpy are required to letterbox image data.") from exc

    original_height, original_width = image.shape[:2]
    scale = min(float(input_size) / float(original_width), float(input_size) / float(original_height))
    resized_width = max(1, int(round(original_width * scale)))
    resized_height = max(1, int(round(original_height * scale)))
    resized = np.array(Image.fromarray(image).resize((resized_width, resized_height), Image.BILINEAR))

    canvas = np.zeros((input_size, input_size, 3), dtype="uint8")
    pad_x = (input_size - resized_width) // 2
    pad_y = (input_size - resized_height) // 2
    canvas[pad_y:pad_y + resized_height, pad_x:pad_x + resized_width] = resized
    return canvas, resized_width, resized_height, pad_x, pad_y


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
