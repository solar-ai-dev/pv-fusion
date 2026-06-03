# 04. Local Run Verification

## 1. 목적
이 문서는 `pv-fusion`의 로컬 DB/Storage 구성과 Backend 실행이 실제로 동작하는지 확인하는 최소 검증 절차를 정리한다.

검증 범위는 아래에 한정한다.

- Docker Compose 기반 `PostgreSQL`, `MinIO`, `minio-init` 실행 확인
- `backend`의 local profile 빌드 및 실행 기준 확인
- `Flyway` migration 적용 여부 확인
- `Actuator health` 응답 확인

이번 문서는 `Controller`, `Service`, `Entity`, `Repository`, 업로드 API 구현 여부를 다루지 않는다.

---

## 2. 사전 점검 항목

| 항목 | 확인 기준 |
| --- | --- |
| `docker-compose.yml` | 저장소 루트에 존재해야 한다. |
| `.env.example` | 저장소 루트에 존재해야 한다. |
| `backend/build.gradle` | `spring-boot-starter-data-jpa`, `flyway-core`, `flyway-database-postgresql`, `postgresql`, `software.amazon.awssdk:s3` 의존성이 있어야 한다. |
| `backend/src/main/resources/application-local.yml` | local DB/Flyway/MinIO placeholder 구성이 있어야 한다. |
| `backend/src/main/resources/db/migration/V1~V5` | migration 파일 5개가 존재해야 한다. |
| `docker/minio/init-buckets.sh` | MinIO bucket 초기화 스크립트가 존재해야 한다. |
| `ai-worker/requirements.txt` | 존재 여부만 확인한다. 이번 검증에서 수정하지 않는다. |
| 로컬 포트 | `5432`, `9000`, `9001`, `8080` 사용 가능 상태인지 확인한다. |
| Docker Desktop / Docker Engine | 실행 중이어야 한다. |

---

## 3. `.env` 준비

### 3.1 생성 방법
PowerShell 기준:

```powershell
Copy-Item .env.example .env
```

`.env.example`은 템플릿 파일이고, 실제 로컬 실행 값은 `.env`에 둔다.

- `.env`는 커밋하지 않는다.
- `.env.example`에는 placeholder 값만 유지한다.
- 실제 실행 시점에는 `.env`, 셸 환경변수, `application-local.yml` fallback 값이 함께 영향을 줄 수 있다.

### 3.2 우선순위 주의
`application-local.yml`에는 아래 fallback 값이 들어 있다.

- `POSTGRES_HOST: localhost`
- `POSTGRES_PORT: 5432`
- `POSTGRES_DB: pv_fusion_local`
- `POSTGRES_USER: pvfusion`
- `POSTGRES_PASSWORD: change_me_postgres_password`
- `MINIO_ENDPOINT: http://localhost:9000`
- `MINIO_INTERNAL_ENDPOINT: http://minio:9000`
- `MINIO_BUCKET_NAME: pv-insight-local`

PowerShell 환경변수가 이미 잡혀 있으면 `.env`와 다르게 해석될 수 있다.

현재 셸의 값을 확인하려면:

```powershell
echo $env:POSTGRES_HOST
echo $env:POSTGRES_PORT
echo $env:POSTGRES_DB
echo $env:POSTGRES_USER
echo $env:POSTGRES_PASSWORD
echo $env:MINIO_ENDPOINT
echo $env:MINIO_INTERNAL_ENDPOINT
echo $env:MINIO_BUCKET_NAME
```

기존 환경변수를 비우고 다시 테스트하려면:

```powershell
Remove-Item Env:POSTGRES_HOST -ErrorAction SilentlyContinue
Remove-Item Env:POSTGRES_PORT -ErrorAction SilentlyContinue
Remove-Item Env:POSTGRES_DB -ErrorAction SilentlyContinue
Remove-Item Env:POSTGRES_USER -ErrorAction SilentlyContinue
Remove-Item Env:POSTGRES_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:MINIO_ENDPOINT -ErrorAction SilentlyContinue
Remove-Item Env:MINIO_INTERNAL_ENDPOINT -ErrorAction SilentlyContinue
Remove-Item Env:MINIO_BUCKET_NAME -ErrorAction SilentlyContinue
```

