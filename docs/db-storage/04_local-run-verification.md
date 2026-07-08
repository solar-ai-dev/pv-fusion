# 04. Local Run Verification

## 1. 목적

이 문서는 `pv-fusion` 저장소의 로컬 PostgreSQL·MinIO 구성과 Backend 실행이 실제로 동작하는지 확인하는 최소 검증 절차를 정리한다.

검증 범위는 아래에 한정한다.

- Docker Compose 기반 PostgreSQL, MinIO, `minio-init` 실행 확인
- Backend의 local profile 빌드 및 실행 확인
- Flyway Migration 적용 여부 확인
- Pair/Fusion 제거 Migration 적용 여부 확인
- 현재 최종 DB 스키마가 이미지 단건 분석 구조인지 확인
- Actuator Health 응답 확인

이번 문서는 다음 항목을 다루지 않는다.

- Controller 구현 검증
- Service 구현 검증
- Entity 및 Repository 전체 기능 검증
- 이미지 업로드 API 기능 검증
- 분석 Job 생성 및 Queue 발행 검증
- AI Worker 실행 검증
- Frontend 실행 검증
- 운영 AWS 환경 검증

현재 운영 분석 기준은 다음과 같다.

- RGB 이미지와 열화상 이미지는 각각 독립적으로 저장한다.
- 분석 작업은 `imageId`로 식별되는 이미지 한 건을 대상으로 한다.
- 현재 최종 DB 스키마에는 `image_pairs` 테이블을 사용하지 않는다.
- 현재 최종 DB 스키마에는 `analysis_jobs.image_pair_id` 컬럼을 사용하지 않는다.
- Pair 생성·관리와 Fusion 분석은 현재 운영 범위에 포함하지 않는다.

> 저장소명과 일부 로컬 컨테이너명에 남아 있는 `pv-fusion`은 기존 프로젝트 식별자이다.
>
> 해당 이름 자체가 현재 운영에서 Fusion 기능을 사용한다는 의미는 아니다.

---

## 2. 사전 점검 항목

| 항목 | 확인 기준 |
| --- | --- |
| `docker-compose.local.yml` | 저장소 루트에 로컬 통합 실행 파일이 존재해야 한다. |
| `.env.example` | 저장소 루트에 환경변수 예시 파일이 존재해야 한다. |
| `.env.local` | 로컬 실제 실행값을 저장하는 파일이며 Git에 커밋하지 않는다. |
| `backend/build.gradle` | JPA, Flyway, PostgreSQL Driver, AWS SDK S3 관련 의존성이 있어야 한다. |
| `backend/src/main/resources/application-local.yml` | Local DB, Flyway, MinIO 또는 S3 호환 Storage 설정이 있어야 한다. |
| `backend/src/main/resources/db/migration/` | 현재 저장소의 Flyway Migration 파일이 모두 존재해야 한다. |
| `V7__remove_pair_fusion_schema.sql` | Pair/Fusion 운영 스키마 제거 Migration이 존재해야 한다. |
| `docker/minio/init-buckets.sh` | MinIO Bucket 초기화 스크립트가 존재하는지 확인한다. |
| `ai-worker/requirements.txt` | 존재 여부만 확인한다. 이번 검증에서는 수정하거나 실행하지 않는다. |
| 로컬 포트 | PostgreSQL, MinIO, Backend가 사용할 포트가 사용 가능한지 확인한다. |
| Docker Desktop / Docker Engine | 실행 중이어야 한다. |
| JDK | 프로젝트 Backend 기준 JDK 버전이 설치되어 있어야 한다. |

### 2.1 Backend 의존성 확인

`backend/build.gradle`에서 다음 의존성을 확인한다.

```gradle
implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
implementation 'org.springframework.boot:spring-boot-starter-actuator'

implementation 'org.flywaydb:flyway-core'
implementation 'org.flywaydb:flyway-database-postgresql'

implementation 'org.postgresql:postgresql'
implementation 'software.amazon.awssdk:s3'
```

