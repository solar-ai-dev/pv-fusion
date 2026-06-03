# AI Worker Contract

## 1. 문서 목적

본 문서는 `Spring Boot Backend`, `AWS SQS / LocalStack SQS`, `FastAPI AI Worker`, `S3 / MinIO`, `PostgreSQL` 사이의 **AI 분석 내부 처리 계약**을 정의한다.

이 문서는 외부 사용자용 API 명세가 아니다.

목적은 다음과 같다.

- Backend가 생성한 분석 작업을 AI Worker가 어떤 메시지 형식으로 수신하는지 정의한다.
- AI Worker가 단건 RGB, 단건 Thermal, RGB-Thermal Pair 입력을 어떻게 구분하고 처리하는지 정의한다.
- AI Worker가 원본 이미지, 모델, 결과 이미지, 결과 메타데이터를 어떤 기준으로 다루는지 정의한다.
- 로컬 개발 환경과 운영 환경에서 Queue, Storage, DB, Secret, Log 설정이 어떻게 달라지는지 정리한다.
- 운영 배포 시 외부 노출, 재시도, DLQ, Health Check, 로그, 모델 파일 관리 기준을 명확히 한다.

---

## 2. 적용 범위

| 구분 | 포함 여부 | 설명 |
| --- | --- | --- |
| Backend 분석 Job 생성 후 SQS 메시지 발행 | 포함 | Backend가 `ANALYSIS_JOBS`를 생성하고 Queue에 작업 메시지를 등록하는 계약 |
| SQS 메시지 Schema | 포함 | AI Worker가 수신하는 최소 메시지 구조 |
| AI Worker 작업 처리 흐름 | 포함 | 메시지 수신, DB 조회, 이미지 로딩, 추론, 결과 저장, 상태 갱신 |
| AI Worker 결과 Schema | 포함 | 성공/실패 결과 저장 또는 전달 기준 |
| Storage 계약 | 포함 | 원본 이미지와 결과 이미지의 S3/MinIO 저장 기준 |
| 운영 환경 기준 | 포함 | K3s, SQS, S3, RDS, CloudWatch, Secret, DLQ, Health Check |
| Public Backend API | 제외 | Frontend가 호출하는 외부 API는 `API-명세.txt`를 따른다. |
| Spring UseCase / Port / DTO 클래스명 확정 | 제외 | Backend 구현 계약 작업에서 별도로 확정한다. |
| AI 모델 내부 텐서 형식 | 제외 | Early Fusion / Late Fusion 최종 모델 선정 후 별도 모델 입출력 문서에서 확정한다. |
| DB Migration 변경 | 제외 | 본 문서는 DB 구조를 변경하지 않는다. |

---

## 3. 기준 문서

| 문서 | 반영 기준 |
| --- | --- |
| `프로젝트개요.txt` | RGB·열화상 단일/Pair 기반 분석, 구역 단위 유지보수 지원 목적 |
| `기능-명세서.txt` | AI 분석 요청, 상태 조회, 모델 라우팅, 결과 저장, ONNX Runtime 기준 |
| `요구사항명세.txt` | FR-039 ~ FR-049, FR-050 ~ FR-072, FR-073 이후 변화 추적 기준 |
| `정책정의서.txt` | AI Worker 외부 노출 금지, Queue 비동기 처리, Storage 접근 제한, 운영/로컬 환경 분리 |
| `시스템-아키텍처.txt` | Backend, SQS, AI Worker, S3, RDS, CloudWatch 역할 분리 |
| `API-명세.txt` | Internal Worker Contract, SQS Message Schema, 성공/실패 결과 Schema |
| `ERD.txt` | ANALYSIS_JOBS, ANALYSIS_RESULTS, DETECTED_DEFECTS, INSPECTION_IMAGES, IMAGE_PAIRS 관계 |
| `흐름도-TEXT.txt` | 이미지 업로드, Pair 구성, 분석 Job, SQS, AI Worker 추론, 결과 저장 흐름 |
| `클라우드-배포-운영-설계서.txt` | 운영/로컬 리소스, Secret, K3s, DLQ, 모델 파일 배포, Health Check 기준 |
| `AGENT-RULE.txt` | AI Worker 작업 원칙, 외부 노출 금지, Secret 관리, 테스트 보고 기준 |

---

## 4. 전체 책임 경계

### 4.1 Frontend

Frontend는 AI Worker를 직접 호출하지 않는다.

Frontend는 다음만 수행한다.

- Spring Boot Backend Public API 호출
- 이미지 업로드 요청
- AI 분석 요청
- 분석 상태 조회
- 분석 결과 조회
- 결과 이미지 조회 요청

Frontend는 다음에 직접 접근하지 않는다.

- S3
- MinIO
- SQS
- LocalStack SQS
- RDS
- PostgreSQL Docker
- AI Worker

### 4.2 Backend

Backend는 사용자 요청과 서비스 데이터 관리의 기준 서버이다.

Backend 책임은 다음과 같다.

- 인증 및 권한 검증
- 발전소, 구역, 설비, 점검 관리
- 이미지 메타데이터 관리
- RGB-Thermal Pair 관리
- 분석 Job 생성
- 분석 Job 상태 관리
- SQS 작업 메시지 발행
- 분석 결과 조회 API 제공
- 원본 이미지와 결과 이미지 접근 권한 검증

### 4.3 Queue

Queue는 Backend와 AI Worker 사이의 비동기 작업 전달 계층이다.

| 환경 | Queue |
| --- | --- |
| 로컬 | LocalStack SQS |
| 운영 | AWS SQS |

Queue 메시지는 분석 대상 식별에 필요한 최소 정보만 포함한다.

### 4.4 AI Worker

AI Worker는 분석 작업 처리자이다.

AI Worker 책임은 다음과 같다.

