# PostgreSQL Schema 설계

## 1. 문서 목적

본 문서는 MVP 기준 PostgreSQL 스키마 설계 원칙을 정리한다.

주요 목적은 다음과 같다.

- ERD 기준 테이블 구조를 구현 전에 정리한다.
- 로컬/운영 DB 구성을 같은 스키마 기준으로 유지한다.
- Flyway Migration 작성 시 따라야 할 규칙을 명확히 한다.
- 정규화 기준과 조회 Index 기준을 미리 합의한다.
- 현재 운영 분석이 RGB·열화상 이미지 단건 분석이라는 점을 DB 구조에 반영한다.

현재 운영 분석 대상은 `inspection_images.id`로 식별되는 이미지 한 건이다.

RGB 이미지와 열화상 이미지는 각각 독립적인 분석 Job과 분석 결과를 가진다.

Pair 생성·관리와 Fusion 분석은 현재 운영 PostgreSQL 스키마에 포함하지 않는다.

Pair/Fusion 관련 과거 Migration 이력은 삭제하거나 수정하지 않으며, 현재 최종 스키마는 제거 Migration까지 모두 적용된 상태를 기준으로 한다.

---

## 2. 로컬 / 운영 DB 기준

| 구분 | 로컬 환경 | 운영 환경 |
| --- | --- | --- |
| DB 엔진 | PostgreSQL Docker | AWS RDS PostgreSQL |
| 스키마 변경 관리 | Flyway | Flyway |
| 서비스 코드 | 동일 | 동일 |
| 환경 분리 방식 | local profile, 환경변수 | prod profile, ConfigMap / Secret |

로컬과 운영은 같은 서비스 코드와 동일한 Flyway Migration 이력을 사용한다.

환경별로 달라지는 항목은 DB 접속 주소, 사용자명, 비밀번호와 같은 연결 정보뿐이다.

로컬에서 정상 동작한 스키마 변경은 동일한 Migration 파일을 통해 운영 환경에도 적용한다.

---

## 3. Flyway Migration 기준

- DB 스키마 변경은 Flyway Migration 기준으로 관리한다.
- 로컬과 운영 모두 같은 Migration 이력을 기준으로 스키마를 맞춘다.
- 운영 환경에서 `ddl-auto`를 이용한 자동 스키마 변경은 사용하지 않는다.
- 운영 환경에서 Flyway `clean` 자동 실행은 금지한다.
- 로컬 환경에서도 임의 SQL 수정보다 Migration 이력 관리 방식을 우선한다.
- 이미 적용된 Migration 파일은 수정하거나 삭제하지 않는다.
- 새로운 스키마 변경은 새로운 버전의 정방향 Migration으로 추가한다.
- 운영 배포 전 Migration SQL의 적용 순서와 영향 범위를 확인한다.
- 테이블이나 컬럼 제거 시 기존 데이터와 애플리케이션 호환성을 확인한다.

현재 Migration 관리 기준은 다음과 같다.

- 과거 Migration에는 Pair/Fusion 구조를 생성한 이력이 존재할 수 있다.
- 과거 Pair/Fusion 생성 Migration은 적용 이력이므로 수정하거나 삭제하지 않는다.
- 현재 운영 스키마에서는 후속 제거 Migration을 통해 Pair/Fusion 구조를 제거한다.
- 현재 최종 스키마에는 `image_pairs` 테이블과 `analysis_jobs.image_pair_id` 컬럼을 사용하지 않는다.
- 현재 분석 작업은 `analysis_jobs.image_id`를 기준으로 생성한다.

대표적인 이력 기준:

```text
과거 Migration
→ Pair/Fusion 구조 생성 이력 포함 가능
→ 기존 파일 수정 금지

V7__remove_pair_fusion_schema.sql
→ 현재 운영 스키마에서 Pair/Fusion 구조 제거
→ imageId 기반 단건 분석 구조로 전환
```

이번 문서는 Migration SQL 자체를 작성하지 않으며, 현재 최종 스키마와 Migration 관리 기준만 정의한다.

---

## 4. 명명 규칙

### 4.1 테이블명

- PostgreSQL 물리 테이블명은 소문자 snake_case를 사용한다.
- 복수형 테이블명을 기본으로 사용한다.
- 도메인 역할이 명확하게 드러나는 이름을 사용한다.

예:

```text
inspection_images
analysis_jobs
analysis_results
operation_logs
```

### 4.2 컬럼명