실제 버전과 의존성 구성은 `backend/build.gradle`과 기술 스택 문서를 최종 기준으로 한다.

### 2.2 Compose 파일명 확인

현재 로컬 통합 실행 기준 파일은 다음과 같다.

```text
docker-compose.local.yml
```

실제 저장소에서 다른 이름을 사용하고 있다면 명령의 `-f` 뒤에 실제 파일명을 사용한다.

이 문서의 명령은 `docker-compose.local.yml`을 기준으로 작성한다.

---

## 3. 로컬 환경변수 준비

### 3.1 `.env.local` 생성

PowerShell 기준:

```powershell
Copy-Item .env.example .env.local
```

macOS / Linux 기준:

```bash
cp .env.example .env.local
```

기준:

- `.env.example`에는 환경변수 이름과 예시 형식만 둔다.
- 실제 로컬 실행값은 `.env.local`에 둔다.
- `.env.local`은 Git에 커밋하지 않는다.
- 실제 비밀번호와 Access Key를 문서나 커밋 메시지에 작성하지 않는다.
- 환경변수 이름의 최신 기준은 `docs/17_environment-variable-secret-contract.md`를 따른다.

### 3.2 설정 우선순위 주의

로컬 실행값은 다음 위치에서 영향을 받을 수 있다.

1. 현재 Shell 환경변수
2. Gradle 또는 Java 실행 시 전달한 환경변수
3. `.env.local`
4. Docker Compose의 `environment`
5. `application-local.yml`의 기본값

Shell 환경변수가 이미 설정되어 있으면 `.env.local` 또는 YAML의 기본값보다 우선 적용될 수 있다.

PowerShell에서 현재 값을 확인하는 예시:

```powershell
echo $env:POSTGRES_HOST
echo $env:POSTGRES_PORT
echo $env:POSTGRES_DB
echo $env:POSTGRES_USER
echo $env:POSTGRES_PASSWORD

echo $env:MINIO_ENDPOINT
echo $env:MINIO_INTERNAL_ENDPOINT
echo $env:MINIO_BUCKET_NAME

echo $env:AWS_REGION
echo $env:S3_BUCKET_NAME
echo $env:S3_PATH_STYLE_ACCESS_ENABLED
```

AI Worker 관련 canonical Storage 키를 함께 확인해야 하는 경우:

```powershell
echo $env:STORAGE_DEFAULT_BUCKET
echo $env:STORAGE_ENDPOINT_URL
echo $env:STORAGE_ACCESS_KEY
echo $env:STORAGE_SECRET_KEY
echo $env:STORAGE_REGION
echo $env:STORAGE_PATH_STYLE_ENABLED
```

이번 검증은 Backend 실행이 중심이므로, 실제 Backend가 사용하는 키는 `application-local.yml`, `.env.example`, Backend 설정 클래스를 기준으로 판단한다.

### 3.3 기존 Shell 환경변수 제거

PowerShell 환경변수를 비우고 다시 검증하려면 다음과 같이 실행한다.

```powershell
Remove-Item Env:POSTGRES_HOST -ErrorAction SilentlyContinue
Remove-Item Env:POSTGRES_PORT -ErrorAction SilentlyContinue
Remove-Item Env:POSTGRES_DB -ErrorAction SilentlyContinue
Remove-Item Env:POSTGRES_USER -ErrorAction SilentlyContinue
Remove-Item Env:POSTGRES_PASSWORD -ErrorAction SilentlyContinue

Remove-Item Env:MINIO_ENDPOINT -ErrorAction SilentlyContinue
Remove-Item Env:MINIO_INTERNAL_ENDPOINT -ErrorAction SilentlyContinue
Remove-Item Env:MINIO_BUCKET_NAME -ErrorAction SilentlyContinue

Remove-Item Env:AWS_REGION -ErrorAction SilentlyContinue
Remove-Item Env:S3_BUCKET_NAME -ErrorAction SilentlyContinue
Remove-Item Env:S3_PATH_STYLE_ACCESS_ENABLED -ErrorAction SilentlyContinue
```

