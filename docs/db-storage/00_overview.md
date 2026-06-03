# DB / Storage 설계 개요

## 1. 문서 목적

본 문서는 MVP 기준 DB·Storage 설계를 구현 전에 명확히 정리하기 위한 문서이다.

주요 목적은 다음과 같다.

- PostgreSQL과 MinIO/S3의 책임을 분리한다.
- 로컬 환경과 운영 환경의 저장소 대응 관계를 정리한다.
- 이미지 바이너리와 메타데이터의 저장 위치를 명확히 구분한다.
- Backend가 인증·권한 검증 후 파일 접근을 중계하는 원칙을 고정한다.
- 이후 Flyway, Entity, Repository, UseCase / Port / DTO 설계의 기준선을 제공한다.

---

## 2. 저장소 책임 분리

### 2.1 PostgreSQL의 책임

PostgreSQL은 관계형 데이터와 메타데이터를 저장한다.

주요 저장 대상:

- 사용자, 권한, 발전소, 구역, 설비
- 점검 회차와 이미지 메타데이터
- RGB-Thermal Pair 관계
- 분석 작업 상태
- 분석 결과 메타데이터
- 결함 후보, 검토 이력, 운영 로그

PostgreSQL은 이미지 파일의 원본 바이너리나 결과 이미지 바이너리를 직접 저장하지 않는다.

### 2.2 MinIO / S3의 책임

MinIO / S3는 객체 저장소 역할을 담당한다.

주요 저장 대상:

- 원본 RGB 이미지
- 원본 열화상 이미지
- Bounding Box 결과 이미지
- Heatmap 결과 이미지
- Mask 결과 이미지
- 필요 시 임시 업로드 파일 또는 분석 중간 산출물

객체 저장소에는 파일 자체를 저장하고, PostgreSQL에는 해당 파일을 식별할 수 있는 메타데이터만 저장한다.

---

## 3. 로컬 / 운영 환경 매핑

| 구분 | 로컬 환경 | 운영 환경 |
| --- | --- | --- |
| 관계형 DB | PostgreSQL Docker | AWS RDS PostgreSQL |
| 객체 저장소 | MinIO | AWS S3 |
| 설정 주입 | `application-local.yml`, `.env.local`, local profile | `application-prod.yml`, ConfigMap, Secret |
| 스키마 변경 관리 | Flyway | Flyway |

운영 환경과 로컬 환경은 서비스 코드를 분리하지 않고, 설정과 외부 리소스 연결만 환경별로 분리한다.

---

## 4. 핵심 저장 원칙

### 4.1 DB에는 메타데이터만 저장한다

이미지 파일과 결과 이미지는 PostgreSQL에 저장하지 않는다.

DB에는 아래와 같은 메타데이터만 저장한다.

- `bucket_name`
- `object_key`
- `file_url`
- `original_filename`
- `mime_type`
- `file_size`

### 4.2 Frontend는 Storage나 DB에 직접 접근하지 않는다

Frontend는 Spring Boot Backend Public API만 호출한다.

직접 접근 금지 대상:

- MinIO
- AWS S3
- PostgreSQL / AWS RDS
- SQS
- AI Worker

### 4.3 Backend가 권한 검증 후 파일 접근을 중계한다

파일 조회, 미리보기, 결과 이미지 접근은 Backend가 최종 권한 검증을 수행한 후 처리한다.

지원 가능한 방식:

- Backend가 파일 스트림을 반환
- Backend가 제한된 접근 URL을 반환

직접 공개된 원본 Storage URL을 Frontend에 그대로 노출하는 구조는 기본 원칙으로 사용하지 않는다.

### 4.4 정규화 기준을 유지한다

ERD 기준으로 중복 FK 저장을 피한다.

예시:

- `inspections`는 `zone_id`만 직접 가진다.
- `inspection_images`, `image_pairs`는 `plant_id`, `zone_id`를 직접 저장하지 않는다.
- `analysis_jobs`는 `inspection_id`를 직접 저장하지 않는다.
- `analysis_results`는 `analysis_job_id`를 기준으로 대상 정보를 조회한다.

---

## 5. 주요 데이터 흐름

### 5.1 이미지 업로드

사용자 업로드 요청
→ Frontend가 Backend API 호출
→ Backend 인증 및 권한 검증
→ Backend가 object key 생성
→ MinIO/S3에 원본 이미지 저장
→ PostgreSQL에 이미지 메타데이터 저장
→ 업로드 결과 반환

### 5.2 Pair 연결

Backend가 동일 `inspection_id`, `target_type`, `equipment_id` 기준으로 RGB/THERMAL 이미지를 검증한 뒤 `image_pairs`에 관계를 저장한다.

### 5.3 분석 요청

Backend가 `analysis_jobs`를 생성하고, 원본 이미지 위치는 PostgreSQL 메타데이터를 통해 조회한다.

### 5.4 결과 이미지 저장

분석 결과 이미지는 MinIO/S3에 저장하고, 결과 메타데이터만 PostgreSQL의 `analysis_results`, `detected_defects`에 저장한다.

---

## 6. 문서 구성

`docs/db-storage/`는 다음 문서로 구성한다.

- `00_overview.md`
  - 전체 DB·Storage 설계 개요
- `01_postgresql-schema-design.md`
  - PostgreSQL 스키마, 정규화, index, 환경 변수 기준
- `02_minio-storage-design.md`
  - MinIO/S3 bucket, object key, 파일 접근 정책 기준
- `03_storage-indexing-flow.md`
  - 업로드, 조회, Pair, 결과 이미지 조회 흐름과 관계형 index 기준
- `04_local-run-verification.md`
  - Docker Compose, local profile, Flyway, actuator health 기준의 로컬 실행 검증 절차

---

## 7. 이번 단계에서 하지 않는 것

이번 문서 범위에서 아래 항목은 상세 설계하지 않는다.

- Redis
- ChromaDB
- SQS 상세 구조
- AI Worker 메시지 처리 상세
- 실제 운영 Secret 값

SQS는 AI 분석 비동기 처리 단계에서 별도 ai-pipeline 문서로 분리하여 다룰 수 있다.

Redis와 ChromaDB는 현재 MVP 필수 구성으로 확정하지 않는다.
