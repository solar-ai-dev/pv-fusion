# Part B 1차 배포 실행 준비 Runbook

## 1. 문서 목적

- 이 문서는 B 담당이 AWS/K3s 기반 1차 배포를 실제로 시작할 수 있도록 실행 순서와 확인 기준을 정리한 runbook이다.
- 목표는 전체 운영 배포 완료가 아니라, 실험 미완료 상태에서 Infra + Backend + Frontend 중심의 안전한 1차 배포를 진행하는 것이다.
- AI Worker는 현재 모델 bootstrap 미구현, 최종 모델 산출물 미확정 상태이므로 최종 추론 smoke 완료 대상으로 보지 않는다.

## 2. 적용 범위

### 포함 범위

- AWS read-only inventory 실행
- `ACTION=plan` 실행 및 결과 검토
- `ACTION=apply` 실행
- ECR repository 확인
- Frontend / Backend / AI Worker Docker image build 준비
- Frontend / Backend image push
- EC2 / K3s 준비
- ConfigMap / Secret 적용
- Backend 배포 및 Flyway 확인
- Frontend 배포 및 Ingress 확인
- Frontend / Backend smoke
- S3 / SQS / RDS 연결 smoke

### 제외 또는 조건부 범위

- AI Worker 최종 추론 smoke
- RGB-Thermal Fusion smoke
- 최종 모델 성능 검증
- 최종 결과 품질 검증
- 도메인 / HTTPS 적용
  - 실제 도메인과 인증서 확보 여부에 따라 조건부

## 3. 기준 가정

- 운영 환경은 AWS + EC2 + K3s + Traefik + ECR + RDS + S3 + SQS + CloudWatch 기준이다.
- Frontend는 Backend Public API만 호출한다.
- AI Worker는 외부 Ingress에 노출하지 않는다.
- 대용량 모델 파일은 Docker image에 포함하지 않는다.
- 운영 Secret은 Git에 기록하지 않는다.
- Jenkinsfile은 현재 테스트 / 빌드 / Docker build / 선택적 ECR push gate까지만 담당한다.
- 운영 DB schema 변경은 Flyway 기준이며 `ddl-auto` 자동 변경은 금지한다.

## 4. 1차 배포 범위 재정의

### 1차 배포에서 완료 대상으로 보는 항목

- AWS 인프라가 `scripts/aws/11-create-infrastructure.sh` 기준으로 생성 또는 재사용된다.
- ECR repository 3종이 확인된다.
- Frontend image와 Backend image가 Git SHA tag 기준으로 ECR에 push된다.
- K3s에 namespace / ConfigMap / Secret / Backend / Frontend / Ingress가 반영된다.
- Backend가 기동되고 Flyway가 정상 수행된다.
- Frontend가 Ingress를 통해 접속 가능하다.
- Backend health와 기본 연결 상태를 확인할 수 있다.
- S3 / SQS / RDS 연결에 대한 설정 및 기본 연결 smoke가 통과한다.

### 1차 배포에서 완료 대상으로 보지 않는 항목

- AI Worker가 최종 운영 Ready 상태인지 여부
- AI 모델 추론 성공 여부
- RGB-Thermal Fusion 처리 성공 여부
- 최종 모델 정확도 및 품질 검증

## 5. AI Worker 처리 방침

## 현재 상태

- 현재 AI Worker image에는 모델 파일과 운영용 manifest가 포함되지 않는다.
- `ai-worker/.dockerignore`는 `models` 디렉터리를 제외한다.
- 운영 설계 문서는 S3에서 모델을 공급하는 방향을 전제하지만, 현재 코드베이스에는 worker startup 시 S3 download/init flow가 구현되어 있지 않다.
- 현재 AI Worker 코드는 `RGB_MODEL_MANIFEST_PATH`와 `THERMAL_MODEL_MANIFEST_PATH`가 컨테이너 또는 마운트된 파일시스템에 실제 존재한다고 가정한다.
- 따라서 모델 artifact와 manifest가 준비되지 않은 상태에서는 Ready를 보장할 수 없다.