- 컬럼명도 소문자 snake_case를 사용한다.
- 시간 컬럼은 `_at` 접미사를 사용한다.
- 상태 컬럼은 역할이 드러나는 이름을 사용한다.
- 객체 저장소 경로는 `bucket_name`, `object_key`, `file_url` 등으로 구분한다.

예:

```text
created_at
updated_at
image_id
object_key
job_status
review_status
```

현재 운영 스키마의 신규 설계와 문서에서는 `image_pair_id`를 사용하지 않는다.

단, 과거 Migration 파일 안에 남아 있는 `image_pair_id`는 Migration 이력 보존을 위해 임의로 수정하지 않는다.

### 4.3 FK 컬럼명

- FK는 참조 대상 기준의 `_id` 형식을 사용한다.
- FK 이름만으로 참조 대상을 파악할 수 있어야 한다.
- 조회 편의를 위한 중복 FK는 최소화한다.

예:

```text
plant_id
zone_id
inspection_id
image_id
analysis_job_id
analysis_result_id
```

---

## 5. 주요 테이블 생성 순서

ERD의 FK 의존성을 기준으로 다음 순서를 우선한다.

1. `users`
2. `plants`
3. `plant_members`
4. `zones`
5. `equipments`
6. `inspections`
7. `inspection_images`
8. `analysis_jobs`
9. `analysis_results`
10. `detected_defects`
11. `result_review_histories`
12. `operation_logs`

`operation_logs`는 여러 대상을 선택적으로 참조할 수 있으므로 가장 뒤에 두는 편이 관리에 유리하다.

현재 운영 스키마에는 `image_pairs` 테이블을 포함하지 않는다.

과거 Migration 적용 과정에서 `image_pairs`가 생성되더라도 최종 제거 Migration까지 적용된 현재 스키마에서는 존재하지 않아야 한다.

---

## 6. 도메인별 스키마 기준

### 6.1 User / Access 도메인

주요 테이블:

- `users`
- `plant_members`

핵심 기준:

- `users`는 계정, 권한, 승인 상태를 저장한다.
- `plant_members`는 사용자와 발전소의 접근 관계를 저장한다.
- `plant_members`는 `users`와 `plants`의 N:M 관계를 연결한다.
- 사용자 이메일은 중복 계정 생성을 방지할 수 있도록 유일성 제약을 검토한다.
- 계정 상태와 역할은 인증·권한 정책 문서의 값을 따른다.

### 6.2 Plant / Zone / Equipment 도메인

주요 테이블:

- `plants`
- `zones`
- `equipments`

핵심 기준:

- `zones.plant_id`로 발전소 하위 구역을 연결한다.
- `equipments.zone_id`로 구역 하위 설비를 연결한다.
- `equipments.parent_equipment_id`로 Array → Panel → Module 계층을 표현한다.
- 발전소와 구역의 비활성화는 실제 삭제보다 상태값 변경을 우선한다.
- 설비 구조는 세부 위치 관리가 필요한 경우 사용하는 선택 구조로 둔다.
- Zone 전체를 점검 대상으로 하는 경우 이미지의 `equipment_id`는 `null`일 수 있다.

### 6.3 Inspection / Image 도메인

주요 테이블:

- `inspections`
- `inspection_images`

핵심 기준:

- `inspections`는 특정 구역의 점검 회차 또는 점검 이벤트를 저장한다.
- `inspections`는 `zone_id`를 통해 구역과 연결한다.
- 발전소 정보는 `inspections.zone_id → zones.plant_id` 관계를 통해 조회한다.
- `inspection_images`는 이미지 바이너리가 아니라 이미지 메타데이터와 객체 저장소 경로를 저장한다.
- 원본 이미지 파일은 로컬에서는 MinIO, 운영에서는 AWS S3에 저장한다.
- `inspection_images.image_type`은 RGB 또는 THERMAL 이미지 유형을 구분한다.
- RGB 이미지와 열화상 이미지는 서로 독립적인 이미지 레코드로 저장한다.
- 하나의 점검에 여러 이미지가 등록될 수 있다.
- 현재 운영 스키마에서는 RGB 이미지와 열화상 이미지 사이에 별도의 Pair 레코드를 생성하지 않는다.

주요 이미지 메타데이터 예시:

- `inspection_id`
- `equipment_id`
- `target_type`
- `image_type`
- `original_filename`
- `mime_type`
- `file_size`
- `bucket_name`
- `object_key`
- `file_url`
- `captured_at`
- `upload_status`
- `status`
- `uploaded_by_user_id`
- `created_at`
- `updated_at`

### 6.4 Analysis / Result 도메인

주요 테이블:

- `analysis_jobs`
- `analysis_results`
- `detected_defects`
- `result_review_histories`

핵심 기준:

- `analysis_jobs`는 이미지 한 건을 대상으로 생성한다.
- 분석 대상은 `analysis_jobs.image_id`로 식별한다.
- `analysis_jobs`에는 `inspection_id`를 직접 저장하지 않는다.
- 점검 정보는 `image_id → inspection_images.inspection_id` 관계를 통해 조회한다.
- RGB 이미지는 `RGB_SINGLE`, `RGB_ONLY` 기준으로 처리한다.
- 열화상 이미지는 `THERMAL_SINGLE`, `THERMAL_ONLY` 기준으로 처리한다.
- `analysis_results`는 분석 결과 요약과 모델 실행 정보, 결과 이미지 경로를 저장한다.
- `detected_defects`는 개별 결함 후보 영역을 저장한다.
- `result_review_histories`는 사람이 결과를 검토하거나 조치 후보와 검토 상태를 변경한 이력을 저장한다.
- 현재 운영 스키마에서는 `analysis_jobs.image_pair_id`를 사용하지 않는다.
- 현재 운영 스키마에서는 `RGB_THERMAL_PAIR`, `FUSION`, `FUSION_AUTO` 값을 분석 입력 또는 모델 유형으로 사용하지 않는다.

분석 결과 시각화 경로는 실제 생성된 결과만 저장한다.

예:

- Bounding Box 결과
- Heatmap 결과
- Mask 결과

모든 분석 결과에서 Bounding Box, Heatmap, Mask가 동시에 생성된다고 가정하지 않는다.

생성되지 않은 시각화 관련 컬럼은 `null`일 수 있다.

### 6.5 Operation Log 도메인

주요 테이블:

- `operation_logs`

핵심 기준:

- 운영 추적, 감사, 관리자 작업 이력을 저장한다.
- 일반 도메인 테이블보다 정규화보다 이벤트 추적 편의성을 우선할 수 있다.
- 여러 FK를 optional로 보유할 수 있다.
- 이벤트와 관련된 사용자, 발전소, 구역, 점검, 이미지, 분석 작업, 분석 결과를 선택적으로 참조할 수 있다.
- 현재 운영 로그에서는 Pair 전용 FK나 Pair 이벤트를 사용하지 않는다.
- 시스템 내부 로그 전체를 PostgreSQL 테이블에 저장하지 않는다.
- 애플리케이션 실행 로그와 Stack Trace는 Console Log 또는 CloudWatch Logs를 우선 사용한다.

---

## 7. 정규화 기준

본 스키마는 기본적으로 3NF를 목표로 한다.

반드시 반영할 기준:

- `inspections`는 `zone_id`를 가진다.
- `inspections`에 `plant_id`를 직접 저장하지 않는다.
- 발전소 정보는 `zone_id → zones.plant_id` 관계로 조회한다.
- `inspection_images`는 `inspection_id`를 가진다.
- `inspection_images`에 `plant_id`, `zone_id`를 직접 저장하지 않는다.
- `inspection_images`는 검사 대상이 Zone 전체인 경우 `equipment_id`가 `null`일 수 있다.
- `analysis_jobs`는 `image_id`로 분석 대상 이미지 한 건을 참조한다.
- `analysis_jobs`에 `inspection_id`, `plant_id`, `zone_id`를 직접 저장하지 않는다.
- 점검 정보는 `analysis_jobs.image_id → inspection_images.inspection_id` 관계로 조회한다.
- `analysis_results`는 `analysis_job_id`를 기준으로 대상 정보를 조회한다.
- `analysis_results`에 `inspection_id`, `plant_id`, `zone_id`, `equipment_id`, `target_type`, `input_type`을 중복 저장하지 않는다.
- `detected_defects`는 `analysis_result_id`를 통해 분석 결과와 연결한다.
- `result_review_histories`는 `analysis_result_id`를 통해 검토 대상 결과와 연결한다.
- `operation_logs`는 운영 추적 목적이므로 정규화보다 이벤트 추적 편의성을 우선할 수 있다.
- 현재 운영 스키마에는 `image_pairs` 테이블을 두지 않는다.
- 현재 운영 스키마에는 `analysis_jobs.image_pair_id`를 두지 않는다.
- Pair/Fusion 연구 데이터 구조를 현재 운영 DB에 임의로 추가하지 않는다.

조회 성능 문제로 중복 저장이 필요해질 경우에는 임의로 컬럼을 추가하지 않고 다음 순서로 검토한다.

