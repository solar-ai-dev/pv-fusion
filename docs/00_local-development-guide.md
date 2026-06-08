# Local Development Guide

## 1. 로컬 인프라 실행

프로젝트 루트에서 Docker Compose 인프라를 실행한다.

```powershell
cd C:\project\pv-fusion
docker compose up -d
docker compose ps
```

PostgreSQL 포트 확인:

```powershell
Test-NetConnection localhost -Port 5432
```

정상이라면 다음 값이 표시된다.

```text
TcpTestSucceeded : True
```

---

## 2. Backend 실행

Backend는 Spring Boot local profile 기준으로 실행한다.

Google OAuth Client ID/Secret은 환경변수로 주입한다.

```powershell
$env:GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET="your-google-client-secret"

cd C:\project\pv-fusion\backend
.\gradlew.bat bootRun --args="--spring.profiles.active=local"
```

Backend 로컬 기본 주소:

```text
http://localhost:8080/api/v1
```

Health check:

```text
GET http://localhost:8080/api/v1/health
```

---

## 3. Frontend 실행

최초 1회 의존성 설치:

```powershell
cd C:\project\pv-fusion\frontend
npm install
```

Frontend 개발 서버 실행:

```powershell
npm run dev
```

Frontend 로컬 기본 주소:

```text
http://localhost:5173
```

---

## 4. Google OAuth 최초 로그인

브라우저에서 Frontend에 접속한 뒤 Google 로그인을 수행한다.

```text
http://localhost:5173
```

최초 로그인 사용자는 기본적으로 승인 대기 상태로 생성된다.

---

## 5. 로컬 DB 사용자 확인

프로젝트 루트에서 users 테이블을 확인한다.

```powershell
cd C:\project\pv-fusion

docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "select id, email, name, role, account_status, provider, created_at from users order by id;"
```

예상 상태:

```text
role           USER
account_status PENDING
```

---

## 6. 로컬 사용자 승인 및 관리자 승격

아래 명령은 로컬 DB 전용이다.

`user@example.com`은 실제 로그인한 Google 이메일로 바꾼다.

```powershell
docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "update users set role='ADMIN', account_status='APPROVED', updated_at=now() where email='user@example.com' returning id, email, role, account_status;"
```

변경 확인:

```powershell
docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "select id, email, name, role, account_status from users order by id;"
```

변경 후 브라우저에서 로그아웃 후 다시 로그인한다.

---

## 7. 로컬 사용자 상태 변경 SQL 모음

### 일반 사용자 승인

```powershell
docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "update users set account_status='APPROVED', updated_at=now() where email='user@example.com' returning id, email, role, account_status;"
```

### 관리자 승격

```powershell
docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "update users set role='ADMIN', updated_at=now() where email='user@example.com' returning id, email, role, account_status;"
```

### 일반 사용자로 변경

```powershell
docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "update users set role='USER', updated_at=now() where email='user@example.com' returning id, email, role, account_status;"
```

### 승인 대기로 되돌리기

```powershell
docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "update users set account_status='PENDING', updated_at=now() where email='user@example.com' returning id, email, role, account_status;"
```

### 비활성화

```powershell
docker compose exec postgres psql -U pvfusion -d pv_fusion_local -c "update users set account_status='INACTIVE', updated_at=now() where email='user@example.com' returning id, email, role, account_status;"
```

---

## 8. 로컬 인프라 종료

컨테이너만 종료:

```powershell
docker compose down
```

볼륨까지 삭제해서 DB 데이터를 초기화:

```powershell
docker compose down -v
```

주의: `-v`를 사용하면 PostgreSQL, MinIO 등 로컬 데이터가 삭제된다.

---
