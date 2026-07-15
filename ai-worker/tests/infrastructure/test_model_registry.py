from pathlib import Path
from decimal import Decimal

import pytest

from app.config.settings import Settings
from app.domain.enums import InputType, ModelType, RequestedModelType
from app.infrastructure.model.model_manifest import load_model_manifest
from app.infrastructure.model.model_registry import ModelRegistry


def test_load_model_manifest_reads_required_fields(tmp_path: Path):
    manifest_path = _write_manifest(
        tmp_path / "rgb-manifest.yaml",
        model_name="pv-rgb",
        model_version="v1.0.0",
        input_type="RGB_SINGLE",
        model_type="RGB_ONLY",
        input_size=640,
        confidence_threshold="0.55",
        model_path="models/rgb.onnx",
        class_names=["A", "B"],
    )

    manifest = load_model_manifest(str(manifest_path))

    assert manifest.modelName == "pv-rgb"
    assert manifest.modelVersion == "v1.0.0"
    assert manifest.inputType is InputType.RGB_SINGLE
    assert manifest.modelType is ModelType.RGB_ONLY
    assert manifest.modelPath == str((tmp_path / "models" / "rgb.onnx").resolve())
    assert manifest.classNames == ["A", "B"]
    assert manifest.maskThreshold is None


def test_load_model_manifest_reads_stage10b_style_manifest_and_resolves_relative_model_path(tmp_path: Path):
    manifest_path = tmp_path / "thermal-stage10b.yaml"
    manifest_path.write_text(
        "\n".join(
            [
                "model_name: thermal-only-yolo26s-det",
                "model_version: th-final-aug-batch-08-stage10b",
                "model_type: THERMAL_ONLY",
                "input_type: THERMAL_SINGLE",
                "task: detect",
                "runtime: onnxruntime",
                "format: onnx",
                "model_path: thermal-only.onnx",
                "input_size: 640",
                "preprocess:",
                "  id: RAW_UINT8_NORMALIZED",
                "threshold:",
                "  conf: 0.55",
                "  iou: 0.45",
                "class_names:",
                "  0: HotSpot",
                "  1: Diode_ByPassed",
                "  2: String_Fault",
                "",
            ]
        ),
        encoding="utf-8",
    )

    manifest = load_model_manifest(str(manifest_path))

    assert manifest.preprocessId == "RAW_UINT8_NORMALIZED"
    assert str(manifest.confidenceThreshold) == "0.55"
    assert str(manifest.nmsIouThreshold) == "0.45"
    assert manifest.classNames == ["HotSpot", "Diode_ByPassed", "String_Fault"]
    assert manifest.modelPath == str((tmp_path / "thermal-only.onnx").resolve())


def test_load_model_manifest_reads_optional_mask_threshold(tmp_path: Path):
    manifest_path = _write_manifest(
        tmp_path / "rgb-manifest.yaml",
        model_name="pv-rgb",
        model_version="v1.0.0",
        input_type="RGB_SINGLE",
        model_type="RGB_ONLY",
        input_size=1280,
        confidence_threshold="0.15",
        model_path="models/rgb.onnx",
        class_names=["broken", "bitki", "dusty", "missing", "shading"],
        overrides={"mask_threshold": "0.30"},
    )

    manifest = load_model_manifest(str(manifest_path))

    assert manifest.maskThreshold == Decimal("0.30")


def test_load_model_manifest_resolves_models_prefix_relative_to_manifest_directory(tmp_path: Path):
    manifest_path = _write_manifest(
        tmp_path / "thermal-manifest.yaml",
        model_name="pv-thermal",
        model_version="v1.0.0",
        input_type="THERMAL_SINGLE",
        model_type="THERMAL_ONLY",
        input_size=640,
        confidence_threshold="0.60",
        model_path="models/thermal.onnx",
        class_names=["HOTSPOT"],
    )

    manifest = load_model_manifest(str(manifest_path))

    assert manifest.modelPath == str((tmp_path / "models" / "thermal.onnx").resolve())


def test_load_model_manifest_resolves_legacy_models_prefix_without_duplicating_manifest_directory(tmp_path: Path):
    manifest_dir = tmp_path / "models" / "rgb"
    manifest_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = _write_manifest(
        manifest_dir / "model-manifest.dev.yaml",
        model_name="pv-rgb",
        model_version="v1.0.0",
        input_type="RGB_SINGLE",
        model_type="RGB_ONLY",
        input_size=640,
        confidence_threshold="0.55",
        model_path="models/rgb/rgb.onnx",
        class_names=["A", "B"],
    )
    expected_model_path = tmp_path / "models" / "rgb" / "rgb.onnx"
    expected_model_path.write_bytes(b"fake")

    manifest = load_model_manifest(str(manifest_path))

    assert manifest.modelPath == str(expected_model_path.resolve())


