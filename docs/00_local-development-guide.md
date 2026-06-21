# Local Development Guide

로컬 개발 기본 실행 가이드다.

## 기본 원칙

- `docker compose up -d`는 인프라 전용 흐름이다.
- Frontend는 Browser에서 Backend API만 호출한다.
- AI Worker는 외부 공개 API가 아니라 내부 Queue Worker다.
- 실제 Secret, OAuth Secret, AWS Key는 커밋하지 않는다.
- 로컬 검증 중 `docker compose down -v`는 실행하지 않는다.

## 1. 인프라만 실행

```powershell
cd C:\project\pv-fusion
Copy-Item .env.example .env
docker compose up -d
docker compose ps

Test-NetConnection localhost -Port 5432
Test-NetConnection localhost -Port 9000
Test-NetConnection localhost -Port 4566
```

기본 인프라 서비스:

- `postgres`
- `minio`
- `minio-init`
- `localstack`
- `localstack-init`

`minio-init`, `localstack-init`가 각각 Bucket, Queue를 자동으로 준비한다.

Queue 확인:

```powershell
docker compose exec localstack awslocal sqs list-queues --region ap-northeast-2
```

Queue URL:

```text
http://localhost:4566/000000000000/analysis-job-queue
```

## 2. 전체 Compose 실행

루트 `.env`에 최소한 다음 값을 준비한다.

```text
VITE_API_BASE_URL=http://localhost:8080/api/v1
AI_WORKER_DATABASE_URI=postgresql://pvfusion:<url-encoded-password>@postgres:5432/pv_fusion_local
AI_WORKER_MODEL_DIR=./ai-worker/models
```

비밀번호에 예약 문자가 있으면 `AI_WORKER_DATABASE_URI`에 URL encoding해서 넣는다.

```powershell
docker compose --profile app up -d --build
docker compose ps
```

Host URL:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- MinIO Public: `http://127.0.0.1:9000`
- AI Worker: `http://127.0.0.1:8000`

Health 확인:

```powershell
Invoke-WebRequest http://localhost:5173/health
Invoke-WebRequest http://localhost:8080/actuator/health
Invoke-WebRequest http://127.0.0.1:8000/health
Invoke-WebRequest http://127.0.0.1:8000/internal/health
```

로컬 주소 계약:

- 브라우저 접근 URL은 `localhost`를 사용한다.
- Frontend API Base URL은 `http://localhost:8080/api/v1`를 사용한다.
- OAuth callback은 `http://localhost:8080/api/v1/auth/oauth2/callback/google`를 사용한다.
- MinIO Presigned URL의 public hostname은 `http://127.0.0.1:9000`를 사용한다.
- Docker 컨테이너 내부 통신은 Compose 서비스명(`minio`, `postgres`, `localstack`)을 사용한다.
- 컨테이너 내부 health check와 host 포트 바인딩은 `127.0.0.1`을 사용할 수 있으며, 브라우저 URL 계약과 별개다.

주소를 바꿀 때는 먼저 호출 주체를 구분한다.

- 브라우저 접근: `localhost`
- 컨테이너 간 통신: Compose 서비스명
- 컨테이너 자기 자신 health check: `127.0.0.1`

한 영역의 hostname을 바꿨다는 이유만으로 다른 영역 endpoint까지 함께 바꾸지 않는다.

## 3. 서비스 단독 실행

Backend:

```powershell
$env:GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET="your-google-client-secret"

cd C:\project\pv-fusion\backend
.\gradlew.bat bootRun --args="--spring.profiles.active=local"
```

Frontend:

```powershell
cd C:\project\pv-fusion\frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Frontend local env:

```text
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

AI Worker:

```powershell
cd C:\project\pv-fusion\ai-worker
Copy-Item .env.example .env.local
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

AI Worker local 설정 기준:

- `.env.local`: DB / SQS / Storage / manifest path
- `model-manifest.dev.yaml`: 모델명 / 버전 / input size / threshold / class_names / model_path

## 4. 최초 로그인 후 관리자 계정 승인

사용자 확인:

```powershell
docker compose exec -T postgres psql -U pvfusion -d pv_fusion_local -c "select id, email, name, role, account_status from users order by id;"
```

관리자 승인:

```powershell
docker compose exec -T postgres psql -U pvfusion -d pv_fusion_local -c "update users set role='ADMIN', account_status='APPROVED', updated_at=now() where email='user@example.com' returning id, email, role, account_status;"
```

## 5. 검증

```powershell
cd C:\project\pv-fusion\backend
.\gradlew.bat compileJava
.\gradlew.bat test

cd C:\project\pv-fusion\frontend
npm run build

cd C:\project\pv-fusion\ai-worker
pytest
```

## 6. 종료

전체 종료:

```powershell
docker compose down
```

앱 서비스만 중지:

```powershell
docker compose stop frontend backend ai-worker
```
