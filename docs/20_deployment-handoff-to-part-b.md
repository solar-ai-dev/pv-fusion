# B 담당 실제 배포 인계서

## 1. 인계 목적

- 본 문서는 배포 A 담당이 준비한 코드, 문서, 스크립트, K3s 매니페스트 초안을 기준으로 B 담당이 실제 AWS 배포를 이어서 수행할 수 있도록 정리한 인계서다.
- 이번 문서는 실제 AWS 리소스 생성, ECR push, Jenkins 실행, K3s 적용을 대신 수행하지 않는다.
- 실제 값이 아직 없는 항목은 `배포 후 기록` 또는 `[확인 필요]`로 남긴다.

## 2. 역할 분담 최종 기준

### A 담당

- 서비스 코드와 실행 구조 준비
- Frontend, Backend, AI Worker Dockerfile 및 `.dockerignore` 정리
- 로컬 Docker Compose 통합 실행 검증
- Health Check, TraceId, 로그 보완
- 환경변수 및 Secret 계약 정리
- AWS 인프라 생성 준비 스크립트 작성
- `ACTION=plan` / `ACTION=apply` 분리
- CloudShell `ACTION=plan` 기준 검증
- Jenkins CI 준비와 ECR push gate 구성
- K3s 매니페스트 초안 작성
- 본 인계 문서 작성

### B 담당

- B 개인 AWS 로그인 및 MFA 확인
- 배포용 Role 확인 또는 전환
- AWS read-only inventory 실행
- `ACTION=plan` 재확인
- 사용자 승인 후 `ACTION=apply` 실행
- 생성된 리소스 값 기록
- 서비스별 Git SHA 이미지 build / ECR push
- EC2 및 K3s 실제 구성
- ConfigMap / Secret 실제 값 반영
- 운영 DB Migration 실행 확인
- K3s manifest 실제 값 반영 및 적용
- Ingress / 도메인 / HTTPS 마무리
- 전체 smoke 검증
- 최종 배포 결과 보고

## 3. A 담당 완료 범위

- AWS 준비 스크립트:
  - [scripts/aws/11-readonly-inventory.sh](/C:/solar-ai-dev/pv-fusion/scripts/aws/11-readonly-inventory.sh)
  - [scripts/aws/11-create-infrastructure.sh](/C:/solar-ai-dev/pv-fusion/scripts/aws/11-create-infrastructure.sh)
- Jenkins CI 준비:
  - [Jenkinsfile](/C:/solar-ai-dev/pv-fusion/Jenkinsfile)
  - [docs/19_jenkins-ecr-ci-preparation.md](/C:/solar-ai-dev/pv-fusion/docs/19_jenkins-ecr-ci-preparation.md)
- K3s 매니페스트 초안:
  - [k8s/namespace.yaml](/C:/solar-ai-dev/pv-fusion/k8s/namespace.yaml)
  - [k8s/configmap.yaml](/C:/solar-ai-dev/pv-fusion/k8s/configmap.yaml)
  - [k8s/_examples/secret-example.yaml](/C:/solar-ai-dev/pv-fusion/k8s/_examples/secret-example.yaml)
  - [k8s/frontend.yaml](/C:/solar-ai-dev/pv-fusion/k8s/frontend.yaml)
  - [k8s/backend.yaml](/C:/solar-ai-dev/pv-fusion/k8s/backend.yaml)
  - [k8s/ai-worker.yaml](/C:/solar-ai-dev/pv-fusion/k8s/ai-worker.yaml)
  - [k8s/ingress.yaml](/C:/solar-ai-dev/pv-fusion/k8s/ingress.yaml)
  - [k8s/README.md](/C:/solar-ai-dev/pv-fusion/k8s/README.md)
- 환경변수 및 Secret 계약:
  - [docs/17_environment-variable-secret-contract.md](/C:/solar-ai-dev/pv-fusion/docs/17_environment-variable-secret-contract.md)
- AWS 리소스 설계 / inventory:
  - [docs/18_aws-resource-inventory.md](/C:/solar-ai-dev/pv-fusion/docs/18_aws-resource-inventory.md)

## 4. 실제로 아직 수행되지 않은 범위

