# Storage / Indexing 흐름 설계

## 1. 문서 목적

본 문서는 이미지 업로드, 이미지 단건 분석 연결, 원본·결과 이미지 조회 흐름과 PostgreSQL 조회 성능을 위한 관계형 DB Index 기준을 정리한다.

여기서 말하는 Indexing은 ChromaDB와 같은 벡터 인덱싱이 아니라 PostgreSQL 조회 성능을 위한 관계형 DB Index를 의미한다.

주요 목적은 다음과 같다.

- RGB·열화상 이미지 업로드 및 저장 흐름을 정리한다.
- 이미지 한 건을 기준으로 분석 작업을 생성하는 흐름을 정리한다.
- 원본 이미지와 분석 결과 이미지의 접근 흐름을 정리한다.
- PostgreSQL 검색과 필터에 필요한 Index 기준을 정의한다.
- Storage 객체와 DB 메타데이터의 책임 경계를 명확히 한다.

현재 운영 서비스에서는 RGB 이미지와 열화상 이미지를 각각 독립적인 이미지로 저장하고 분석한다.

분석 대상은 `inspection_images.id`로 식별되는 이미지 한 건이며, 분석 Job은 `analysis_jobs.image_id`를 기준으로 생성한다.

Pair 생성·관리와 Fusion 분석은 현재 운영 Storage 및 Indexing 흐름에 포함하지 않는다.

---

## 2. 이미지 업로드 저장 흐름

이미지 업로드 저장 흐름은 아래 기준을 따른다.

```text
사용자 이미지 업로드
→ Frontend가 Backend Public API 호출
→ Backend 인증 상태 확인
→ Backend 데이터 접근 권한 확인
→ Backend 점검과 검사 대상 정보 검증
→ Backend 이미지 파일 형식·크기 검증
→ Backend 이미지 메타데이터 레코드 준비
→ Backend object key 생성
→ MinIO/S3에 원본 이미지 저장
→ PostgreSQL inspection_images에 메타데이터 저장
→ 업로드 결과 반환
```

Frontend는 MinIO 또는 S3를 직접 호출하지 않는다.

Backend는 사용자가 전달한 파일명이나 Storage 경로를 그대로 사용하지 않고, 검증된 이미지 정보와 서버에서 생성한 object key를 사용한다.

### 2.1 저장 시 필요한 입력값

기본 입력값:

- `inspectionId`
- `imageType`
- `file`

업로드 정책에 따라 함께 사용할 수 있는 입력값:

- `targetType`
- `equipmentId`
- `capturedAt`
- `memo`

입력 기준:

- `imageType`은 `RGB` 또는 `THERMAL`이어야 한다.
- `inspectionId`는 사용자가 접근 가능한 유효한 점검이어야 한다.
- Zone 전체 촬영이면 `equipmentId`는 `null`일 수 있다.
- Array, Panel, Module 등 특정 설비를 대상으로 할 경우 `equipmentId`가 필요할 수 있다.
- `capturedAt`이 입력되지 않은 경우 점검 촬영 시각 또는 서버 기본값 사용 여부는 이미지 업로드 정책을 따른다.
- Frontend가 전달한 `targetType`, `equipmentId`는 Backend에서 실제 점검·구역·설비 관계를 다시 검증한다.

### 2.2 저장되는 DB 메타데이터

`inspection_images`에 저장하는 대표 메타데이터:

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

저장 기준:

- 이미지 바이너리는 PostgreSQL에 저장하지 않는다.
- 원본 이미지 파일은 MinIO 또는 S3에 저장한다.
- DB에는 객체 저장소에서 파일을 찾는 데 필요한 메타데이터만 저장한다.
- 만료되는 Presigned URL은 DB에 영구 저장하지 않는 것을 기본으로 한다.
- `file_url`이 필요하지 않은 구조에서는 `null`을 허용할 수 있다.

### 2.3 Storage 저장 실패 처리

Storage 저장에 실패한 경우:

- 정상 업로드 완료 상태로 응답하지 않는다.
- 불완전한 DB 메타데이터가 남지 않도록 처리한다.
- DB 레코드를 먼저 생성하는 구조라면 `upload_status`를 실패 상태로 반영한다.
- 재시도 가능 여부와 실패 사유를 사용자용 메시지와 내부 로그로 구분한다.
- 임시 객체가 생성된 경우 정리 대상으로 처리한다.

DB 저장에 실패했지만 Storage 객체가 생성된 경우:

- 고아 객체가 남을 수 있으므로 보상 삭제를 시도한다.
- 삭제에 실패한 객체는 운영 정리 대상 로그에 기록한다.
- 성공 응답을 반환하지 않는다.