환경변수를 제거한 뒤 새 Terminal을 열어 다시 검증하는 방법도 사용할 수 있다.

### 3.4 기존 Volume 주의

PostgreSQL Volume이 이미 생성된 뒤 사용자명, DB 이름, 비밀번호를 변경해도 기존 Volume에는 변경값이 자동 반영되지 않을 수 있다.

이 경우 로컬 데이터를 초기화해야 할 수 있다.

```powershell
docker compose `
  --env-file .env.local `
  -f docker-compose.local.yml `
  down -v

docker compose `
  --env-file .env.local `
  -f docker-compose.local.yml `
  up -d postgres minio minio-init
```

주의:

- `down -v`는 PostgreSQL과 MinIO의 로컬 Volume 데이터를 삭제한다.
- 필요한 로컬 데이터가 있다면 먼저 백업한다.
- 운영 환경에서는 이 명령을 사용하지 않는다.
- 단순 컨테이너 재시작이 목적이라면 `down -v`를 사용하지 않는다.

---

## 4. Docker Compose 실행 순서

### 4.1 Docker와 Compose 버전 확인

```powershell
docker --version
docker compose version
```

Docker Engine이 실행 중인지도 확인한다.

```powershell
docker info
```

### 4.2 Compose 설정 검증

```powershell
docker compose `
  --env-file .env.local `
  -f docker-compose.local.yml `
  config
```

정상이라면 YAML 파싱 오류와 필수 환경변수 누락 오류 없이 최종 Compose 구성이 출력된다.

주의:

- `docker compose config` 출력에는 환경변수가 치환되어 표시될 수 있다.
- 출력 결과를 그대로 문서, PR, 채팅에 붙이지 않는다.
- 실제 비밀번호와 Access Key가 노출되지 않도록 주의한다.

### 4.3 PostgreSQL과 MinIO 기동

```powershell
docker compose `
  --env-file .env.local `
  -f docker-compose.local.yml `
  up -d postgres minio minio-init
```

### 4.4 서비스 상태 확인

```powershell
docker compose `
  --env-file .env.local `
  -f docker-compose.local.yml `
  ps
```

일반적으로 다음 역할의 서비스가 보여야 한다.

- PostgreSQL
- MinIO
- MinIO 초기화 컨테이너

기존 Compose 설정에서 다음과 같은 컨테이너명이 사용될 수 있다.

```text
pv-fusion-postgres
pv-fusion-minio
pv-fusion-minio-init
```

컨테이너명은 실제 `docker compose ps` 출력값을 최종 기준으로 한다.

### 4.5 PostgreSQL 로그 확인

```powershell
docker compose `
  --env-file .env.local `
  -f docker-compose.local.yml `
  logs postgres --no-color
```

정상 판단 예시:

```text
database system is ready to accept connections
```

### 4.6 MinIO 로그 확인

```powershell
docker compose `
  --env-file .env.local `
  -f docker-compose.local.yml `
  logs minio --no-color
```

MinIO가 정상적으로 API와 Console Port를 열었는지 확인한다.

### 4.7 Bucket 초기화 로그 확인

```powershell
docker compose `
  --env-file .env.local `
  -f docker-compose.local.yml `
  logs minio-init --no-color
```

또는 실제 컨테이너명을 확인한 뒤 다음처럼 실행할 수 있다.

```powershell
docker logs pv-fusion-minio-init
```

정상 판단 기준:

- MinIO 연결 성공
- 대상 Bucket 존재 여부 확인
- Bucket이 없으면 생성
- 이미 존재한다면 오류 없이 종료
- 무한 재시도나 인증 실패가 없음

### 4.8 Host Endpoint와 내부 Endpoint 구분

Backend를 Host PC에서 실행하는 경우 MinIO Endpoint는 일반적으로 다음과 같다.

```text
http://localhost:9000
```

