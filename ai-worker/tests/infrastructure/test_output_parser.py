from app.domain.enums import ModelType, RequestedModelType, ResultStatus
from app.domain.model import ModelInfo
from app.infrastructure.model.output_parser import extract_detections, parse_inference_output, restore_rgb_instance_masks


def build_model_info(
    model_type: ModelType,
    threshold: str = "0.50",
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
        inputSize=640,
        threshold=threshold,
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


def test_thermal_output_below_threshold_is_filtered_out():
    raw_output = [[[10, 20, 30, 50, 0.3, 2]]]

    result = parse_inference_output(raw_output, build_model_info(ModelType.THERMAL_ONLY, threshold="0.50"))

    assert result.resultStatus is ResultStatus.NORMAL
    assert result.anomalyCount == 0
    assert result.maxConfidence is None
    assert result.defects == []


def test_thermal_output_uses_unknown_for_unmapped_class_name():
    detections = extract_detections([[[10, 20, 30, 50, 0.9, 99]]], build_model_info(ModelType.THERMAL_ONLY))
    result = parse_inference_output([[[10, 20, 30, 50, 0.9, 99]]], build_model_info(ModelType.THERMAL_ONLY))

    assert detections[0].class_name is None
    assert result.defects[0].defectType == "UNKNOWN"


def test_thermal_output_uses_allowed_manifest_class_name_as_defect_type():
    result = parse_inference_output(
        [[[10, 20, 30, 50, 0.9, 0]]],
        build_model_info(ModelType.THERMAL_ONLY, class_names=["DUST"]),
    )

    assert result.defects[0].defectType == "DUST"


def test_rgb_output_uses_unknown_for_non_enum_manifest_class_name():
    output0 = [[[10, 20, 30, 50, 0.9, 0] + ([0] * 32)]]
    output1 = [[[[0] * 192 for _ in range(192)] for _ in range(32)]]

    result = parse_inference_output(
        [output0, output1],
        build_model_info(ModelType.RGB_ONLY, class_names=["dusty"]),
    )

    assert result.defects[0].defectType == "UNKNOWN"


def test_rgb_output_with_two_tensors_does_not_crash_and_ignores_mask_proto():
    output0 = [[[10, 20, 30, 50, 0.9, 1] + ([0] * 32)]]
    output1 = [[[[0] * 192 for _ in range(192)] for _ in range(32)]]

    result = parse_inference_output([output0, output1], build_model_info(ModelType.RGB_ONLY))

    assert result.resultStatus is ResultStatus.ANOMALY
    assert result.anomalyCount == 1
    assert result.defects[0].defectSource == "RGB"


def test_empty_detections_return_normal_result():
    output0 = [[[10, 20, 30, 50, 0.1, 1] + ([0] * 32)]]
    output1 = [[[[0] * 192 for _ in range(192)] for _ in range(32)]]

    result = parse_inference_output([output0, output1], build_model_info(ModelType.RGB_ONLY))

    assert result.resultStatus is ResultStatus.NORMAL
    assert result.anomalyCount == 0
    assert result.maxConfidence is None


def test_restore_rgb_instance_masks_returns_mask_for_matching_coefficients():
    output0 = [[[10, 20, 30, 50, 0.9, 1] + ([1.0] * 32)]]
    output1 = [[[[1.0] * 192 for _ in range(192)] for _ in range(32)]]

    restored_masks = restore_rgb_instance_masks([output0, output1], build_model_info(ModelType.RGB_ONLY))

    assert len(restored_masks) == 1
    assert len(restored_masks[0].data) == 192
    assert len(restored_masks[0].data[0]) == 192
    assert sum(sum(row) for row in restored_masks[0].data) > 0


def test_restore_rgb_instance_masks_skips_when_coefficient_count_mismatches_prototype_channels():
    output0 = [[[10, 20, 30, 50, 0.9, 1] + ([1.0] * 31)]]
    output1 = [[[[1.0] * 192 for _ in range(192)] for _ in range(32)]]

    restored_masks = restore_rgb_instance_masks([output0, output1], build_model_info(ModelType.RGB_ONLY))
    result = parse_inference_output([output0, output1], build_model_info(ModelType.RGB_ONLY))

    assert restored_masks == []
    assert result.anomalyCount == 1
