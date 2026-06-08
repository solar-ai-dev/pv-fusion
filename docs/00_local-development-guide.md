# Local Development Guide

로컬에서 PV Fusion 전체 서비스를 실행하는 최소 절차이다.

---

## 1. Docker 인프라 실행

PostgreSQL, MinIO, LocalStack을 실행한다.

```powershell
cd C:\project\pv-fusion
docker compose up -d
docker compose ps
````

DB 포트 확인:

```powershell
Test-NetConnection localhost -Port 5432
```

---

## 2. Backend 실행

Google OAuth 환경변수를 설정한 뒤 Spring Boot local profile로 실행한다.

```powershell
$env:GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET="your-google-client-secret"

cd C:\project\pv-fusion\backend
.\gradlew.bat bootRun --args="--spring.profiles.active=local"
```

Backend URL:

```text
http://localhost:8080/api/v1
```

---

## 3. Frontend 실행

최초 1회 `.env.local`을 만든 뒤 Vite 개발 서버를 실행한다.

```powershell
cd C:\project\pv-fusion\frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

`.env.local` 확인:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

Frontend URL:

```text
http://localhost:5173
```

---

## 4. AI Worker / FastAPI 실행

최초 1회 `.env.local`을 만든 뒤 FastAPI Worker를 실행한다.

```powershell
cd C:\project\pv-fusion\ai-worker
Copy-Item .env.example .env.local
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> `uvicorn app.main:app` 경로는 실제 FastAPI app 위치에 맞게 조정한다.

AI Worker URL:

```text
http://localhost:8000
```

---

## 5. 실행 순서 요약

각각 다른 터미널에서 실행한다.

```text
1. docker compose up -d
2. backend bootRun
3. frontend npm run dev
4. ai-worker uvicorn 실행
```

---

## 6. 최초 로그인 후 관리자 승인

Google 로그인 후 생성된 로컬 사용자를 승인하고 관리자로 변경한다.

사용자 확인:

```powershell
docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "select id, email, name, role, account_status from users order by id;"
```

관리자 승인:

```powershell
docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "update users set role='ADMIN', account_status='APPROVED', updated_at=now() where email='user@example.com' returning id, email, role, account_status;"
```

`user@example.com`은 실제 로그인한 Google 이메일로 바꾼다.

변경 후 브라우저에서 로그아웃 후 다시 로그인한다.

---

## 7. 사용자 상태 변경 SQL

일반 사용자 승인:

```powershell
docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "update users set account_status='APPROVED', updated_at=now() where email='user@example.com' returning id, email, role, account_status;"
```

관리자 승격:

```powershell
docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "update users set role='ADMIN', updated_at=now() where email='user@example.com' returning id, email, role, account_status;"
```

일반 사용자로 변경:

```powershell
docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "update users set role='USER', updated_at=now() where email='user@example.com' returning id, email, role, account_status;"
```

승인 대기로 변경:

```powershell
docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "update users set account_status='PENDING', updated_at=now() where email='user@example.com' returning id, email, role, account_status;"
```

비활성화:

```powershell
docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "update users set account_status='INACTIVE', updated_at=now() where email='user@example.com' returning id, email, role, account_status;"
```

---

## 8. 종료

컨테이너 종료:

```powershell
docker compose down
```

DB/MinIO 데이터까지 삭제:

```powershell
docker compose down -v
```

`-v`는 로컬 데이터를 삭제하므로 주의한다.

```