`minio-init`처럼 Compose 내부에서 실행되는 컨테이너는 Docker Network의 서비스명을 사용한다.

```text
http://minio:9000
```

두 Endpoint를 혼용하면 다음 문제가 발생할 수 있다.

- Backend에서는 MinIO가 연결되지만 `minio-init`이 실패
- `minio-init`에서는 연결되지만 Host에서 실행한 Backend가 실패
- `localhost` 연결 재시도가 반복됨
- Bucket 초기화만 실패하고 MinIO 컨테이너는 정상 상태로 보임

### 4.9 로컬 데이터 전체 초기화

```powershell
docker compose `
  --env-file .env.local `
  -f docker-compose.local.yml `
  down -v

docker compose `
  --env-file .env.local `
  -f docker-compose.local.yml `
  up -d postgres minio minio-init
```

이 절차는 다음 상황에서만 사용한다.

- PostgreSQL 비밀번호 변경 후 인증 충돌이 남아 있을 때
- Flyway Migration을 완전히 처음부터 재검증할 때
- 잘못된 초기 데이터로 재검증이 필요할 때
- MinIO와 PostgreSQL Volume을 모두 초기화해야 할 때

---

## 5. Backend 실행 순서

### 5.1 Windows

저장소 루트에서:

```powershell
cd backend
.\gradlew.bat clean build
.\gradlew.bat bootRun --args="--spring.profiles.active=local"
```

주의:

- `gradlew.bat`는 `backend` 디렉터리에서 실행한다.
- `bootRun`은 Foreground로 실행된다.
- Backend 실행 Terminal과 검증 명령 Terminal을 분리하는 것이 좋다.

### 5.2 macOS / Linux

```bash
cd backend
./gradlew clean build
./gradlew bootRun --args="--spring.profiles.active=local"
```

### 5.3 환경변수를 명시해 실행하는 경우

PowerShell 예시:

```powershell
$env:SPRING_PROFILES_ACTIVE = "local"

cd backend
.\gradlew.bat bootRun
```

검증이 끝난 뒤 필요하면 환경변수를 제거한다.

```powershell
Remove-Item Env:SPRING_PROFILES_ACTIVE -ErrorAction SilentlyContinue
```

### 5.4 정상 시작 판단 기준

정상적으로 시작하면 다음 계열의 로그가 보여야 한다.

```text
Tomcat started on port 8080
Started PvFusionApplication
```

Flyway 관련 로그에서는 다음 항목을 확인한다.

- PostgreSQL 연결 성공
- Flyway Schema History 조회 성공
- 적용 대상 Migration 확인
- Migration 성공
- Schema가 최신 상태라는 메시지
- Validation 실패 없음
- Checksum mismatch 없음

`bootRun` 종료:

```text
Ctrl + C
```

---

## 6. Health Check

### 6.1 PowerShell

```powershell
Invoke-RestMethod http://localhost:8080/actuator/health
```

### 6.2 Curl

```bash
curl -i http://localhost:8080/actuator/health
```

### 6.3 브라우저

```text
http://localhost:8080/actuator/health
```

정상 기대값:

```json
{
  "status": "UP"
}
```

주의:

- Actuator 응답에 DB URL, 비밀번호, Storage Credential과 같은 내부 정보를 노출하지 않는다.
- Health 응답이 `UP`이어도 모든 업로드·분석 기능이 정상이라는 의미는 아니다.
- 이번 문서에서는 Backend 프로세스와 최소 의존성 연결 상태만 확인한다.

---

## 7. Flyway 적용 확인

### 7.1 현재 Migration 기준

현재 로컬 DB는 다음 Migration 이력을 순서대로 적용한다.

```text
V1__create_user_access_tables.sql
V2__create_plant_zone_equipment_tables.sql
V3__create_inspection_image_pair_tables.sql
V4__create_analysis_result_tables.sql
V5__create_operation_logs.sql
V6__alter_analysis_jobs_add_retry_and_trace.sql
V7__remove_pair_fusion_schema.sql
```

