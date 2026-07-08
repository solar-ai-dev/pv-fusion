from pathlib import Path

import pytest

from scripts.bootstrap_thermal_model_artifacts import (
    ThermalArtifactBootstrapConfig,
    bootstrap_thermal_model_artifacts,
    load_config_from_env,
)


class FakeS3Client:
    def __init__(self, manifest_body: str, model_body: bytes = b"onnx"):
        self.manifest_body = manifest_body
        self.model_body = model_body
        self.calls: list[tuple[str, str, str]] = []

    def download_file(self, bucket: str, key: str, destination: str) -> None:
        self.calls.append((bucket, key, destination))
        destination_path = Path(destination)
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        if destination_path.suffix == ".yaml":
            destination_path.write_text(self.manifest_body, encoding="utf-8")
            return
        destination_path.write_bytes(self.model_body)


def test_bootstrap_downloads_manifest_and_model_to_manifest_directory(tmp_path: Path):
    client = FakeS3Client(
        "\n".join(
            [
                "model_id: thermal-yolo26s-det-stage10b",
                "model_name: thermal-yolo26s-det-stage10b",
                "model_version: v20260704-r1",
                "model_type: THERMAL_ONLY",
                "input_type: THERMAL_SINGLE",
                "task: detection",
                "runtime: ONNX_RUNTIME",
                "format: ONNX_FP32",
                "input_size: 640",
                "model_path: thermal-yolo26s-det-stage10b-v20260704-r1.onnx",
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
        )
    )
    manifest_path = tmp_path / "models" / "thermal" / "model-manifest.yaml"
    config = ThermalArtifactBootstrapConfig(
        bucket="artifact-bucket",
        manifest_path=manifest_path,
        prefix="models/ai-worker/thermal",
        endpoint_url=None,
        region_name="ap-northeast-2",
    )

    resolved_manifest_path, resolved_model_path = bootstrap_thermal_model_artifacts(config, s3_client=client)

    assert resolved_manifest_path == manifest_path
    assert resolved_model_path == manifest_path.parent / "thermal-yolo26s-det-stage10b-v20260704-r1.onnx"
    assert resolved_manifest_path.exists()
    assert resolved_model_path.exists()
    assert client.calls == [
        (
            "artifact-bucket",
            "models/ai-worker/thermal/model-manifest.yaml",
            str(manifest_path),
        ),
        (
            "artifact-bucket",
            "models/ai-worker/thermal/thermal-yolo26s-det-stage10b-v20260704-r1.onnx",
            str(resolved_model_path),
        ),
    ]


def test_bootstrap_rejects_absolute_model_path_in_manifest(tmp_path: Path):
    client = FakeS3Client(
        "\n".join(
            [
                "model_name: thermal-yolo26s-det-stage10b",
                "model_version: v20260704-r1",
                "model_type: THERMAL_ONLY",
                "input_type: THERMAL_SINGLE",
                "task: detect",
                "runtime: onnxruntime",
                "format: onnx",
                "input_size: 640",
                "model_path: C:/project/thermal-yolo26s-det-stage10b-v20260704-r1.onnx",
                "",
            ]
        )
    )
    config = ThermalArtifactBootstrapConfig(
        bucket="artifact-bucket",
        manifest_path=tmp_path / "models" / "thermal" / "model-manifest.yaml",
        prefix="models/ai-worker/thermal",
        endpoint_url=None,
        region_name="ap-northeast-2",
    )

    with pytest.raises(ValueError, match="relative file path"):
        bootstrap_thermal_model_artifacts(config, s3_client=client)


def test_load_config_from_env_uses_thermal_manifest_path_and_bucket_alias(monkeypatch):
    monkeypatch.setenv("STORAGE_DEFAULT_BUCKET", "artifact-bucket")
    monkeypatch.setenv("THERMAL_MODEL_MANIFEST_PATH", "/models/thermal/model-manifest.yaml")
    monkeypatch.setenv("THERMAL_MODEL_S3_PREFIX", "models/ai-worker/thermal")
    monkeypatch.setenv("STORAGE_REGION", "ap-northeast-2")
    monkeypatch.setenv("STORAGE_PATH_STYLE_ENABLED", "true")

    config = load_config_from_env()

    assert config.bucket == "artifact-bucket"
    assert config.manifest_path == Path("/models/thermal/model-manifest.yaml")
    assert config.prefix == "models/ai-worker/thermal"
    assert config.region_name == "ap-northeast-2"
    assert config.path_style_enabled is True
