## 1. 설계 범위

본 문서는 RGB·열화상 기반 태양광 구역 관리 플랫폼의 로컬 개발 환경과 클라우드 운영 환경에서 필요한 설정, 배포, Secret 관리, 루트 디렉터리 구조 기준을 정의한다.

- Backend는 `backend/.env.example` 대신 Spring Profile과 `application-*.yml` 기준으로 설정을 관리

| 파일/디렉터리 | 설명 | 비고 |
| --- | --- | --- |
| `docker-compose.yml` | 로컬 통합 실행용 Compose 파일 | 루트에 두고, `docker/`는 Compose에서 참조하는 init script/config 보관용으로 사용함 |
| `.env.example` | Docker Compose 기준 공통 환경 변수 템플릿 | 실제 Secret 값 작성 금지 |
| `frontend/.env.example` | Frontend 단독 실행에 필요한 API Base URL 등 환경 변수 템플릿 | Vite 환경 기준 |
| `backend/src/main/resources/application-local.yml` | Backend 로컬 실행 설정 | PostgreSQL Docker, MinIO, LocalStack 연결, Flyway 로컬 적용 |
| `backend/src/main/resources/application-prod.yml` | Backend 운영 환경 설정 구조 | 실제 Secret 값 포함 금지, `${ENV_VAR}` 형식으로 ConfigMap/Secret 값 참조 |
| `backend/src/main/resources/db/migration/` | 로컬/운영 DB 스키마 변경 이력 관리 | Flyway 기준, 운영 환경 `ddl-auto` 자동 변경 금지 |
| `ai-worker/.env.example` | AI Worker 단독 실행에 필요한 환경 변수 템플릿 | SQS, S3/MinIO, 모델 경로 기준 |
| `frontend/Dockerfile` | Frontend Docker 이미지 빌드 파일 | Vite build + Nginx 정적 서빙 멀티스테이지 빌드 기준 |
| `backend/Dockerfile` | Backend Docker 이미지 빌드 파일 | 운영 배포 이미지 생성 |
| `ai-worker/Dockerfile` | AI Worker Docker 이미지 빌드 파일 | 운영 배포 이미지 생성 |
| `frontend/.dockerignore` | Frontend Docker 빌드 제외 파일 정의 | `node_modules`, `dist` 등 제외 |
| `backend/.dockerignore` | Backend Docker 빌드 제외 파일 정의 | `.gradle`, `build` 등 제외 |
| `ai-worker/.dockerignore` | AI Worker Docker 빌드 제외 파일 정의 | `venv`, `__pycache__`, 대용량 모델 파일 등 제외 |
| `docker/` | Docker Compose에서 참조하는 PostgreSQL, MinIO, LocalStack 초기화 스크립트와 보조 설정 | 로컬 실행 보조 설정 |
| `k8s/namespace.yaml` | K3s Namespace 정의 | 운영 배포 기준 |
| `k8s/configmap.yaml` | 비민감 운영 설정 정의 | Secret 값 제외 |
| `k8s/_examples/secret-example.yaml` | 운영 Secret 템플릿 | 실제 Secret 값 작성 금지, 배포 적용 대상에서 제외 |
| `k8s/frontend.yaml` | Frontend Deployment / Service 정의 | Nginx 정적 서빙 상태 확인용 readiness/liveness probe 포함 |
| `k8s/backend.yaml` | Backend Deployment / Service 정의 | readiness/liveness probe 포함 |
| `k8s/ai-worker.yaml` | AI Worker Deployment 정의 | S3 모델 다운로드 후 Worker 실행, 다운로드 실패 시 기동 실패 처리 |
| `k8s/ingress.yaml` | Traefik Ingress 라우팅 정의 | `/`, `/api` 라우팅 |
| `Jenkinsfile` | Docker 이미지 빌드, ECR Push, K3s 배포 자동화 | ECR Push 권한과 K3s kubeconfig 접근 권한 필요 |
| `scripts/*.sh` | 로컬 실행, 초기화, 배포 보조 스크립트 | `init-local.sh`, `seed-db.sh`, `deploy.sh` 등 |

---

## 2. 운영 환경 구성