1. Index 추가
2. 조회 Query 개선
3. View 검토
4. Materialized View 검토
5. 비정규화 필요성 별도 승인

---

## 8. 주요 Index 기준

### 8.1 사용자 / 권한 조회

- `users(email)`
- `users(account_status)`
- 필요 시 `users(role, account_status)`
- `plant_members(user_id)`
- `plant_members(plant_id)`
- 필요 시 `plant_members(user_id, plant_id)`

사용자 이메일과 사용자·발전소 접근 관계는 중복 방지를 위한 Unique Constraint 적용 여부를 함께 검토한다.

### 8.2 발전소 접근 관계

- `plant_members(user_id)`
- `plant_members(plant_id)`
- 필요 시 `plant_members(user_id, plant_id)`

`plant_members(user_id, plant_id)` 조합은 동일 사용자와 발전소 관계의 중복 생성을 방지할 수 있도록 Unique Constraint 적용을 검토한다.

### 8.3 발전소 / 구역 / 설비 조회

- `zones(plant_id)`
- `equipments(zone_id)`
- `equipments(parent_equipment_id)`
- 필요 시 `equipments(zone_id, equipment_type)`
- 필요 시 `equipments(zone_id, status)`

### 8.4 점검 조회

- `inspections(zone_id)`
- `inspections(zone_id, captured_at)`
- 필요 시 `inspections(inspection_status, captured_at)`
- 필요 시 `inspections(zone_id, inspection_status, captured_at)`

### 8.5 이미지 조회 및 중복 검증

- `inspection_images(inspection_id)`
- `inspection_images(equipment_id)`
- `inspection_images(image_type)`
- `inspection_images(target_type)`
- `inspection_images(status)`
- 필요 시 `inspection_images(inspection_id, image_type, status)`
- 필요 시 `inspection_images(inspection_id, target_type, equipment_id, image_type, status)`

동일 점검·검사 대상·이미지 유형의 중복 허용 여부는 업로드 정책에 따라 결정한다.

중복 업로드를 제한할 경우 단순 Index가 아니라 Partial Unique Index 또는 애플리케이션 검증과의 조합을 검토한다.

### 8.6 분석 상태 조회

- `analysis_jobs(image_id)`
- `analysis_jobs(job_status)`
- `analysis_jobs(requested_by_user_id)`
- 필요 시 `analysis_jobs(job_status, created_at)`
- 필요 시 `analysis_jobs(image_id, created_at)`
- 필요 시 `analysis_jobs(image_id, job_status)`

현재 운영 스키마에서는 `analysis_jobs(image_pair_id)` Index를 생성하지 않는다.

동일 이미지에 진행 중인 분석 Job의 중복 생성을 제한할 경우 `QUEUED`, `RUNNING` 상태를 대상으로 한 Partial Unique Index 적용 여부를 검토한다.

### 8.7 결과 조회

- `analysis_results(analysis_job_id)`
- `analysis_results(result_status)`
- `analysis_results(review_status)`
- `analysis_results(severity_level)`
- `analysis_results(priority_level)`
- 필요 시 `analysis_results(review_status, created_at)`
- 필요 시 `analysis_results(severity_level, created_at)`
- `detected_defects(analysis_result_id)`
- `result_review_histories(analysis_result_id)`
- 필요 시 `result_review_histories(analysis_result_id, created_at)`

`analysis_jobs`와 `analysis_results`가 1:1 관계라면 `analysis_results.analysis_job_id`에 Unique Constraint 적용을 검토한다.

### 8.8 운영 로그 조회

- `operation_logs(actor_user_id)`
- `operation_logs(event_category)`
- `operation_logs(event_type)`
- `operation_logs(plant_id)`
- `operation_logs(zone_id)`
- `operation_logs(inspection_id)`
- `operation_logs(image_id)`
- `operation_logs(analysis_job_id)`
- `operation_logs(analysis_result_id)`
- 필요 시 `operation_logs(event_category, created_at)`
- 필요 시 `operation_logs(actor_user_id, created_at)`

현재 운영 로그에는 `image_pair_id` Index를 생성하지 않는다.

Index는 실제 조회 Query와 실행 계획을 확인한 뒤 추가한다.

사용되지 않는 Index를 과도하게 생성해 INSERT와 UPDATE 성능을 떨어뜨리지 않는다.

---

## 9. 환경변수 이름 기준

실제 Secret 값은 작성하지 않고, 환경변수 이름 기준만 정리한다.

환경변수의 최신 상세 기준은 다음 문서를 우선한다.

```text
docs/17_environment-variable-secret-contract.md
```

