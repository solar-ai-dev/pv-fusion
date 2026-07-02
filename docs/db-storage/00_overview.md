# DB / Storage 설계 개요

## 1. 문서 목적

본 문서는 MVP 기준 DB·Storage 설계를 구현 전에 명확히 정리하기 위한 문서이다.

주요 목적은 다음과 같다.

- PostgreSQL과 MinIO/S3의 책임을 분리한다.
- 로컬 환경과 운영 환경의 저장소 대응 관계를 정리한다.
- 이미지 바이너리와 메타데이터의 저장 위치를 명확히 구분한다.
- Backend가 인증·권한 검증 후 파일 접근을 중계하는 원칙을 고정한다.
- RGB 이미지와 열화상 이미지의 독립적인 저장·분석 구조를 정의한다.
- 이후 Flyway, Entity, Repository, UseCase / Port / DTO 설계의 기준선을 제공한다.

현재 운영 분석 기준은 다음과 같다.

- RGB 이미지와 열화상 이미지는 각각 독립적인 이미지로 저장한다.
- 분석 대상은 `inspection_images.id`로 식별되는 이미지 한 건이다.
- 분석 요청은 `imageId`를 기준으로 생성한다.
- RGB 이미지와 열화상 이미지는 각각 독립적인 분석 Job과 결과를 가진다.
- Pair 생성·관리와 Fusion 분석은 현재 운영 DB·Storage 범위에 포함하지 않는다.

---

## 2. 저장소 책임 분리

### 2.1 PostgreSQL의 책임

PostgreSQL은 관계형 데이터와 메타데이터를 저장한다.

주요 저장 대상:

- 사용자, 권한, 발전소, 구역, 설비
- 점검 회차
- RGB·열화상 이미지 메타데이터
- 이미지 단건 분석 작업 상태
- 분석 결과 메타데이터
- 결함 후보
- 검토 이력
- 운영 로그

주요 관계 기준:

- 점검은 `zone_id`를 기준으로 구역과 연결한다.
- 이미지는 `inspection_id`를 기준으로 점검과 연결한다.
- 분석 Job은 `image_id`를 기준으로 분석 대상 이미지와 연결한다.
- 분석 결과는 `analysis_job_id`를 기준으로 분석 Job과 연결한다.

PostgreSQL은 다음 파일 바이너리를 직접 저장하지 않는다.

- 원본 RGB 이미지
- 원본 열화상 이미지
- Bounding Box 결과 이미지
- Heatmap 결과 이미지
- Mask 결과 이미지
- 임시 업로드 파일
- 분석 중간 산출물

현재 최종 운영 스키마에서는 다음 구조를 사용하지 않는다.

- `image_pairs`
- `analysis_jobs.image_pair_id`
- Pair 전용 FK
- Fusion 전용 분석 대상 관계

과거 Flyway Migration에 Pair/Fusion 생성 이력이 존재하더라도 해당 Migration 파일은 수정하거나 삭제하지 않는다.

현재 최종 스키마는 Pair/Fusion 제거 Migration까지 적용된 상태를 기준으로 한다.

### 2.2 MinIO / S3의 책임

MinIO / S3는 객체 저장소 역할을 담당한다.

주요 저장 대상:

- 원본 RGB 이미지
- 원본 열화상 이미지
- Bounding Box 결과 이미지
- Heatmap 결과 이미지
- Mask 결과 이미지
- 필요 시 임시 업로드 파일
- 필요 시 분석 중간 산출물

객체 저장소에는 파일 자체를 저장한다.

PostgreSQL에는 해당 파일을 찾는 데 필요한 다음 메타데이터만 저장한다.

- Bucket 이름
- Object Key
- 파일명
- MIME Type
- 파일 크기
- 촬영 시각
- 저장 상태
- 필요 시 파일 접근 관련 메타데이터

Bounding Box, Heatmap, Mask는 모든 분석에서 반드시 생성되는 결과가 아니다.

실제 모델 출력 또는 후처리에서 생성된 결과 파일만 객체 저장소에 저장한다.

생성되지 않은 결과 이미지의 경로 필드는 `null`일 수 있다.

---

## 3. 로컬 / 운영 환경 매핑