`[확인 필요]`
- AI Worker를 1차 배포 시점에 포함할지, 보류할지, 조건부 배포로 둘지 B 담당이 최종 결정해야 한다.

## 선택지

### A. AI Worker manifest 적용 보류

- 권장 기본안
- `k8s/ai-worker.yaml`은 적용하지 않는다.
- Frontend / Backend / Infra 중심 1차 배포를 먼저 완료한다.
- 장점: 1차 배포 범위를 가장 안전하게 제한할 수 있다.

### B. AI Worker Deployment 적용, Ready 실패 가능성 보류

- `k8s/ai-worker.yaml`을 적용하되, 모델 부재 또는 manifest 부재로 인해 readiness 실패 가능성을 보류 항목으로 기록한다.
- 운영 보고서에는 "배포 시도는 했으나 모델 bootstrap 미구현으로 Ready 보장 불가"를 명시한다.
- 장점: K3s 상의 구조 검토는 가능하다.
- 주의: 1차 배포 성공 기준에는 포함하지 않는다.

### C. 모델 artifact와 manifest 준비 시에만 AI Worker 배포

- `/models/rgb/model-manifest.dev.yaml`, `/models/thermal/model-manifest.dev.yaml`와 실제 `v0-dev` 모델 artifact가 준비된 경우 적용한다.
- 이 경우에도 추론 정확도나 최종 모델 검증은 별도 단계로 분리한다.

`[충돌 가능성 있음]`
- [docs/12_cloud-deployment-operations-design.md](/C:/project/pv-fusion/docs/12_cloud-deployment-operations-design.md:115)는 운영 bootstrap을 전제한다.
- [k8s/README.md](/C:/project/pv-fusion/k8s/README.md:53)는 현재 bootstrap 미구현 상태를 명시한다.
- 실제 배포 판단에서는 현재 코드와 [k8s/README.md](/C:/project/pv-fusion/k8s/README.md:53)를 우선 기준으로 본다.

## 6. 사전 체크

### Git / 작업 트리

- 현재 브랜치: `develop`
- 현재 확인 시점 Git 상태: `develop...origin/develop [ahead 1]`
- 작업 시작 전 `git status --short --branch` 재확인
- `.venv`, `.venv-experiments`, `node_modules`, `build`, `dist`, `__pycache__`, 모델 파일이 추적 대상에 포함되지 않았는지 확인

### 필수 문서 / 파일

- [docs/17_environment-variable-secret-contract.md](/C:/project/pv-fusion/docs/17_environment-variable-secret-contract.md:20)
- [docs/18_aws-resource-inventory.md](/C:/project/pv-fusion/docs/18_aws-resource-inventory.md:69)
- [docs/19_jenkins-ecr-ci-preparation.md](/C:/project/pv-fusion/docs/19_jenkins-ecr-ci-preparation.md:138)
- [docs/20_deployment-handoff-to-part-b.md](/C:/project/pv-fusion/docs/20_deployment-handoff-to-part-b.md:117)
- [k8s/README.md](/C:/project/pv-fusion/k8s/README.md:17)
- [k8s/configmap.yaml](/C:/project/pv-fusion/k8s/configmap.yaml:12)
- [k8s/_examples/secret-example.yaml](/C:/project/pv-fusion/k8s/_examples/secret-example.yaml:11)

### 사전 권한 확인

- AWS 개인 로그인 및 MFA 확인
- 배포 Role 또는 허용된 Principal 확인
- CloudShell 또는 실제 실행 환경에서 `aws`, `docker`, `kubectl`, `git` 사용 가능 여부 확인
- K3s kubeconfig 접근 가능 여부 확인

`[확인 필요]`
- B 전용 배포 Role의 최종 IAM 정책 범위는 현재 레포에서 확정되지 않았다.

## 7. 값 치환 체크리스트

### 공통 값

- `AWS_REGION`
- `S3_BUCKET_NAME`
- `SQS_QUEUE_URL`
- `Ingress host`
- TLS 사용 여부

### Backend ConfigMap / Secret 값

- `FRONTEND_BASE_URL`
- `CORS_ALLOWED_ORIGINS`
- `GOOGLE_CLIENT_ID`
- `RDS_USERNAME`
- `RDS_JDBC_URL`
- `RDS_PASSWORD`
- `GOOGLE_CLIENT_SECRET`