---

## 3. 중복 업로드 검증 흐름

중복 업로드 검증에 사용할 수 있는 기준:

- `inspection_id`
- `target_type`
- `equipment_id`
- `image_type`
- `status = ACTIVE`

추가 기준:

- Zone 전체 촬영이면 `equipment_id`는 `null`일 수 있다.
- Array, Panel, Module 대상이면 `equipment_id`가 필요할 수 있다.
- 동일 점검에 RGB 이미지와 열화상 이미지를 각각 등록할 수 있다.
- 동일 이미지 유형의 여러 장 업로드를 허용할지는 이미지 업로드 정책을 따른다.

중복 검증 흐름:

```text
업로드 요청 수신
→ inspection_id, target_type, equipment_id, image_type 검증
→ 동일 조건의 활성 이미지 조회
→ 중복 업로드 정책 확인
→ 허용 시 새 이미지 저장
→ 제한 시 사용자에게 기존 이미지 존재 안내
```

### 3.1 중복 업로드 정책 주의

단순히 동일 조건의 활성 이미지가 존재한다는 이유만으로 모든 추가 업로드를 차단하지 않는다.

드론 촬영이나 넓은 점검 영역에서는 같은 점검·대상·이미지 유형에 여러 이미지가 필요할 수 있다.

따라서 다음 중 어떤 정책을 사용할지 별도로 확정해야 한다.

- 동일 조건에서 이미지 한 장만 허용
- 동일 조건에서 여러 이미지 허용
- 파일 Hash가 동일한 경우에만 중복으로 판단
- 사용자가 기존 이미지를 대체하도록 선택
- 기존 이미지를 비활성화한 뒤 새 이미지 등록

[확인 필요]

현재 운영에서 동일 점검·대상·이미지 유형의 다중 업로드를 허용하는지 최종 정책 확인이 필요하다.

정책이 확정되지 않은 상태에서 DB Unique Constraint로 다중 업로드를 강제로 제한하지 않는다.

### 3.2 파일 내용 중복 검증

필요한 경우 다음 정보를 이용한 중복 검증을 검토할 수 있다.

- 파일 크기
- MIME type
- SHA-256 Hash
- 원본 파일명
- 촬영 시각

원본 파일명만으로 중복 여부를 판단하지 않는다.

Hash를 저장하거나 검사하는 기능은 실제 요구사항과 성능 영향을 확인한 뒤 도입한다.

---

## 4. 이미지 단건 분석 연결 흐름

현재 운영 분석은 Pair가 아니라 이미지 한 건을 대상으로 한다.

분석 연결 기준:

- 분석 대상 이미지가 존재해야 한다.
- 이미지 상태가 활성 상태여야 한다.
- 이미지 업로드가 정상 완료되어야 한다.
- 이미지가 연결된 점검과 발전소에 대한 사용자 접근 권한이 있어야 한다.
- RGB 이미지는 RGB 단건 모델로 처리한다.
- 열화상 이미지는 Thermal 단건 모델로 처리한다.

분석 요청 흐름:

```text
사용자가 이미지 분석 요청
→ Frontend가 imageId를 Backend에 전달
→ Backend 인증 및 권한 확인
→ inspection_images에서 이미지 메타데이터 조회
→ 이미지 상태와 Storage 메타데이터 확인
→ 이미지 유형 확인
→ RGB 또는 Thermal 단건 분석 Job 생성
→ analysis_jobs.image_id에 분석 대상 저장
→ 분석 Job 상태를 QUEUED로 저장
→ 내부 Queue 메시지 발행
→ 분석 Job 결과 반환
```

분석 요청 Body 예시:

```json
{
  "imageId": 100
}
```

라우팅 기준:

| 이미지 유형 | inputType | modelType |
| --- | --- | --- |
| `RGB` | `RGB_SINGLE` | `RGB_ONLY` |
| `THERMAL` | `THERMAL_SINGLE` | `THERMAL_ONLY` |

Frontend는 사용자가 선택한 이미지의 `imageId`만 전달한다.

Backend는 DB에 저장된 이미지 유형을 기준으로 `inputType`과 모델 유형을 결정한다.

현재 운영 흐름에서는 다음 값을 사용하지 않는다.

- `imagePairId`
- `RGB_THERMAL_PAIR`
- `FUSION`
- `FUSION_AUTO`

Queue 메시지의 세부 계약과 Worker 처리 방식은 AI Worker Contract를 우선한다.

---

