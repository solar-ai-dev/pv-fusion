# 환경변수 및 Secret 계약

## 1. 목적

- Backend, AI Worker, Frontend, 향후 배포 환경에서 공통으로 사용할 환경변수 계약을 고정한다.
- local/prod 차이와 ConfigMap, Secret, IAM 책임 경계를 분리한다.
- 실제 Secret 값은 이 문서, 예시 파일, 코드에 넣지 않는다.

## 2. 환경 선택 기준

| 서비스 | 공식 환경 선택 키 | 허용값 | 비고 |
| --- | --- | --- | --- |
| Backend | `SPRING_PROFILES_ACTIVE` | `local`, `prod` | Spring profile 기준 |
| AI Worker | `APP_ENV` | `local`, `prod` | `ENVIRONMENT`는 호환 alias |
| Frontend | 없음 | 해당 없음 | Vite build-time 변수만 사용 |

## 3. 분류 기준

- ConfigMap 또는 일반 환경변수: 환경 이름, 포트, region, bucket 이름, queue URL, public URL, 모델 경로, polling 설정
- Secret: DB 비밀번호, `DATABASE_URI`, OAuth Client Secret, local MinIO/LocalStack 자격증명
- IAM 또는 AWS 기본 Credential Chain: prod S3, prod SQS 접근 권한

## 4. Backend 계약

| 변수명 | 서비스 | 환경 | 필수 | 기본값 | 예시 값 | 민감 | 분류 | 사용 위치 | 비고 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | Backend | local/prod | Y | 없음 | `local` | N | ConfigMap | `backend/.env.example`, 실행 인자 | Backend 환경 선택 키 |
| `SERVER_PORT` | Backend | local/prod | N | `8080` | `8080` | N | ConfigMap | `backend/src/main/resources/application.yml` | 공통 포트 |
| `FRONTEND_BASE_URL` | Backend | local/prod | local N, prod Y | local `http://localhost:5173` | `https://app.example.com` | N | ConfigMap | `application-local.yml`, `application-prod.yml` | OAuth redirect 기본 URL 계산에 사용 |
| `CORS_ALLOWED_ORIGINS` | Backend | local/prod | local N, prod Y | local localhost 3개 | `https://app.example.com` | N | ConfigMap | `application-local.yml`, `application-prod.yml`, `SecurityConfig.java` | 쉼표 구분 |
| `OAUTH2_SUCCESS_REDIRECT_URL` | Backend | local/prod | N | `${FRONTEND_BASE_URL}/dashboard` | `https://app.example.com/dashboard` | N | ConfigMap | `application-local.yml`, `application-prod.yml` | 선택 override |
| `OAUTH2_FAILURE_REDIRECT_URL` | Backend | local/prod | N | `${FRONTEND_BASE_URL}/login?error=oauth` | `https://app.example.com/login?error=oauth` | N | ConfigMap | `application-local.yml`, `application-prod.yml` | 선택 override |
| `GOOGLE_CLIENT_ID` | Backend | local/prod | Y | 없음 | `123.apps.googleusercontent.com` | N | ConfigMap | `application-local.yml`, `application-prod.yml` | 공개 가능한 client id |
| `GOOGLE_CLIENT_SECRET` | Backend | local/prod | Y | 없음 | `<set-in-secret>` | Y | Secret | `application-local.yml`, `application-prod.yml` | Secret 대상 |
| `POSTGRES_HOST` | Backend | local | N | `localhost` | `localhost` | N | ConfigMap | `application-local.yml` | local DB host |
| `POSTGRES_PORT` | Backend | local | N | `5432` | `5432` | N | ConfigMap | `application-local.yml` | local DB port |
| `POSTGRES_DB` | Backend | local | N | `pv_fusion_local` | `pv_fusion_local` | N | ConfigMap | `application-local.yml` | local DB name |
| `POSTGRES_USER` | Backend | local | N | `pvfusion` | `pvfusion` | N | ConfigMap | `application-local.yml` | local DB user |
| `POSTGRES_PASSWORD` | Backend | local | N | `change_me_postgres_password` | `<set-in-secret>` | Y | Secret | `application-local.yml` | local Secret 취급 |
| `RDS_JDBC_URL` | Backend | prod | Y | 없음 | `jdbc:postgresql://db.example.com:5432/pv_fusion` | Y | Secret | `application-prod.yml` | 연결 문자열 전체를 Secret으로 분류 |
| `RDS_USERNAME` | Backend | prod | Y | 없음 | `pvfusion` | N | ConfigMap | `application-prod.yml` | 운영 분리 기준상 일반 값 |
| `RDS_PASSWORD` | Backend | prod | Y | 없음 | `<set-in-secret>` | Y | Secret | `application-prod.yml` | 운영 DB 비밀번호 |
| `MINIO_ENDPOINT` | Backend | local | N | `http://localhost:9000` | `http://localhost:9000` | N | ConfigMap | `application-local.yml` | local 전용 |
| `MINIO_ROOT_USER` | Backend | local | N | `change_me_minio_root_user` | `change_me_minio_root_user` | Y | Secret | `application-local.yml` | local Secret 취급 |
| `MINIO_ROOT_PASSWORD` | Backend | local | N | `change_me_minio_root_password` | `<set-in-secret>` | Y | Secret | `application-local.yml` | local Secret 취급 |
| `MINIO_BUCKET_NAME` | Backend | local | N | `pv-insight-local` | `pv-insight-local` | N | ConfigMap | `application-local.yml` | local bucket |
| `MINIO_REGION` | Backend | local | N | `ap-northeast-2` | `ap-northeast-2` | N | ConfigMap | `application-local.yml` | local region |
| `AWS_REGION` | Backend | prod | Y | 없음 | `ap-northeast-2` | N | ConfigMap | `application.yml`, `application-prod.yml` | prod S3/SQS 공통 |
| `S3_BUCKET_NAME` | Backend | prod | Y | 없음 | `example-bucket` | N | ConfigMap | `application-prod.yml` | prod bucket |
| `S3_PATH_STYLE_ACCESS_ENABLED` | Backend | prod | N | `false` | `false` | N | ConfigMap | `application-prod.yml` | 기본은 비활성 |
| `SQS_ENDPOINT` | Backend | local | N | `http://localhost:4566` | `http://localhost:4566` | N | ConfigMap | `application-local.yml` | local 전용 |
| `SQS_ACCESS_KEY` | Backend | local | N | `test` | `test` | Y | Secret | `application-local.yml` | local Secret 취급 |
| `SQS_SECRET_KEY` | Backend | local | N | `test` | `test` | Y | Secret | `application-local.yml` | local Secret 취급 |
| `SQS_REGION` | Backend | local | N | `ap-northeast-2` | `ap-northeast-2` | N | ConfigMap | `application-local.yml` | local queue region |
| `SQS_QUEUE_URL` | Backend | local/prod | Y | local LocalStack URL | `https://sqs.ap-northeast-2.amazonaws.com/123456789012/analysis-job-queue` | N | ConfigMap | `application-local.yml`, `application-prod.yml` | prod에서도 일반 값 |