- `ACTION=apply`
- 실제 AWS 리소스 생성
- 실제 ECR repository 생성 확인
- 실제 ECR login 및 image push
- 실제 Jenkins job 실행
- 실제 EC2 / K3s 설치와 구성
- 실제 ConfigMap / Secret 적용
- 운영 DB Migration 실제 실행 검증
- `kubectl apply`
- 실제 도메인 / HTTPS 설정
- 전체 운영 smoke 검증

## 5. B 담당 완료 조건

- AWS 리소스가 승인된 구성대로 생성됨
- `scripts/aws/output/11-create-summary.env` 또는 동등한 기록에 비민감 값이 남음
- Frontend / Backend / AI Worker 이미지가 Git SHA tag로 ECR에 push 됨
- K3s namespace / ConfigMap / Secret / Deployment / Service / Ingress가 적용됨
- Backend / AI Worker health check가 정상
- 운영 DB Migration 적용 상태가 확인됨
- 업로드부터 결과 조회까지 smoke 검증이 완료됨
- 최종 배포 결과 보고서가 작성됨

## 6. 필수 사전 조건

- AWS Region: `ap-northeast-2`
- Environment: `mvp`
- 프로젝트 Prefix: `pv-insight`
- B 개인 AWS 로그인과 개인 MFA 사용
- 배포용 Role 또는 필요한 권한이 사전에 정리되어 있어야 함
- 실제 운영 Secret 값은 Git이 아닌 별도 안전 채널로 확보해야 함
- Jenkins 또는 수동 빌드 환경에 Docker, AWS CLI, Git, kubectl, K3s 접근 권한이 준비되어 있어야 함

## 7. AWS 계정·권한 사용 기준

- Root 계정 사용 금지
- 관리자 계정 공유 금지
- B 개인 로그인과 개인 MFA 사용
- Jenkins는 장기 Access Key 대신 EC2 Instance Role 사용 전제
- `iam:PassRole`은 실제 필요한 runtime role 범위로만 제한
- 실제 Account ID, User ARN, Role ARN, Access Key, Secret Access Key, Session Token은 Git 문서에 기록하지 않음

`[확인 필요]`
배포용 B 전용 Role의 정확한 IAM 정책 JSON은 현재 저장소에 확정본이 없다. 필요 권한은 실제 apply 및 운영 배포 범위 기준으로 B가 최종 정리해야 한다.

## 8. 배포 전체 순서

1. B 개인 AWS 로그인 및 MFA 확인
2. 배포 Role 전환 여부 확인
3. Principal / Region 확인
4. Read-only inventory 실행
5. `ACTION=plan` 실행
6. Plan 결과 검토
7. 비용 / 이름 충돌 / 보안 규칙 최종 확인
8. 사용자 승인 확보
9. `ACTION=apply` 실행
10. 생성된 리소스 요약 기록
11. ECR repository 존재 확인
12. 서비스별 Git SHA 이미지 build
13. ECR login 및 push
14. EC2 / K3s 실제 준비
15. ConfigMap / Secret 실제 값 반영
16. DB Migration 실행 확인
17. K3s manifest 실제 값 반영
18. Namespace / ConfigMap / Secret 적용
19. Backend / AI Worker / Frontend / Ingress 순서 적용
20. 도메인 / HTTPS 설정
21. 전체 smoke 검증
22. 로그 및 모니터링 확인
23. 최종 배포 결과 보고

## 9. AWS Plan 검증 지침

Read-only inventory:

```bash
bash scripts/aws/11-readonly-inventory.sh
```

Plan:

```bash
ACTION=plan \
S3_BUCKET_NAME=<unique-bucket-name> \
bash scripts/aws/11-create-infrastructure.sh
```

확인 포인트:

- Principal ARN
- Root principal 여부
- Region / Environment / Prefix
- AMI 확인
- VPC / Subnet / SG / ECR / S3 / SQS / RDS / EC2 / Log Group existing 여부
- `No AWS resources were created or modified.`
- `PLAN COMPLETE`

## 10. AWS Apply 실행 지침

사전 조건:

- 사용자 승인 확보
- `AWS_CONFIRM_PHASE2_CREATE=yes`
- 정확한 승인 문자열 입력 필요

실행:

