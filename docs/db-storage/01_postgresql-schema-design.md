# PostgreSQL Schema 설계

## 1. 문서 목적

본 문서는 MVP 기준 PostgreSQL 스키마 설계 원칙을 정리한다.

주요 목적은 다음과 같다.

- ERD 기준 테이블 구조를 구현 전에 정리한다.
- 로컬/운영 DB 구성을 같은 스키마 기준으로 유지한다.
- Flyway migration 작성 시 따라야 할 규칙을 명확히 한다.
- 정규화 기준과 조회 index 기준을 미리 합의한다.

---

## 2. 로컬 / 운영 DB 기준

| 구분 | 로컬 환경 | 운영 환경 |
| --- | --- | --- |
| DB 엔진 | PostgreSQL Docker | AWS RDS PostgreSQL |
| 스키마 변경 관리 | Flyway | Flyway |
| 서비스 코드 | 동일 | 동일 |
| 환경 분리 방식 | local profile, 환경 변수 | prod profile, ConfigMap / Secret |

로컬과 운영은 같은 서비스 코드를 사용하되, DB 연결 정보만 환경별로 분리한다.

---

## 3. Flyway migration 기준

- DB 스키마 변경은 Flyway migration 기준으로 관리한다.
- 로컬과 운영 모두 같은 migration 이력을 기준으로 스키마를 맞춘다.
- 운영 환경에서 `ddl-auto` 자동 변경은 사용하지 않는다.
- 운영 환경에서 Flyway `clean` 자동 실행은 금지한다.
- 로컬 환경에서도 임의 SQL 수정보다 migration 이력 관리 방식을 우선한다.

이번 문서는 migration SQL 자체를 작성하지 않으며, 기준만 정의한다.

---

## 4. 명명 규칙

### 4.1 테이블명

- PostgreSQL 물리 테이블명은 소문자 snake_case를 사용한다.
- 예: `inspection_images`, `analysis_jobs`, `operation_logs`

### 4.2 컬럼명

- 컬럼명도 소문자 snake_case를 사용한다.
- 예: `created_at`, `updated_at`, `image_pair_id`, `object_key`

### 4.3 FK 컬럼명

- FK는 참조 대상 기준의 `_id` 형식을 사용한다.
- 예: `plant_id`, `zone_id`, `inspection_id`, `analysis_job_id`

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
8. `image_pairs`
9. `analysis_jobs`
10. `analysis_results`
11. `detected_defects`
12. `result_review_histories`
13. `operation_logs`

`operation_logs`는 여러 optional FK를 가질 수 있으므로 가장 뒤에 두는 편이 관리에 유리하다.

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

### 6.2 Plant / Zone / Equipment 도메인

주요 테이블:

- `plants`
- `zones`
- `equipments`

핵심 기준:

- `zones.plant_id`로 발전소 하위 구역을 연결한다.
- `equipments.zone_id`로 구역 하위 설비를 연결한다.
- `equipments.parent_equipment_id`로 Array → Panel → Module 계층을 표현한다.

### 6.3 Inspection / Image 도메인

주요 테이블:

- `inspections`
- `inspection_images`
- `image_pairs`

핵심 기준:

- `inspections`는 특정 구역의 점검 회차를 저장한다.
- `inspection_images`는 이미지 바이너리가 아니라 이미지 메타데이터와 객체 저장소 경로를 저장한다.
- `image_pairs`는 RGB / THERMAL 이미지 연결 관계를 저장한다.

### 6.4 Analysis / Result 도메인

주요 테이블:

- `analysis_jobs`
- `analysis_results`
- `detected_defects`
- `result_review_histories`

핵심 기준:

- `analysis_jobs`는 단건 이미지 또는 Pair를 대상으로 생성한다.
- `analysis_results`는 분석 결과 요약과 결과 이미지 경로를 저장한다.
- `detected_defects`는 개별 결함 후보 영역을 저장한다.
- `result_review_histories`는 사람이 결과를 검토한 변경 이력을 저장한다.

### 6.5 Operation Log 도메인

주요 테이블:

- `operation_logs`

핵심 기준:

- 운영 추적, 감사, 관리자 작업 이력을 저장한다.
- 일반 테이블보다 정규화보다 이벤트 추적 편의성을 우선할 수 있다.
- 여러 FK를 optional로 보유할 수 있다.