### 3.3 stale volume 주의
PostgreSQL volume이 이미 생성된 뒤 `.env` 값을 바꾸면, 새 비밀번호가 즉시 반영되지 않을 수 있다.

이 경우 아래 순서로 데이터를 초기화해야 할 수 있다.

```powershell
docker compose down -v
docker compose up -d postgres minio minio-init
```

주의: `down -v`는 로컬 DB/MinIO 볼륨 데이터를 삭제한다.

---

## 4. Docker Compose 실행 순서

### 4.1 설정 검증

```powershell
docker compose config
```

정상이라면 YAML 파싱 오류 없이 최종 compose 구성이 출력된다.

### 4.2 서비스 기동

```powershell
docker compose up -d postgres minio minio-init
```

### 4.3 상태 확인

```powershell
docker compose ps
```

일반적으로 아래 서비스명이 보여야 한다.

- `pv-fusion-postgres`
- `pv-fusion-minio`
- `pv-fusion-minio-init`

### 4.4 bucket 초기화 로그 확인

```powershell
docker logs pv-fusion-minio-init
```

또는:

```powershell
docker compose logs minio-init --no-color
```

bucket 생성 또는 재시도 로그를 통해 초기화 상태를 확인한다.

주의:

- Backend local profile은 호스트 PC에서 실행되므로 `MINIO_ENDPOINT=http://localhost:9000`을 사용한다.
- `minio-init` 컨테이너는 compose 내부 네트워크에서 실행되므로 `MINIO_INTERNAL_ENDPOINT=http://minio:9000`을 사용한다.
- 로컬 bucket 이름은 compose 기준 `pv-insight-local`로 고정해 사용한다.

### 4.5 로컬 데이터 초기화

```powershell
docker compose down -v
docker compose up -d postgres minio minio-init
```

이 절차는 아래 상황에서 사용한다.

- PostgreSQL 비밀번호 변경 후 인증 충돌이 남아 있을 때
- 잘못된 초기 데이터로 인해 재검증이 필요할 때
- MinIO/PostgreSQL 볼륨을 완전히 초기화해야 할 때

---

## 5. Backend 실행 순서

### 5.1 Windows

```powershell
cd backend
.\gradlew.bat build
.\gradlew.bat bootRun --args="--spring.profiles.active=local"
```

주의: `gradlew.bat`는 저장소 루트가 아니라 `backend` 디렉터리에서 실행한다.

### 5.2 macOS / Linux

```bash
cd backend
./gradlew build
./gradlew bootRun --args="--spring.profiles.active=local"
```

### 5.3 정상 시작 판단 기준
정상적으로 올라오면 보통 아래 로그가 보인다.

- `Tomcat started on port 8080`
- `Started PvFusionApplication`

`bootRun`은 포그라운드로 계속 실행된다.

중지할 때는 `Ctrl + C`를 사용한다.

---

## 6. Health Check

PowerShell:

```powershell
Invoke-RestMethod http://localhost:8080/actuator/health
```

브라우저:

```text
http://localhost:8080/actuator/health
```

정상 기대값:

```json
{"status":"UP"}
```

---

## 7. Flyway 적용 확인

### 7.1 migration 파일 기준
현재 local schema는 아래 migration 파일 기준으로 생성된다.

- `V1__create_user_access_tables.sql`
- `V2__create_plant_zone_equipment_tables.sql`
- `V3__create_inspection_image_pair_tables.sql`
- `V4__create_analysis_result_tables.sql`
- `V5__create_operation_logs.sql`

### 7.2 기대 테이블 수

- 서비스 테이블: 13개
- `flyway_schema_history` 포함 전체: 14개

### 7.3 테이블 목록 확인

