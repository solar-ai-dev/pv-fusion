# AI Worker Local Models

AI Worker는 `RGB_MODEL_MANIFEST_PATH`, `THERMAL_MODEL_MANIFEST_PATH`가 가리키는 로컬 manifest 파일을 기준으로 모델을 로드합니다.

- 실제 `.onnx`, `.pt`, `.engine` 대용량 모델 파일은 Git에 포함하지 않습니다.
- Thermal Stage10B 운영 예시 manifest는 `thermal/model-manifest.thermal.stage10b.yaml`로 Git에 포함합니다.
- 운영 배포에서는 manifest와 ONNX를 S3 artifact 경로에서 `/models/...` 아래로 내려받은 뒤 worker가 로드합니다.
- manifest의 `model_path`는 S3 URL이 아니라 manifest 파일 기준 상대 파일명만 사용합니다.

예시:
- manifest: `/models/thermal/model-manifest.thermal.stage10b.yaml`
- model: `/models/thermal/thermal-only-yolo26s-det-640-stage10b-rawu8-r3-rot45-flip-s150-t075.onnx`

bootstrap 예시:
- `python scripts/bootstrap_thermal_model_artifacts.py`