## 5. 이미지 조회 흐름

원본 이미지 조회 흐름:

```text
Frontend 이미지 조회 요청
→ Backend 인증 확인
→ Backend 이미지 접근 권한 확인
→ inspection_images 조회
→ 이미지가 속한 점검·구역·발전소 확인
→ 사용자의 발전소 접근 권한 확인
→ bucket_name, object_key 확인
→ MinIO/S3에서 파일 조회
→ Backend가 파일 Stream 또는 제한된 접근 URL 반환
```

주의:

- Frontend는 MinIO/S3를 직접 호출하지 않는다.
- 권한 검증은 Backend가 최종 기준이다.
- 사용자가 Bucket 이름이나 object key를 직접 지정하도록 하지 않는다.
- Backend는 `imageId`를 기준으로 DB에서 Storage 메타데이터를 조회한다.
- 비활성 이미지 또는 접근 권한이 없는 이미지의 파일을 반환하지 않는다.
- Storage 객체가 존재하지 않으면 정상 이미지 응답으로 처리하지 않는다.
- Presigned URL을 사용하는 경우 제한된 만료 시간을 적용한다.

### 5.1 이미지 목록 조회

점검 이미지 목록 조회 흐름:

```text
Frontend가 inspectionId 기준 이미지 목록 요청
→ Backend 인증 및 점검 접근 권한 확인
→ inspection_images에서 inspection_id 기준 조회
→ 활성 상태, 이미지 유형, 촬영 시각 등 조건 적용
→ 이미지 메타데이터 목록 반환
```

목록 응답에는 필요한 메타데이터만 포함하고 Storage Credential이나 내부 객체 저장소 접속 정보를 노출하지 않는다.

---

## 6. 분석 결과 이미지 조회 흐름

분석 결과 이미지 조회 흐름:

```text
Frontend 결과 이미지 조회 요청
→ Backend 인증 확인
→ Backend 결과 접근 권한 확인
→ analysis_results 조회
→ analysis_jobs와 원본 이미지 관계 확인
→ 원본 이미지가 속한 점검·구역·발전소 확인
→ 요청한 시각화 유형의 메타데이터 확인
→ MinIO/S3에서 결과 이미지 조회
→ Backend가 파일 Stream 또는 제한된 접근 URL 반환
```

조회 가능한 시각화 예시:

- Bounding Box
- Heatmap
- Mask

결함 단위 Mask가 실제로 생성된 경우에는 `detected_defects`의 Mask 경로 메타데이터를 추가로 조회할 수 있다.

주의:

- 모든 분석 결과에 Bounding Box, Heatmap, Mask가 존재한다고 가정하지 않는다.
- 실제 생성된 시각화 유형만 조회할 수 있다.
- 존재하지 않는 결과 유형은 빈 이미지나 Placeholder 파일로 반환하지 않는다.
- Mask는 모델 출력 또는 후처리에서 실제 생성된 경우에만 제공한다.
- Heatmap도 AI Worker가 실제 생성한 경우에만 제공한다.
- 결과 object key는 사용자 입력값이 아니라 DB 메타데이터를 기준으로 조회한다.

### 6.1 결과 Storage 메타데이터

`analysis_results`에서 사용할 수 있는 대표 필드:

- `bbox_bucket_name`
- `bbox_object_key`
- `bbox_file_url`
- `heatmap_bucket_name`
- `heatmap_object_key`
- `heatmap_file_url`
- `mask_bucket_name`
- `mask_object_key`
- `mask_file_url`

결과가 생성되지 않은 시각화 필드는 `null`일 수 있다.

---

## 7. 검색 / 필터 기준

권장 검색·필터 기준:

- `plantId`
- `zoneId`
- `inspectionId`
- `imageId`
- `targetType`
- `equipmentId`
- `imageType`
- `inputType`
- `modelType`
- `jobStatus`
- `resultStatus`
- `actionCandidate`
- `priorityLevel`
- `severityLevel`
- `reviewStatus`
- `capturedAt`
- `analyzedAt`
- `createdAt`

현재 운영 값:

| 구분 | 허용 값 |
| --- | --- |
| `imageType` | `RGB`, `THERMAL` |
| `inputType` | `RGB_SINGLE`, `THERMAL_SINGLE` |
| `modelType` | `RGB_ONLY`, `THERMAL_ONLY` |
| `jobStatus` | `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED` |

주의:

- `plantId`, `zoneId`, `inspectionId`는 모든 테이블에 직접 저장하지 않는다.
- 정규화된 관계를 따라 Join으로 조회한다.
- 목록 화면에서 사용자에게 내부 ID 직접 입력을 기본 검색 방식으로 제공하지 않을 수 있다.
- API 내부 필터와 Frontend에 노출되는 필터는 구분한다.

