from dataclasses import dataclass
from io import BytesIO

from app.domain.inference_result import RestoredMask
from app.infrastructure.model.output_parser import ParsedDetection

RGB_CLASS_PALETTE = {
    "broken": (213, 94, 0),
    "bitki": (0, 158, 115),
    "dusty": (230, 159, 0),
    "missing": (204, 121, 167),
    "shading": (0, 114, 178),
}
RGB_CLASS_PALETTE_BY_ID = {
    0: RGB_CLASS_PALETTE["broken"],
    1: RGB_CLASS_PALETTE["bitki"],
    2: RGB_CLASS_PALETTE["dusty"],
    3: RGB_CLASS_PALETTE["missing"],
    4: RGB_CLASS_PALETTE["shading"],
}
RGB_FALLBACK_COLOR = (107, 114, 128)
RGB_BBOX_COLOR = (255, 0, 0)
RGB_BBOX_COLOR_BGR = (0, 0, 255)
RGB_BBOX_WIDTH = 5
RGB_LABEL_TEXT_COLOR_BGR = (255, 255, 255)
RGB_LABEL_X_PADDING = 5
RGB_LABEL_Y_PADDING = 3
RGB_LABEL_FONT_SCALE = 0.65
RGB_LABEL_FONT_THICKNESS = 1
_RGB_VIEWER_WIDTH = 1000.0
_RGB_VIEWER_HEIGHT = 560.0
_RGB_TARGET_DISPLAY_TEXT_HEIGHT = 8.0
_RGB_TARGET_DISPLAY_TEXT_THICKNESS = 1.0
_RGB_TARGET_DISPLAY_PADDING_X = 3.0
_RGB_TARGET_DISPLAY_PADDING_Y = 2.0
_RGB_SOURCE_TEXT_THICKNESS_CAP = 16
_RGB_SOURCE_PADDING_CAP = 40
RGB_MASK_CONTOUR_WIDTH = 4
THERMAL_BBOX_COLOR = (255, 0, 0)
THERMAL_BBOX_WIDTH = 2
MASK_ALPHA = 128


@dataclass(frozen=True)
class _RgbLabelStyle:
    font_scale: float
    text_thickness: int
    padding_x: int
    padding_y: int


def draw_bbox_overlay(
    image_bytes: bytes,
    detections: list[ParsedDetection],
    image_format: str = "PNG",
) -> bytes:
    try:
        import cv2
        import numpy as np
        from PIL import Image
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("Pillow, numpy, and opencv-python are required to draw bbox overlays.") from exc

    if not image_bytes:
        raise ValueError("Image bytes are empty.")

    with Image.open(BytesIO(image_bytes)) as image:
        canvas = image.convert("RGB")
        width, height = canvas.size
        canvas_bgr = cv2.cvtColor(np.asarray(canvas), cv2.COLOR_RGB2BGR)

        for detection in detections:
            bbox = _normalize_bbox(detection, width, height)
            if bbox is None:
                continue

            x1, y1, x2, y2 = bbox
            if str(detection.source).upper() == "RGB":
                cv2.rectangle(
                    canvas_bgr,
                    (x1, y1),
                    (x2, y2),
                    RGB_BBOX_COLOR_BGR,
                    thickness=RGB_BBOX_WIDTH,
                )
                _draw_rgb_label(
                    canvas_bgr,
                    width=width,
                    height=height,
                    x1=x1,
                    y1=y1,
                    label=_resolve_detection_label(detection),
                )
            else:
                cv2.rectangle(
                    canvas_bgr,
                    (x1, y1),
                    (x2, y2),
                    _rgb_to_bgr(THERMAL_BBOX_COLOR),
                    thickness=THERMAL_BBOX_WIDTH,
                )

        output = BytesIO()
        Image.fromarray(cv2.cvtColor(canvas_bgr, cv2.COLOR_BGR2RGB)).save(output, format=image_format)
        return output.getvalue()