```powershell
docker exec -it pv-fusion-postgres psql -U pvfusion -d pv_fusion_local -c "\dt"
```

### 7.4 migration 이력 확인

```powershell
docker exec -it pv-fusion-postgres psql -U pvfusion -d pv_fusion_local -c "select version, description, success from flyway_schema_history order by installed_rank;"
```

정상이라면 `V1`부터 `V5`까지 `success = t`로 보여야 한다.

---

## 8. 자주 발생하는 이슈

### 8.1 `password authentication failed for user "pvfusion"`
가장 흔한 원인은 아래 셋 중 하나다.

- `.env`의 `POSTGRES_PASSWORD`와 실제 volume에 저장된 비밀번호가 다름
- PowerShell 환경변수가 `.env`보다 우선 적용됨
- `application-local.yml` fallback 값과 기대값을 혼동함

확인 순서:

```powershell
docker compose config
echo $env:POSTGRES_PASSWORD
```

필요 시:

```powershell
docker compose down -v
docker compose up -d postgres minio minio-init
```

### 8.2 `actuator/health` 호출 실패
대부분은 `bootRun`이 아직 떠 있지 않아서 발생한다.

먼저 확인할 것:

- `backend`에서 `bootRun --args="--spring.profiles.active=local"`가 실제 실행 중인지
- `Tomcat started on port 8080` 로그가 나왔는지

### 8.3 VS Code Problems에 옛 `demo` 패키지 오류가 남아 있음
과거 `com.example.demo` 캐시가 남아 있을 수 있다.

대응:

- Java Language Server의 workspace clean 실행
- IDE Problems보다 `gradlew build` 결과를 우선 기준으로 판단

### 8.4 `application-local.yml`의 `storage` unknown property 경고
현재는 `@ConfigurationProperties` 클래스가 없는 상태라 IDE가 경고를 줄 수 있다.

이 경고만으로 실행 실패로 판단하지 않는다.

`bootRun`과 실제 바인딩 로직이 추가되는 다음 단계에서 다시 정리하면 된다.

### 8.5 YAML 하이픈 키 관련 경고
IDE가 `bucket-name`, `access-key` 같은 키에 대해 보조 경고를 줄 수 있다.

이 역시 실행 결과를 우선 기준으로 판단한다.

### 8.6 `minio/mc:latest` 사용 이슈
현재 `minio-init`은 `minio/mc:latest`를 사용한다.

과거에는 고정 태그 사용을 시도했지만 실제 레지스트리 해석 문제로 실패한 이력이 있다.

추후에는 사용 가능한 고정 태그를 다시 확인한 뒤 pinning하는 편이 안전하다.

### 8.7 `Backend endpoint`와 `컨테이너 내부 endpoint` 혼동
`Backend`는 호스트에서 실행되므로 `MINIO_ENDPOINT=http://localhost:9000`이 맞다.

반대로 `minio-init`처럼 compose 내부에서 실행되는 컨테이너는 `MINIO_INTERNAL_ENDPOINT=http://minio:9000`을 써야 한다.

두 값을 같은 변수로 섞어 쓰면 아래 문제가 다시 생길 수 있다.

- Backend는 정상인데 `minio-init`만 bucket 초기화 실패
- `docker compose config`에서는 값이 보이지만 실제 컨테이너 통신이 실패
- `localhost` 재시도 로그가 반복됨

---

## 9. 브랜치 / 커밋 / PR 체크 예시

- 문서 수정만 있는 경우에도 `docker compose config`와 `backend build` 결과를 확인한 뒤 커밋한다.
- 로컬 검증 로그는 커밋하지 않는다.
- `.env`, `.log`, 임시 파일은 `.gitignore` 대상인지 다시 확인한다.
- PR 본문에는 아래를 포함하는 것이 좋다.
  - 어떤 로컬 실행 절차를 문서화했는지
  - 실제로 확인한 명령이 무엇인지
  - 남아 있는 환경 이슈가 있는지