- 운영 환경은 AWS와 K3s 기반으로 구성하고, 로컬 환경은 Docker 기반 대체 리소스를 사용
- 운영과 로컬은 서비스 코드를 최대한 동일하게 유지하되, DB, Storage, Queue, Log, Secret 설정만 환경별로 분리
- 로컬 환경에서 Queue는 LocalStack SQS Endpoint를 사용하고, Storage는 MinIO Endpoint를 사용
- AWS SDK를 사용하는 Backend와 AI Worker는 로컬 환경에서 LocalStack SQS를 바라볼 수 있도록 AWS Endpoint URL을 환경 변수로 오버라이드함, 운영 환경에서는 Endpoint Override를 사용하지 않고 AWS 기본 Endpoint를 사용

| 구분 | 운영 환경 | 로컬 환경 |
| --- | --- | --- |
| Frontend | K3s Frontend Pod | Vite dev server 또는 Docker |
| Backend | K3s Backend Pod | Spring Boot local profile 또는 Docker |
| AI Worker | K3s AI Worker Pod | FastAPI local worker 또는 Docker |
| DB | AWS RDS PostgreSQL | PostgreSQL Docker |
| Storage | AWS S3 | MinIO |
| Queue | AWS SQS | LocalStack SQS |
| Ingress | Traefik Ingress Controller | localhost 또는 Local Traefik |
| Container | Docker | Docker / Docker Compose |
| CI/CD | Jenkins + AWS ECR | 수동 실행 또는 로컬 Docker Build |
| Logs | CloudWatch Logs | Console Log |
| Secret | Kubernetes Secret 또는 AWS Secrets Manager | `.env.local` 또는 local profile |

---

## 3. Secret 관리 기준

- Secret은 코드와 분리하여 관리
- `.env.example`에는 환경 변수 이름과 설명만 작성하고, 실제 Secret 값은 작성하지 않음
- 운영 Secret은 Kubernetes Secret 또는 AWS Secrets Manager에서 관리함

| 구분 | 관리 대상 | 관리 기준 |
| --- | --- | --- |
| DB 접속 정보 | DB URL, username, password | 로컬은 개인 환경 파일, 운영은 Secret으로 관리 |
| 인증 정보 | OAuth Client Secret, 세션/JWT 서명 Secret | Secret 값은 Git에 커밋하지 않음 |
| AWS 접근 정보 | IAM Role, Access Key, Secret Key, Region | 운영은 IAM Role 우선, Access Key는 필요한 경우에만 Secret으로 관리 |
| ConfigMap 대상 | API Base URL, S3 Bucket 이름, SQS Queue 이름, AWS Region, model path, profile | 민감하지 않은 환경 설정만 관리 |
| Secret 대상 | DB password, OAuth Client Secret, 세션/JWT 서명 Secret, AWS Access Key | 외부 노출 금지 값만 관리 |
| 운영 설정 주입 | `application-prod.yml`, K8s Deployment env/envFrom | 운영 설정은 `${ENV_VAR}` 형식으로 참조하고 ConfigMap/Secret에서 주입 |
| Storage 설정 | S3 Bucket, MinIO Bucket, object path | 이름은 Config로 관리하고, 접근 권한은 Secret으로 관리 |
| Queue 설정 | SQS Queue URL, LocalStack Queue URL, Endpoint URL | 로컬/운영 환경별로 분리 관리 |
| 모델 설정 | 모델 파일 경로, 모델 버전, Runtime 설정 | 모델 파일은 서비스 코드와 Docker 빌드 컨텍스트에서 분리하고, 경로와 버전은 Config로 관리 |
| 배포 설정 | ECR Registry, image tag, namespace | 민감하지 않은 값은 문서화 가능 |
| 예시 파일 | `.env.example`, `secret-example.yaml` | 키 이름과 설명만 작성 |

---

## 4. ECR / K3s / AWS 기본 결정

- ECR, K3s, AWS 리소스는 MVP 기준 기본값을 적용