def draw_mask_overlay(
    image_bytes: bytes,
    masks: list[RestoredMask],
    image_format: str = "PNG",
) -> bytes:
    try:
        import cv2
        import numpy as np
        from PIL import Image
    except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
        raise ModuleNotFoundError("Pillow, numpy, and opencv-python are required to draw mask overlays.") from exc

    if not image_bytes:
        raise ValueError("Image bytes are empty.")

    with Image.open(BytesIO(image_bytes)) as image:
        canvas = image.convert("RGBA")

        ordered_masks = sorted(
            masks,
            key=lambda item: item.confidence if item.confidence is not None else -1.0,
        )

        for restored_mask in ordered_masks:
            if not restored_mask.data:
                continue

            mask_array = np.asarray(restored_mask.data, dtype="uint8")
            if mask_array.ndim != 2:
                continue

            binary_mask = _prepare_binary_mask(mask_array, canvas.size)
            if binary_mask is None:
                continue

            alpha_image = Image.fromarray(binary_mask * MASK_ALPHA, mode="L")

            overlay = Image.new("RGBA", canvas.size, _resolve_restored_mask_color(restored_mask) + (0,))
            overlay.putalpha(alpha_image)
            canvas = Image.alpha_composite(canvas, overlay)

        canvas_bgr = cv2.cvtColor(np.asarray(canvas.convert("RGB")), cv2.COLOR_RGB2BGR)
        for restored_mask in ordered_masks:
            if not restored_mask.data:
                continue

            mask_array = np.asarray(restored_mask.data, dtype="uint8")
            if mask_array.ndim != 2:
                continue

            binary_mask = _prepare_binary_mask(mask_array, canvas.size)
            if binary_mask is None or not bool(binary_mask.any()):
                continue

            contours, _ = cv2.findContours(
                (binary_mask * 255).copy(),
                cv2.RETR_EXTERNAL,
                cv2.CHAIN_APPROX_SIMPLE,
            )
            if not contours:
                continue

            cv2.drawContours(
                canvas_bgr,
                contours,
                -1,
                _rgb_to_bgr(_resolve_restored_mask_color(restored_mask)),
                thickness=RGB_MASK_CONTOUR_WIDTH,
                lineType=cv2.LINE_AA,
            )

        output = BytesIO()
        Image.fromarray(cv2.cvtColor(canvas_bgr, cv2.COLOR_BGR2RGB)).save(output, format=image_format)
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


def _calculate_rgb_viewer_fit_scale(
    image_width: int,
    image_height: int,
) -> float:
    if image_width <= 0 or image_height <= 0:
        raise ValueError(
            "RGB overlay image dimensions must be positive: "
            f"width={image_width}, height={image_height}"
        )

    return min(
        _RGB_VIEWER_WIDTH / float(image_width),
        _RGB_VIEWER_HEIGHT / float(image_height),
    )


def _measure_rgb_text_height(
    text: str,
    font_scale: float,
    text_thickness: int,
) -> int:
    import cv2

    (_, text_height), _ = cv2.getTextSize(
        text,
        cv2.FONT_HERSHEY_SIMPLEX,
        font_scale,
        text_thickness,
    )
    return max(1, int(text_height))


def _resolve_rgb_label_style(
    *,
    image_width: int,
    image_height: int,
    label: str,
) -> _RgbLabelStyle:
    fit_scale = _calculate_rgb_viewer_fit_scale(
        image_width=image_width,
        image_height=image_height,
    )

    baseline_source_text_height = _measure_rgb_text_height(
        label,
        RGB_LABEL_FONT_SCALE,
        RGB_LABEL_FONT_THICKNESS,
    )
    baseline_display_text_height = baseline_source_text_height * fit_scale
    if baseline_display_text_height >= _RGB_TARGET_DISPLAY_TEXT_HEIGHT:
        return _RgbLabelStyle(
            font_scale=RGB_LABEL_FONT_SCALE,
            text_thickness=RGB_LABEL_FONT_THICKNESS,
            padding_x=RGB_LABEL_X_PADDING,
            padding_y=RGB_LABEL_Y_PADDING,
        )

    source_text_thickness = min(
        _RGB_SOURCE_TEXT_THICKNESS_CAP,
        max(
            RGB_LABEL_FONT_THICKNESS,
            round(_RGB_TARGET_DISPLAY_TEXT_THICKNESS / fit_scale),
        ),
    )
    target_source_text_height = _RGB_TARGET_DISPLAY_TEXT_HEIGHT / fit_scale
    text_height_at_scale_one = _measure_rgb_text_height(
        label,
        1.0,
        source_text_thickness,
    )
    font_scale = target_source_text_height / float(text_height_at_scale_one)
    source_padding_x = min(
        _RGB_SOURCE_PADDING_CAP,
        max(
            RGB_LABEL_X_PADDING,
            round(_RGB_TARGET_DISPLAY_PADDING_X / fit_scale),
        ),
    )
    source_padding_y = min(
        _RGB_SOURCE_PADDING_CAP,
        max(
            RGB_LABEL_Y_PADDING,
            round(_RGB_TARGET_DISPLAY_PADDING_Y / fit_scale),
        ),
    )

    return _RgbLabelStyle(
        font_scale=max(0.1, float(font_scale)),
        text_thickness=int(source_text_thickness),
        padding_x=int(source_padding_x),
        padding_y=int(source_padding_y),
    )


