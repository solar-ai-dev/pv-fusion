# Local Development Guide

로컬 실행 최소 절차이다.

## 기본 전제

- Frontend는 Backend API만 호출한다.
- AI Worker는 외부 API가 아니라 내부 Queue Worker다.
- 로컬 인프라는 Docker Compose로 PostgreSQL, MinIO, LocalStack을 실행한다.
- 실제 Secret, OAuth Secret, AWS Key, 개인 계정 정보는 커밋하지 않는다.

## 1. Docker 인프라 실행

```powershell
cd C:\project\pv-fusion
docker compose up -d
docker compose ps

포트 확인:

Test-NetConnection localhost -Port 5432
Test-NetConnection localhost -Port 9000
Test-NetConnection localhost -Port 4566

2. LocalStack SQS Queue 생성

AWS CLI가 없으면 LocalStack 컨테이너의 awslocal을 사용한다.

docker compose exec localstack awslocal sqs list-queues --region ap-northeast-2
docker compose exec localstack awslocal sqs create-queue --queue-name analysis-job-queue --region ap-northeast-2
docker compose exec localstack awslocal sqs list-queues --region ap-northeast-2

Queue URL:

http://localhost:4566/000000000000/analysis-job-queue

3. Backend 실행
$env:GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET="your-google-client-secret"

cd C:\project\pv-fusion\backend
.\gradlew.bat bootRun --args="--spring.profiles.active=local"

Backend URL:

http://localhost:8080/api/v1

4. Frontend 실행
cd C:\project\pv-fusion\frontend
Copy-Item .env.example .env.local
npm install
npm run dev

.env.local 확인:

VITE_API_BASE_URL=http://localhost:8080/api/v1

Frontend URL:

http://localhost:5173

5. AI Worker 실행
cd C:\project\pv-fusion\ai-worker
Copy-Item .env.example .env.local
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

AI Worker 설정 기준:

.env.local = DB / SQS / Storage / manifest path
model-manifest.dev.yaml = 모델명 / 버전 / input size / threshold / class_names / model_path

6. 최초 로그인 후 관리자 승인

사용자 확인:

docker compose exec -T postgres psql -U pvfusion -d pv_fusion_local -c "select id, email, name, role, account_status from users order by id;"

관리자 승인:

docker compose exec -T postgres psql -U pvfusion -d pv_fusion_local -c "update users set role='ADMIN', account_status='APPROVED', updated_at=now() where email='user@example.com' returning id, email, role, account_status;"

user@example.com은 실제 로그인한 Google 이메일로 바꾼다. 변경 후 로그아웃/재로그인한다.

7. 검증
cd C:\project\pv-fusion\backend
.\gradlew.bat compileJava
.\gradlew.bat test
cd C:\project\pv-fusion\frontend
npm run build
cd C:\project\pv-fusion\ai-worker
pytest

8. 종료
docker compose down

DB/MinIO 데이터까지 삭제:

docker compose down -v