중요:

- `V3__create_inspection_image_pair_tables.sql`은 과거 스키마 생성 이력이다.
- 이미 적용된 V3 파일은 수정하거나 삭제하지 않는다.
- `V7__remove_pair_fusion_schema.sql`이 Pair/Fusion 운영 스키마를 제거한다.
- 현재 최종 스키마 판단은 V1부터 V7까지 모두 적용된 상태를 기준으로 한다.
- V3 파일이 남아 있다는 이유만으로 현재 DB가 Pair/Fusion을 지원한다고 판단하지 않는다.

### 7.2 Migration 파일 존재 확인

PowerShell:

```powershell
Get-ChildItem backend/src/main/resources/db/migration |
  Sort-Object Name |
  Select-Object Name
```

macOS / Linux:

```bash
ls -1 backend/src/main/resources/db/migration | sort
```

확인 기준:

- V1부터 V7까지 필요한 Migration이 존재한다.
- 동일 버전 번호가 중복되지 않는다.
- 적용된 과거 Migration 파일이 임의 수정되지 않았다.
- V7 제거 Migration이 누락되지 않았다.

### 7.3 Flyway 이력 확인

컨테이너명이 `pv-fusion-postgres`인 경우:

```powershell
docker exec -it pv-fusion-postgres `
  psql -U pvfusion -d pv_fusion_local `
  -c "select installed_rank, version, description, type, success from flyway_schema_history order by installed_rank;"
```

컨테이너명, DB 사용자명, DB 이름은 실제 `.env.local`과 Compose 설정을 기준으로 변경한다.

정상이라면 다음 조건을 만족해야 한다.

- V1부터 V7까지 순서대로 존재
- 모든 Migration의 `success = t`
- V7 설명이 Pair/Fusion 제거 내용으로 표시
- Failed Migration 이력 없음

### 7.4 서비스 테이블 목록 확인

```powershell
docker exec -it pv-fusion-postgres `
  psql -U pvfusion -d pv_fusion_local `
  -c "\dt"
```

현재 최종 스키마의 대표 서비스 테이블:

```text
users
plants
plant_members
zones
equipments
inspections
inspection_images
analysis_jobs
analysis_results
detected_defects
result_review_histories
operation_logs
```

Flyway 관리 테이블:

```text
flyway_schema_history
```

현재 ERD와 Migration이 동일하다면 예상 수는 다음과 같다.

- 서비스 테이블: 12개
- `flyway_schema_history` 포함: 13개

단, 실제 저장소에 별도 보조 테이블이 추가된 경우 정확한 개수는 현재 Migration과 ERD를 최종 기준으로 한다.

테이블 개수만 확인하지 말고, 필요한 테이블과 제거된 테이블을 함께 확인한다.

### 7.5 `image_pairs` 제거 확인

```powershell
docker exec -it pv-fusion-postgres `
  psql -U pvfusion -d pv_fusion_local `
  -c "select to_regclass('public.image_pairs') as image_pairs_table;"
```

정상 기대값:

```text
image_pairs_table
-------------------
null
```

또는 빈 값으로 표시될 수 있다.

다음 Query로도 확인할 수 있다.

```powershell
docker exec -it pv-fusion-postgres `
  psql -U pvfusion -d pv_fusion_local `
  -c "select table_name from information_schema.tables where table_schema = 'public' and table_name = 'image_pairs';"
```

정상 기준:

```text
0 rows
```

### 7.6 `analysis_jobs.image_pair_id` 제거 확인

```powershell
docker exec -it pv-fusion-postgres `
  psql -U pvfusion -d pv_fusion_local `
  -c "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'analysis_jobs' order by ordinal_position;"
```

정상 기준:

- `image_id` 컬럼이 존재한다.
- `image_pair_id` 컬럼이 존재하지 않는다.

특정 컬럼만 검사하려면:

```powershell
docker exec -it pv-fusion-postgres `
  psql -U pvfusion -d pv_fusion_local `
  -c "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'analysis_jobs' and column_name = 'image_pair_id';"
```

정상 기준:

```text
0 rows
```

### 7.7 현재 분석 FK 확인

`analysis_jobs.image_id` FK를 확인한다.

```powershell
docker exec -it pv-fusion-postgres `
  psql -U pvfusion -d pv_fusion_local `
  -c "\d analysis_jobs"
```

확인 기준:

- `image_id`가 존재한다.
- `inspection_images`를 참조하는 FK가 존재한다.
- `image_pair_id`가 없다.
- 재시도와 Trace 관련 V6 컬럼이 존재한다.
- 현재 Job 상태 컬럼과 입력 유형 컬럼이 존재한다.

### 7.8 Pair/Fusion 상태값 잔존 확인

상태값이 PostgreSQL Enum으로 구현된 경우 다음 Query를 사용할 수 있다.

```powershell
docker exec -it pv-fusion-postgres `
  psql -U pvfusion -d pv_fusion_local `
  -c "select t.typname, e.enumlabel from pg_type t join pg_enum e on t.oid = e.enumtypid order by t.typname, e.enumsortorder;"
```

확인 기준:

- 현재 운영 입력 유형은 `RGB_SINGLE`, `THERMAL_SINGLE`이다.
- 현재 운영 모델 유형은 `RGB_ONLY`, `THERMAL_ONLY`이다.
- `RGB_THERMAL_PAIR`, `FUSION`, `FUSION_AUTO`가 현재 운영 Enum 값으로 남아 있지 않아야 한다.

상태값이 Enum이 아니라 `varchar`와 Check Constraint로 구현된 경우 다음 명령을 사용한다.

```powershell
docker exec -it pv-fusion-postgres `
  psql -U pvfusion -d pv_fusion_local `
  -c "\d+ analysis_jobs"
```

실제 구현 방식에 따라 Enum 또는 Constraint 중 해당되는 항목을 확인한다.

### 7.9 보조 검증 스크립트

다음 스크립트가 실제 저장소에 존재하는 경우 사용할 수 있다.

```powershell
.\docker\postgres\scripts\check-flyway-state.ps1
```

스크립트가 존재하지 않는 경우 새 파일을 임의로 만들지 않고, 앞의 `psql` 명령으로 직접 확인한다.

---

## 8. 자주 발생하는 이슈

### 8.1 `password authentication failed for user "pvfusion"`

가능한 원인:

- `.env.local`의 `POSTGRES_PASSWORD`와 기존 Volume의 비밀번호가 다름
- PowerShell 환경변수가 `.env.local`보다 우선 적용됨
- `application-local.yml` 기본값과 실제 Compose 값을 혼동함
- Backend와 PostgreSQL 컨테이너가 서로 다른 사용자명 또는 DB 이름을 사용함

확인 순서:

```powershell
docker compose `
  --env-file .env.local `
  -f docker-compose.local.yml `
  config

echo $env:POSTGRES_USER
echo $env:POSTGRES_PASSWORD
```

필요하면 로컬 Volume을 초기화한다.

```powershell
docker compose `
  --env-file .env.local `
  -f docker-compose.local.yml `
  down -v

docker compose `
  --env-file .env.local `
  -f docker-compose.local.yml `
  up -d postgres minio minio-init