```bash
ACTION=apply \
AWS_CONFIRM_PHASE2_CREATE=yes \
S3_BUCKET_NAME=<unique-bucket-name> \
bash scripts/aws/11-create-infrastructure.sh
```

스크립트 확인 게이트:

- 승인 문자열: `CREATE pv-insight mvp ap-northeast-2`
- 출력 요약 파일: `scripts/aws/output/11-create-summary.env`

주의:

- 스크립트는 ECR repository도 생성한다.
- 스크립트는 EC2 보안 그룹에 80/443만 공개하는 구조다.
- 스크립트는 `AmazonSSMManagedInstanceCore`를 EC2 role에 연결한다.

## 11. 생성 리소스 기록표

아래 값은 실제 생성 후 B가 기록한다.

| 구분 | 항목 | 값 | 확인 방법 | 담당 |
| --- | --- | --- | --- | --- |
| 공통 | AWS Region | `ap-northeast-2` | 설정 확인 | B |
| 공통 | Environment | `mvp` | 설정 확인 | B |
| 네트워크 | VPC ID | 배포 후 기록 | apply 출력 | B |
| 네트워크 | Public Subnet ID | 배포 후 기록 | apply 출력 | B |
| 네트워크 | Private DB Subnet IDs | 배포 후 기록 | apply 출력 | B |
| 보안 | EC2 Security Group ID | 배포 후 기록 | apply 출력 | B |
| 보안 | RDS Security Group ID | 배포 후 기록 | apply 출력 | B |
| EC2 | Instance ID | 배포 후 기록 | apply 출력 | B |
| EC2 | Elastic IP | 배포 후 기록 | apply 출력 | B |
| ECR | Frontend URI | 배포 후 기록 | ECR 조회 | B |
| ECR | Backend URI | 배포 후 기록 | ECR 조회 | B |
| ECR | AI Worker URI | 배포 후 기록 | ECR 조회 | B |
| 이미지 | Git SHA Tag | 배포 후 기록 | Git / Jenkins | B |
| S3 | Bucket Name | 배포 후 기록 | apply 출력 | B |
| SQS | Main Queue URL | 배포 후 기록 | apply 출력 | B |
| SQS | DLQ URL | 배포 후 기록 | apply 출력 | B |
| RDS | Endpoint | 배포 후 기록 | apply 출력 | B |
| RDS | Port | 배포 후 기록 | apply 출력 | B |
| 로그 | Backend Log Group | 배포 후 기록 | apply 출력 | B |
| 로그 | AI Worker Log Group | 배포 후 기록 | apply 출력 | B |

## 12. ECR Build/Push 지침

고정 계약:

- Repository:
  - `pv-insight-frontend`
  - `pv-insight-backend`
  - `pv-insight-ai-worker`
- Tag: 전체 Git commit SHA
- `latest`를 운영 기준으로 사용하지 않음
- Account ID와 전체 registry URI 하드코딩 금지

Jenkins 기준:

- parameter: `ENABLE_ECR_PUSH`
- 기본값: `false`
- 허용 브랜치: `main`
- repository가 없으면 Jenkinsfile이 생성하지 않고 실패

`[확인 필요]`
실제 운영에서 Jenkins를 그대로 사용할지, 동일 명령을 수동으로 실행할지는 B가 결정해야 한다.

## 13. EC2 및 K3s 준비 지침

- EC2 접근 기준은 SSH 22 공개가 아니라 SSM 기반이다.
- 보안 그룹 기본 공개 포트는 80/443이다.
- K3s 적용 대상 namespace는 `pv-insight`다.
- Ingress class는 `traefik`이다.

`[충돌 가능성 있음]`
일부 과거 설명에서 SSH 접근을 암시할 수 있으나, 현재 AWS 생성 스크립트 기준은 SSM + 80/443 공개다. 최신 스크립트 기준을 우선한다.

## 14. ConfigMap 구성 기준

실제 파일: [k8s/configmap.yaml](/C:/solar-ai-dev/pv-fusion/k8s/configmap.yaml)

Backend ConfigMap key:

- `SPRING_PROFILES_ACTIVE`
- `SERVER_PORT`
- `FRONTEND_BASE_URL`
- `CORS_ALLOWED_ORIGINS`
- `OAUTH2_SUCCESS_REDIRECT_URL`
- `OAUTH2_FAILURE_REDIRECT_URL`
- `GOOGLE_CLIENT_ID`
- `RDS_USERNAME`
- `AWS_REGION`
- `S3_BUCKET_NAME`
- `S3_PATH_STYLE_ACCESS_ENABLED`
- `SQS_QUEUE_URL`

AI Worker ConfigMap key:

- `APP_ENV`
- `AWS_REGION`
- `SQS_QUEUE_URL`
- `STORAGE_DEFAULT_BUCKET`
- `STORAGE_PATH_STYLE_ENABLED`
- `RGB_MODEL_MANIFEST_PATH`
- `THERMAL_MODEL_MANIFEST_PATH`

## 15. Secret 구성 및 전달 기준

실제 예시 파일: [k8s/_examples/secret-example.yaml](/C:/solar-ai-dev/pv-fusion/k8s/_examples/secret-example.yaml)

Backend Secret key:

- `RDS_JDBC_URL`
- `RDS_PASSWORD`
- `GOOGLE_CLIENT_SECRET`

AI Worker Secret key:

- `DATABASE_URI`
- 필요 시만:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`

기준:

- Secret 원문은 Git, 문서, 임시 파일, Jenkins log, Notion 본문에 기록하지 않음
- Key 이름, 사용 위치, 상태만 기록
- 운영 AWS 접근은 가능하면 IAM Role 우선

## 16. DB Migration 실행 기준

관련 파일:

- [backend/src/main/resources/application-prod.yml](/C:/solar-ai-dev/pv-fusion/backend/src/main/resources/application-prod.yml)
- [backend/src/main/resources/application.yml](/C:/solar-ai-dev/pv-fusion/backend/src/main/resources/application.yml)
- [backend/src/main/resources/db/migration](/C:/solar-ai-dev/pv-fusion/backend/src/main/resources/db/migration)

확인된 사실:

- Backend는 Spring Boot + Flyway 구조다.
- migration 위치는 `classpath:db/migration`
- 현재 migration 파일:
  - `V1__create_user_access_tables.sql`
  - `V2__create_plant_zone_equipment_tables.sql`
  - `V3__create_inspection_image_pair_tables.sql`
  - `V4__create_analysis_result_tables.sql`
  - `V5__create_operation_logs.sql`
  - `V6__alter_analysis_jobs_add_retry_and_trace.sql`

판정:

- 운영 DB migration은 Backend startup 시 Flyway 자동 실행 구조로 보인다.
- 별도 K3s Job manifest는 현재 저장소에 없다.

`[확인 필요]`
B는 운영 첫 배포 시 migration을 앱 기동에 맡길지, 사전 수동 실행 절차를 둘지 최종 결정해야 한다.

## 17. K3s Manifest 실제값 반영 기준

manifest 목록:

- `k8s/namespace.yaml`
- `k8s/configmap.yaml`
- `k8s/frontend.yaml`
- `k8s/backend.yaml`
- `k8s/ai-worker.yaml`
- `k8s/ingress.yaml`
- `k8s/_examples/secret-example.yaml`

실제 치환이 필요한 대표 placeholder:

- `example.invalid/pv-insight-frontend:replace-me-git-sha`
- `example.invalid/pv-insight-backend:replace-me-git-sha`
- `example.invalid/pv-insight-ai-worker:replace-me-git-sha`
- `REPLACE_ME_AWS_REGION`
- `REPLACE_ME_S3_BUCKET_NAME`
- `REPLACE_ME_ACCOUNT_ID`
- `REPLACE_ME_SQS_QUEUE_NAME`
- `REPLACE_ME_GOOGLE_CLIENT_ID`
- `REPLACE_ME_RDS_USERNAME`
- `app.example.invalid`

## 18. Manifest 적용 순서

기본 순서:

1. `k8s/namespace.yaml`
2. `k8s/configmap.yaml`
3. 실제 Secret 생성
4. `k8s/backend.yaml`
5. `k8s/ai-worker.yaml`
6. `k8s/frontend.yaml`
7. `k8s/ingress.yaml`

비고:

- `k8s/README.md`에는 frontend를 backend보다 먼저 쓰는 순서가 있으나, 운영 의존성을 생각하면 backend와 ai-worker를 먼저 준비하는 편이 안전하다.

`[충돌 가능성 있음]`
문서상의 apply 순서와 실제 운영 안정성 우선 순서가 다를 수 있다. B가 실제 k3s 환경 기준으로 최종 순서를 확정해야 한다.

## 19. 전체 Smoke 검증 시나리오

1. EC2 / K3s node 상태 확인
2. namespace와 pod 상태 확인
3. Frontend 접근 확인
4. Backend `/actuator/health` 확인
5. Backend readiness 확인
6. AI Worker `/health`, `/internal/health` 확인
7. 로그인 또는 인증 흐름 확인
8. 이미지 업로드 확인
9. S3 원본 객체 저장 확인
10. Backend의 SQS job 발행 확인
11. AI Worker의 메시지 수신 확인
12. AI Worker 분석 실행 확인
13. 결과 객체 저장 확인
14. Backend 결과 조회 확인
15. Frontend 결과 표시 확인

성공 기준:

- Frontend, Backend, AI Worker 모두 health 정상
- Queue / Storage / DB 연동 오류 없음
- 결과 조회까지 한 흐름이 완료됨

## 20. 로그·장애 확인 위치

- Jenkins build log
- Backend stdout log
- AI Worker stdout log
- CloudWatch log groups
- `kubectl get pods`
- `kubectl describe pod`
- `kubectl logs`
- Traefik / ingress log
- SQS DLQ
- RDS 연결 오류
- ECR pull 오류
- readiness / liveness 실패 이벤트

## 21. 롤백 기준

- 이전 Git SHA 이미지 tag를 기준으로 롤백
- `latest`는 롤백 기준으로 사용하지 않음
- manifest image를 이전 SHA로 되돌리고 rollout 상태 확인
- ConfigMap / Secret 변경이 같이 있었다면 함께 복구 여부 확인

`[확인 필요]`
DB schema 변경이 이미 적용된 뒤에는 이미지 롤백만으로 충분하지 않을 수 있다. migration rollback 전략은 별도 최종 판단이 필요하다.

## 22. 보안 체크리스트

- Root 계정 사용 금지
- 관리자 계정 공유 금지
- 개인 MFA 사용
- 실제 Secret Git 기록 금지
- 실제 AWS Account ID / ARN / credential 문서 기록 금지
- SSH 22 기본 공개 금지
- 장기 Access Key 기본 사용 금지
- Jenkins credential 본문 노출 금지
- Presigned URL, Cookie, Authorization header 기록 금지

## 23. 배포 완료 보고 형식

```text
## B 담당 실제 배포 결과 보고