### Image 값

- Frontend ECR image URI
- Backend ECR image URI
- AI Worker ECR image URI
- 실제 배포할 Git SHA tag

### AI Worker 조건부 값

- `DATABASE_URI`
- `RGB_MODEL_MANIFEST_PATH`
- `THERMAL_MODEL_MANIFEST_PATH`

## 8. 실행 순서

### 1. Read-only inventory

```bash
bash scripts/aws/11-readonly-inventory.sh
```

확인 포인트:

- 현재 Principal
- Region
- 기존 VPC / Subnet / SG / ECR / S3 / SQS / RDS / EC2 / Log Group 존재 여부

### 2. AWS plan

```bash
ACTION=plan \
S3_BUCKET_NAME=<unique-bucket-name> \
bash scripts/aws/11-create-infrastructure.sh
```

확인 포인트:

- `No AWS resources were created or modified.`
- `PLAN COMPLETE`
- AMI 조회 성공 여부
- 기존 자원 충돌 여부

### 3. AWS apply

```bash
ACTION=apply \
AWS_CONFIRM_PHASE2_CREATE=yes \
S3_BUCKET_NAME=<unique-bucket-name> \
bash scripts/aws/11-create-infrastructure.sh
```

주의:

- 승인 문자열 입력이 필요하다.
- 실제 실행 전 비용, 자원명, 권한 범위를 다시 확인한다.
- 출력 요약 파일 `scripts/aws/output/11-create-summary.env`에는 비민감 값만 남겨야 한다.

### 4. ECR login

```bash
AWS_REGION=<aws-region>
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY=${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"
```

### 5. Docker image build

```bash
GIT_SHA=$(git rev-parse HEAD)

docker build \
  --build-arg VITE_API_BASE_URL=/api/v1 \
  -t pv-insight-frontend:${GIT_SHA} \
  ./frontend

docker build \
  -t pv-insight-backend:${GIT_SHA} \
  ./backend

docker build \
  -t pv-insight-ai-worker:${GIT_SHA} \
  ./ai-worker
```

### 6. Docker image tag / push

```bash
AWS_REGION=<aws-region>
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY=${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
GIT_SHA=$(git rev-parse HEAD)

docker tag pv-insight-frontend:${GIT_SHA} \
  ${ECR_REGISTRY}/pv-insight-frontend:${GIT_SHA}

docker tag pv-insight-backend:${GIT_SHA} \
  ${ECR_REGISTRY}/pv-insight-backend:${GIT_SHA}

docker tag pv-insight-ai-worker:${GIT_SHA} \
  ${ECR_REGISTRY}/pv-insight-ai-worker:${GIT_SHA}

docker push ${ECR_REGISTRY}/pv-insight-frontend:${GIT_SHA}
docker push ${ECR_REGISTRY}/pv-insight-backend:${GIT_SHA}
docker push ${ECR_REGISTRY}/pv-insight-ai-worker:${GIT_SHA}
```

`[확인 필요]`
- 1차 배포에서 AI Worker image는 미리 push만 하고 manifest 적용은 보류할 수 있다.

### 7. K3s 준비

- kubeconfig 설정
- namespace 존재 여부 확인
- image pull 가능 여부 확인
- Secret 파일은 예시 파일을 그대로 쓰지 않고 실제 값으로 별도 생성

### 8. kubectl apply 순서

권장 순서:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f <real-secret-file>.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

AI Worker 조건부:

```bash
kubectl apply -f k8s/ai-worker.yaml
```

`[충돌 가능성 있음]`
- [k8s/README.md](/C:/project/pv-fusion/k8s/README.md:17)는 frontend를 backend보다 먼저 적용하는 순서를 적고 있다.
- [docs/20_deployment-handoff-to-part-b.md](/C:/project/pv-fusion/docs/20_deployment-handoff-to-part-b.md:362)는 backend와 ai-worker를 먼저 준비하는 쪽을 더 안전하다고 본다.
- 1차 배포에서는 Backend 확인 후 Frontend를 올리는 순서를 권장한다.

