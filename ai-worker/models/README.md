# AI Worker Local Models

AI Worker는 `RGB_MODEL_MANIFEST_PATH`, `THERMAL_MODEL_MANIFEST_PATH`가 가리키는 로컬 manifest 파일을 기준으로 모델을 로드합니다.

- 실제 `.onnx`, `.pt`, `.engine` 대용량 모델 파일은 Git에 포함하지 않습니다.
- Thermal artifact는 manifest와 ONNX 모두 S3 전용이며, `ai-worker/models/thermal/` 아래 로컬 파일도 Git에 포함하지 않습니다.
- 운영 배포에서는 manifest와 ONNX를 S3 artifact 경로에서 `/models/...` 아래로 내려받은 뒤 worker가 로드합니다.
- manifest의 `model_path`는 S3 URL이 아니라 manifest 파일 기준 상대 파일명만 사용합니다.

예시:
- manifest: `/models/thermal/model-manifest.yaml`
- model: `/models/thermal/thermal-yolo26s-det-stage10b-v20260704-r1.onnx`

bootstrap 예시:
- `python scripts/bootstrap_thermal_model_artifacts.py`
