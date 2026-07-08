from io import BytesIO

from app.domain.inference_result import RestoredMask
from app.infrastructure.model.output_parser import ParsedDetection


def draw_bbox_overlay(
    image_bytes: bytes,
    detections: list[ParsedDetection],
    image_format: str = "PNG",
) -> bytes:
    try:
        from PIL import Image, ImageDraw
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("Pillow is required to draw bbox overlays.") from exc

    if not image_bytes:
        raise ValueError("Image bytes are empty.")

    with Image.open(BytesIO(image_bytes)) as image:
        canvas = image.convert("RGB")
        draw = ImageDraw.Draw(canvas)
        width, height = canvas.size

        for detection in detections:
            bbox = _normalize_bbox(detection, width, height)
            if bbox is None:
                continue

            x1, y1, x2, y2 = bbox
            draw.rectangle((x1, y1, x2, y2), outline=(255, 0, 0), width=2)

        output = BytesIO()
        canvas.save(output, format=image_format)
        return output.getvalue()


def draw_mask_overlay(
    image_bytes: bytes,
    masks: list[RestoredMask],
    image_format: str = "PNG",
) -> bytes:
    try:
        import numpy as np
        from PIL import Image
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("Pillow and numpy are required to draw mask overlays.") from exc

    if not image_bytes:
        raise ValueError("Image bytes are empty.")

    with Image.open(BytesIO(image_bytes)) as image:
        canvas = image.convert("RGBA")
        alpha = np.zeros((canvas.height, canvas.width), dtype="uint8")

        for restored_mask in masks:
            if not restored_mask.data:
                continue

            mask_array = np.asarray(restored_mask.data, dtype="uint8")
            if mask_array.ndim != 2:
                continue

            resized = Image.fromarray(mask_array * 255, mode="L").resize(canvas.size, resample=Image.NEAREST)
            alpha = np.maximum(alpha, np.asarray(resized, dtype="uint8"))

        overlay = Image.new("RGBA", canvas.size, (255, 0, 0, 0))
        overlay.putalpha(Image.fromarray((alpha > 0).astype("uint8") * 96, mode="L"))
        output = BytesIO()
        Image.alpha_composite(canvas, overlay).convert("RGB").save(output, format=image_format)
        return output.getvalue()


def _normalize_bbox(
    detection: ParsedDetection,
    image_width: int,
    image_height: int,
) -> tuple[int, int, int, int] | None:
    x = detection.bbox_x
    y = detection.bbox_y
    width = detection.bbox_width
    height = detection.bbox_height
    if width <= 0 or height <= 0:
        return None

    if _looks_normalized(x, y, width, height):
        x *= image_width
        y *= image_height
        width *= image_width
        height *= image_height

    x1 = int(round(x))
    y1 = int(round(y))
    x2 = int(round(x + width))
    y2 = int(round(y + height))

    x1, x2 = sorted((x1, x2))
    y1, y2 = sorted((y1, y2))

    x1 = max(0, min(image_width - 1, x1))
    y1 = max(0, min(image_height - 1, y1))
    x2 = max(0, min(image_width - 1, x2))
    y2 = max(0, min(image_height - 1, y2))

    if x2 <= x1 or y2 <= y1:
        return None
    return x1, y1, x2, y2


def _looks_normalized(x: float, y: float, width: float, height: float) -> bool:
    return 0.0 <= x <= 1.0 and 0.0 <= y <= 1.0 and 0.0 <= width <= 1.0 and 0.0 <= height <= 1.0