- SQS 메시지 수신
- `jobId` 기준 분석 Job 조회
- `imageId` 또는 `imagePairId` 기준 이미지 메타데이터 조회
- 객체 저장소에서 원본 이미지 읽기
- `inputType` 기준 모델 라우팅
- ONNX Runtime 기반 추론
- bbox / heatmap / mask / 시각화 이미지 생성
- 결과 이미지 객체 저장소 저장
- 결과 메타데이터 저장 또는 Backend Internal API 전달
- 분석 Job 상태 갱신
- 실패 사유 저장
- 운영 로그 출력

AI Worker는 외부 사용자용 API 서버가 아니다.

### 4.5 Storage

| 환경 | Storage |
| --- | --- |
| 로컬 | MinIO |
| 운영 | AWS S3 |

Storage에는 다음을 저장한다.

- 원본 RGB 이미지
- 원본 Thermal 이미지
- bbox 시각화 이미지
- heatmap 시각화 이미지
- mask 이미지
- 필요 시 Worker 중간 산출물 중 운영 보존 대상

DB에는 이미지 바이너리를 직접 저장하지 않고, bucket name, object key, file url 또는 Backend 조회 경로를 저장한다.

### 4.6 Database

| 환경 | DB |
| --- | --- |
| 로컬 | PostgreSQL Docker |
| 운영 | AWS RDS PostgreSQL |

DB에는 다음을 저장한다.

- 사용자, 발전소, 구역, 설비
- 점검 정보
- 이미지 메타데이터
- RGB-Thermal Pair 관계
- 분석 Job
- 분석 결과 요약
- 개별 결함 후보
- 검토 이력
- 운영 로그

---

## 5. 환경별 구성 기준

| 항목 | 로컬 개발 환경 | 운영 환경 |
| --- | --- | --- |
| Backend | Spring Boot local profile | K3s Backend Pod |
| AI Worker | FastAPI Local Worker 또는 Docker | K3s AI Worker Pod |
| Queue | LocalStack SQS | AWS SQS |
| Storage | MinIO | AWS S3 |
| DB | PostgreSQL Docker | AWS RDS PostgreSQL |
| Log | Console Log | CloudWatch Logs |
| Secret | `.env.local`, local profile | Kubernetes Secret 또는 AWS Secrets Manager |
| Model | 로컬 모델 경로 또는 개발용 object storage | S3에서 모델 다운로드 후 Worker 기동 |
| Endpoint Override | 사용 가능 | 사용 금지, AWS 기본 Endpoint 사용 |

운영과 로컬은 서비스 코드를 최대한 동일하게 유지한다.

환경 차이는 다음으로만 분리한다.

- Profile
- 환경 변수
- Secret
- Endpoint URL
- Bucket 이름
- Queue URL
- 모델 경로
- 로그 출력 대상

---

## 6. 핵심 상태값

### 6.1 inputType

| 값 | 의미 | 분석 대상 |
| --- | --- | --- |
| `RGB_SINGLE` | RGB 단건 분석 | `imageId` |
| `THERMAL_SINGLE` | Thermal 단건 분석 | `imageId` |
| `RGB_THERMAL_PAIR` | RGB-Thermal Pair 분석 | `imagePairId` |

### 6.2 modelType

| 값 | 의미 |
| --- | --- |
| `RGB_ONLY` | RGB-only 모델 |
| `THERMAL_ONLY` | Thermal-only 모델 |
| `FUSION` | RGB-Thermal Fusion 모델 |

### 6.3 requestedModelType

`requestedModelType`은 Backend가 요청한 모델 선택 의도를 나타낸다.

예시 값은 다음과 같다.

| 값 | 의미 |
| --- | --- |
| `RGB_ONLY` | RGB-only 모델 요청 |
| `THERMAL_ONLY` | Thermal-only 모델 요청 |
| `FUSION` | Fusion 모델 요청 |
| `FUSION_AUTO` | Pair 기준 Fusion 자동 선택 요청 |
| `AUTO` | 입력 유형 기준 자동 라우팅 요청 |

[확인 필요] 실제 enum 값은 Backend 도메인 계약 구성 결과와 맞춰야 한다.

### 6.4 jobStatus

| 값 | 의미 | 주체 |
| --- | --- | --- |
| `QUEUED` | 작업 등록 완료, Worker 처리 전 | Backend |
| `RUNNING` | Worker 처리 중 | AI Worker |
| `SUCCEEDED` | 분석 성공 | AI Worker 또는 Backend Internal 처리 |
| `FAILED` | 분석 실패 | AI Worker 또는 Backend Internal 처리 |

### 6.5 resultStatus

| 값 | 의미 |
| --- | --- |
| `NORMAL` | 이상 후보 없음 |
| `ANOMALY` | 이상 후보 있음 |
| `LOW_CONFIDENCE` | 저신뢰도 결과 |
| `FAILED` | 결과 생성 실패 |

[확인 필요] 실제 `resultStatus` enum은 Backend/DB 상태 정의와 맞춰야 한다.

### 6.6 actionCandidate

| 값 | 의미 |
| --- | --- |
| `CLEANING` | 청소 후보 |
| `RETAKE` | 재촬영 후보 |
| `FIELD_INSPECTION` | 현장 점검 후보 |
| `REPLACEMENT_REVIEW` | 교체 검토 후보 |

---

## 7. Backend → SQS Message Contract

### 7.1 기본 원칙

Backend는 분석 Job을 DB에 먼저 생성한 뒤 SQS 메시지를 발행한다.

SQS 메시지는 분석 대상 식별에 필요한 최소 정보만 포함한다.

메시지에 포함하지 않는 값은 다음과 같다.

- `plantId`
- `zoneId`
- `inspectionId`
- 원본 이미지 object key
- 결과 저장 object key
- 사용자 권한 정보
- Secret
- Presigned URL

이 값들이 필요한 경우 AI Worker는 `jobId`, `imageId`, `imagePairId`를 기준으로 DB에서 다시 조회한다.