### 9. rollout / 상태 확인

```bash
kubectl rollout status deployment/pv-insight-backend -n pv-insight
kubectl rollout status deployment/pv-insight-frontend -n pv-insight
kubectl get pods -n pv-insight
kubectl get svc -n pv-insight
kubectl get ingress -n pv-insight
```

AI Worker 조건부:

```bash
kubectl rollout status deployment/pv-insight-ai-worker -n pv-insight
```

### 10. 로그 확인

```bash
kubectl logs deployment/pv-insight-backend -n pv-insight
kubectl logs deployment/pv-insight-frontend -n pv-insight
kubectl describe pod <pod-name> -n pv-insight
```

AI Worker 조건부:

```bash
kubectl logs deployment/pv-insight-ai-worker -n pv-insight
```

## 9. Migration 실행 판단

## 현재 판단

- 현재 레포에는 별도 K3s Job 형태의 migration manifest가 없다.
- Backend는 Flyway 자동 실행 구조이고, 운영 공통 설정에서 `ddl-auto=validate`, `clean-disabled=true`다.
- 따라서 현재 기준으로는 Backend startup 시 Flyway가 수행되는 구조로 판단한다.

`[확인 필요]`
- 운영 첫 배포에서 migration을 Backend startup에 바로 맡길지, 사전 수동 검토 후 배포할지 B 담당이 최종 판단해야 한다.

## 실행 전 확인 사항

- 최초 생성 DB인지 확인
- 기존 운영 또는 시험 DB라면 backup 또는 snapshot 가능 여부 확인
- 적용 대상 migration이 V1~V6과 일치하는지 확인

## 확인 명령 예시

```bash
kubectl logs deployment/pv-insight-backend -n pv-insight
kubectl describe deployment pv-insight-backend -n pv-insight
```

확인 포인트:

- Flyway 시작 로그
- migration 성공 로그
- schema validation 실패 여부
- DB 접속 실패 여부

## 실패 시 대응 기준

- Backend 신규 rollout 중단
- 이전 image tag로 rollback 검토
- DB가 최초 생성 전 단계라면 인프라 재구성보다 snapshot / 재생성 기준 우선 검토
- 이미 migration이 일부 적용된 경우 image rollback만으로 충분한지 별도 판단 필요

`[확인 필요]`
- migration rollback 전용 절차는 현재 문서화되어 있지 않다.

## 10. 1차 필수 smoke

### Frontend / Ingress

- Frontend 접속 확인
- Ingress host 라우팅 확인
- 정적 리소스 로딩 확인

예시:

```bash
kubectl get ingress -n pv-insight
curl -I http://<ingress-host>/
curl -I http://<ingress-host>/health
```

### Backend

- Backend health 확인
- readiness / liveness 확인
- 공개 health 응답 확인
- 필요 시 `auth/me` 또는 인증 흐름 점검

예시:

```bash
curl -i http://<ingress-host>/api/actuator/health
curl -i http://<ingress-host>/api/actuator/health/readiness
curl -i http://<ingress-host>/api/actuator/health/liveness
```

### DB / Flyway

- DB 연결 성공 여부
- Flyway 완료 로그 확인

### S3 / SQS / 설정

- `S3_BUCKET_NAME` 설정 반영 확인
- `SQS_QUEUE_URL` 설정 반영 확인
- Storage / Queue 관련 초기화 오류 로그 부재 확인

`[확인 필요]`
- 1차 배포 시점에 실제 업로드 플로우까지 수행할지, 설정 및 연결 로그 확인까지만 할지 B 담당이 선택해야 한다.

## 11. 1차 제외 smoke

- AI 모델 추론 정확도
- AI Worker 최종 Ready 보장
- RGB-Thermal Fusion 분석
- 최종 결과 품질 검증
- 최종 모델 성능 검증

## 12. AI Worker 조건부 smoke

### 적용을 보류한 경우

- 별도 smoke 없음
- 운영 보고서에 "1차 배포 범위에서 제외"로 기록

### 적용했지만 Ready 실패 가능성을 보류한 경우