---

## 7. 정규화 기준

본 스키마는 기본적으로 3NF를 목표로 한다.

반드시 반영할 기준:

- `inspections`는 `zone_id`를 가진다.
- `inspections`에 `plant_id`를 직접 저장하지 않는다.
- 발전소 정보는 `zone_id -> zones.plant_id` 관계로 조회한다.
- `inspection_images`는 `inspection_id`를 가진다.
- `inspection_images`에 `plant_id`, `zone_id`를 직접 저장하지 않는다.
- `image_pairs`는 `inspection_id`, `equipment_id`, `target_type`, `rgb_image_id`, `thermal_image_id`를 가진다.
- `image_pairs`에 `plant_id`, `zone_id`를 직접 저장하지 않는다.
- `analysis_jobs`는 `image_id` 또는 `image_pair_id` 중 하나를 대상으로 생성한다.
- `analysis_jobs`에 `inspection_id`를 직접 저장하지 않는다.
- `analysis_results`는 `analysis_job_id`를 기준으로 대상 정보를 조회한다.
- `analysis_results`에 `inspection_id`, `plant_id`, `zone_id`, `equipment_id`, `target_type`, `input_type`을 중복 저장하지 않는다.
- `operation_logs`는 운영 추적 목적이므로 정규화보다 이벤트 추적 편의성을 우선할 수 있다.

---

## 8. 주요 index 기준

### 8.1 사용자 / 권한 조회

- `users(email)`
- `users(account_status)`
- 필요 시 `users(role, account_status)`

### 8.2 발전소 접근 관계

- `plant_members(user_id)`
- `plant_members(plant_id)`
- 필요 시 `plant_members(user_id, plant_id)`

### 8.3 발전소 / 구역 / 설비 조회

- `zones(plant_id)`
- `equipments(zone_id)`
- `equipments(parent_equipment_id)`
- 필요 시 `equipments(zone_id, equipment_type)`

### 8.4 점검 조회

- `inspections(zone_id)`
- `inspections(zone_id, captured_at)`
- 필요 시 `inspections(inspection_status, captured_at)`

### 8.5 이미지 조회 및 중복 검증

- `inspection_images(inspection_id)`
- `inspection_images(equipment_id)`
- `inspection_images(image_type)`
- `inspection_images(target_type)`
- 필요 시 `inspection_images(inspection_id, target_type, equipment_id, image_type, status)`

### 8.6 Pair 조회

- `image_pairs(inspection_id)`
- `image_pairs(equipment_id)`
- `image_pairs(rgb_image_id)`
- `image_pairs(thermal_image_id)`
- 필요 시 `image_pairs(inspection_id, target_type, equipment_id, status)`

### 8.7 분석 상태 조회

- `analysis_jobs(image_id)`
- `analysis_jobs(image_pair_id)`
- `analysis_jobs(job_status)`
- 필요 시 `analysis_jobs(job_status, created_at)`

### 8.8 결과 조회

- `analysis_results(analysis_job_id)`
- `detected_defects(analysis_result_id)`
- `result_review_histories(analysis_result_id)`

---

## 9. 환경 변수 이름 기준

실제 Secret 값은 작성하지 않고, 이름 기준만 정리한다.

예시:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `FLYWAY_ENABLED`

운영 환경 기준:

- 운영 DB password는 Kubernetes Secret 또는 AWS Secrets Manager로 관리한다.
- `.env.example`에는 실제 비밀번호를 넣지 않는다.

---

## 10. 확인 기준

PostgreSQL 스키마 설계는 아래 조건을 만족해야 한다.

- ERD의 테이블 관계와 FK 방향을 깨지 않는다.
- `plant_id`, `zone_id`, `inspection_id`의 중복 저장을 최소화한다.
- 이미지 바이너리를 DB에 저장하지 않는다.
- 이미지와 결과 파일은 객체 저장소에 두고, DB에는 경로 메타데이터만 저장한다.
- 로컬/운영 환경 모두 Flyway 기준으로 스키마를 관리한다.
- 운영 환경의 자동 schema 변경이나 clean 실행을 기본 전략으로 사용하지 않는다.