### 7.2 Message Schema

```json
{
  "jobId": 1000,
  "inputType": "RGB_THERMAL_PAIR",
  "imageId": null,
  "imagePairId": 10,
  "requestedModelType": "FUSION_AUTO",
  "requestedByUserId": 1,
  "traceId": "req-20260601-0001",
  "createdAt": "2026-06-01T10:00:00+09:00"
}
```

### 7.3 Field Definition

| 필드 | 타입 | 필수 | 기준 |
| --- | --- | ---: | --- |
| `jobId` | number | Y | `analysis_jobs.id` |
| `inputType` | string | Y | `RGB_SINGLE`, `THERMAL_SINGLE`, `RGB_THERMAL_PAIR` |
| `imageId` | number  null | 조건부 | 단건 분석이면 필수, Pair 분석이면 `null` |
| `imagePairId` | number  null | 조건부 | Pair 분석이면 필수, 단건 분석이면 `null` |
| `requestedModelType` | string | Y | Backend가 요청한 모델 선택 의도 |
| `requestedByUserId` | number | Y | 분석 요청 사용자 ID |
| `traceId` | string | Y | 요청 추적 ID |
| `createdAt` | datetime | Y | 메시지 생성 시각 |

### 7.4 정합성 규칙

| 규칙 | 설명 |
| --- | --- |
| 단건 분석 | `imageId`는 값이 있어야 하고 `imagePairId`는 `null`이어야 한다. |
| Pair 분석 | `imagePairId`는 값이 있어야 하고 `imageId`는 `null`이어야 한다. |
| RGB 단건 | `inputType = RGB_SINGLE`, `imageId != null`, `imagePairId = null` |
| Thermal 단건 | `inputType = THERMAL_SINGLE`, `imageId != null`, `imagePairId = null` |
| Fusion | `inputType = RGB_THERMAL_PAIR`, `imageId = null`, `imagePairId != null` |
| 대상 검증 | Worker는 메시지 값만 신뢰하지 않고 DB의 Job과 대상 정보를 재조회한다. |
| 중복 처리 | 같은 `jobId` 메시지를 다시 받아도 결과가 중복 저장되지 않아야 한다. |
| Secret 금지 | 메시지에는 Secret, Access Key, Presigned URL을 넣지 않는다. |

### 7.5 RGB 단건 메시지 예시

```json
{
  "jobId": 1001,
  "inputType": "RGB_SINGLE",
  "imageId": 201,
  "imagePairId": null,
  "requestedModelType": "RGB_ONLY",
  "requestedByUserId": 1,
  "traceId": "req-20260601-1001",
  "createdAt": "2026-06-01T10:00:00+09:00"
}
```

### 7.6 Thermal 단건 메시지 예시

```json
{
  "jobId": 1002,
  "inputType": "THERMAL_SINGLE",
  "imageId": 202,
  "imagePairId": null,
  "requestedModelType": "THERMAL_ONLY",
  "requestedByUserId": 1,
  "traceId": "req-20260601-1002",
  "createdAt": "2026-06-01T10:00:00+09:00"
}
```

### 7.7 RGB-Thermal Pair 메시지 예시

```json
{
  "jobId": 1003,
  "inputType": "RGB_THERMAL_PAIR",
  "imageId": null,
  "imagePairId": 301,
  "requestedModelType": "FUSION_AUTO",
  "requestedByUserId": 1,
  "traceId": "req-20260601-1003",
  "createdAt": "2026-06-01T10:00:00+09:00"
}
```

---

## 8. AI Worker 처리 흐름

```text
SQS 메시지 수신
→ 메시지 기본 검증
→ jobId 기준 ANALYSIS_JOBS 조회
→ Job 상태 및 처리 가능 여부 확인
→ RUNNING 상태로 변경
→ imageId 또는 imagePairId 기준 이미지 메타데이터 조회
→ 객체 저장소에서 원본 이미지 읽기
→ inputType 기준 모델 라우팅
→ ONNX Runtime 추론
→ bbox / heatmap / mask 생성
→ 결과 이미지 객체 저장소 저장
→ 분석 결과 요약 저장 또는 전달
→ 개별 결함 후보 저장 또는 전달
→ ANALYSIS_JOBS 상태 SUCCEEDED 또는 FAILED 변경
→ SQS 메시지 삭제
```

### 8.1 처리 순서 상세

| 단계 | 처리 내용 | 실패 시 처리 |
| --- | --- | --- |
| 1 | SQS 메시지 수신 | 메시지 파싱 실패 시 `INVALID_WORKER_MESSAGE` |
| 2 | message schema 검증 | 필수값 누락 시 `INVALID_WORKER_MESSAGE` |
| 3 | `jobId`로 Job 조회 | 없으면 `JOB_NOT_FOUND` |
| 4 | Job 상태 확인 | 이미 `SUCCEEDED`이면 중복 처리 없이 종료 |
| 5 | Job `RUNNING` 변경 | DB 오류 시 재시도 대상 |
| 6 | 이미지 또는 Pair 메타데이터 조회 | 없으면 `IMAGE_METADATA_NOT_FOUND` 또는 `PAIR_METADATA_NOT_FOUND` |
| 7 | 객체 저장소에서 원본 이미지 읽기 | `IMAGE_OBJECT_NOT_FOUND`, `STORAGE_READ_FAILED` |
| 8 | 모델 선택 및 로딩 | `MODEL_NOT_FOUND`, `MODEL_LOAD_FAILED` |
| 9 | 전처리 및 추론 | `PREPROCESS_FAILED`, `AI_INFERENCE_FAILED` |
| 10 | 후처리 및 시각화 생성 | `POSTPROCESS_FAILED`, `VISUALIZATION_FAILED` |
| 11 | 결과 이미지 저장 | `STORAGE_WRITE_FAILED` |
| 12 | 결과 메타데이터 저장 또는 전달 | `RESULT_SAVE_FAILED` |
| 13 | Job `SUCCEEDED` 변경 | DB 오류 시 재시도 또는 보상 처리 |
| 14 | SQS 메시지 삭제 | 삭제 실패 시 중복 수신 가능, idempotency로 방어 |

