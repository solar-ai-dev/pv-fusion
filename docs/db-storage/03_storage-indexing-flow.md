# Storage / Indexing 흐름 설계

## 1. 문서 목적

본 문서는 이미지 업로드, Pair 연결, 결과 이미지 조회 흐름과 PostgreSQL 조회 성능을 위한 관계형 DB index 기준을 정리한다.

여기서 말하는 indexing은 ChromaDB 벡터 인덱싱이 아니라 PostgreSQL 조회 성능을 위한 관계형 DB index를 의미한다.

---

## 2. 이미지 업로드 저장 흐름

이미지 업로드 저장 흐름은 아래 기준을 따른다.

사용자 이미지 업로드
→ Frontend가 Backend API 호출
→ Backend 인증 상태 확인
→ Backend 데이터 접근 권한 확인
→ Backend 이미지 파일 검증
→ Backend object key 생성
→ MinIO/S3에 원본 이미지 저장
→ PostgreSQL `inspection_images`에 메타데이터 저장
→ 업로드 결과 반환

### 2.1 저장 시 필요한 입력값

- `inspectionId`
- `targetType`
- `equipmentId`
- `imageType`
- `capturedAt`
- `file`

### 2.2 저장되는 DB 메타데이터

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

---

## 3. 중복 업로드 검증 흐름

중복 업로드 검증 기준:

- `inspection_id`
- `target_type`
- `equipment_id`
- `image_type`
- `status = ACTIVE`

추가 기준:

- ZONE 전체 촬영이면 `equipment_id`는 `null`일 수 있다.
- ARRAY, PANEL, MODULE 대상이면 `equipment_id`가 필요하다.

중복 검증 흐름:

업로드 요청 수신
→ `inspection_id`, `target_type`, `equipment_id`, `image_type`, `status` 기준 조회
→ 활성 이미지 존재 여부 확인
→ 중복 정책에 따라 차단 또는 후속 처리

---

## 4. RGB-Thermal Pair 연결 흐름

Pair 생성 기준:

- `rgb_image.inspection_id = thermal_image.inspection_id`
- `rgb_image.target_type = thermal_image.target_type`
- `rgb_image.equipment_id = thermal_image.equipment_id`
- `rgb_image.image_type = RGB`
- `thermal_image.image_type = THERMAL`

ZONE 전체 대상이면 두 이미지의 `equipment_id`가 모두 `null`이어야 한다.

Pair 연결 흐름:

Pair 생성 요청
→ Backend 인증 및 권한 확인
→ RGB / THERMAL 이미지 메타데이터 조회
→ 동일 `inspection_id`, `target_type`, `equipment_id` 조건 검증
→ `image_pairs` 저장
→ Pair 결과 반환

---

## 5. 이미지 조회 흐름

이미지 조회 흐름:

Frontend 이미지 조회 요청
→ Backend 인증 확인
→ Backend 이미지 접근 권한 확인
→ `inspection_images` 조회
→ `bucket_name`, `object_key` 확인
→ MinIO/S3에서 파일 조회
→ Backend가 파일 스트림 또는 접근 URL 반환

주의:

- Frontend는 MinIO/S3를 직접 호출하지 않는다.
- 권한 검증은 Backend가 최종 기준이다.

---

## 6. 분석 결과 이미지 조회 흐름

분석 결과 이미지 조회 흐름:

Frontend 결과 이미지 조회 요청
→ Backend 인증 확인
→ Backend 결과 접근 권한 확인
→ `analysis_results` 조회
→ bbox / heatmap / mask `object_key` 확인
→ MinIO/S3에서 결과 이미지 조회
→ Backend가 파일 스트림 또는 접근 URL 반환

결함 단위 마스크가 필요한 경우에는 `detected_defects`의 mask 경로 메타데이터를 추가로 조회할 수 있다.

---

## 7. 검색 / 필터 기준

권장 검색·필터 기준:

- `plantId`
- `zoneId`
- `inspectionId`
- `targetType`
- `equipmentId`
- `imageType`
- `inputType`
- `modelType`
- `jobStatus`
- `resultStatus`
- `actionCandidate`
- `severityLevel`
- `reviewStatus`
- `capturedAt`
- `createdAt`

주의:

- `plantId`, `zoneId`는 일부 테이블에 직접 저장하지 않고 Join으로 조회한다.

예시:

- `plantId = zones.plant_id`
- `zoneId = inspections.zone_id`
- `inspectionId = inspection_images.inspection_id` 또는 `image_pairs.inspection_id`

---

## 8. 권장 index

### 8.1 inspection_images 중복 검증용 index

- `(inspection_id, target_type, equipment_id, image_type, status)`

### 8.2 inspection_images 목록 조회용 index

- `(inspection_id, created_at)`
- `(equipment_id, image_type)`

### 8.3 image_pairs 후보 조회용 index

- `(inspection_id, target_type, equipment_id, status)`
- `(rgb_image_id)`
- `(thermal_image_id)`

### 8.4 analysis_jobs 상태 조회용 index

- `(job_status, created_at)`
- `(image_id)`
- `(image_pair_id)`

### 8.5 analysis_results 목록 필터용 index

- `(analysis_job_id)`
- 필요 시 `(result_status, review_status, priority_level, analyzed_at)`

---

## 9. 주의 사항

- `plant_id`, `zone_id`를 `inspection_images` 또는 `image_pairs`에 중복 저장하지 않는다.
- `inspection_id`를 통해 구역과 발전소를 조회한다.
- 이미지 바이너리를 DB에 저장하지 않는다.
- object key는 Backend에서 생성한다.
- 원본 파일명은 object key로 직접 사용하지 않는다.
- 실제 Secret 값은 문서와 Git에 남기지 않는다.
- Frontend가 MinIO/S3에 직접 접근하는 구조를 기본 설계로 사용하지 않는다.
- SQS 분석 큐는 본 문서 범위가 아니라 추후 ai-pipeline 문서에서 정의한다.

---

## 10. 완료 기준

본 문서의 설계 기준은 아래 조건을 만족해야 한다.

- 업로드, Pair, 조회 흐름이 Backend 중심으로 정리되어 있다.
- PostgreSQL에는 메타데이터만 저장한다.
- MinIO/S3에는 원본 이미지와 결과 이미지를 저장한다.
- 정규화 기준을 깨는 중복 FK 저장 구조를 제안하지 않는다.
- 조회 성능 개선을 위한 관계형 DB index 기준이 정리되어 있다.
- SQS, Redis, ChromaDB는 이번 범위 밖으로 유지된다.