def _draw_rgb_label(
    canvas_bgr,
    *,
    width: int,
    height: int,
    x1: int,
    y1: int,
    label: str | None,
) -> None:
    import cv2

    if not label:
        return

    text = label.strip()
    if not text:
        return

    label_style = _resolve_rgb_label_style(
        image_width=width,
        image_height=height,
        label=text,
    )
    (text_width, text_height), baseline = cv2.getTextSize(
        text,
        cv2.FONT_HERSHEY_SIMPLEX,
        label_style.font_scale,
        label_style.text_thickness,
    )
    box_width = min(width, text_width + (label_style.padding_x * 2))
    box_height = min(height, text_height + baseline + (label_style.padding_y * 2))
    label_left = min(max(0, x1), max(0, width - box_width))
    preferred_top = y1 - box_height
    label_top = preferred_top if preferred_top >= 0 else min(max(0, y1), max(0, height - box_height))
    label_right = label_left + box_width
    label_bottom = label_top + box_height
    text_x = min(max(label_left + label_style.padding_x, 0), max(0, width - text_width))
    text_y = min(
        max(label_top + label_style.padding_y + text_height, text_height),
        max(text_height, height - baseline - label_style.padding_y),
    )

    cv2.rectangle(
        canvas_bgr,
        (label_left, label_top),
        (label_right, label_bottom),
        RGB_BBOX_COLOR_BGR,
        thickness=-1,
    )
    cv2.putText(
        canvas_bgr,
        text,
        (text_x, text_y),
        cv2.FONT_HERSHEY_SIMPLEX,
        label_style.font_scale,
        RGB_LABEL_TEXT_COLOR_BGR,
        thickness=label_style.text_thickness,
        lineType=cv2.LINE_AA,
    )


def _resolve_detection_color(detection: ParsedDetection) -> tuple[int, int, int]:
    if str(detection.source).upper() != "RGB":
        return THERMAL_BBOX_COLOR
    return _resolve_rgb_color(detection.class_id, detection.class_name)


def _resolve_restored_mask_color(restored_mask: RestoredMask) -> tuple[int, int, int]:
    return _resolve_rgb_color(restored_mask.classId, restored_mask.className)


def _resolve_detection_label(detection: ParsedDetection) -> str | None:
    if str(detection.source).upper() != "RGB":
        return None
    if detection.model_class_name:
        return detection.model_class_name
    if detection.class_name:
        return detection.class_name
    return None


def _resolve_rgb_color(class_id: int | None, class_name: str | None) -> tuple[int, int, int]:
    if class_name:
        normalized = class_name.strip().lower()
        if normalized in RGB_CLASS_PALETTE:
            return RGB_CLASS_PALETTE[normalized]
    if class_id in RGB_CLASS_PALETTE_BY_ID:
        return RGB_CLASS_PALETTE_BY_ID[class_id]
    return RGB_FALLBACK_COLOR


def _prepare_binary_mask(mask_array, canvas_size: tuple[int, int]):
    from PIL import Image
    import numpy as np

    canvas_width, canvas_height = canvas_size
    if mask_array.shape == (canvas_height, canvas_width):
        return (mask_array > 0).astype("uint8")

    resized = Image.fromarray(mask_array * 255, mode="L").resize(canvas_size, resample=Image.NEAREST)
    return (np.asarray(resized, dtype="uint8") > 0).astype("uint8")


def _rgb_to_bgr(color: tuple[int, int, int]) -> tuple[int, int, int]:
    return color[2], color[1], color[0]