## 5. AI Worker 계약

| 변수명 | 서비스 | 환경 | 필수 | 기본값 | 예시 값 | 민감 | 분류 | 사용 위치 | 비고 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `APP_ENV` | AI Worker | local/prod | Y | `local` | `prod` | N | ConfigMap | `ai-worker/app/config/settings.py`, `.env.example` | 공식 환경 선택 키 |
| `ENVIRONMENT` | AI Worker | local/prod | N | 없음 | `prod` | N | ConfigMap | `settings.py` | 호환 alias |
| `DATABASE_URI` | AI Worker | local/prod | Y | 없음 | `postgresql://pvfusion:<set-in-secret>@db.example.com:5432/pv_fusion` | Y | Secret | `settings.py`, `.env.example` | canonical |
| `DATABASE_URL` | AI Worker | local/prod | N | 없음 | 위와 동일 | Y | Secret | `settings.py` | 호환 alias |
| `AWS_REGION` | AI Worker | local/prod | N | `ap-northeast-2` | `ap-northeast-2` | N | ConfigMap | `settings.py` | 공통 region fallback |
| `SQS_QUEUE_URL` | AI Worker | local/prod | Y | 없음 | `http://localhost:4566/000000000000/analysis-job-queue` | N | ConfigMap | `settings.py`, `runtime.py` | 공통 필수 |
| `SQS_ENDPOINT_URL` | AI Worker | local | Y | 없음 | `http://localhost:4566` | N | ConfigMap | `settings.py`, `runtime_clients.py` | prod 미사용 |
| `SQS_ENDPOINT` | AI Worker | local | N | 없음 | `http://localhost:4566` | N | ConfigMap | `settings.py` | Backend 호환 alias |
| `SQS_ACCESS_KEY` | AI Worker | local | Y | 없음 | `test` | Y | Secret | `settings.py`, `runtime_clients.py` | prod 미사용 |
| `SQS_SECRET_KEY` | AI Worker | local | Y | 없음 | `test` | Y | Secret | `settings.py`, `runtime_clients.py` | prod 미사용 |
| `SQS_WAIT_TIME_SECONDS` | AI Worker | local/prod | N | `5` | `5` | N | ConfigMap | `settings.py`, `runtime.py` | polling |
| `SQS_VISIBILITY_TIMEOUT_SECONDS` | AI Worker | local/prod | N | 없음 | `30` | N | ConfigMap | `settings.py`, `runtime.py` | 선택 |
| `STORAGE_DEFAULT_BUCKET` | AI Worker | local/prod | Y | 없음 | `example-bucket` | N | ConfigMap | `settings.py`, `runtime.py` | canonical |
| `S3_BUCKET_NAME` | AI Worker | local/prod | N | 없음 | `example-bucket` | N | ConfigMap | `settings.py` | 호환 alias |
| `STORAGE_ENDPOINT_URL` | AI Worker | local | Y | 없음 | `http://localhost:9000` | N | ConfigMap | `settings.py`, `runtime_clients.py` | prod 미사용 |
| `STORAGE_ENDPOINT` | AI Worker | local | N | 없음 | `http://localhost:9000` | N | ConfigMap | `settings.py` | alias |
| `S3_ENDPOINT` | AI Worker | local | N | 없음 | `http://localhost:9000` | N | ConfigMap | `settings.py` | alias |
| `STORAGE_REGION` | AI Worker | local/prod | N | `AWS_REGION` 대체 사용 | `ap-northeast-2` | N | ConfigMap | `settings.py`, `runtime_clients.py` | 선택 override |
| `STORAGE_ACCESS_KEY` | AI Worker | local | Y | 없음 | `change_me_minio_root_user` | Y | Secret | `settings.py`, `runtime_clients.py` | prod 미사용 |
| `STORAGE_SECRET_KEY` | AI Worker | local | Y | 없음 | `<set-in-secret>` | Y | Secret | `settings.py`, `runtime_clients.py` | prod 미사용 |
| `STORAGE_PATH_STYLE_ENABLED` | AI Worker | local/prod | N | `false` | `true` | N | ConfigMap | `settings.py`, `runtime_clients.py` | local MinIO에서 주로 사용 |
| `RGB_MODEL_MANIFEST_PATH` | AI Worker | local/prod | N | `models/rgb/model-manifest.dev.yaml` | `/models/rgb/model-manifest.yaml` | N | ConfigMap | `settings.py` | 모델 경로 |
| `THERMAL_MODEL_MANIFEST_PATH` | AI Worker | local/prod | N | `models/thermal/model-manifest.dev.yaml` | `/models/thermal/model-manifest.yaml` | N | ConfigMap | `settings.py` | 모델 경로 |

