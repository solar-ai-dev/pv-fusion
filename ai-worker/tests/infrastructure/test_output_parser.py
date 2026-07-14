from decimal import Decimal

import numpy as np
import pytest

from app.domain.enums import ActionCandidate, ModelType, RequestedModelType, ResultStatus
from app.domain.model import ModelInfo
from app.infrastructure.model.output_parser import extract_detections, parse_inference_output, restore_rgb_instance_masks


def build_model_info(
    model_type: ModelType,
    *,
    input_size: int = 8,
    threshold: str = "0.15",
    nms_iou_threshold: str = "0.40",
    mask_threshold: str | None = "0.30",
    class_names: list[str] | None = None,
) -> ModelInfo:
    return ModelInfo(
        modelPath="models/test.onnx",
        modelType=model_type,
        requestedModelType=RequestedModelType.RGB_ONLY
        if model_type is ModelType.RGB_ONLY
        else RequestedModelType.THERMAL_ONLY,
        modelName="test-model",
        modelVersion="v0",
        modelFormat="onnx",
        runtime="onnxruntime",
        inputSize=input_size,
        threshold=threshold,
        nmsIouThreshold=nms_iou_threshold,
        maskThreshold=mask_threshold,
        classNames=class_names or [],
    )


def test_thermal_output_above_threshold_is_converted_to_defect():
    raw_output = [[[10, 20, 30, 50, 0.9, 2], [0, 0, 0, 0, 0.2, 1]]]

    result = parse_inference_output(raw_output, build_model_info(ModelType.THERMAL_ONLY))

    assert result.resultStatus is ResultStatus.ANOMALY
    assert result.anomalyCount == 1
    assert str(result.maxConfidence) == "0.9"
    assert result.defects[0].bboxX == 10
    assert result.defects[0].bboxY == 20
    assert result.defects[0].bboxWidth == 20
    assert result.defects[0].bboxHeight == 30


def test_thermal_output_restores_bbox_from_letterboxed_coordinates():
    detections = extract_detections(
        [[[100, 200, 300, 320, 0.9, 0]]],
        build_model_info(ModelType.THERMAL_ONLY, class_names=["HotSpot"]),
        image_context=_image_context(
            original_width=320,
            original_height=160,
            resized_width=640,
            resized_height=320,
            scale_x=2.0,
            scale_y=2.0,
            pad_x=0,
            pad_y=160,
        ),
    )

    assert detections[0].bbox_x == 50
    assert detections[0].bbox_y == 20
    assert detections[0].bbox_width == 100
    assert detections[0].bbox_height == 60


def test_rgb_confidence_below_threshold_is_filtered_out():
    output0, output1 = _build_rgb_outputs([[1, 1, 7, 7, 0.14, 0] + ([1.0] * 32)])

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=["broken"]),
    )

    assert result.resultStatus is ResultStatus.NORMAL
    assert result.anomalyCount == 0
    assert result.defects == []
    assert result.areaRatio == Decimal("0.0")


def test_rgb_same_class_nms_iou_040_keeps_higher_confidence_only():
    output0, output1 = _build_rgb_outputs(
        [
            [1, 1, 7, 7, 0.95, 0] + ([1.0] * 32),
            [1, 1, 7, 7, 0.80, 0] + ([1.0] * 32),
        ]
    )

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=["broken"]),
    )

    assert result.anomalyCount == 1
    assert float(result.defects[0].confidence) == pytest.approx(0.95, rel=1e-6)


def test_rgb_different_class_overlap_is_preserved():
    output0, output1 = _build_rgb_outputs(
        [
            [1, 1, 7, 7, 0.95, 0] + ([1.0] * 32),
            [1, 1, 7, 7, 0.80, 1] + ([1.0] * 32),
        ]
    )

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=["broken", "bitki"]),
    )

    assert result.anomalyCount == 2
    assert [defect.defectType for defect in result.defects] == ["APPEARANCE_DAMAGE", "VEGETATION"]
    assert len(result.restoredMasks) == 2


def test_rgb_restores_bbox_mask_and_area_ratio_to_original_coordinates():
    output0, output1 = _build_rgb_outputs([[2, 2, 6, 6, 0.90, 0] + ([1.0] * 32)])
    image_context = _image_context(
        original_width=4,
        original_height=2,
        resized_width=8,
        resized_height=4,
        scale_x=2.0,
        scale_y=2.0,
        pad_x=0,
        pad_y=2,
    )

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=["broken"]),
        image_context=image_context,
    )

    assert result.anomalyCount == 1
    assert result.defects[0].bboxX == 1
    assert result.defects[0].bboxY == 0
    assert result.defects[0].bboxWidth == 2
    assert result.defects[0].bboxHeight == 2
    assert result.defects[0].areaRatio == Decimal("0.5")
    assert result.areaRatio == Decimal("0.5")
    assert len(result.restoredMasks) == 1
    assert len(result.restoredMasks[0].data) == 2
    assert len(result.restoredMasks[0].data[0]) == 4