---

## 9. 모델 라우팅 계약

| inputType | imageId | imagePairId | modelType | 입력 이미지 |
| --- | ---: | ---: | --- | --- |
| `RGB_SINGLE` | not null | null | `RGB_ONLY` | RGB 1장 |
| `THERMAL_SINGLE` | not null | null | `THERMAL_ONLY` | Thermal 1장 |
| `RGB_THERMAL_PAIR` | null | not null | `FUSION` | RGB 1장 + Thermal 1장 |

### 9.1 RGB-only

RGB 단건 분석은 RGB 이미지에서 다음 후보를 탐지한다.

- 오염
- 먼지
- 낙엽
- 조류 배설물
- 음영
- 식생 침범
- 외관 손상

### 9.2 Thermal-only

Thermal 단건 분석은 열화상 이미지에서 다음 후보를 탐지한다.

- hotspot
- 과열 영역
- 비정상 발열
- diode 이상
- substring 이상
- string fault 계열 이상

### 9.3 Fusion

RGB-Thermal Pair 분석은 같은 점검 회차와 같은 검사 대상의 RGB 이미지와 Thermal 이미지를 함께 입력한다.

Fusion 방식은 실험 결과에 따라 Early Fusion 또는 Late Fusion 중 확정한다.

[확인 필요] 최종 모델의 실제 입력 tensor 구조, 정렬 방식, resize 정책, normalization 값은 모델 배포 전 별도 문서로 확정한다.

---

## 10. DB 조회 계약

### 10.1 단건 분석

단건 분석에서는 Worker가 `imageId` 기준으로 `INSPECTION_IMAGES`를 조회한다.

조회해야 하는 주요 정보는 다음과 같다.

| 정보 | 설명 |
| --- | --- |
| `imageId` | 이미지 ID |
| `inspectionId` | 점검 ID |
| `equipmentId` | Array, Panel, Module 대상이면 설비 ID, Zone 전체이면 null 가능 |
| `targetType` | ZONE, ARRAY, PANEL, MODULE |
| `imageType` | RGB, THERMAL |
| `bucketName` | 원본 이미지 bucket |
| `objectKey` | 원본 이미지 object key |
| `mimeType` | 파일 형식 |
| `fileSize` | 파일 크기 |
| `status` | ACTIVE 여부 |

### 10.2 Pair 분석

Pair 분석에서는 Worker가 `imagePairId` 기준으로 `IMAGE_PAIRS`를 조회한다.

조회해야 하는 주요 정보는 다음과 같다.

| 정보 | 설명 |
| --- | --- |
| `imagePairId` | Pair ID |
| `inspectionId` | 점검 ID |
| `equipmentId` | Array, Panel, Module 대상이면 설비 ID, Zone 전체이면 null 가능 |
| `targetType` | ZONE, ARRAY, PANEL, MODULE |
| `rgbImageId` | RGB 이미지 ID |
| `thermalImageId` | Thermal 이미지 ID |
| `status` | ACTIVE 여부 |

Pair 조회 후 Worker는 `rgbImageId`, `thermalImageId`로 각각의 `INSPECTION_IMAGES` 메타데이터를 조회한다.

### 10.3 조회 금지 / 저장 금지 기준

| 항목 | 기준 |
| --- | --- |
| `plantId` | SQS 메시지에 포함하지 않는다. 필요한 경우 `inspectionId → zoneId → plantId` 관계로 조회한다. |
| `zoneId` | SQS 메시지에 포함하지 않는다. 필요한 경우 `inspectionId`를 통해 조회한다. |
| `inspectionId` | `ANALYSIS_JOBS`에 직접 저장하지 않는다. `imageId` 또는 `imagePairId`를 통해 조회한다. |
| 이미지 바이너리 | DB에 저장하지 않는다. 객체 저장소에서 읽는다. |

---

## 11. Storage 계약

### 11.1 원본 이미지 읽기

Worker는 이미지 메타데이터의 `bucketName`, `objectKey`를 기준으로 원본 이미지를 읽는다.

| 환경 | 기준 |
| --- | --- |
| 로컬 | MinIO bucket + object key |
| 운영 | AWS S3 bucket + object key |

### 11.2 결과 이미지 저장

Worker는 분석 결과 시각화 이미지를 객체 저장소에 저장한다.

저장 대상은 다음과 같다.

| 결과물 | 설명 |
| --- | --- |
| bbox image | Bounding Box가 그려진 결과 이미지 |
| heatmap image | 모델 신뢰도, 열 이상, anomaly 반응 시각화 이미지 |
| mask image | segmentation 또는 synthetic defect 기준 mask 이미지 |

### 11.3 Object Key 권장 규칙

[구현상 보완 제안]

```text
results/{jobId}/bbox.jpg
results/{jobId}/heatmap.jpg
results/{jobId}/mask.png
```

또는 결과 ID가 생성된 뒤에는 다음 구조를 사용할 수 있다.

```text
results/{resultId}/bbox.jpg
results/{resultId}/heatmap.jpg
results/{resultId}/mask.png
```

[확인 필요] `jobId` 기준 저장과 `resultId` 기준 저장 중 어떤 방식을 쓸지는 실제 결과 저장 구현 시 확정해야 한다.

### 11.4 fileUrl 기준

DB에 저장하는 `fileUrl`은 S3/MinIO 직접 공개 URL이 아니라 Backend 조회 API 경로를 우선한다.

예시:

```text
/api/v1/results/{resultId}/visualization?type=BBOX
/api/v1/results/{resultId}/visualization?type=HEATMAP
/api/v1/results/{resultId}/visualization?type=MASK
```

Backend는 파일 조회 시 인증과 데이터 접근 권한을 검증한다.

---

## 12. AI Worker 성공 결과 계약

AI Worker가 분석 성공 시 저장하거나 Backend Internal API로 전달해야 하는 결과 구조이다.

```json
{
  "jobId": 1000,
  "jobStatus": "SUCCEEDED",
  "result": {
    "modelType": "FUSION",
    "modelName": "pv-fusion-yolov8s",
    "modelVersion": "v1.0.0",
    "modelFormat": "ONNX_FP32",
    "runtime": "ONNX_RUNTIME",
    "inputSize": 640,
    "threshold": 0.25,
    "resultStatus": "ANOMALY",
    "anomalyCount": 2,
    "maxConfidence": 0.91,
    "areaRatio": 0.034,
    "severityScore": 82.5,
    "severityLevel": "HIGH",
    "actionCandidate": "FIELD_INSPECTION",
    "priorityLevel": "HIGH",
    "visualization": {
      "bboxBucketName": "pv-results",
      "bboxObjectKey": "results/1000/bbox.jpg",
      "bboxFileUrl": "/api/v1/results/{resultId}/visualization?type=BBOX",
      "heatmapBucketName": "pv-results",
      "heatmapObjectKey": "results/1000/heatmap.jpg",
      "heatmapFileUrl": "/api/v1/results/{resultId}/visualization?type=HEATMAP",
      "maskBucketName": "pv-results",
      "maskObjectKey": "results/1000/mask.png",
      "maskFileUrl": "/api/v1/results/{resultId}/visualization?type=MASK"
    },
    "detections": [
      {
        "defectType": "HOTSPOT",
        "defectSource": "THERMAL",
        "confidence": 0.91,
        "areaRatio": 0.034,
        "bboxX": 120,
        "bboxY": 80,
        "bboxWidth": 50,
        "bboxHeight": 40,
        "severityScore": 82.5,
        "severityLevel": "HIGH",
        "actionCandidate": "FIELD_INSPECTION"
      }
    ],
    "analyzedAt": "2026-06-01T10:03:00+09:00"
  },
  "error": null,
  "completedAt": "2026-06-01T10:03:00+09:00"
}
```

### 12.1 결과 저장 매핑

| 결과 필드 | 저장 대상 |
| --- | --- |
| `jobId` | `ANALYSIS_JOBS.id` |
| `modelType` | `ANALYSIS_RESULTS.model_type` |
| `modelName` | `ANALYSIS_RESULTS.model_name` |
| `modelVersion` | `ANALYSIS_RESULTS.model_version` |
| `modelFormat` | `ANALYSIS_RESULTS.model_format` |
| `runtime` | `ANALYSIS_RESULTS.runtime` |
| `inputSize` | `ANALYSIS_RESULTS.input_size` |
| `threshold` | `ANALYSIS_RESULTS.threshold` |
| `resultStatus` | `ANALYSIS_RESULTS.result_status` |
| `anomalyCount` | `ANALYSIS_RESULTS.anomaly_count` |
| `maxConfidence` | `ANALYSIS_RESULTS.max_confidence` |
| `areaRatio` | `ANALYSIS_RESULTS.area_ratio` |
| `severityScore` | `ANALYSIS_RESULTS.severity_score` |
| `severityLevel` | `ANALYSIS_RESULTS.severity_level` |
| `actionCandidate` | `ANALYSIS_RESULTS.action_candidate` |
| `priorityLevel` | `ANALYSIS_RESULTS.priority_level` |
| `visualization.*BucketName` | `ANALYSIS_RESULTS.*_bucket_name` |
| `visualization.*ObjectKey` | `ANALYSIS_RESULTS.*_object_key` |
| `visualization.*FileUrl` | `ANALYSIS_RESULTS.*_file_url` |
| `detections[]` | `DETECTED_DEFECTS` |

---

## 13. AI Worker 실패 결과 계약

```json
{
  "jobId": 1000,
  "jobStatus": "FAILED",
  "result": null,
  "error": {
    "code": "AI_INFERENCE_FAILED",
    "message": "AI 분석 중 오류가 발생했습니다.",
    "detail": "ONNX Runtime inference failed"
  },
  "failedAt": "2026-06-01T10:03:00+09:00"
}
```

### 13.1 실패 코드 기준

| code | 설명 | 재시도 가능성 |
| --- | --- | --- |
| `INVALID_WORKER_MESSAGE` | SQS 메시지 형식 오류 | 낮음 |
| `JOB_NOT_FOUND` | `jobId`에 해당하는 작업 없음 | 낮음 |
| `JOB_ALREADY_COMPLETED` | 이미 완료된 작업 중복 수신 | 재시도 불필요 |
| `IMAGE_METADATA_NOT_FOUND` | 이미지 메타데이터 없음 | 낮음 |
| `PAIR_METADATA_NOT_FOUND` | Pair 메타데이터 없음 | 낮음 |
| `IMAGE_OBJECT_NOT_FOUND` | Storage에 원본 이미지 없음 | 낮음 |
| `STORAGE_READ_FAILED` | 원본 이미지 읽기 실패 | 중간 |
| `MODEL_NOT_FOUND` | 모델 파일 없음 | 낮음 |
| `MODEL_LOAD_FAILED` | 모델 로딩 실패 | 중간 |
| `PREPROCESS_FAILED` | 이미지 전처리 실패 | 낮음 |
| `AI_INFERENCE_FAILED` | ONNX Runtime 추론 실패 | 중간 |
| `POSTPROCESS_FAILED` | 추론 결과 후처리 실패 | 중간 |
| `VISUALIZATION_FAILED` | bbox/heatmap/mask 생성 실패 | 중간 |
| `STORAGE_WRITE_FAILED` | 결과 이미지 저장 실패 | 중간 |
| `RESULT_SAVE_FAILED` | 결과 메타데이터 저장 실패 | 중간 |
| `UNKNOWN_WORKER_ERROR` | 알 수 없는 Worker 오류 | 중간 |