def test_resolve_returns_rgb_model_for_rgb_single(tmp_path: Path):
    registry = ModelRegistry(_build_settings(tmp_path))

    model_info = registry.resolve(InputType.RGB_SINGLE, RequestedModelType.RGB_ONLY)

    assert model_info.modelPath == str((tmp_path / "models" / "rgb.onnx").resolve())
    assert model_info.modelType is ModelType.RGB_ONLY
    assert model_info.modelName == "pv-rgb"
    assert str(model_info.threshold) == "0.55"
    assert model_info.maskThreshold is None


def test_resolve_returns_thermal_model_for_thermal_single(tmp_path: Path):
    registry = ModelRegistry(
        _build_settings(
            tmp_path,
            thermal_overrides={
                "model_name": "pv-thermal",
                "model_version": "v1.2.0",
                "input_type": "THERMAL_SINGLE",
                "model_type": "THERMAL_ONLY",
                "input_size": 512,
                "confidence_threshold": "0.65",
                "model_path": "models/thermal.onnx",
                "class_names": ["HOTSPOT"],
            },
        )
    )

    model_info = registry.resolve(InputType.THERMAL_SINGLE, RequestedModelType.THERMAL_ONLY)

    assert model_info.modelPath == str((tmp_path / "models" / "thermal.onnx").resolve())
    assert model_info.modelType is ModelType.THERMAL_ONLY
    assert model_info.modelName == "pv-thermal"
    assert str(model_info.threshold) == "0.65"


def test_resolve_rejects_mismatched_requested_model_type(tmp_path: Path):
    registry = ModelRegistry(_build_settings(tmp_path))

    with pytest.raises(ValueError, match="Requested model type mismatch"):
        registry.resolve(InputType.RGB_SINGLE, RequestedModelType.THERMAL_ONLY)


def _build_settings(tmp_path: Path, thermal_overrides: dict | None = None) -> Settings:
    rgb_manifest = _write_manifest(
        tmp_path / "rgb-manifest.yaml",
        model_name="pv-rgb",
        model_version="v1.0.0",
        input_type="RGB_SINGLE",
        model_type="RGB_ONLY",
        input_size=640,
        confidence_threshold="0.55",
        model_path="models/rgb.onnx",
        class_names=["A", "B"],
    )
    thermal_manifest = _write_manifest(
        tmp_path / "thermal-manifest.yaml",
        model_name="pv-thermal",
        model_version="v1.0.0",
        input_type="THERMAL_SINGLE",
        model_type="THERMAL_ONLY",
        input_size=640,
        confidence_threshold="0.60",
        model_path="models/thermal.onnx",
        class_names=["HOTSPOT"],
        overrides=thermal_overrides,
    )
    return Settings(
        rgbModelManifestPath=str(rgb_manifest),
        thermalModelManifestPath=str(thermal_manifest),
    )


def _write_manifest(
    path: Path,
    *,
    model_name: str,
    model_version: str,
    input_type: str,
    model_type: str,
    input_size: int,
    confidence_threshold: str,
    model_path: str,
    class_names: list[str],
    overrides: dict | None = None,
) -> Path:
    payload = {
        "model_name": model_name,
        "model_version": model_version,
        "model_status": "DEV_ONLY",
        "input_type": input_type,
        "model_type": model_type,
        "task": "detection",
        "format": "ONNX",
        "precision": "FP32",
        "runtime": "ONNX_RUNTIME",
        "input_size": str(input_size),
        "confidence_threshold": confidence_threshold,
        "nms_iou_threshold": "0.70",
        "mask_threshold": None,
        "model_path": model_path,
        "class_names": class_names,
    }
    if overrides:
        payload.update(overrides)

    content = "\n".join(
        [
            "models:",
            f"  - model_name: {payload['model_name']}",
            f"    model_version: {payload['model_version']}",
            f"    model_status: {payload['model_status']}",
            f"    input_type: {payload['input_type']}",
            f"    model_type: {payload['model_type']}",
            f"    task: {payload['task']}",
            f"    format: {payload['format']}",
            f"    precision: {payload['precision']}",
            f"    runtime: {payload['runtime']}",
            f"    input_size: {payload['input_size']}",
            f"    confidence_threshold: {payload['confidence_threshold']}",
            f"    nms_iou_threshold: {payload['nms_iou_threshold']}",
            *([f"    mask_threshold: {payload['mask_threshold']}"] if payload["mask_threshold"] else []),
            f"    model_path: {payload['model_path']}",
            "    class_names:",
            *[f"      - {class_name}" for class_name in payload["class_names"]],
            "",
        ]
    )
    path.write_text(content, encoding="utf-8")
    return path