| 구분 | 로컬 환경 | 운영 환경 |
| --- | --- | --- |
| 관계형 DB | PostgreSQL Docker | AWS RDS PostgreSQL |
| 객체 저장소 | MinIO | AWS S3 |
| 설정 주입 | `application-local.yml`, `.env.local`, local profile | `application-prod.yml`, ConfigMap, Secret |
| 스키마 변경 관리 | Flyway | Flyway |
| Storage 인증 | 로컬 Access Key / Secret Key | IAM Role 또는 기본 Credential Chain 우선 |
| 서비스 코드 | 동일 | 동일 |

운영 환경과 로컬 환경은 서비스 코드를 분리하지 않는다.

환경별로 다음 설정만 분리한다.

- DB 연결 주소
- DB 사용자명
- DB 비밀번호
- Storage Endpoint
- Storage Bucket
- Storage Region
- Storage 인증 정보
- Path-style Access 사용 여부

로컬 MinIO와 운영 AWS S3는 같은 Object Key 규칙을 사용한다.

---

## 4. 핵심 저장 원칙

### 4.1 DB에는 메타데이터만 저장한다

이미지 파일과 분석 결과 이미지는 PostgreSQL에 저장하지 않는다.

DB에는 다음과 같은 메타데이터만 저장한다.

- `bucket_name`
- `object_key`
- `file_url`
- `original_filename`
- `mime_type`
- `file_size`
- `captured_at`
- `upload_status`
- `status`

분석 결과 이미지에는 시각화 유형에 따라 다음 메타데이터를 저장할 수 있다.

- `bbox_bucket_name`
- `bbox_object_key`
- `bbox_file_url`
- `heatmap_bucket_name`
- `heatmap_object_key`
- `heatmap_file_url`
- `mask_bucket_name`
- `mask_object_key`
- `mask_file_url`

만료되는 Presigned URL은 DB에 장기 저장하지 않는 것을 기본으로 한다.

### 4.2 Frontend는 Storage나 DB에 직접 접근하지 않는다

Frontend는 Spring Boot Backend Public API만 호출한다.

직접 접근 금지 대상:

- MinIO
- AWS S3
- PostgreSQL
- AWS RDS
- SQS
- AI Worker

Frontend는 다음 값을 사용자가 직접 입력하도록 하지 않는다.

- Bucket 이름
- Object Key
- Storage Endpoint
- Storage Credential
- 내부 DB 식별 정보

Frontend는 이미지와 분석 결과를 조회할 때 `imageId`, `jobId`, `resultId` 등 Public API에서 허용된 도메인 식별자를 사용한다.

### 4.3 Backend가 권한 검증 후 파일 접근을 중계한다

파일 조회, 미리보기, 결과 이미지 접근은 Backend가 최종 인증·권한 검증을 수행한 후 처리한다.

지원 가능한 방식:

- Backend가 파일 Stream을 반환
- Backend가 제한된 만료 시간을 가진 접근 URL을 반환

Backend는 파일 접근 전에 다음 관계를 확인한다.

```text
사용자
→ 발전소 접근 권한
→ 구역
→ 점검
→ 이미지
→ 분석 Job
→ 분석 결과
```

직접 공개된 원본 Storage URL을 Frontend에 장기 노출하는 구조는 기본 원칙으로 사용하지 않는다.

Backend는 사용자가 전달한 Bucket 이름이나 Object Key를 그대로 신뢰하지 않는다.

### 4.4 정규화 기준을 유지한다

ERD 기준으로 중복 FK 저장을 피한다.

예시:

- `inspections`는 `zone_id`를 직접 가진다.
- `inspections`에 `plant_id`를 중복 저장하지 않는다.
- `inspection_images`는 `inspection_id`를 직접 가진다.
- `inspection_images`에 `plant_id`, `zone_id`를 직접 저장하지 않는다.
- `analysis_jobs`는 `image_id`를 직접 가진다.
- `analysis_jobs`에 `inspection_id`, `plant_id`, `zone_id`를 중복 저장하지 않는다.
- `analysis_results`는 `analysis_job_id`를 기준으로 대상 정보를 조회한다.
- `analysis_results`에 점검·구역·발전소 정보를 중복 저장하지 않는다.

분석 결과에서 발전소까지의 조회 관계는 다음과 같다.

```text
analysis_results
→ analysis_jobs
→ inspection_images
→ inspections
→ zones
→ plants
```

현재 운영 관계에는 `image_pairs`를 포함하지 않는다.

### 4.5 Object Key는 서버가 생성한다

원본 이미지 Object Key는 Backend가 생성한다.

분석 결과 Object Key는 AI Worker 또는 결과 저장 담당 계층이 공통 Storage 규칙에 따라 생성한다.

