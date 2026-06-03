# MinIO / S3 Storage 설계

## 1. 문서 목적

본 문서는 로컬 MinIO와 운영 AWS S3를 공통 기준으로 사용하는 객체 저장소 설계를 정리한다.

주요 목적은 다음과 같다.

- 원본 이미지와 분석 결과 이미지의 저장 위치를 표준화한다.
- DB에 저장할 Storage 메타데이터 기준을 명확히 한다.
- 파일 접근 시 Backend 권한 검증을 최종 기준으로 고정한다.
- 운영 S3와 로컬 MinIO를 같은 object key 규칙으로 대응시킨다.

---

## 2. 로컬 MinIO와 운영 S3의 대응 관계

| 구분 | 로컬 환경 | 운영 환경 |
| --- | --- | --- |
| 객체 저장소 | MinIO | AWS S3 |
| 접근 설정 | local profile, MinIO endpoint | prod profile, AWS endpoint / SDK |
| Bucket 이름 | 로컬 기본값 사용 가능 | 환경 변수로 관리 |
| 서비스 코드 | 동일 | 동일 |

운영과 로컬의 차이는 Storage 엔진이 아니라 연결 설정과 인증 정보 관리 방식이다.

---

## 3. Bucket 기준

권장 bucket 기준:

- 로컬 bucket: `pv-insight-local`
- 운영 bucket 이름: 환경 변수로 관리

운영 bucket 예시는 문서에 고정하지 않고, 이름 기준만 외부 설정으로 관리한다.

원칙:

- 원본 이미지와 결과 이미지는 같은 bucket 또는 분리 bucket 전략 모두 가능하다.
- MVP 문서에서는 공통 bucket + prefix 분리를 기본 가정으로 둔다.

---

## 4. Object key 구조

권장 object key 예시:

- `originals/inspections/{inspectionId}/rgb/{imageId}_{uuid}.{ext}`
- `originals/inspections/{inspectionId}/thermal/{imageId}_{uuid}.{ext}`
- `results/analysis-jobs/{jobId}/bbox/{resultId}_{uuid}.{ext}`
- `results/analysis-jobs/{jobId}/heatmap/{resultId}_{uuid}.{ext}`
- `results/analysis-jobs/{jobId}/mask/{resultId}_{uuid}.{ext}`
- `temp/uploads/{uuid}.{ext}`
- `temp/analysis/{jobId}/{uuid}.{ext}`

원칙:

- object key는 Backend가 생성한다.
- 원본 파일명을 object key로 직접 사용하지 않는다.
- id와 uuid를 함께 사용해 충돌 가능성을 줄인다.
- 확장자는 검증된 MIME type 기준으로 결정한다.

---

## 5. 원본 이미지 저장 경로

원본 RGB / THERMAL 이미지는 다음 경로 체계를 따른다.

- RGB: `originals/inspections/{inspectionId}/rgb/...`
- THERMAL: `originals/inspections/{inspectionId}/thermal/...`

이 구조를 사용하면 다음 장점이 있다.

- 점검 기준으로 파일 묶음 관리가 쉽다.
- RGB와 THERMAL prefix를 분리해 관리할 수 있다.
- Pair 후보 조회 시 inspection 기준의 파일 위치를 추적하기 쉽다.

---

## 6. 분석 결과 이미지 저장 경로

분석 결과 이미지는 `analysis_job` 기준으로 관리한다.

권장 경로:

- bbox: `results/analysis-jobs/{jobId}/bbox/{resultId}_{uuid}.{ext}`
- heatmap: `results/analysis-jobs/{jobId}/heatmap/{resultId}_{uuid}.{ext}`
- mask: `results/analysis-jobs/{jobId}/mask/{resultId}_{uuid}.{ext}`

이 구조를 사용하면:

- 결과 파일을 분석 작업 단위로 모을 수 있다.
- `analysis_results`의 시각화 메타데이터와 대응시키기 쉽다.

---

## 7. 임시 파일 경로

임시 파일 또는 분석 중간 산출물은 다음 prefix를 사용할 수 있다.

- `temp/uploads/{uuid}.{ext}`
- `temp/analysis/{jobId}/{uuid}.{ext}`

주의:

- temp 경로는 영구 저장 보장이 필요한 경로가 아니다.
- 실제 보존 정책과 정리 스케줄은 운영 정책 문서 또는 ai-pipeline 문서에서 별도 정의할 수 있다.

---

## 8. DB에 저장할 필드 기준

### 8.1 inspection_images

- `bucket_name`
- `object_key`
- `file_url`
- `original_filename`
- `mime_type`
- `file_size`

### 8.2 analysis_results

- `bbox_bucket_name`
- `bbox_object_key`
- `bbox_file_url`
- `heatmap_bucket_name`
- `heatmap_object_key`
- `heatmap_file_url`
- `mask_bucket_name`
- `mask_object_key`
- `mask_file_url`

### 8.3 detected_defects

- `mask_bucket_name`
- `mask_object_key`
- `mask_file_url`

DB에는 파일 바이너리가 아니라 객체 저장소 경로 메타데이터만 저장한다.

---

## 9. 파일 접근 기준

파일 접근 원칙:

- 사용자는 MinIO / S3 URL에 직접 접근하지 않는다.
- Frontend는 Backend API를 통해 미리보기 또는 결과 이미지를 요청한다.
- Backend는 사용자 인증과 데이터 접근 권한을 검증한다.
- 권한 검증 후 Backend가 파일 스트림을 반환하거나 제한된 접근 URL을 제공한다.
- 파일 접근 정책은 Backend 권한 검증을 최종 기준으로 한다.

직접 공개 URL을 장기적으로 노출하는 구조는 기본 설계로 사용하지 않는다.

---

## 10. 파일명 생성 기준

- 원본 파일명은 DB의 `original_filename`에만 저장한다.
- object key에는 id와 uuid를 사용한다.
- 파일 확장자는 검증된 MIME type 기준으로 결정한다.
- 사용자가 올린 파일명을 Storage 경로 식별자로 직접 사용하지 않는다.

이 기준은 경로 충돌, 특수문자 이슈, 보안 노출 위험을 줄이기 위한 것이다.

---

## 11. 환경 변수 이름 기준

실제 Secret 값 대신 변수명 기준만 정리한다.

예시:

- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET_NAME`
- `MINIO_REGION`
- `AWS_REGION`
- `S3_BUCKET_NAME`

운영 기준:

- 실제 access key, secret key는 문서에 작성하지 않는다.
- 운영 Secret은 Kubernetes Secret 또는 AWS Secrets Manager로 관리한다.

---

## 12. 초기화 스크립트 기준

로컬 MinIO bucket 초기화 스크립트 위치는 아래와 같이 제안할 수 있다.

- `docker/minio/init-buckets.sh`

주의:

- 이번 작업에서는 해당 스크립트를 생성하지 않는다.
- bucket만 초기화하면 되고, prefix는 object 저장 시 자동 생성되므로 별도 디렉터리 생성은 필수는 아니다.

---

## 13. 확인 기준

MinIO / S3 Storage 설계는 아래 조건을 만족해야 한다.

- 원본 이미지와 결과 이미지는 객체 저장소에 저장한다.
- DB에는 `bucket_name`, `object_key`, `file_url` 등 메타데이터만 저장한다.
- Frontend는 Storage에 직접 접근하지 않는다.
- Backend가 인증·권한 검증 후 파일 접근을 중계한다.
- object key는 Backend가 생성하며, 원본 파일명을 직접 사용하지 않는다.
- 실제 Secret 값은 문서나 Git에 남기지 않는다.