def test_rgb_recomputes_bbox_from_final_mask_pixels():
    coefficients = [1.0] + ([0.0] * 31)
    output0 = np.asarray([[[0, 0, 4, 4, 0.90, 0] + coefficients]], dtype=np.float32)
    output1 = np.full((1, 32, 4, 4), -10.0, dtype=np.float32)
    output1[0, 0, 1:3, 1:3] = 10.0

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, input_size=4, class_names=["broken"]),
    )

    assert result.anomalyCount == 1
    assert result.defects[0].bboxX == 1
    assert result.defects[0].bboxY == 1
    assert result.defects[0].bboxWidth == 2
    assert result.defects[0].bboxHeight == 2
    assert result.restoredMasks[0].bboxX == 1
    assert result.restoredMasks[0].bboxY == 1
    assert result.restoredMasks[0].bboxWidth == 2
    assert result.restoredMasks[0].bboxHeight == 2
    _assert_bbox_contains_mask(result.restoredMasks[0], result.defects[0])


@pytest.mark.parametrize(
    (
        "context_kwargs",
        "original_size",
    ),
    [
        (
            {
                "original_width": 8,
                "original_height": 4,
                "resized_width": 8,
                "resized_height": 4,
                "scale_x": 1.0,
                "scale_y": 1.0,
                "pad_x": 0,
                "pad_y": 2,
            },
            (8, 4),
        ),
        (
            {
                "original_width": 4,
                "original_height": 8,
                "resized_width": 4,
                "resized_height": 8,
                "scale_x": 1.0,
                "scale_y": 1.0,
                "pad_x": 2,
                "pad_y": 0,
            },
            (4, 8),
        ),
        (
            {
                "original_width": 7,
                "original_height": 6,
                "resized_width": 8,
                "resized_height": 7,
                "scale_x": 8 / 7,
                "scale_y": 8 / 7,
                "pad_x": 0,
                "pad_y": 0,
            },
            (7, 6),
        ),
    ],
)
def test_rgb_recomputed_bbox_contains_mask_for_original_image_shapes(context_kwargs, original_size):
    coefficients = [1.0] + ([0.0] * 31)
    output0 = np.asarray([[[0, 0, 8, 8, 0.90, 0] + coefficients]], dtype=np.float32)
    output1 = np.full((1, 32, 4, 4), -10.0, dtype=np.float32)
    output1[0, 0, 1:3, 1:3] = 10.0
    image_context = _image_context(**context_kwargs)

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=["broken"]),
        image_context=image_context,
    )

    assert result.anomalyCount == 1
    defect = result.defects[0]
    restored_mask = result.restoredMasks[0]
    original_width, original_height = original_size
    assert 0 <= defect.bboxX < defect.bboxX + defect.bboxWidth <= original_width
    assert 0 <= defect.bboxY < defect.bboxY + defect.bboxHeight <= original_height
    _assert_bbox_contains_mask(restored_mask, defect)


def test_rgb_result_area_ratio_uses_union_for_non_overlapping_masks():
    output0, output1 = _build_rgb_outputs(
        [
            [0, 0, 2, 2, 0.90, 0] + ([1.0] * 32),
            [6, 6, 8, 8, 0.80, 1] + ([1.0] * 32),
        ]
    )

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=["broken", "bitki"]),
    )

    assert result.defects[0].areaRatio == Decimal("0.0625")
    assert result.defects[1].areaRatio == Decimal("0.0625")
    assert result.areaRatio == Decimal("0.125")


def test_rgb_result_area_ratio_uses_union_for_partially_overlapping_masks():
    output0, output1 = _build_rgb_outputs(
        [
            [0, 0, 4, 4, 0.90, 0] + ([1.0] * 32),
            [2, 2, 6, 6, 0.80, 1] + ([1.0] * 32),
        ]
    )

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=["broken", "bitki"]),
    )

    assert result.defects[0].areaRatio == Decimal("0.25")
    assert result.defects[1].areaRatio == Decimal("0.25")
    assert result.areaRatio == Decimal("0.4375")


def test_rgb_result_area_ratio_counts_fully_overlapping_masks_once():
    output0, output1 = _build_rgb_outputs(
        [
            [0, 0, 4, 4, 0.90, 0] + ([1.0] * 32),
            [0, 0, 4, 4, 0.80, 1] + ([1.0] * 32),
        ]
    )

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=["broken", "bitki"]),
    )

    assert result.defects[0].areaRatio == Decimal("0.25")
    assert result.defects[1].areaRatio == Decimal("0.25")
    assert result.areaRatio == Decimal("0.25")


def test_rgb_result_area_ratio_uses_union_after_same_class_nms_survivors():
    output0, output1 = _build_rgb_outputs(
        [
            [0, 0, 4, 4, 0.95, 0] + ([1.0] * 32),
            [2, 0, 6, 4, 0.85, 0] + ([1.0] * 32),
        ]
    )

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=["broken"]),
    )

    assert result.anomalyCount == 2
    assert result.defects[0].areaRatio == Decimal("0.25")
    assert result.defects[1].areaRatio == Decimal("0.25")
    assert result.areaRatio == Decimal("0.375")
    assert result.areaRatio != sum(defect.areaRatio for defect in result.defects if defect.areaRatio is not None)


