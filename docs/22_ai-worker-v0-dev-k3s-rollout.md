# AI Worker v0-dev K3s Rollout Memo

## 1. 작업 목적

- Jira/Backlog 맥락: AI Worker를 운영 K3s에 임시 `v0-dev` 모델 기준으로 먼저 기동하고, 이후 Jenkins CD에서 Frontend / Backend / AI Worker 3개 서비스를 모두 Git SHA 이미지로 자동 rollout 할 수 있게 준비한다.
- End-to-End 위치: `Jenkins CD -> ECR Push -> K3s Deployment -> AI Worker Pod startup -> model manifest load -> SQS worker startup`
- 이번 범위의 성공 기준:
  - 모델 파일은 Git에 추가하지 않는다.
  - AI Worker K8s 설정이 `/models` 기준 `v0-dev` manifest 경로를 바라본다.
  - AI Worker Deployment가 `replicas=1`로 기동 준비된다.
  - Jenkins main CD에서 ECR push 성공 후 3개 Deployment를 Git SHA 이미지로 자동 rollout 할 수 있다.

## 2. 코딩 전 가설 명시

- 현재 AI Worker 코드 계약은 `RGB_MODEL_MANIFEST_PATH`, `THERMAL_MODEL_MANIFEST_PATH` 두 경로가 실제 파일시스템에 존재한다는 가정이다.
- 현재 코드베이스에는 S3 다운로드/initContainer 기반 모델 bootstrap 구현이 없다.
- 따라서 이번 작업은 최종 모델 배포 설계가 아니라 `hostPath` 기반 임시 smoke 방식이다.
- Spring Boot ↔ FastAPI 인터페이스, Backend API, DB 스키마, 인증/권한 로직에는 영향이 없다.

## 3. 임시 모델 정책

- version: `v0-dev`
- purpose: AI Worker Pod 기동 및 CI/CD smoke 검증
- status: temporary
- final production model: 아님
- 후속 작업:
  - 최종 manifest 교체
  - 실제 추론 코드와 최종 모델 정합성 재검증
  - S3 download/initContainer 기반 모델 공급 구조 정리

## 4. 모델 공급 경로

### S3 기준 경로

- `s3://<bucket>/models/ai-worker/v0-dev/rgb/model-manifest.dev.yaml`
- `s3://<bucket>/models/ai-worker/v0-dev/rgb/rgb-only-yolo26s-seg-768-e10-dev.onnx`
- `s3://<bucket>/models/ai-worker/v0-dev/thermal/model-manifest.dev.yaml`
- `s3://<bucket>/models/ai-worker/v0-dev/thermal/thermal-only-yolo26n-det-dev-untrained-640.onnx`

### EC2 hostPath 기준 경로

- `/opt/pv-insight/models/v0-dev/rgb/model-manifest.dev.yaml`
- `/opt/pv-insight/models/v0-dev/rgb/rgb-only-yolo26s-seg-768-e10-dev.onnx`
- `/opt/pv-insight/models/v0-dev/thermal/model-manifest.dev.yaml`
- `/opt/pv-insight/models/v0-dev/thermal/thermal-only-yolo26n-det-dev-untrained-640.onnx`

## 5. K3s 반영 내용

- `k8s/ai-worker.yaml`
  - `hostPath: /opt/pv-insight/models/v0-dev`
  - container `mountPath: /models`
  - `readOnly: true`
  - `replicas: 1`
- `k8s/configmap.yaml`
  - `RGB_MODEL_MANIFEST_PATH=/models/rgb/model-manifest.dev.yaml`
  - `THERMAL_MODEL_MANIFEST_PATH=/models/thermal/model-manifest.dev.yaml`

주의:

- 이 `hostPath` 방식은 운영 smoke용 임시 방식이다.
- 최종 운영 모델 공급 방식은 별도 작업에서 S3 download/initContainer 또는 이에 준하는 외부 artifact bootstrap으로 전환해야 한다.
- AI Worker는 Service/Ingress로 외부 노출하지 않는다.

## 6. Jenkins CD rollout 정책

- 대상 브랜치: `main`
- 선행 조건:
  - `ENABLE_ECR_PUSH=true`
  - Optional ECR Push stage 성공
- rollout 대상 Deployment:
  - `pv-insight-frontend` / container `frontend`
  - `pv-insight-backend` / container `backend`
  - `pv-insight-ai-worker` / container `ai-worker`
- 이미지 태그: `Git SHA`
- ECR registry는 Jenkins runtime에서 `aws sts get-caller-identity`로 Account ID를 조회해 조합한다.

## 7. 운영 적용 확인 명령

### S3 파일 존재 확인

```bash
aws s3 ls s3://<bucket>/models/ai-worker/v0-dev/rgb/
aws s3 ls s3://<bucket>/models/ai-worker/v0-dev/thermal/
```

### EC2 hostPath 파일 존재 확인

```bash
sudo ls -R /opt/pv-insight/models/v0-dev
```

### manifest 내부 model_path와 실제 ONNX 파일명 확인

```bash
grep -n "model_path" /opt/pv-insight/models/v0-dev/rgb/model-manifest.dev.yaml
grep -n "model_path" /opt/pv-insight/models/v0-dev/thermal/model-manifest.dev.yaml
```

### K8s 변경 diff / apply

```bash
kubectl diff -f k8s/configmap.yaml
kubectl diff -f k8s/ai-worker.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/ai-worker.yaml
```

### AI Worker rollout 확인

```bash
kubectl -n pv-insight rollout status deployment/pv-insight-ai-worker --timeout=180s
kubectl -n pv-insight get pods -l app.kubernetes.io/name=ai-worker
kubectl -n pv-insight logs deployment/pv-insight-ai-worker --tail=200
```

### Jenkins rollout 확인

```bash
kubectl -n pv-insight rollout status deployment/pv-insight-frontend --timeout=120s
kubectl -n pv-insight rollout status deployment/pv-insight-backend --timeout=120s
kubectl -n pv-insight rollout status deployment/pv-insight-ai-worker --timeout=180s
```

## 8. 테스트 메모

- 권장 로컬 검증:
  - AI Worker unit test
  - manifest path 로딩 관련 테스트
- 실행하지 못한 항목은 배포 보고서에 명시한다.