> 완료 상태: 완료 / 부분 완료 / 실패

### 1. 배포 요약
- 

### 2. 사용한 Git Commit
- Commit SHA:
- Branch:
- 이미지 태그:

### 3. 생성·사용한 AWS 리소스
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

### 7. Smoke 검증 결과
-

### 8. 도메인·HTTPS 결과
-

### 9. 로그·모니터링 결과
-

### 10. 보안 확인
-

### 11. 실패·보류 항목
-

### 12. 롤백 가능 상태
-

### 13. 다음 작업용 메모
-
```

## 24. 보류·확인 필요 사항

- `[확인 필요]` B 전용 배포 Role의 정확한 IAM 정책
- `[확인 필요]` 운영 DB migration 실행 방식을 startup 자동 적용으로 볼지 별도 절차로 둘지
- `[확인 필요]` Jenkins를 실제 운영 push 수단으로 사용할지 수동 push를 허용할지
- `[충돌 가능성 있음]` K3s apply 순서
- `[충돌 가능성 있음]` AI Worker 모델 bootstrap 설명
  - [k8s/README.md](/C:/solar-ai-dev/pv-fusion/k8s/README.md) 기준: S3 download/init flow 미구현
  - [docs/12_cloud-deployment-operations-design.md](/C:/solar-ai-dev/pv-fusion/docs/12_cloud-deployment-operations-design.md) 일부 설명: 운영 bootstrap을 전제
  - 최신 저장소 구현 기준으로는 `k8s/README.md`와 실제 코드 기준을 우선하는 편이 안전하다.