```

### 8.2 Actuator Health 호출 실패

대부분 Backend가 아직 실행 중이 아니거나 시작 과정에서 실패했을 때 발생한다.

확인할 것:

- `backend` 디렉터리에서 `bootRun`을 실행했는지
- local profile이 활성화됐는지
- `Tomcat started on port 8080` 로그가 있는지
- PostgreSQL 연결 오류가 없는지
- Flyway Migration 오류가 없는지
- 8080 Port를 다른 프로세스가 사용 중인지

Windows Port 확인:

```powershell
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
```

### 8.3 Flyway Checksum mismatch

이미 적용된 Migration 파일을 수정하면 발생할 수 있다.

원칙:

- V1~V7의 적용된 파일을 임의 수정하지 않는다.
- 스키마 변경은 새로운 Migration으로 추가한다.
- 로컬에서 단순히 이력을 맞추기 위해 `flyway_schema_history`를 직접 수정하지 않는다.
- 운영 DB에서 `repair`, `clean`, 수동 이력 수정을 임의로 실행하지 않는다.

로컬 개인 DB이고 데이터를 삭제해도 되는 경우에만 Volume 초기화 후 처음부터 다시 검증한다.

### 8.4 V7이 적용되지 않음

증상:

- `image_pairs` 테이블이 남아 있음
- `analysis_jobs.image_pair_id`가 남아 있음
- Flyway 이력이 V6에서 끝남

확인할 것:

- V7 파일이 Migration 디렉터리에 존재하는지
- 파일명이 Flyway Naming 규칙에 맞는지
- Backend가 최신 Branch와 Commit인지
- Backend 재시작 전에 Build가 완료됐는지
- Flyway가 활성화되어 있는지
- V7 SQL 실행 중 오류가 발생하지 않았는지

V7을 건너뛰거나 DB를 수동 수정하는 방식으로 해결하지 않는다.

### 8.5 V3 파일에 Pair 이름이 남아 있음

다음 파일명은 과거 Migration 이력이므로 남아 있는 것이 정상이다.

```text
V3__create_inspection_image_pair_tables.sql
```

조치 기준:

- V3 파일명과 내용을 수정하지 않는다.
- V3 파일을 삭제하지 않는다.
- 최종 DB 상태는 V7까지 적용한 결과로 판단한다.
- 현재 코드와 문서에서는 V3 구조를 운영 기능으로 사용하지 않는다.

### 8.6 VS Code Problems에 과거 패키지 오류가 남아 있음

과거 Java Language Server Cache가 남아 있을 수 있다.

대응:

- Java Language Server Workspace Clean 실행
- VS Code 재시작
- Gradle Project Reload
- IDE Problems보다 `gradlew clean build` 결과를 우선 기준으로 판단

### 8.7 `application-local.yml`의 Storage Unknown Property 경고

설정 키와 `@ConfigurationProperties` 클래스가 완전히 연결되지 않은 경우 IDE 경고가 나타날 수 있다.

판단 기준:

- IDE 경고만으로 실행 실패라고 단정하지 않는다.
- 실제 `clean build` 결과를 확인한다.
- `bootRun` 시 Property Binding 실패가 발생하는지 확인한다.
- 실제 Storage Client 초기화 로그를 확인한다.
- 현재 코드와 맞지 않는 과거 설정 키는 별도 정리 대상이다.

### 8.8 YAML 하이픈 키 경고

IDE가 `bucket-name`, `access-key`, `path-style-access-enabled` 같은 설정에 경고를 표시할 수 있다.

확인 기준:

- 실제 설정 클래스의 Prefix와 Field 이름
- Spring Boot Relaxed Binding 적용 여부
- `bootRun`의 Property Binding 결과
- 실제 MinIO 연결 결과

### 8.9 `minio/mc:latest` 사용

`minio-init` 이미지가 `minio/mc:latest`를 사용하는 경우 재현성이 낮아질 수 있다.

기준:

- 현재 실제 실행이 정상이라면 이번 검증에서 임의 변경하지 않는다.
- 사용 가능한 고정 Tag를 확인한 뒤 별도 작업으로 고정한다.
- 확인하지 않은 Tag를 문서에 임의로 작성하지 않는다.
- Docker 이미지 버전 변경은 로컬 인프라 계약에 영향을 줄 수 있으므로 별도 PR로 처리한다.

### 8.10 Backend Endpoint와 컨테이너 내부 Endpoint 혼동

Backend는 Host에서 실행하므로 일반적으로 다음 Endpoint를 사용한다.

```text
http://localhost:9000
```

Compose 내부의 `minio-init`은 다음 Endpoint를 사용한다.

```text
http://minio:9000
```

두 값을 같은 환경변수로 무조건 통합하지 않는다.

### 8.11 Compose 파일을 찾지 못함

증상:

```text
no configuration file provided
```

확인:

```powershell
Get-ChildItem docker-compose*.yml
```

현재 기준 명령:

```powershell
docker compose `
  --env-file .env.local `
  -f docker-compose.local.yml `
  config
```