def test_rgb_mask_threshold_030_is_loaded_and_applied():
    output0, output1 = _build_rgb_outputs([[0, 0, 8, 8, 0.90, 0] + ([0.0] * 32)], prototype_value=0.0)

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=["shading"], mask_threshold="0.30"),
    )

    assert result.anomalyCount == 1
    assert result.defects[0].areaRatio == Decimal("1.0")
    assert result.areaRatio == Decimal("1.0")


def test_rgb_empty_final_mask_candidate_is_removed():
    coefficients = [1.0] + ([0.0] * 31)
    output0 = np.asarray([[[0, 0, 8, 8, 0.90, 0] + coefficients]], dtype=np.float32)
    output1 = np.full((1, 32, 4, 4), -10.0, dtype=np.float32)

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=["broken"]),
    )

    assert result.resultStatus is ResultStatus.NORMAL
    assert result.anomalyCount == 0
    assert result.defects == []
    assert result.restoredMasks == []
    assert result.areaRatio == Decimal("0.0")


def test_rgb_five_class_mapping_uses_existing_contract_enums():
    class_names = ["broken", "bitki", "dusty", "missing", "shading"]
    rows = [
        [0, 0, 8, 8, 0.90, 0] + ([1.0] * 32),
        [0, 0, 8, 8, 0.90, 1] + ([1.0] * 32),
        [0, 0, 8, 8, 0.90, 2] + ([1.0] * 32),
        [0, 0, 8, 8, 0.90, 3] + ([1.0] * 32),
        [0, 0, 8, 8, 0.90, 4] + ([1.0] * 32),
    ]
    output0, output1 = _build_rgb_outputs(rows)

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=class_names),
    )

    assert [defect.defectType for defect in result.defects] == [
        "APPEARANCE_DAMAGE",
        "VEGETATION",
        "DUST",
        "APPEARANCE_DAMAGE",
        "SHADING",
    ]
    assert result.defects[2].actionCandidate == ActionCandidate.CLEANING


def test_rgb_dusty_maps_to_existing_cleaning_contract():
    output0, output1 = _build_rgb_outputs([[0, 0, 8, 8, 0.90, 0] + ([1.0] * 32)])

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=["dusty"]),
    )

    assert result.defects[0].defectType == "DUST"
    assert result.defects[0].actionCandidate == ActionCandidate.CLEANING
    assert result.actionCandidate == ActionCandidate.CLEANING


def test_restore_rgb_instance_masks_returns_original_size_masks():
    output0, output1 = _build_rgb_outputs([[2, 2, 6, 6, 0.90, 0] + ([1.0] * 32)])

    restored_masks = restore_rgb_instance_masks(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=["broken"]),
        image_context=_image_context(
            original_width=4,
            original_height=2,
            resized_width=8,
            resized_height=4,
            scale_x=2.0,
            scale_y=2.0,
            pad_x=0,
            pad_y=2,
        ),
    )

    assert len(restored_masks) == 1
    assert len(restored_masks[0].data) == 2
    assert len(restored_masks[0].data[0]) == 4


def test_rgb_invalid_output_shape_raises_value_error():
    output0 = np.asarray([[[0, 0, 8, 8, 0.90, 0] + ([1.0] * 31)]], dtype=np.float32)
    output1 = np.ones((1, 32, 4, 4), dtype=np.float32)

    with pytest.raises(ValueError, match="RGB output0 row shape is invalid"):
        parse_inference_output(
            [output0, output1],
            build_model_info(ModelType.RGB_ONLY, class_names=["broken"]),
        )


def _build_rgb_outputs(rows: list[list[float]], *, prototype_value: float = 1.0, prototype_size: int = 4):
    output0 = np.asarray([rows], dtype=np.float32)
    output1 = np.full((1, 32, prototype_size, prototype_size), prototype_value, dtype=np.float32)
    return output0, output1


def _image_context(
    *,
    original_width: int,
    original_height: int,
    resized_width: int,
    resized_height: int,
    scale_x: float,
    scale_y: float,
    pad_x: int,
    pad_y: int,
):
    return type(
        "ImageContext",
        (),
        {
            "originalWidth": original_width,
            "originalHeight": original_height,
            "resizedWidth": resized_width,
            "resizedHeight": resized_height,
            "scaleX": scale_x,
            "scaleY": scale_y,
            "padX": pad_x,
            "padY": pad_y,
        },
    )()


def _assert_bbox_contains_mask(restored_mask, defect):
    mask = np.asarray(restored_mask.data, dtype=np.uint8)
    ys, xs = np.where(mask > 0)
    assert xs.size > 0
    assert ys.size > 0

    x1 = defect.bboxX
    y1 = defect.bboxY
    x2 = defect.bboxX + defect.bboxWidth
    y2 = defect.bboxY + defect.bboxHeight
    assert xs.min() >= x1
    assert ys.min() >= y1
    assert xs.max() + 1 <= x2
    assert ys.max() + 1 <= y2