| 구분 | 기본 결정 |
| --- | --- |
| ECR Repository | Frontend, Backend, AI Worker 서비스별 분리 |
| Image Tag | `git-sha` 기반 태그 사용 |
| `latest` 태그 | 개발 편의용으로만 사용 |
| Docker Build Context | Jenkins는 각 서비스 디렉터리(`frontend/`, `backend/`, `ai-worker/`)를 빌드 컨텍스트로 사용 |
| Docker Ignore | 각 서비스는 `.dockerignore`로 `node_modules`, `.gradle`, `build`, `dist`, `venv`, 대용량 모델 파일을 빌드에서 제외 |
| K3s Namespace | `pv-insight` |
| K3s 배포 방식 | Frontend/Backend는 Deployment + Service + Ingress, AI Worker는 Deployment 중심으로 구성 |
| Service Type | 내부 통신은 ClusterIP |
| Ingress | Traefik Ingress Controller |
| 라우팅 | `/` → Frontend, `/api` → Backend |
| AI Worker 외부 노출 | 금지 |
| Health Check | Frontend, Backend, AI Worker에 readiness/liveness probe를 적용하고, AI Worker는 모델 로딩 시간을 고려해 초기 지연 시간을 둠 |
| TLS/HTTPS | 운영 환경은 HTTPS 사용을 전제로 하며, 인증서 처리 방식은 도메인/인프라 구성 시 별도 확정 |
| AWS Region | 모든 AWS 리소스 동일 Region 사용 |
| EC2 | K3s 단일 노드 MVP |
| RDS | PostgreSQL |
| DB Migration | 로컬/운영 모두 Flyway 기준으로 관리하고, 운영 환경에서는 `ddl-auto` 자동 변경을 사용하지 않음 |
| Flyway 로컬 기준 | 로컬도 Flyway를 적용하며, 초기 데이터는 필요한 경우 `scripts/seed-db.sh`로 분리 |
| Flyway Clean | 로컬/운영 모두 자동 clean은 사용하지 않음 |
| 로컬 DB 초기화 | 로컬 스키마 초기화가 필요한 경우 `docker compose down -v` 후 재기동하여 처리 |
| S3 | 원본 이미지와 분석 결과 이미지 저장 |
| SQS | AI 분석 작업 Queue |
| SQS 실패 처리 | AI 분석 작업 메시지는 최대 수신 횟수 3회 후 DLQ로 이동 |
| CloudWatch | Backend / AI Worker 로그 수집 |
| IAM | 최소 권한 원칙 적용 |
| Secret | MVP는 Kubernetes Secret 우선, 필요 시 AWS Secrets Manager 사용 |
| Jenkins 실행 위치 | MVP 기준 Jenkins는 K3s 단일 노드 EC2에서 실행 |
| Jenkins 리소스 주의 | K3s 단일 노드 EC2에서 Jenkins 빌드가 실행되므로, 빌드 중 서비스 Pod와 CPU/메모리 경합이 발생할 수 있음 |
| Jenkins 배포 권한 | Jenkins는 ECR Push 권한과 K3s 배포용 kubeconfig 접근 권한을 가짐 |
| 모델 파일 배포 | 대용량 모델 파일은 Docker 이미지에 포함하지 않고, AI Worker 기동 시 S3에서 지정 경로로 다운로드하여 사용 |
| 모델 다운로드 실패 처리 | AI Worker가 S3 모델 다운로드에 실패하면 기동을 중단하고 K8s 재시작 정책으로 재시도 |
| 롤백 | 이전 ECR 이미지 태그로 롤백 |

---

## 5. 전체 루트 디렉터리 구조

```
pv-fusion/
├─ frontend/              # React Frontend 소스
├─ backend/               # Spring Boot Backend 소스
├─ ai-worker/             # FastAPI AI Worker 소스
├─ docker/                # Compose에서 참조하는 PostgreSQL, MinIO, LocalStack 초기화 스크립트와 보조 설정
├─ k8s/                   # 운영 K3s 배포 설정(Deployment, Service, Ingress, ConfigMap 등)
│  └─ _examples/          # 실제 배포 대상에서 제외되는 Kubernetes 예시 템플릿
├─ scripts/               # 로컬 실행/초기화/배포 보조 스크립트(init-local.sh, seed-db.sh, deploy.sh 등)
├─ experiments/           # AI 실험 설정/결과 아카이브, 대용량 결과물 제외 기준은 .gitignore 참조
├─ docs/                  # 프로젝트 문서, 설계서, API 명세, ERD, 정책 문서
├─ Jenkinsfile            # Jenkins CI/CD 파이프라인 정의
├─ docker-compose.yml     # 로컬 통합 실행용 Compose 파일
├─ .env.example           # Docker Compose 기준 공통 환경 변수 템플릿, 실제 Secret 값 작성 금지
├─ .gitignore             # Git 제외 파일 정의
└─ README.md              # 프로젝트 개요와 실행 방법 안내
```