## 6. Frontend 계약

| 변수명 | 서비스 | 환경 | 필수 | 기본값 | 예시 값 | 민감 | 분류 | 사용 위치 | 비고 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Frontend | local/prod build-time | N | `http://localhost:8080/api/v1` | `https://api.example.com/api/v1` | N | ConfigMap | `frontend/.env.example`, `frontend/src/shared/api/client.ts` | 현재 실제 사용 변수 1개 |

## 7. local/prod 차이

- local: PostgreSQL Docker, MinIO, LocalStack SQS를 사용하며 endpoint override와 local dummy credential이 필요하다.
- prod: RDS PostgreSQL, AWS S3, AWS SQS를 사용하며 endpoint override와 static AWS credential을 기본 계약으로 요구하지 않는다.

## 8. 배포 주입 기준

- Docker Compose: 루트 `.env.example` 기준으로 local infra 값을 주입한다.
- Jenkins: 같은 변수명을 사용하되 실제 Secret 값은 Jenkins credential 또는 외부 Secret 저장소에서 주입한다.
- K3s: ConfigMap에는 일반 값만 두고 Secret에는 비밀번호, `DATABASE_URI`, OAuth Secret만 둔다.
- prod AWS 접근: `AWS_ACCESS_KEY_ID`와 `AWS_SECRET_ACCESS_KEY` 직접 주입 대신 IAM Role 또는 기본 Credential Chain을 우선한다.

## 9. 운영 금지 사항

- Frontend에 Secret 전달 금지
- prod에서 MinIO, LocalStack endpoint 주입 금지
- prod에서 static AWS access key 계약화 금지
- 예시 파일에 실제 비밀번호, OAuth Secret, Access Key 저장 금지

## 10. 역할 분담

- A 담당: 환경변수 이름, 계약, 예시 파일, 애플리케이션 검증 코드 준비
- B 담당: 실제 Jenkins/K3s/AWS 주입, ConfigMap/Secret 생성, 운영 Secret 관리

## 11. 현재 코드 기준 확인 메모

- Frontend는 `VITE_API_BASE_URL`만 사용한다.
- AI Worker는 `APP_ENV`, `DATABASE_URI`, `SQS_QUEUE_URL`, `STORAGE_DEFAULT_BUCKET`을 중심으로 동작한다.
- `docs/11_ai-worker-contract.md`에는 현재 코드에서 사용하지 않는 과거 키(`SQS_DLQ_URL`, `S3_ORIGINAL_BUCKET`, `DB_HOST`)가 남아 있어 최신 계약 문서로 사용하면 안 된다.