관계 예시:

```text
plantId
= zones.plant_id

zoneId
= inspections.zone_id

inspectionId
= inspection_images.inspection_id

imageId
= analysis_jobs.image_id

resultId
= analysis_results.id
```

분석 결과에서 발전소까지 조회하는 관계:

```text
analysis_results
→ analysis_jobs
→ inspection_images
→ inspections
→ zones
→ plants
```

현재 운영 조회 관계에는 `image_pairs`를 포함하지 않는다.

---

## 8. 권장 Index

Index는 실제 조회 Query와 실행 계획을 확인한 뒤 적용한다.

필요 이상의 Index를 생성하면 INSERT와 UPDATE 성능, 저장 공간에 영향을 줄 수 있으므로 문서에 적힌 모든 Index를 일괄 생성하지 않는다.

### 8.1 `inspection_images` 중복 검증용 Index

검토 후보:

```text
(inspection_id, target_type, equipment_id, image_type, status)
```

용도:

- 동일 점검과 검사 대상의 활성 이미지 조회
- 중복 업로드 정책 검증
- 이미지 유형별 존재 여부 확인

주의:

- `equipment_id`가 `null`인 Zone 대상 이미지의 조회 조건을 고려해야 한다.
- 다중 이미지 업로드를 허용하는 경우 Unique Index로 만들지 않는다.
- 실제 중복 정책이 확정되기 전에는 일반 Index로만 검토한다.

### 8.2 `inspection_images` 목록 조회용 Index

권장 후보:

```text
(inspection_id, created_at)
(inspection_id, image_type, status)
(equipment_id, image_type)
(captured_at)
```

용도:

- 점검 상세의 이미지 목록 조회
- RGB·열화상 이미지 유형별 조회
- 설비 위치 기준 이미지 조회
- 촬영 시각 정렬과 기간 필터

데이터가 적은 초기 MVP에서는 단일 FK Index부터 적용하고, 복합 Index는 실제 Query 사용 빈도를 확인한 뒤 추가할 수 있다.

### 8.3 이미지 단건 분석 연결 조회용 Index

권장 후보:

```text
analysis_jobs(image_id)
analysis_jobs(image_id, created_at)
analysis_jobs(image_id, job_status)
```

용도:

- 특정 이미지의 분석 작업 이력 조회
- 이미지별 최근 분석 상태 확인
- 동일 이미지의 진행 중 분석 Job 확인
- 이미지 재분석 결과 조회

현재 운영 구조에서는 다음 Index를 생성하지 않는다.

```text
analysis_jobs(image_pair_id)
```

### 8.4 `analysis_jobs` 상태 조회용 Index

권장 후보:

```text
(job_status, created_at)
(requested_by_user_id, created_at)
(input_type, created_at)
```

용도:

- 대기 중 또는 진행 중인 분석 Job 조회
- 관리자 분석 작업 목록
- 사용자별 요청 이력
- 입력 유형별 분석 Job 통계

동일 이미지에 `QUEUED` 또는 `RUNNING` 상태 Job을 하나만 허용할 경우 Partial Unique Index를 검토할 수 있다.

예시 개념:

```sql
CREATE UNIQUE INDEX ...
ON analysis_jobs (image_id)
WHERE job_status IN ('QUEUED', 'RUNNING');
```

[확인 필요]

진행 중 분석 Job의 중복 생성 제한을 DB에서 강제할지, Backend 비즈니스 로직으로 처리할지 최종 정책 확인이 필요하다.

정책 확정 전에는 해당 Unique Index를 임의로 추가하지 않는다.

### 8.5 `analysis_results` 목록 필터용 Index

기본 후보:

```text
(analysis_job_id)
(result_status)
(review_status)
(severity_level)
(priority_level)
(analyzed_at)
```

복합 Index 검토 후보:

```text
(result_status, review_status, analyzed_at)
(review_status, priority_level, analyzed_at)
(severity_level, analyzed_at)
```

용도:

- 결과 상태별 목록 조회
- 검토 대기 결과 조회
- 높은 심각도·우선순위 결과 조회
- 기간별 분석 결과 조회

`analysis_jobs`와 `analysis_results`가 1:1 관계라면 `analysis_results.analysis_job_id`에 Unique Constraint 적용을 검토한다.

### 8.6 `detected_defects` 및 검토 이력 Index

권장 후보:

```text
detected_defects(analysis_result_id)
detected_defects(defect_type)
result_review_histories(analysis_result_id, created_at)
```

용도:

- 결과 상세의 결함 후보 목록 조회
- 결함 유형별 통계
- 결과 검토 변경 이력 조회

### 8.7 Index 적용 확인

Index 적용 전후 다음 항목을 확인한다.

- 실제 사용 Query
- `EXPLAIN`
- `EXPLAIN ANALYZE`
- 예상 Row 수
- 테이블 전체 Row 수
- 정렬 조건
- 필터 선택도
- INSERT·UPDATE 빈도
- Index 저장 공간

개발 초기에 데이터가 적다는 이유만으로 복합 Index를 과도하게 추가하지 않는다.

---

## 9. 주의 사항

- `plant_id`, `zone_id`를 `inspection_images`에 중복 저장하지 않는다.
- 점검 정보는 `inspection_images.inspection_id` 관계로 조회한다.
- 발전소 정보는 `inspections.zone_id → zones.plant_id` 관계로 조회한다.
- 현재 운영 DB에 `image_pairs` 테이블을 사용하지 않는다.
- 현재 운영 `analysis_jobs`에 `image_pair_id`를 사용하지 않는다.
- 이미지 바이너리를 PostgreSQL에 저장하지 않는다.
- 원본 이미지와 분석 결과 이미지는 MinIO 또는 S3에 저장한다.
- DB에는 Bucket, object key, 파일 정보 등 메타데이터만 저장한다.
- 원본 object key는 Backend가 생성한다.
- 결과 object key는 AI Worker 또는 결과 저장 담당 계층이 공통 규칙에 따라 생성한다.
- 사용자 입력 파일명을 object key로 직접 사용하지 않는다.
- 사용자에게 Bucket 이름이나 object key를 직접 입력받지 않는다.
- 실제 Secret 값은 문서와 Git에 남기지 않는다.
- Frontend가 MinIO 또는 S3에 직접 접근하는 구조를 기본 설계로 사용하지 않는다.
- Presigned URL을 DB에 장기 저장하거나 로그에 전체 값으로 남기지 않는다.
- RGB 이미지와 열화상 이미지는 각각 독립적인 Storage 객체, 분석 Job, 결과를 가진다.
- Pair/Fusion 연구 구조를 현재 운영 DB와 Storage에 임의로 추가하지 않는다.
- 과거 Pair/Fusion Migration 파일은 이력 보존을 위해 수정하거나 삭제하지 않는다.
- SQS 메시지 세부 계약과 AI Worker 처리 흐름은 AI Worker Contract를 우선한다.
- Redis와 ChromaDB는 현재 운영 Storage 및 관계형 Indexing 범위에 포함하지 않는다.

---

## 10. 완료 기준

본 문서의 설계 기준은 아래 조건을 만족해야 한다.

- RGB·열화상 이미지 업로드 흐름이 Backend 중심으로 정리되어 있다.
- 분석 요청이 `imageId` 기준 이미지 단건 흐름으로 정의되어 있다.
- RGB 이미지는 RGB 단건 분석으로 처리된다.
- 열화상 이미지는 Thermal 단건 분석으로 처리된다.
- 현재 운영 흐름에 Pair 생성·관리와 Fusion 분석이 포함되지 않는다.
- PostgreSQL에는 이미지와 결과 파일의 메타데이터만 저장한다.
- MinIO/S3에는 원본 이미지와 실제 생성된 결과 이미지를 저장한다.
- Frontend는 MinIO/S3를 직접 호출하지 않는다.
- Backend가 인증·권한 검증 후 파일 접근을 중계한다.
- `plant_id`, `zone_id`, `inspection_id`를 불필요하게 중복 저장하지 않는다.
- 분석 Job은 `analysis_jobs.image_id`를 통해 원본 이미지를 참조한다.
- 조회 성능 개선을 위한 관계형 DB Index 기준이 정리되어 있다.
- Index는 실제 Query와 실행 계획을 확인한 뒤 적용한다.
- 동일 이미지의 진행 중 분석 Job 중복 제한 방식은 정책 확정 후 적용한다.
- 사용자가 전달한 파일명, Bucket 이름, object key를 그대로 신뢰하지 않는다.
- 생성되지 않은 Bounding Box, Heatmap, Mask 경로는 `null`로 처리할 수 있다.
- 실제 Secret과 Presigned URL 전체 값을 문서, Git, 로그에 남기지 않는다.
- Redis, ChromaDB와 같은 별도 인덱싱 시스템은 현재 범위 밖으로 유지한다.