사용자가 업로드한 원본 파일명을 Object Key로 직접 사용하지 않는다.

권장 원본 이미지 경로:

```text
originals/inspections/{inspectionId}/rgb/{imageId}_{uuid}.{ext}
originals/inspections/{inspectionId}/thermal/{imageId}_{uuid}.{ext}
```

권장 결과 이미지 경로:

```text
results/analysis-jobs/{jobId}/bbox/{resultId}_{uuid}.{ext}
results/analysis-jobs/{jobId}/heatmap/{resultId}_{uuid}.{ext}
results/analysis-jobs/{jobId}/mask/{resultId}_{uuid}.{ext}
```

현재 운영 Storage에는 Pair 또는 Fusion 전용 Prefix를 만들지 않는다.

---

## 5. 주요 데이터 흐름

### 5.1 이미지 업로드

```text
사용자 업로드 요청
→ Frontend가 Backend API 호출
→ Backend 인증 상태 확인
→ Backend 데이터 접근 권한 확인
→ Backend 점검·대상 정보 검증
→ Backend 파일 형식·크기 검증
→ Backend가 Object Key 생성
→ MinIO/S3에 원본 이미지 저장
→ PostgreSQL inspection_images에 이미지 메타데이터 저장
→ 업로드 결과 반환
```

RGB 이미지와 열화상 이미지는 각각 독립적인 `inspection_images` 레코드로 저장한다.

같은 점검에 포함되어 있더라도 두 이미지를 별도 Pair 레코드로 묶지 않는다.

### 5.2 이미지 단건 분석 요청

```text
사용자가 분석 대상 이미지 한 건 선택
→ Frontend가 imageId를 Backend에 전달
→ Backend 인증 및 권한 확인
→ Backend가 inspection_images 조회
→ 이미지 상태와 Storage 메타데이터 확인
→ 이미지 유형 확인
→ analysis_jobs 생성
→ Queue 메시지 발행
→ 분석 Job 정보 반환
```

현재 분석 라우팅 기준:

| 이미지 유형 | inputType | modelType |
| --- | --- | --- |
| RGB | `RGB_SINGLE` | `RGB_ONLY` |
| THERMAL | `THERMAL_SINGLE` | `THERMAL_ONLY` |

현재 운영 분석 요청에서는 다음 값을 사용하지 않는다.

- `imagePairId`
- `RGB_THERMAL_PAIR`
- `FUSION`
- `FUSION_AUTO`

### 5.3 분석용 원본 이미지 조회

AI Worker는 분석 Job의 `imageId`를 기준으로 이미지 메타데이터를 조회한다.

```text
분석 Job 수신
→ imageId 확인
→ PostgreSQL에서 inspection_images 조회
→ bucket_name, object_key 확인
→ MinIO/S3에서 원본 이미지 읽기
→ 이미지 유형별 전처리 및 모델 추론
```

RGB와 열화상 이미지는 각각 독립적인 전처리·모델 경로를 사용한다.

현재 AI Worker는 Pair 메타데이터를 조회하지 않는다.

### 5.4 결과 이미지 저장

```text
AI Worker 추론 완료
→ 실제 생성된 시각화 결과 확인
→ 결과 Object Key 생성
→ MinIO/S3에 결과 이미지 저장
→ PostgreSQL analysis_results에 결과 메타데이터 저장
→ 필요 시 detected_defects 저장
→ analysis_jobs 상태를 SUCCEEDED로 변경
```

저장 가능한 결과 예시:

- Bounding Box
- Heatmap
- Mask

저장 기준:

- 실제 생성된 결과만 저장한다.
- Heatmap이 생성되지 않은 분석에서는 Heatmap 경로를 저장하지 않는다.
- Mask가 생성되지 않은 분석에서는 Mask 경로를 저장하지 않는다.
- 빈 파일이나 임의의 Placeholder를 결과 이미지로 저장하지 않는다.

### 5.5 원본 이미지 조회

```text
Frontend가 imageId 기준 이미지 요청
→ Backend 인증 확인
→ Backend 이미지 접근 권한 확인
→ inspection_images 조회
→ bucket_name, object_key 확인
→ MinIO/S3 객체 조회
→ Backend가 파일 Stream 또는 제한된 접근 URL 반환
```

### 5.6 분석 결과 이미지 조회

```text
Frontend가 resultId 기준 결과 이미지 요청
→ Backend 인증 확인
→ Backend 결과 접근 권한 확인
→ analysis_results 조회
→ analysis_jobs와 원본 이미지 관계 확인
→ 요청한 시각화 경로 확인
→ MinIO/S3 객체 조회
→ Backend가 파일 Stream 또는 제한된 접근 URL 반환
```