- `/health`, `/internal/health` 응답 확인만 시도
- 실패 시 "모델 bootstrap 미구현 또는 모델 artifact 미준비"로 분류
- 1차 배포 실패로 간주하지 않는다

### artifact 준비 후 조건부 적용한 경우

- Pod 기동 여부
- readiness 성공 여부
- manifest 경로 존재 여부
- 모델 파일 마운트 또는 공급 경로 확인

단, 이 경우에도 추론 정확도와 최종 품질 검증은 별도 단계다.

## 13. 롤백 기준

### Image rollback

- 이전 Git SHA 기반 ECR tag로 manifest image 값을 되돌린다.
- 또는 다음 명령을 사용한다.

```bash
kubectl rollout undo deployment/pv-insight-backend -n pv-insight
kubectl rollout undo deployment/pv-insight-frontend -n pv-insight
```

AI Worker 조건부:

```bash
kubectl rollout undo deployment/pv-insight-ai-worker -n pv-insight
```

### ConfigMap / Secret 복구

- 직전 정상 값 기준으로 재적용한다.
- Secret 값은 Git 본문에 남기지 않는다.

### DB migration 실패 대응

- image rollback만으로 복구 가능한지 먼저 판단하지 않는다.
- 이미 schema 변경이 적용된 경우 rollback script 부재 상태일 수 있다.
- 최초 생성 DB가 아니면 snapshot / backup 상태를 먼저 확인한다.

### AWS resource apply 이후 주의사항

- `ACTION=apply` 이후 자원 정리는 즉시 삭제보다 의존관계 확인이 우선이다.
- RDS, S3, EIP, SG, IAM role, ECR repository는 삭제 시 영향 범위를 먼저 검토한다.
- 1차 배포 실패 시에도 인프라 삭제를 자동 복구 방식으로 보지 않는다.

## 14. 도메인 / HTTPS

- 현재 Ingress host는 placeholder다.
- 실제 도메인 확보 여부에 따라 1차 배포에서 HTTP까지만 확인할 수 있다.
- HTTPS / TLS secret / 인증서 연동은 조건부 항목으로 둔다.

`[확인 필요]`
- 실제 운영 도메인 확보 여부
- TLS termination 위치
- 인증서 발급 방식

## 15. 1차 배포 완료 기준

- AWS 인프라 생성 또는 재사용 결과가 기록되었다.
- Frontend / Backend image가 Git SHA tag로 ECR에 반영되었다.
- Backend가 Ready 상태이며 Flyway 오류가 없다.
- Frontend가 Ingress를 통해 접속 가능하다.
- Backend health가 정상이다.
- S3 / SQS / RDS 설정 또는 기본 연결 상태를 확인했다.
- AI Worker는 보류 또는 조건부 상태가 명시적으로 기록되었다.

## 16. 배포 결과 보고 형식

```text
## B 담당 1차 배포 결과 보고

> 완료 상태: 완료 / 부분 완료 / 실패

### 1. 배포 요약
- 

### 2. 사용한 Git Commit
- Commit SHA:
- Branch:
- 이미지 태그:

### 3. 생성/사용한 AWS 리소스
- VPC:
- EC2:
- ECR:
- S3:
- SQS:
- RDS:
- CloudWatch:

### 4. ECR Push 결과
- Frontend:
- Backend:
- AI Worker:

### 5. K3s 적용 결과
- Namespace:
- ConfigMap:
- Secret:
- Frontend:
- Backend:
- AI Worker:
- Ingress:

### 6. Migration 결과
- 

### 7. 1차 필수 smoke 결과
- Frontend 접속:
- Backend health:
- Backend readiness/liveness:
- DB 연결 / Flyway:
- S3 설정 / 연결:
- SQS 설정 / 연결:

### 8. AI Worker 보류 / 조건부 결과
- 적용 여부:
- 보류 사유:
- Ready 상태:
- 로그 요약:

### 9. 도메인 / HTTPS 결과
- 

### 10. 로그 / 모니터링 결과
- 

### 11. 보안 확인
- 

### 12. 실패 / 보류 항목
- 

### 13. 롤백 가능 상태
- 

### 14. 다음 작업 메모
- 
```