### 13.2 실패 저장 기준

실패 시 Worker 또는 Backend Internal 처리 계층은 다음을 저장해야 한다.

| 저장 대상 | 내용 |
| --- | --- |
| `ANALYSIS_JOBS.job_status` | `FAILED` |
| `ANALYSIS_JOBS.failure_code` | 실패 코드 |
| `ANALYSIS_JOBS.failure_message` | 사용자에게 제공 가능한 실패 메시지 |
| 운영 로그 | 상세 stack trace, jobId, traceId |

사용자에게 노출되는 메시지와 운영 로그의 상세 오류는 분리한다.

---

## 14. 결과 저장 방식

현재 문서 기준으로 허용되는 결과 저장 방식은 두 가지이다.

### 14.1 DB_DIRECT

AI Worker가 결과 이미지는 S3/MinIO에 저장하고, 결과 메타데이터는 PostgreSQL에 직접 저장한다.

| 항목 | 기준 |
| --- | --- |
| 장점 | 구현 단순, Queue Worker가 독립적으로 처리 가능 |
| 주의 | Worker가 DB schema와 transaction 기준을 정확히 따라야 함 |
| 운영 이슈 | DB 권한, migration 정합성, 중복 처리, 장애 복구 필요 |

### 14.2 BACKEND_CALLBACK

AI Worker가 결과 이미지는 S3/MinIO에 저장하고, 결과 메타데이터는 Backend Internal API로 전달한다.

| 항목 | 기준 |
| --- | --- |
| 장점 | 결과 저장 책임을 Backend로 집중, 권한/도메인 로직 일원화 |
| 주의 | Backend Internal API 추가 필요 |
| 운영 이슈 | 내부 API 보호, 네트워크 장애, callback 재시도 필요 |

### 14.3 현재 적용 기준

[확인 필요]

기존 문서에는 두 방식이 모두 허용되어 있다.

- AI Worker가 DB/S3에 직접 저장
- AI Worker가 결과 이미지는 S3/MinIO에 저장하고 결과 메타데이터는 Backend Internal API로 전달

따라서 실제 소스 확인 후 하나를 선택해야 한다.

MVP 문서 작성 기준으로는 다음처럼 둔다.

```text
기본 기준: DB_DIRECT 우선 검토
확장 기준: Backend Internal API가 구현되면 BACKEND_CALLBACK 전환 가능
공통 조건: Frontend는 어떤 경우에도 AI Worker를 직접 호출하지 않음
```

---

## 15. SQS 운영 계약

### 15.1 메시지 처리 원칙

| 항목 | 기준 |
| --- | --- |
| 메시지 삭제 | 결과 저장과 Job 상태 갱신이 끝난 뒤 삭제 |
| 중복 수신 | 가능하다고 가정하고 `jobId` 기준 idempotency 보장 |
| Visibility Timeout | 최악의 추론 시간보다 길게 설정 |
| DLQ | 최대 수신 횟수 초과 시 DLQ 이동 |
| 운영 기준 | 최대 수신 횟수 3회 후 DLQ 이동 |
| 메시지 본문 | Secret, Presigned URL, 대용량 payload 포함 금지 |

### 15.2 Idempotency 기준

같은 `jobId` 메시지를 여러 번 받아도 결과가 중복 생성되면 안 된다.

Worker는 처리 시작 전 다음을 확인한다.

| Job 상태 | 처리 기준 |
| --- | --- |
| `QUEUED` | 처리 시작 가능 |
| `RUNNING` | 오래된 RUNNING인지 확인 필요 |
| `SUCCEEDED` | 이미 완료된 작업으로 보고 메시지 삭제 |
| `FAILED` | 재시도 정책에 따라 처리, 기본은 재요청 API를 통해 새 Job 생성 권장 |

[구현상 보완 제안]

- `ANALYSIS_RESULTS.analysis_job_id`는 논리적으로 1:1 관계이므로 중복 저장을 막아야 한다.
- Worker는 `jobId` 단위 lock 또는 상태 전이 조건을 둬야 한다.
- Backend는 SQS 발행 실패에 대비해 transactional outbox 패턴을 검토할 수 있다.

---

## 16. 운영 보안 계약

### 16.1 외부 노출 금지

AI Worker는 외부 사용자에게 직접 노출하지 않는다.

운영 환경 기준:

- Ingress에서 AI Worker 경로를 열지 않는다.
- AI Worker Service가 필요하면 내부 ClusterIP로 제한한다.
- 내부 Health Check도 외부 공개하지 않는다.
- Frontend는 AI Worker endpoint를 알 필요가 없다.

### 16.2 Secret 관리

Secret은 코드, 문서, 로그에 직접 남기지 않는다.

| Secret 대상 | 운영 기준 |
| --- | --- |
| DB password | Kubernetes Secret 또는 AWS Secrets Manager |
| AWS Access Key | 가능하면 IAM Role 우선, 필요한 경우 Secret |
| AWS Secret Key | Secret 관리 |
| OAuth Client Secret | Backend Secret 관리 |
| Session / JWT Secret | Backend Secret 관리 |
| MinIO Access Key | 로컬 개인 환경 파일 또는 Secret |

`.env.example`에는 실제 값을 쓰지 않고 키 이름과 설명만 작성한다.

### 16.3 로그 보안

로그에 남기면 안 되는 값:

- Access Key
- Secret Key
- DB password
- JWT / Session 값
- Presigned URL 전체
- 사용자 개인정보 전체 덤프
- 이미지 바이너리

로그에 남겨도 되는 값:

- `jobId`
- `traceId`
- `inputType`
- `modelType`
- `jobStatus`
- 실패 코드
- 처리 시간
- object key 일부 또는 마스킹된 경로

---

## 17. 운영 관측성 계약

### 17.1 로그 필드

AI Worker 운영 로그는 다음 필드를 포함하는 것을 권장한다.

| 필드 | 설명 |
| --- | --- |
| `timestamp` | 로그 발생 시각 |
| `level` | INFO, WARN, ERROR |
| `service` | `ai-worker` |
| `jobId` | 분석 Job ID |
| `traceId` | 요청 추적 ID |
| `inputType` | RGB_SINGLE, THERMAL_SINGLE, RGB_THERMAL_PAIR |
| `modelType` | RGB_ONLY, THERMAL_ONLY, FUSION |
| `event` | `message_received`, `job_started`, `inference_succeeded` 등 |
| `durationMs` | 처리 시간 |
| `errorCode` | 실패 코드 |

### 17.2 주요 이벤트

| 이벤트 | 설명 |
| --- | --- |
| `message_received` | SQS 메시지 수신 |
| `message_invalid` | 메시지 검증 실패 |
| `job_started` | Job RUNNING 변경 |
| `image_loaded` | 원본 이미지 로딩 성공 |
| `model_loaded` | 모델 로딩 성공 |
| `inference_succeeded` | 추론 성공 |
| `inference_failed` | 추론 실패 |
| `result_saved` | 결과 저장 성공 |
| `job_succeeded` | Job SUCCEEDED 변경 |
| `job_failed` | Job FAILED 변경 |
| `message_deleted` | SQS 메시지 삭제 |

### 17.3 Metrics 권장 항목

[구현상 보완 제안]

| Metric | 설명 |
| --- | --- |
| worker 처리 성공 수 | 성공한 Job 수 |
| worker 처리 실패 수 | 실패한 Job 수 |
| 평균 추론 시간 | 모델별 평균 추론 시간 |
| Queue 대기 시간 | 메시지 생성부터 처리 시작까지 시간 |
| Storage 읽기 실패 수 | 원본 이미지 읽기 실패 수 |
| Storage 쓰기 실패 수 | 결과 이미지 저장 실패 수 |
| DLQ 이동 수 | DLQ로 이동한 메시지 수 |
| 모델 로딩 실패 수 | 모델 파일 문제 감지 |

---

## 18. Health Check 계약

### 18.1 Backend Health Check

Backend 공개 Health Check는 상세 내부 정보를 과도하게 노출하지 않는다.

상세 DB, Storage, Queue 상태는 내부 모니터링용 Health Check에서만 확인한다.

### 18.2 AI Worker Health Check

AI Worker는 운영 배포에서 readiness / liveness probe를 가져야 한다.

| Check | 기준 |
| --- | --- |
| Liveness | 프로세스가 살아 있고 event loop가 응답하는지 확인 |
| Readiness | 모델 로딩, 필수 설정, Queue 연결 준비 여부 확인 |

AI Worker는 모델 파일을 S3에서 다운로드해 사용하는 구조를 고려해야 한다.

모델 다운로드 실패 시 Worker는 기동 실패로 처리하고 K8s 재시작 정책으로 재시도한다.

[확인 필요] 실제 FastAPI health endpoint 경로는 소스 기준으로 확정한다.

---

## 19. 모델 파일 운영 계약

### 19.1 기본 기준

- 대용량 모델 파일은 Docker 이미지에 직접 포함하지 않는다.
- 운영에서는 AI Worker 기동 시 S3에서 지정 경로로 모델을 다운로드한다.
- 모델 다운로드 실패 시 Worker 기동을 실패시킨다.
- 모델명, 모델 버전, 모델 형식, Runtime, 입력 크기, threshold는 분석 결과에 저장한다.

### 19.2 모델 설정 항목

| 항목 | 설명 |
| --- | --- |
| `MODEL_DIR` | Worker 내부 모델 저장 경로 |
| `RGB_MODEL_PATH` | RGB-only ONNX 모델 경로 |
| `THERMAL_MODEL_PATH` | Thermal-only ONNX 모델 경로 |
| `FUSION_MODEL_PATH` | Fusion ONNX 모델 경로 |
| `MODEL_VERSION` | 모델 버전 |
| `MODEL_FORMAT` | ONNX_FP32 또는 ONNX_INT8 |
| `RUNTIME` | ONNX_RUNTIME |
| `INPUT_SIZE` | 모델 입력 크기 |
| `CONFIDENCE_THRESHOLD` | confidence threshold |
| `NMS_IOU_THRESHOLD` | NMS IoU threshold |

[확인 필요] 모델별 설정 파일을 `.env`, manifest, DB 중 어디에서 관리할지는 구현 단계에서 확정한다.

---

## 20. 환경 변수 계약

### 20.1 AI Worker 환경 변수 예시

| 변수 | 설명 | Secret 여부 | 로컬 예시 | 운영 기준 |
| --- | --- | --- | --- | --- |
| `APP_ENV` | 실행 환경 | N | `local` | `prod` |
| `LOG_LEVEL` | 로그 레벨 | N | `DEBUG` | `INFO` |
| `AWS_REGION` | AWS Region | N | `ap-northeast-2` | 운영 Region |
| `AWS_ENDPOINT_URL` | LocalStack/MinIO endpoint override | N | 로컬에서만 사용 | 운영에서는 미사용 |
| `SQS_QUEUE_URL` | 분석 작업 Queue URL | N | LocalStack Queue URL | AWS SQS Queue URL |
| `SQS_DLQ_URL` | DLQ URL | N | LocalStack DLQ URL | AWS SQS DLQ URL |
| `S3_ORIGINAL_BUCKET` | 원본 이미지 bucket | N | MinIO bucket | S3 bucket |
| `S3_RESULT_BUCKET` | 결과 이미지 bucket | N | MinIO bucket | S3 bucket |
| `DB_HOST` | DB host | N | PostgreSQL Docker host | RDS endpoint |
| `DB_PORT` | DB port | N | `5432` | `5432` |
| `DB_NAME` | DB name | N | local DB name | 운영 DB name |
| `DB_USER` | DB user | Y | local secret | Kubernetes Secret |
| `DB_PASSWORD` | DB password | Y | local secret | Kubernetes Secret |
| `MODEL_DIR` | 모델 경로 | N | local path | mounted/downloaded path |
| `WORKER_CONCURRENCY` | 동시 처리 수 | N | 낮은 값 | 리소스 기준 조정 |