### 9.1 Backend 로컬 DB

- `SPRING_PROFILES_ACTIVE`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

예시 역할:

| 변수 | 역할 | 분류 |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | Backend 실행 환경 선택 | ConfigMap 또는 일반 환경변수 |
| `POSTGRES_HOST` | 로컬 PostgreSQL Host | ConfigMap |
| `POSTGRES_PORT` | 로컬 PostgreSQL Port | ConfigMap |
| `POSTGRES_DB` | 로컬 DB 이름 | ConfigMap |
| `POSTGRES_USER` | 로컬 DB 사용자명 | ConfigMap |
| `POSTGRES_PASSWORD` | 로컬 DB 비밀번호 | Secret |

### 9.2 Backend 운영 DB

- `SPRING_PROFILES_ACTIVE`
- `RDS_JDBC_URL`
- `RDS_USERNAME`
- `RDS_PASSWORD`

예시 역할:

| 변수 | 역할 | 분류 |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` Profile 선택 | ConfigMap |
| `RDS_JDBC_URL` | 운영 RDS JDBC 연결 문자열 | Secret |
| `RDS_USERNAME` | 운영 DB 사용자명 | ConfigMap |
| `RDS_PASSWORD` | 운영 DB 비밀번호 | Secret |

### 9.3 AI Worker DB

- `APP_ENV`
- `DATABASE_URI`

예시 역할:

| 변수 | 역할 | 분류 |
| --- | --- | --- |
| `APP_ENV` | AI Worker 실행 환경 선택 | ConfigMap |
| `DATABASE_URI` | AI Worker PostgreSQL 연결 문자열 | Secret |

`DATABASE_URL`은 호환 Alias로 존재할 수 있지만 신규 설정에서는 `DATABASE_URI`를 우선한다.

### 9.4 환경변수 운영 기준

- 운영 DB 비밀번호는 Kubernetes Secret 또는 AWS Secrets Manager로 관리한다.
- `.env.example`에는 실제 비밀번호를 넣지 않는다.
- Git 저장소, 문서, Jenkins 로그에 실제 DB 비밀번호와 연결 문자열을 기록하지 않는다.
- 운영 환경에서 실제 Secret 값은 ConfigMap에 넣지 않는다.
- `RDS_JDBC_URL`, `RDS_PASSWORD`, `DATABASE_URI`는 Secret으로 취급한다.
- Flyway 활성화 여부는 Spring 설정 파일과 Profile을 기준으로 관리한다.
- 실제 코드에 별도의 `FLYWAY_ENABLED` 환경변수 계약이 없다면 문서에서 필수 환경변수로 정의하지 않는다.

---

## 10. 확인 기준

PostgreSQL 스키마 설계는 아래 조건을 만족해야 한다.

- ERD의 현재 테이블 관계와 FK 방향을 깨지 않는다.
- `plant_id`, `zone_id`, `inspection_id`의 중복 저장을 최소화한다.
- 이미지 바이너리를 DB에 저장하지 않는다.
- 원본 이미지와 분석 결과 이미지는 객체 저장소에 저장한다.
- DB에는 파일 메타데이터와 객체 저장소 경로만 저장한다.
- 로컬과 운영 환경 모두 동일한 Flyway Migration 이력을 사용한다.
- 운영 환경의 자동 Schema 변경이나 Flyway `clean` 실행을 기본 전략으로 사용하지 않는다.
- 이미 적용된 Flyway Migration 파일을 수정하거나 삭제하지 않는다.
- 현재 운영 최종 스키마에 `image_pairs` 테이블이 없어야 한다.
- 현재 운영 최종 스키마에 `analysis_jobs.image_pair_id` 컬럼이 없어야 한다.
- 현재 분석 Job은 `image_id` 한 건을 대상으로 생성되어야 한다.
- RGB와 열화상 이미지는 각각 독립적인 분석 Job과 결과를 가져야 한다.
- 현재 운영 상태값에는 `RGB_THERMAL_PAIR`, `FUSION`, `FUSION_AUTO`를 사용하지 않아야 한다.
- 운영 로그에서 Pair 전용 FK와 이벤트를 현재 기능처럼 사용하지 않아야 한다.
- Pair/Fusion 관련 과거 Migration은 실행 이력으로 유지하되 현재 기능 기준으로 사용하지 않는다.
- 새로운 Pair/Fusion 구조가 필요한 경우 기존 스키마에 임의로 추가하지 않고 API, DB, Queue, AI Worker, Frontend 영향 범위를 별도로 검토한다.