실제 파일명이 다르면 `-f` 인자를 현재 저장소 파일명으로 변경한다.

### 8.12 `.env.local`을 읽지 못함

`docker compose`는 `.env.local`을 자동으로 읽지 않을 수 있다.

따라서 이 문서에서는 다음 옵션을 명시한다.

```text
--env-file .env.local
```

`.env`를 별도로 사용하는 기존 구성이 있다면 현재 Compose 설정을 먼저 확인하고 중복 환경 파일을 만들지 않는다.

---

## 9. 브랜치 / 커밋 / PR 체크 예시

- 문서 수정만 있는 경우에도 가능한 범위에서 Compose 설정과 Backend Build를 확인한다.
- 로컬 실행 로그를 Git에 커밋하지 않는다.
- `.env`, `.env.local`, `.log`, 임시 파일이 `.gitignore` 대상인지 확인한다.
- DB Volume과 MinIO Volume 데이터를 Git에 추가하지 않는다.
- 실제 Secret이 포함된 Terminal 출력이나 Screenshot을 PR에 첨부하지 않는다.
- 과거 Flyway Migration 파일을 수정하지 않았는지 확인한다.
- V7 제거 Migration을 임의로 합치거나 V3에 소급 반영하지 않았는지 확인한다.
- `pv-fusion` 저장소명이나 컨테이너명을 Pair/Fusion 기능 잔존으로 오인하여 임의 변경하지 않는다.

PR 본문에는 다음 내용을 포함하는 것이 좋다.

```text
## 작업 내용
- 로컬 PostgreSQL / MinIO 실행 절차 정리
- Backend local profile 실행 절차 정리
- Flyway V1~V7 적용 확인 절차 정리
- Pair/Fusion 최종 스키마 제거 확인 절차 정리

## 검증 내용
- docker compose config:
- PostgreSQL 기동:
- MinIO 기동:
- Backend clean build:
- Backend bootRun:
- Actuator health:
- Flyway V1~V7:
- image_pairs 제거:
- analysis_jobs.image_pair_id 제거:

## 확인하지 못한 항목
-

## 남은 이슈
-
```

---

## 10. 완료 기준

로컬 DB·Storage·Backend 최소 검증은 다음 조건을 만족하면 완료로 본다.

- `docker-compose.local.yml`이 정상적으로 해석된다.
- PostgreSQL 컨테이너가 정상 실행된다.
- MinIO 컨테이너가 정상 실행된다.
- `minio-init`이 Bucket 초기화에 성공한다.
- Backend `clean build`가 성공한다.
- Backend가 local profile로 실행된다.
- `/actuator/health`가 `UP`을 반환한다.
- Flyway V1부터 V7까지 성공 이력이 존재한다.
- `image_pairs` 테이블이 최종 스키마에 존재하지 않는다.
- `analysis_jobs.image_pair_id` 컬럼이 존재하지 않는다.
- `analysis_jobs.image_id`가 현재 분석 대상 FK로 존재한다.
- 현재 운영 입력 유형이 RGB·열화상 단건 기준과 충돌하지 않는다.
- 실제 Secret과 로컬 실행값이 Git에 포함되지 않는다.
- 실행하지 못한 검증 항목을 완료했다고 기록하지 않는다.

이번 검증은 Backend·PostgreSQL·MinIO의 최소 실행 확인이다.

이미지 업로드, 분석 요청, LocalStack SQS, AI Worker 추론과 결과 조회까지의 통합 검증은 별도 테스트 또는 로컬 통합 실행 절차에서 수행한다.