# AGENT-infra.md

## 1. 적용 범위

이 문서는 DB, Migration, Docker, K3s, AWS, 배포 작업 시 적용한다.

대상 작업:

- PostgreSQL
- Flyway Migration
- Docker / Docker Compose
- MinIO
- LocalStack SQS
- K3s
- Traefik Ingress
- Jenkins
- ECR
- AWS RDS
- AWS S3
- AWS SQS
- CloudWatch Logs
- Kubernetes Secret
- AWS Secrets Manager

공통 판단 기준은 `AGENT.md`를 우선한다.

---

## 2. 환경 분리 원칙

운영 환경과 로컬 환경은 서비스 코드를 최대한 동일하게 유지한다.

차이는 설정과 외부 리소스 연결로 분리한다.

| 구분 | 운영 환경 | 로컬 환경 |
| --- | --- | --- |
| DB | AWS RDS PostgreSQL | PostgreSQL Docker |
| Storage | AWS S3 | MinIO |
| Queue | AWS SQS | LocalStack SQS |
| Logs | CloudWatch Logs | Console Log |
| Secret | Kubernetes Secret / AWS Secrets Manager | .env.local / local profile |
| Orchestration | EC2 + K3s | Docker Compose / Local K3s |

로컬용 코드와 운영용 코드를 무분별하게 분기하지 않는다.

환경 차이는 profile, env, config, adapter 설정으로 처리한다.

---

## 3. DB / Migration 규칙

PostgreSQL 물리 테이블과 컬럼은 snake_case를 따른다.

DB 구조는 ERD와 정규화 기준을 따른다.

기본 원칙:

- 이미지 파일 자체를 DB에 저장하지 않는다.
- 객체 저장소 경로와 메타데이터만 DB에 저장한다.
- Soft Delete 또는 비활성화 정책이 있는 데이터는 실제 삭제하지 않는다.
- 운영 환경에서는 `ddl-auto` 자동 변경에 의존하지 않는다.
- schema 변경은 Flyway migration으로 관리한다.
- Flyway clean 자동 실행은 사용하지 않는다.

주의:

- 기존 테이블에 중복 컬럼을 추가하기 전에 ERD의 파생 조회 기준을 확인한다.
- migration 파일을 만들었다면 적용 순서와 롤백 가능성을 보고한다.
- 운영 DB에 영향을 주는 변경은 임의로 진행하지 않는다.

---

## 4. Docker / Compose 규칙

로컬 통합 실행은 Docker Compose 기준을 따른다.

로컬 구성 요소:

- Frontend
- Backend
- AI Worker
- PostgreSQL
- MinIO
- LocalStack SQS

주의:

- `.env.example`에는 실제 Secret 값을 쓰지 않는다.
- `.env.local` 같은 실제 환경 파일은 Git에 포함하지 않는다.
- `node_modules`, `dist`, `.gradle`, `build`, `venv`, `__pycache__`, 대용량 모델 파일은 이미지 빌드에서 제외한다.
- 대용량 모델 파일은 Docker 이미지에 직접 포함하지 않는 방향을 우선한다.

---

## 5. K3s / Ingress 규칙

운영 환경은 EC2 기반 K3s 단일 노드 MVP를 기준으로 한다.

K3s 내부에는 다음을 배치한다.

- Frontend Pod
- Backend Pod
- AI Worker Pod
- Traefik Ingress Controller
- Jenkins

AWS 관리형 서비스는 K3s 외부 리소스로 본다.

- RDS PostgreSQL
- S3
- SQS
- CloudWatch Logs
- ECR

Ingress 기준:

- `/` → Frontend
- `/api` → Backend
- AI Worker 외부 노출 금지

---

## 6. Secret 관리 규칙

Secret은 코드와 분리한다.

금지:

- Secret 하드코딩
- 실제 Secret 값이 들어간 `.env` 커밋
- 실제 Secret 값이 들어간 yaml 커밋
- 로그에 Secret 출력
- README나 문서에 실제 Secret 작성

관리 기준:

- 로컬은 `.env.local` 또는 local profile 사용
- 운영은 Kubernetes Secret 또는 AWS Secrets Manager 사용
- `.env.example`과 `secret-example.yaml`에는 키 이름과 설명만 작성
- ConfigMap에는 민감하지 않은 설정만 작성

Secret 대상 예시:

- DB password
- OAuth Client Secret
- Session / JWT Secret
- AWS Access Key
- AWS Secret Key

---

## 7. CI/CD 규칙

CI/CD는 Jenkins와 ECR, K3s 배포 기준을 따른다.

기본 흐름:

1. Jenkins가 서비스별 Docker 이미지 빌드
2. ECR에 image push
3. K3s 배포 manifest 또는 rollout 갱신
4. Pod 상태 확인
5. 필요 시 이전 image tag로 롤백

주의:

- image tag는 git-sha 기반을 우선한다.
- latest 태그는 개발 편의용으로만 사용한다.
- Jenkins 권한은 ECR Push와 K3s 배포에 필요한 범위로 제한한다.
- Jenkins가 K3s 단일 노드에서 실행될 경우 리소스 경합을 고려한다.

---

## 8. 로그 / 모니터링 규칙

운영 로그는 CloudWatch Logs 기준을 따른다.

로컬 로그는 Console Log 기준을 따른다.

로그에 남기면 안 되는 것:

- Secret
- Access Token
- Refresh Token
- OAuth Secret
- DB password
- Presigned URL 전체
- 사용자 민감 정보

운영상 필요한 로그:

- 로그인
- 업로드
- 분석 요청
- 분석 실패
- Queue 오류
- DB 오류
- 파일 저장 실패
- 관리자 작업
- Health Check 실패

---

## 9. 테스트 기준

가능하면 변경 범위에 맞는 검증을 수행한다.

권장 확인:

- Docker Compose config 확인
- 컨테이너 기동 확인
- DB migration 적용 확인
- MinIO 연결 확인
- LocalStack SQS 연결 확인
- K8s manifest 문법 확인
- readiness / liveness probe 확인
- Secret 값이 Git에 포함되지 않았는지 확인

테스트를 실행하지 못했으면 `실행하지 못함`으로 보고한다.