요청한 시각화가 실제 생성되지 않았다면 존재하지 않는 결과를 임의로 생성해 반환하지 않는다.

---

## 6. 문서 구성

`docs/db-storage/`는 다음 문서로 구성한다.

- `00_overview.md`
  - 전체 DB·Storage 설계 개요
  - PostgreSQL과 MinIO/S3의 책임 분리
  - RGB·열화상 이미지 단건 저장·분석 기준

- `01_postgresql-schema-design.md`
  - PostgreSQL 스키마
  - 정규화
  - Index
  - Flyway Migration
  - 환경변수 기준
  - 현재 최종 단건 분석 스키마 기준

- `02_minio-storage-design.md`
  - MinIO/S3 Bucket
  - Object Key
  - 원본·결과 이미지 저장 경로
  - 파일 접근 정책
  - 환경변수 기준

- `03_storage-indexing-flow.md`
  - 이미지 업로드
  - 이미지 단건 분석 연결
  - 원본·결과 이미지 조회
  - PostgreSQL 관계형 Index 기준

- `04_local-run-verification.md`
  - Docker Compose
  - Local Profile
  - PostgreSQL
  - MinIO
  - Flyway Migration
  - Pair/Fusion 제거 Migration 확인
  - Actuator Health 기준의 로컬 실행 검증 절차

---

## 7. 이번 단계에서 하지 않는 것

이번 문서 범위에서는 다음 항목을 상세 설계하지 않는다.

- Redis
- ChromaDB
- SQS 메시지 세부 Schema
- AI Worker 내부 처리 구현
- 모델별 전처리 수치
- 모델별 후처리 Threshold
- 실제 운영 Secret 값
- Pair 생성·관리
- Fusion 분석
- Pair/Fusion 전용 Storage 구조

SQS 메시지 세부 계약과 AI Worker 처리 방식은 AI Worker Contract를 우선한다.

Redis와 ChromaDB는 현재 MVP 필수 구성으로 확정하지 않는다.

Pair/Fusion은 현재 운영 DB·Storage 범위에 포함하지 않는다.

향후 Fusion을 운영 기능으로 도입하려면 다음 영역을 별도로 검토해야 한다.

- API 요청 및 응답
- DB Schema
- Flyway Migration
- Queue Message
- AI Worker 입력·출력
- 모델 배포
- Storage 경로
- Frontend 사용자 흐름
- 권한 검증
- 테스트 시나리오

해당 범위는 기존 운영 구조에 임의로 추가하지 않고 별도 승인 후 진행한다.

---

## 8. 확인 기준

DB / Storage 설계 개요는 다음 조건을 만족해야 한다.

- PostgreSQL과 객체 저장소의 책임이 구분되어 있다.
- 이미지 바이너리를 PostgreSQL에 저장하지 않는다.
- MinIO/S3에는 원본 이미지와 실제 생성된 결과 이미지를 저장한다.
- PostgreSQL에는 파일 메타데이터만 저장한다.
- RGB 이미지와 열화상 이미지는 각각 독립적인 이미지 레코드로 저장한다.
- 분석 Job은 `imageId` 한 건을 대상으로 생성한다.
- RGB 이미지는 `RGB_SINGLE`, `RGB_ONLY` 기준으로 처리한다.
- 열화상 이미지는 `THERMAL_SINGLE`, `THERMAL_ONLY` 기준으로 처리한다.
- 현재 운영 구조에 `image_pairs`를 사용하지 않는다.
- 현재 운영 구조에 `analysis_jobs.image_pair_id`를 사용하지 않는다.
- Frontend는 DB, Storage, Queue, AI Worker에 직접 접근하지 않는다.
- Backend가 인증·권한 검증 후 파일 접근을 중계한다.
- 사용자가 전달한 Bucket 이름이나 Object Key를 그대로 신뢰하지 않는다.
- 만료되는 Presigned URL을 DB에 장기 저장하지 않는다.
- Bounding Box, Heatmap, Mask는 실제 생성된 결과만 저장한다.
- 로컬과 운영 환경은 동일한 Flyway Migration 이력을 사용한다.
- 과거 Pair/Fusion Migration은 이력으로 유지하되 현재 운영 기능으로 사용하지 않는다.
- 실제 Secret 값을 문서와 Git에 기록하지 않는다.