`.env.example`에는 실제 Secret 값을 쓰지 않는다.

---

## 21. Backend 계약 작업과의 관계

본 문서는 Backend의 UseCase / Port / DTO 이름을 확정하지 않는다.

다만 Backend 계약 구성 시 다음 영역과 직접 연결된다.

| Backend 영역 | 연결 내용 |
| --- | --- |
| analysis usecase | 분석 Job 생성, 재요청, 상태 조회 |
| queue out port | SQS 메시지 발행 |
| image port | 이미지 메타데이터 조회 |
| imagepair port | Pair 메타데이터 조회 |
| result port | 분석 결과 저장 또는 조회 |
| defect port | 개별 결함 후보 저장 또는 조회 |

Backend 팀원이 계약 구성 중이면 이 문서는 다음처럼 사용한다.

- SQS 메시지 필드 기준 참고
- Job 상태 전이 기준 참고
- Worker 결과 저장 구조 참고
- 외부 노출 금지 기준 참고
- 로컬/운영 Queue, Storage 차이 참고

하지 말아야 할 것:

- 이 문서에서 Spring interface 이름을 확정하지 않는다.
- 이 문서에서 Java DTO 클래스명을 확정하지 않는다.
- 이 문서에서 DB 컬럼을 새로 추가하지 않는다.
- 이 문서만 보고 인증/권한 구조를 바꾸지 않는다.

---

## 22. 테스트 및 검증 기준

### 22.1 문서 생성 후 확인

| 확인 항목 | 기준 |
| --- | --- |
| 기존 API 명세와 충돌 여부 | SQS Message Schema가 기존 기준과 맞는지 확인 |
| ERD 정합성 | `plantId`, `zoneId`, `inspectionId` 직접 저장/전달 기준을 어기지 않았는지 확인 |
| 운영 기준 | SQS, S3, RDS, CloudWatch, Secret, DLQ 기준이 포함되어 있는지 확인 |
| 외부 노출 | AI Worker가 외부 API로 노출되지 않도록 명시했는지 확인 |
| Backend 계약 침범 | UseCase/Port/DTO 이름을 임의 확정하지 않았는지 확인 |

### 22.2 구현 후 권장 테스트

| 영역 | 테스트 |
| --- | --- |
| Backend | 분석 Job 생성 후 SQS 메시지 발행 테스트 |
| Backend | `imageId` 단건 / `imagePairId` Pair 정합성 테스트 |
| AI Worker | SQS 메시지 파싱 테스트 |
| AI Worker | 중복 메시지 idempotency 테스트 |
| AI Worker | RGB_SINGLE / THERMAL_SINGLE / RGB_THERMAL_PAIR 라우팅 테스트 |
| AI Worker | Storage read/write 실패 테스트 |
| AI Worker | 모델 로딩 실패 테스트 |
| AI Worker | 성공 결과 저장 테스트 |
| AI Worker | 실패 결과 저장 테스트 |
| Infra | LocalStack SQS + MinIO 통합 테스트 |
| Infra | DLQ 이동 테스트 |
| K8s | readiness/liveness probe 확인 |

---

## 23. 남은 확인 필요 항목

| 항목 | 상태 | 이유 |
| --- | --- | --- |
| 결과 저장 방식 | 확인 필요 | DB_DIRECT와 BACKEND_CALLBACK 중 실제 구현 선택 필요 |
| 실제 enum 값 | 확인 필요 | Backend 계약 구성 결과와 맞춰야 함 |
| AI Worker health endpoint | 확인 필요 | 실제 FastAPI 소스에서 경로 확인 필요 |
| 모델 입력 tensor 형식 | 확인 필요 | Fusion 모델 최종 선정 후 확정 필요 |
| object key 최종 규칙 | 확인 필요 | `jobId` 기준 또는 `resultId` 기준 선택 필요 |
| Worker 동시 처리 수 | 확인 필요 | 운영 서버 CPU/Memory, 모델 크기 기준으로 조정 필요 |
| Visibility Timeout | 확인 필요 | 실제 최대 추론 시간 측정 후 확정 필요 |
| Backend transactional outbox 적용 여부 | 구현상 보완 제안 | SQS 발행 실패와 DB commit 불일치 방어 목적 |

---

## 24. 요약

AI Worker Contract의 핵심은 다음이다.

```text
Frontend는 Backend만 호출한다.
Backend는 분석 Job을 만들고 SQS에 최소 메시지를 발행한다.
SQS 메시지는 jobId, inputType, imageId 또는 imagePairId 중심으로 구성한다.
AI Worker는 메시지 값을 그대로 신뢰하지 않고 DB에서 Job과 이미지 메타데이터를 재조회한다.
AI Worker는 S3/MinIO에서 원본 이미지를 읽고 ONNX Runtime으로 추론한다.
결과 이미지는 S3/MinIO에 저장한다.
결과 메타데이터는 DB 직접 저장 또는 Backend Internal API 전달 중 실제 구현 방식에 맞춘다.
AI Worker는 외부 사용자에게 직접 노출하지 않는다.
운영에서는 SQS, S3, RDS, CloudWatch, Kubernetes Secret, DLQ, Health Check 기준을 적용한다.
```
