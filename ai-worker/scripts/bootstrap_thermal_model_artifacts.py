from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path

import boto3
import yaml
from botocore.config import Config

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ThermalArtifactBootstrapConfig:
    bucket: str
    manifest_path: Path
    prefix: str
    endpoint_url: str | None
    region_name: str | None
    force_download: bool = False
    path_style_enabled: bool = False


def load_config_from_env() -> ThermalArtifactBootstrapConfig:
    bucket = _require_env("MODEL_ARTIFACT_BUCKET", fallback="STORAGE_DEFAULT_BUCKET")
    manifest_path = Path(
        os.getenv(
            "THERMAL_MODEL_MANIFEST_PATH",
            "/models/thermal/model-manifest.yaml",
        )
    )
    prefix = _require_env("THERMAL_MODEL_S3_PREFIX")
    endpoint_url = os.getenv("STORAGE_ENDPOINT_URL")
    region_name = os.getenv("STORAGE_REGION") or os.getenv("AWS_REGION")
    path_style_enabled = os.getenv("STORAGE_PATH_STYLE_ENABLED", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    return ThermalArtifactBootstrapConfig(
        bucket=bucket,
        manifest_path=manifest_path,
        prefix=prefix.strip("/"),
        endpoint_url=endpoint_url,
        region_name=region_name,
        force_download=os.getenv("MODEL_ARTIFACT_FORCE_DOWNLOAD", "").strip().lower() in {"1", "true", "yes", "on"},
        path_style_enabled=path_style_enabled,
    )


def bootstrap_thermal_model_artifacts(
    config: ThermalArtifactBootstrapConfig,
    *,
    s3_client=None,
) -> tuple[Path, Path]:
    client = s3_client or build_s3_client(config)
    manifest_path = config.manifest_path
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    manifest_key = _join_s3_key(config.prefix, manifest_path.name)
    download_if_needed(
        client=client,
        bucket=config.bucket,
        key=manifest_key,
        destination=manifest_path,
        force_download=config.force_download,
    )

    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    model_filename = _extract_model_filename(manifest)
    model_path = manifest_path.parent / model_filename
    model_key = _join_s3_key(config.prefix, model_filename)
    download_if_needed(
        client=client,
        bucket=config.bucket,
        key=model_key,
        destination=model_path,
        force_download=config.force_download,
    )

    logger.info(
        "Thermal model artifacts are ready. manifestPath=%s modelPath=%s bucket=%s prefix=%s",
        manifest_path,
        model_path,
        config.bucket,
        config.prefix,
    )
    return manifest_path, model_path


def build_s3_client(config: ThermalArtifactBootstrapConfig):
    client_config = Config(
        signature_version="s3v4",
        s3={"addressing_style": "path" if config.path_style_enabled else "auto"},
    )
    return boto3.client(
        "s3",
        endpoint_url=config.endpoint_url,
        region_name=config.region_name,
        config=client_config,
    )


def download_if_needed(*, client, bucket: str, key: str, destination: Path, force_download: bool) -> None:
    if destination.exists() and not force_download:
        logger.info("Skipping existing model artifact. path=%s", destination)
        return

    destination.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Downloading model artifact. bucket=%s key=%s destination=%s", bucket, key, destination)
    client.download_file(bucket, key, str(destination))


def _extract_model_filename(manifest: object) -> str:
    if not isinstance(manifest, dict):
        raise ValueError("Thermal model manifest is malformed.")

    if "models" in manifest:
        models = manifest.get("models")
        if isinstance(models, list) and models and isinstance(models[0], dict):
            model_path = models[0].get("model_path")
        else:
            model_path = None
    else:
        model_path = manifest.get("model_path")

    if not isinstance(model_path, str) or not model_path.strip():
        raise ValueError("Thermal model manifest is missing model_path.")

    candidate = Path(model_path.strip())
    if candidate.is_absolute():
        raise ValueError("Thermal model manifest model_path must be a relative file path.")
    return candidate.as_posix()


def _join_s3_key(prefix: str, filename: str) -> str:
    return f"{prefix.rstrip('/')}/{filename.lstrip('/')}"


def _require_env(primary: str, *, fallback: str | None = None) -> str:
    primary_value = os.getenv(primary, "").strip()
    if primary_value:
        return primary_value
    if fallback:
        fallback_value = os.getenv(fallback, "").strip()
        if fallback_value:
            return fallback_value
    raise ValueError(f"Missing required environment variable: {primary}")


def main() -> int:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
    config = load_config_from_env()
    bootstrap_thermal_model_artifacts(config)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
