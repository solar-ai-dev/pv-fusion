# AI Worker Contract

## 1. 문서 목적

이 문서는 Backend, SQS, AI Worker, Storage, DB 사이의 AI Worker 기능 계약을 정리한다.

- AI Worker는 사용자용 공개 API가 아니다.
- Frontend는 AI Worker에 직접 접근하지 않는다.
- 환경변수 상세 표의 최신 기준은 `docs/17_environment-variable-secret-contract.md`를 따른다.
- 이 문서는 AI Worker의 기능 계약, 메시지 계약, 상태 전이, local/prod 구조를 설명한다.
- 현재 운영 분석은 RGB 이미지와 열화상 이미지를 각각 독립적인 단건 이미지로 처리한다.
- Pair 생성·관리 및 Fusion 분석은 현재 운영 AI Worker 계약에 포함하지 않는다.

## 2. 적용 범위

포함:

- Backend에서 발행하는 이미지 단건 분석 SQS 메시지 계약
- AI Worker 메시지 파싱과 처리 흐름
- Storage, Queue, DB 사용 경계
- RGB-only 및 Thermal-only 모델 manifest 기반 실행 계약
- local/prod 실행 구조
- Health check, 운영 보안, 관측성 기준

제외:

- Frontend 공개 API 명세
- Backend Java 클래스명, Port/UseCase 이름 확정
- DB schema 변경
- Dockerfile, Jenkins, K3s manifest 구현
- 실제 AWS/K3s 운영값 주입
- Pair 생성·조회·수정·비활성화 기능
- RGB-Thermal Pair 입력 처리
- Fusion 모델 라우팅 및 Fusion 추론

## 3. 기준 문서와 코드

최신 기준 문서:

- `docs/17_environment-variable-secret-contract.md`
- `docs/12_cloud-deployment-operations-design.md`
- `docs/08_system-architecture.md`
- `docs/09_erd.md`
- `docs/10_api-specification.md`

현재 구현 기준 코드:

- `ai-worker/app/config/settings.py`
- `ai-worker/app/runtime_clients.py`
- `ai-worker/app/runtime.py`
- `ai-worker/app/main.py`
- `ai-worker/app/api/health.py`
- `ai-worker/app/domain/worker_message.py`
- `ai-worker/app/workers/sqs_worker.py`
- `ai-worker/.env.example`

> **현재 운영 기준**
>
> Backend가 발행하는 분석 작업과 AI Worker의 처리 대상은 `imageId`로 식별되는 RGB 또는 열화상 이미지 한 건이다.
>
> 코드에 과거 계약과의 호환을 위한 Pair 관련 필드가 일부 남아 있더라도 현재 운영 기능으로 사용하지 않는다.

## 4. 전체 책임 경계

### 4.1 Frontend

- Backend Public API만 호출한다.
- AI Worker, SQS, S3/MinIO, RDS/PostgreSQL에 직접 접근하지 않는다.

### 4.2 Backend

- 이미지 단건 분석 Job 생성
- Job 상태 관리
- SQS 메시지 발행
- 이미지 메타데이터 관리
- 이미지 유형에 따른 입력 유형과 모델 유형 결정
- 결과 조회 API 제공

### 4.3 Queue

- local: LocalStack SQS
- prod: AWS SQS
- AI Worker에 이미지 단건 분석에 필요한 최소 메시지만 전달한다.

### 4.4 AI Worker

- SQS 메시지 수신
- 메시지 검증
- DB 조회
- Storage 원본 이미지 조회
- RGB-only 또는 Thermal-only 모델 선택 및 추론
- 결과 이미지 저장
- 결과 또는 실패 상태 반영

### 4.5 Storage

- local: MinIO
- prod: AWS S3
- 원본 RGB/THERMAL 이미지와 생성된 결과 시각화 산출물을 저장한다.

### 4.6 Database

- local: PostgreSQL Docker
- prod: AWS RDS PostgreSQL
- 이미지 메타데이터, 분석 Job, 분석 결과 메타데이터를 저장한다.
- 현재 운영 DB 계약에서는 이미지 Pair 정보를 사용하지 않는다.

## 5. 환경별 구성 기준

| 항목 | local | prod |
| --- | --- | --- |
| Backend | Spring Boot local profile | K3s Backend Pod |
| AI Worker | FastAPI local worker 또는 Docker | K3s AI Worker Pod |
| Queue | LocalStack SQS | AWS SQS |
| Storage | MinIO | AWS S3 |
| DB | PostgreSQL Docker | AWS RDS PostgreSQL |
| Log | Console Log | CloudWatch Logs |
| Secret | `.env.local` 또는 local profile | Kubernetes Secret 또는 AWS Secrets Manager |

### 5.1 환경 선택 계약

- 공식 환경 선택 키는 `APP_ENV`다.
- 허용값은 `local`, `prod`다.
- `ENVIRONMENT`는 호환 alias다.
- local/prod에 따른 S3/SQS client 조립은 `runtime` 계층에서 처리한다.
- Adapter는 환경을 직접 판단하지 않는다.

### 5.2 환경변수 기준 문서

- 환경변수 상세 표, ConfigMap/Secret/IAM 분류, Docker/Jenkins/K3s 주입 기준은 `docs/17_environment-variable-secret-contract.md`를 최신 기준으로 사용한다.
- 이 문서에서는 AI Worker가 실제로 의존하는 키만 요약한다.

### 5.3 현재 구현 기준 환경변수 요약

현재 사용 중인 canonical 키:

- `APP_ENV`
- `DATABASE_URI`
- `AWS_REGION`
- `STORAGE_DEFAULT_BUCKET`
- `STORAGE_ENDPOINT_URL`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_REGION`
- `STORAGE_PATH_STYLE_ENABLED`
- `SQS_QUEUE_URL`
- `SQS_ENDPOINT_URL`
- `SQS_ACCESS_KEY`
- `SQS_SECRET_KEY`
- `SQS_WAIT_TIME_SECONDS`
- `SQS_VISIBILITY_TIMEOUT_SECONDS`
- `RGB_MODEL_MANIFEST_PATH`
- `THERMAL_MODEL_MANIFEST_PATH`

현재 허용하는 alias:

- `ENVIRONMENT`
- `DATABASE_URL`
- `S3_BUCKET_NAME`
- `SQS_ENDPOINT`
- `STORAGE_ENDPOINT`
- `S3_ENDPOINT`

## 6. 핵심 상태값

### 6.1 inputType

| 값 | 의미 | 식별자 |
| --- | --- | --- |
| `RGB_SINGLE` | RGB 이미지 단건 분석 | `imageId` |
| `THERMAL_SINGLE` | 열화상 이미지 단건 분석 | `imageId` |

현재 운영 계약에서는 `RGB_THERMAL_PAIR` 입력 유형을 사용하지 않는다.

### 6.2 requestedModelType

현재 운영 메시지 계약에서 사용하는 값:

- `RGB_ONLY`
- `THERMAL_ONLY`
- `AUTO`

| 값 | 의미 |
| --- | --- |
| `RGB_ONLY` | RGB 단건 분석 모델 요청 |
| `THERMAL_ONLY` | Thermal 단건 분석 모델 요청 |
| `AUTO` | 이미지 유형 또는 inputType에 따라 단건 모델 자동 선택 |

현재 운영 계약에서는 `FUSION`, `FUSION_AUTO`를 사용하지 않는다.

`AUTO`를 사용하는 경우에도 최종 실행 모델은 `RGB_ONLY` 또는 `THERMAL_ONLY` 중 하나여야 한다.

### 6.3 jobStatus

| 값 | 의미 | 주체 |
| --- | --- | --- |
| `QUEUED` | 등록 완료, 대기 | Backend |
| `RUNNING` | Worker 처리 중 | AI Worker |
| `SUCCEEDED` | 분석 성공 | AI Worker 또는 내부 결과 반영 계층 |
| `FAILED` | 분석 실패 | AI Worker 또는 내부 결과 반영 계층 |

## 7. Backend → SQS Message Contract

### 7.1 기본 원칙

- Backend는 DB에 분석 Job을 먼저 생성한 뒤 SQS 메시지를 발행한다.
- 분석 Job은 `imageId`로 식별되는 이미지 한 건을 대상으로 생성한다.
- 메시지에는 Worker 처리에 필요한 최소 필드만 넣는다.
- `plantId`, `zoneId`, `inspectionId`, object key, Secret, presigned URL은 메시지에 넣지 않는다.
- AI Worker는 `jobId`, `imageId`를 기준으로 DB를 다시 조회한다.
- Backend는 대상 이미지의 `imageType`에 따라 `inputType`과 `requestedModelType`을 결정한다.
- Pair 식별자와 Fusion 모델 요청값은 현재 운영 메시지에 포함하지 않는다.

### 7.2 RGB 단건 메시지 스키마

```json
{
  "jobId": 1000,
  "inputType": "RGB_SINGLE",
  "imageId": 100,
  "requestedModelType": "RGB_ONLY",
  "requestedByUserId": 1,
  "traceId": "req-20260601-0001",
  "createdAt": "2026-06-01T10:00:00+09:00"
}
```

### 7.3 Thermal 단건 메시지 스키마

```json
{
  "jobId": 1001,
  "inputType": "THERMAL_SINGLE",
  "imageId": 101,
  "requestedModelType": "THERMAL_ONLY",
  "requestedByUserId": 1,
  "traceId": "req-20260601-0002",
  "createdAt": "2026-06-01T10:01:00+09:00"
}
```

### 7.4 필드 규칙

| 필드 | 필수 | 규칙 |
| --- | ---: | --- |
| `jobId` | Y | 양수인 분석 Job ID |
| `inputType` | Y | `RGB_SINGLE` 또는 `THERMAL_SINGLE` |
| `imageId` | Y | 양수인 이미지 ID |
| `requestedModelType` | Y | `RGB_ONLY`, `THERMAL_ONLY`, `AUTO` 중 하나 |
| `requestedByUserId` | Y | 분석을 요청한 사용자 ID |
| `traceId` | Y | 비어 있지 않은 요청 추적 ID |
| `createdAt` | Y | 메시지 생성 시각 |

추가 검증 기준:

- `inputType=RGB_SINGLE`이면 대상 이미지의 `imageType`은 `RGB`여야 한다.
- `inputType=THERMAL_SINGLE`이면 대상 이미지의 `imageType`은 `THERMAL`이어야 한다.
- `requestedModelType=AUTO`인 경우 Worker는 `inputType` 또는 조회한 이미지 유형을 기준으로 단건 모델을 선택한다.
- `imageId`가 없거나 유효하지 않으면 메시지 검증에 실패한다.
- 현재 운영 메시지에는 `imagePairId`를 포함하지 않는다.

## 8. AI Worker 처리 흐름

```text
SQS 메시지 수신
→ 메시지 파싱 및 검증
→ jobId 기준 Job 조회
→ Job과 메시지의 imageId 정합성 확인
→ RUNNING 상태 반영
→ imageId 기준 이미지 메타데이터 조회
→ Storage에서 원본 이미지 한 건 로드
→ inputType 기준 RGB_ONLY 또는 THERMAL_ONLY 모델 선택
→ ONNX Runtime 추론
→ 모델 출력 후처리
→ 생성 가능한 결과 시각화 생성
→ 결과 이미지 Storage 저장
→ 결과 메타데이터 저장 또는 내부 반영
→ SUCCEEDED 또는 FAILED 상태 반영
→ 성공 또는 처리 불필요 상태 확인 후 SQS 메시지 삭제
```

현재 구현 근거:

- 메시지 파싱: `ai-worker/app/workers/sqs_worker.py`
- 메시지 도메인 모델: `ai-worker/app/domain/worker_message.py`
- 런타임 조립: `ai-worker/app/runtime.py`
- client 조립: `ai-worker/app/runtime_clients.py`

처리 원칙:

- RGB 이미지와 열화상 이미지는 서로 독립적으로 처리한다.
- 같은 점검에 RGB 이미지와 열화상 이미지가 모두 있어도 각각 별도의 Job과 SQS 메시지를 사용한다.
- 한 이미지의 분석 실패는 다른 이미지의 분석 상태에 영향을 주지 않는다.
- Pair 생성 여부를 조회하거나 기다리지 않는다.

## 9. 모델 라우팅 계약

| inputType | 이미지 유형 | 실행 modelType | Manifest |
| --- | --- | --- | --- |
| `RGB_SINGLE` | `RGB` | `RGB_ONLY` | `RGB_MODEL_MANIFEST_PATH` |
| `THERMAL_SINGLE` | `THERMAL` | `THERMAL_ONLY` | `THERMAL_MODEL_MANIFEST_PATH` |

라우팅 기준:

- `RGB_SINGLE`은 RGB-only 모델로만 처리한다.
- `THERMAL_SINGLE`은 Thermal-only 모델로만 처리한다.
- 메시지의 `inputType`과 DB 이미지의 `imageType`이 일치하지 않으면 분석을 진행하지 않는다.
- `AUTO`는 Fusion 자동 선택을 의미하지 않는다.
- `AUTO`는 RGB 또는 Thermal 단건 모델 중 하나를 선택하는 내부 라우팅 값이다.
- Pair 입력과 Fusion 모델 라우팅은 현재 운영 계약에서 지원하지 않는다.

## 10. DB 조회 계약

### 10.1 단건 분석

Worker는 `imageId` 기준으로 이미지 메타데이터를 조회한다.

주요 조회 정보:

- `imageId`
- `inspectionId`
- `equipmentId`
- `targetType`
- `imageType`
- `bucketName`
- `objectKey`
- `status`

조회 기준:

- 이미지가 존재해야 한다.
- 이미지 상태가 분석 가능한 상태여야 한다.
- `bucketName`, `objectKey`가 유효해야 한다.
- 이미지의 `imageType`이 메시지의 `inputType`과 일치해야 한다.
- 점검, 구역, 발전소 정보가 필요하면 `inspectionId` 관계를 통해 조회한다.
- 분석 Job은 `imageId`를 참조하며 `inspectionId`를 직접 저장하지 않는다.

### 10.2 분석 Job 조회

Worker는 `jobId` 기준으로 분석 Job을 조회한다.

주요 확인 정보:

- `jobId`
- `imageId`
- `inputType`
- `requestedModelType`
- `modelType`
- `jobStatus`

검증 기준:

- 메시지의 `jobId`와 조회된 Job이 일치해야 한다.
- 메시지의 `imageId`와 Job의 `imageId`가 일치해야 한다.
- 이미 `SUCCEEDED` 상태인 Job은 중복 추론하지 않는다.
- 이미 다른 Worker가 정상 처리 중인 `RUNNING` Job은 중복 실행을 방지해야 한다.

### 10.3 금지 사항

- 이미지 바이너리를 DB에 직접 저장하지 않는다.
- 메시지에 object key 전체를 중복 전달하지 않는다.
- `plantId`, `zoneId`, `inspectionId`를 분석 대상 식별자로 사용하지 않는다.
- `imagePairId`를 현재 운영 분석 대상 식별자로 사용하지 않는다.
- Pair 메타데이터를 조회해 단건 분석 모델을 선택하지 않는다.

## 11. Storage 계약

### 11.1 원본 이미지 조회

- local: MinIO
- prod: AWS S3
- Worker는 DB에서 조회한 `bucketName`, `objectKey`로 원본 이미지 한 건을 읽는다.
- 메시지에 포함된 외부 URL이나 임의 object key를 신뢰하지 않는다.
- 이미지 객체를 찾을 수 없으면 분석 Job을 실패 처리한다.

### 11.2 결과 이미지 저장

저장 대상 예시:

- bbox image
- heatmap image
- mask image

결과 생성 기준:

- bbox는 모델 탐지 결과와 시각화 구현이 지원되는 경우 생성한다.
- heatmap은 해당 모델 출력 또는 후처리에서 생성되는 경우에만 저장한다.
- mask는 해당 모델 출력에서 생성되는 경우에만 저장한다.
- 생성되지 않은 시각화 항목은 `null`로 처리할 수 있다.
- 모든 분석에서 bbox, heatmap, mask가 동시에 생성된다고 가정하지 않는다.

### 11.3 object key 규칙

[확인 필요]

`jobId` 기준 저장과 `resultId` 기준 저장 중 최종 운영 규칙은 별도 확정이 필요하다.

공통 원칙:

- 원본 이미지와 결과 이미지의 object key 영역을 구분한다.
- 동일 Job 재처리 시 기존 결과 덮어쓰기 여부를 명확히 정의한다.
- 사용자 입력 파일명을 object key 전체로 직접 사용하지 않는다.
- object key에 Secret 또는 개인정보를 포함하지 않는다.

## 12. AI Worker 성공 결과 계약

성공 시 결과에는 다음 계열 정보가 포함된다.

- `jobId`
- `jobStatus=SUCCEEDED`
- 실행된 단건 모델 정보
- 결과 상태
- anomaly 수치
- severity, priority, action candidate
- 생성된 시각화 object key 또는 file URL
- detection 목록
- 분석 완료 시각

성공 결과 예시:

```json
{
  "jobId": 1001,
  "jobStatus": "SUCCEEDED",
  "result": {
    "imageId": 101,
    "inputType": "THERMAL_SINGLE",
    "modelType": "THERMAL_ONLY",
    "modelName": "thermal-yolo26s",
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
      "bboxObjectKey": "analysis-jobs/1001/bbox.png",
      "bboxFileUrl": null,
      "heatmapBucketName": null,
      "heatmapObjectKey": null,
      "heatmapFileUrl": null,
      "maskBucketName": null,
      "maskObjectKey": null,
      "maskFileUrl": null
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

결과 기준:

- `inputType`은 `RGB_SINGLE` 또는 `THERMAL_SINGLE`이다.
- `modelType`은 `RGB_ONLY` 또는 `THERMAL_ONLY`이다.
- `defectSource`는 `RGB` 또는 `THERMAL`이다.
- RGB 결과는 모델 manifest 기준 원본 클래스 `broken`, `bitki`, `dusty`, `missing`, `shading`를 `model_class_id`, `model_class_name` 의미로 보존한다.
- RGB 결과의 BBox 라벨은 정책 분류명이 아니라 원본 클래스명(`modelClassName`)을 표시한다.
- `modelClassId`, `modelClassName`은 과거 결과 또는 Thermal 결과에서는 `null`일 수 있다.
- 결과는 분석 대상 `imageId` 한 건에 대응한다.
- Pair 또는 Fusion 결과를 포함하지 않는다.
- 시각화 정보는 실제 생성된 항목만 값을 가진다.
- `bboxX`, `bboxY`, `bboxWidth`, `bboxHeight`는 원본 이미지 픽셀 좌표 기준이다.
- `bboxWidth`, `bboxHeight`는 길이이며 `x2 = bboxX + bboxWidth`, `y2 = bboxY + bboxHeight`로 해석한다. `x2`, `y2`는 포함 좌표가 아니라 상한 배타(exclusive upper bound)이다.
- `RGB_ONLY` 세그멘테이션 결과의 bbox는 최종 복원 이진 Mask의 활성 픽셀 범위로 다시 계산한 값을 저장하고 시각화에 사용한다.
- RGB Mask 시각화는 fill alpha를 높여 가시성을 보정하며 contour는 기존 4px를 유지한다.
- Thermal 결과의 bbox, heatmap, mask 동작은 기존 계약을 유지한다.

## 13. AI Worker 실패 결과 계약

실패 시 결과에는 다음 계열 정보가 포함된다.

- `jobId`
- `jobStatus=FAILED`
- `failureCode`
- `failureMessage`
- 내부 상세 오류 정보
- 실패 시각

실패 결과 예시:

```json
{
  "jobId": 1001,
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

현재 운영의 대표 실패 코드는 다음 범주를 따른다.

- `INVALID_WORKER_MESSAGE`
- `JOB_NOT_FOUND`
- `IMAGE_METADATA_NOT_FOUND`
- `IMAGE_OBJECT_NOT_FOUND`
- `UNSUPPORTED_IMAGE_TYPE`
- `STORAGE_READ_FAILED`
- `MODEL_NOT_FOUND`
- `MODEL_LOAD_FAILED`
- `PREPROCESS_FAILED`
- `AI_INFERENCE_FAILED`
- `POSTPROCESS_FAILED`
- `VISUALIZATION_FAILED`
- `STORAGE_WRITE_FAILED`
- `RESULT_SAVE_FAILED`
- `UNKNOWN_WORKER_ERROR`

현재 운영 계약에서는 Pair 메타데이터를 조회하지 않으므로 `PAIR_METADATA_NOT_FOUND`를 사용하지 않는다.

실패 처리 기준:

- 분석 Job 상태를 `FAILED`로 변경한다.
- 사용자에게 노출할 실패 메시지와 내부 진단용 상세 메시지를 구분한다.
- 로그에는 `jobId`, `imageId`, `traceId`, `failureCode`를 포함한다.
- Secret, DB 접속 정보, AWS credential, 전체 Stack Trace를 사용자 응답에 노출하지 않는다.

## 14. 결과 저장 방식

현재 문서상 두 가지 방식을 구분한다.

- 현재 코드 기준 운영 저장 방식은 `DB_DIRECT`이다.
- `BACKEND_CALLBACK`은 Backend 코드에 존재하는 입력 계약 참고 경로이며, 현재 AI Worker 런타임 저장 경로는 아니다.

### 14.1 DB_DIRECT

AI Worker가 분석 결과와 결함 후보를 DB에 직접 저장한다.
현재 코드 기준 AI Worker 런타임은 `PostgresResultRepository`를 사용해 `ANALYSIS_RESULTS`, `DETECTED_DEFECTS`, `ANALYSIS_JOBS` 반영을 직접 수행한다.

공통 처리:

- `ANALYSIS_RESULTS` 저장
- `DETECTED_DEFECTS` 저장
- RGB 결과의 경우 `DETECTED_DEFECTS.model_class_id`, `DETECTED_DEFECTS.model_class_name` 저장
- `ANALYSIS_JOBS` 상태 변경
- 결과 이미지 Storage 저장

### 14.2 BACKEND_CALLBACK

Backend 코드에는 결과 메타데이터 입력 계약이 존재하며, 이 경로를 사용할 경우 Backend Internal API 또는 내부 처리 계약으로 결과를 전달한다.

공통 처리:

- Backend가 `ANALYSIS_RESULTS` 저장
- Backend가 `DETECTED_DEFECTS` 저장
- RGB 결과의 경우 Backend가 `DETECTED_DEFECTS.model_class_id`, `DETECTED_DEFECTS.model_class_name` 저장
- Backend가 `ANALYSIS_JOBS` 상태 변경
- AI Worker가 결과 이미지 Storage 저장

주의:

- Backend의 `SaveAnalysisResultRequest`, `SaveDetectedDefectRequest` 입력 계약은 실제로 존재한다.
- 다만 현재 코드 기준 AI Worker 런타임은 이 경로로 저장하지 않고 `DB_DIRECT`를 사용한다.

다만 공통 원칙은 동일하다.

- Frontend는 어떤 경우에도 AI Worker에 직접 접근하지 않는다.
- AI Worker는 내부 계약으로만 결과를 반영한다.
- 결과는 `jobId`와 `imageId` 기준으로 반영한다.
- RGB 원본 클래스 보존은 `broken`, `bitki`, `dusty`, `missing`, `shading` 기준이며 정책 분류(`defectType`)와 별도로 유지한다.
- Thermal 처리와 시각화는 기존 동작을 유지한다.
- Pair 또는 Fusion 결과 저장 흐름은 현재 운영 계약에 포함하지 않는다.

## 15. SQS 운영 계약

- 메시지는 결과 반영과 상태 갱신이 끝난 뒤 삭제한다.
- 중복 수신을 가정하고 `jobId` 기준 idempotency를 고려한다.
- 동일 `jobId`의 결과가 이미 정상 반영된 경우 중복 추론과 중복 결과 생성을 방지한다.
- visibility timeout은 최대 추론 시간보다 길게 잡아야 한다.
- 메시지 처리 중 예외가 발생한 경우 무조건 삭제하지 않는다.
- 재처리 가능 오류와 영구 실패 오류를 구분한다.
- DLQ는 운영 확장 항목이지만 현재 코드 필수 환경변수는 아니다.
- Pair 또는 Fusion 작업 전용 Queue는 현재 운영 범위에서 사용하지 않는다.

## 16. 운영 보안 계약

- AI Worker는 외부 공개 대상이 아니다.
- Ingress에서 AI Worker 경로를 외부에 노출하지 않는다.
- Frontend가 AI Worker의 내부 Health Check 또는 처리 API를 직접 호출하지 않는다.
- Secret은 코드, 문서, 로그에 직접 기록하지 않는다.
- prod AWS 접근은 IAM Role 또는 기본 credential chain을 우선한다.
- Storage object key와 DB 조회 결과는 메시지의 사용자 입력값만으로 결정하지 않는다.
- Worker는 DB에서 분석 대상 메타데이터를 다시 조회하고 검증한다.
- Presigned URL 또는 내부 Storage URL을 SQS 메시지에 포함하지 않는다.
- 실패 로그에 AWS Access Key, Secret Key, DB 비밀번호를 출력하지 않는다.

## 17. 운영 관측성 계약

권장 로그 필드:

- `jobId`
- `imageId`
- `traceId`
- `inputType`
- `modelType`
- `event`
- `durationMs`
- `errorCode`

권장 이벤트:

- `message_received`
- `message_invalid`
- `job_started`
- `image_metadata_loaded`
- `image_loaded`
- `model_selected`
- `model_loaded`
- `inference_succeeded`
- `inference_failed`
- `visualization_saved`
- `result_saved`
- `job_succeeded`
- `job_failed`
- `message_deleted`

관측성 기준:

- Pair 또는 Fusion 관련 식별자를 운영 필수 로그 필드로 사용하지 않는다.
- 모델 선택 결과는 `RGB_ONLY` 또는 `THERMAL_ONLY`로 기록한다.
- 처리 시간은 이미지 한 건 기준으로 측정한다.
- 사용자 요청 추적은 `traceId`를 기준으로 Backend 로그와 연결한다.

## 18. Health Check 계약

### 18.1 Backend Health Check

- 공개 Health 응답에는 내부 세부 정보 노출을 최소화한다.
- DB, Queue, Storage의 상세 접속 오류를 공개 응답에 포함하지 않는다.

### 18.2 AI Worker Health Check

현재 구현 기준 엔드포인트:

- `/health`
- `/internal/health`

운영 기준:

- liveness: `/health` 응답 확인
- readiness: `/internal/health`와 Worker runtime 상태 확인

내부 Health Check 확인 후보:

- 설정값 로딩 여부
- Worker runtime 초기화 여부
- Queue client 초기화 여부
- Storage client 초기화 여부
- DB 연결 가능 여부
- RGB model manifest 접근 가능 여부
- Thermal model manifest 접근 가능 여부

주의:

- `/internal/health`는 외부 사용자에게 노출하지 않는다.
- 모델 파일 경로, DB 주소, Queue URL, Secret 값은 응답에 직접 포함하지 않는다.

## 19. 모델 파일 운영 계약

### 19.1 기본 기준

- 대용량 모델 파일은 Docker 이미지에 직접 포함하지 않는다.
- 운영에서는 S3 또는 별도 모델 저장소에서 Worker 기동 시 로드한다.
- 모델 다운로드 또는 manifest 로딩에 실패하면 Worker 준비 상태 실패로 처리한다.
- RGB-only 모델과 Thermal-only 모델을 독립적으로 관리한다.
- 현재 운영 Worker는 Fusion 모델 파일을 요구하지 않는다.

### 19.2 현재 구현 기준

현재 설정 계층이 직접 참조하는 모델 관련 환경변수는 다음 두 개다.

- `RGB_MODEL_MANIFEST_PATH`
- `THERMAL_MODEL_MANIFEST_PATH`

현재 미사용 또는 과거 설계 키:

- `MODEL_DIR`
- `RGB_MODEL_PATH`
- `THERMAL_MODEL_PATH`
- `FUSION_MODEL_PATH`
- `MODEL_VERSION`
- `MODEL_FORMAT`
- `RUNTIME`
- `INPUT_SIZE`
- `CONFIDENCE_THRESHOLD`
- `NMS_IOU_THRESHOLD`

이 값들은 현재 배포 필수 환경변수로 취급하지 않는다.

특히 `FUSION_MODEL_PATH`는 과거 또는 후속 연구 설계 키이며 현재 운영 AI Worker의 필수 설정값이 아니다.

### 19.3 모델 Manifest 기준

RGB 모델 Manifest는 RGB 단건 분석 모델을 설명한다.

Thermal 모델 Manifest는 열화상 단건 분석 모델을 설명한다.

Manifest에서 관리할 수 있는 정보 예시:

- 모델 파일 위치
- 모델명
- 모델 버전
- 모델 형식
- Runtime
- 입력 크기
- confidence threshold
- NMS IoU threshold
- class 목록
- 출력 타입

[확인 필요]

Manifest의 필수 필드와 JSON/YAML 형식은 실제 구현 코드와 모델 배포 방식에 맞춰 별도 확정한다.

## 20. 환경 변수 계약

### 20.1 최신 기준 문서

- AI Worker 환경변수 상세 기준은 `docs/17_environment-variable-secret-contract.md`를 단일 최신 기준으로 삼는다.
- 이 장은 기능 계약 관점의 요약만 제공한다.

### 20.2 현재 구현 기준 canonical 키

- 환경 선택: `APP_ENV`
- DB: `DATABASE_URI`
- Storage: `AWS_REGION`, `STORAGE_DEFAULT_BUCKET`, `STORAGE_ENDPOINT_URL`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_REGION`, `STORAGE_PATH_STYLE_ENABLED`
- Queue: `SQS_QUEUE_URL`, `SQS_ENDPOINT_URL`, `SQS_ACCESS_KEY`, `SQS_SECRET_KEY`, `SQS_WAIT_TIME_SECONDS`, `SQS_VISIBILITY_TIMEOUT_SECONDS`
- Model: `RGB_MODEL_MANIFEST_PATH`, `THERMAL_MODEL_MANIFEST_PATH`

### 20.3 현재 구현 기준 alias

- `ENVIRONMENT`
- `DATABASE_URL`
- `S3_BUCKET_NAME`
- `SQS_ENDPOINT`
- `STORAGE_ENDPOINT`
- `S3_ENDPOINT`

### 20.4 local / prod 적용 기준

local:

- PostgreSQL Docker
- MinIO
- LocalStack SQS
- endpoint override 사용
- local credential 사용

prod:

- AWS RDS PostgreSQL
- AWS S3
- AWS SQS
- endpoint override 없음
- static AWS credential 필수 아님
- IAM Role 또는 기본 credential chain 사용

### 20.5 deprecated 또는 현재 미사용 키

| 키 | 상태 | 정리 기준 |
| --- | --- | --- |
| `DB_HOST` | deprecated | `DATABASE_URI`로 통합 |
| `DB_PORT` | deprecated | `DATABASE_URI`로 통합 |
| `DB_NAME` | deprecated | `DATABASE_URI`로 통합 |
| `DB_USER` | deprecated | `DATABASE_URI`로 통합 |
| `DB_PASSWORD` | deprecated | `DATABASE_URI`로 통합 |
| `S3_ORIGINAL_BUCKET` | deprecated | `STORAGE_DEFAULT_BUCKET`으로 통합 |
| `S3_RESULT_BUCKET` | deprecated | 현재 코드 기준 별도 bucket 계약 없음 |
| `SQS_DLQ_URL` | 현재 미사용 | 향후 확장 후보, 배포 필수값 아님 |
| `AWS_ENDPOINT_URL` | deprecated | Storage/SQS endpoint 분리 계약으로 대체 |
| `LOG_LEVEL` | 현재 미사용 | `Settings` 필드 없음 |
| `MODEL_DIR` | 현재 미사용 | 배포 구현 단계에서 별도 결정 필요 |
| `FUSION_MODEL_PATH` | 현재 미사용 | 후속 연구용 과거 설계 키이며 현재 운영 배포 필수값 아님 |
| `WORKER_CONCURRENCY` | 현재 미사용 | 현재는 `workerMaxMessages`, `workerPollIntervalSeconds`만 존재 |

## 21. Backend 계약 작업과의 관계

이 문서는 Backend의 구체적 Java 인터페이스명, DTO 이름, DB 컬럼을 새로 확정하지 않는다.

대신 Backend 작업에서 다음 기준을 참조한다.

- SQS 메시지의 `jobId`, `imageId`, `inputType`, `requestedModelType`
- 이미지 유형 기반 단건 모델 라우팅
- Job 상태 전이
- 결과 반영 구조
- AI Worker 내부 비공개 원칙
- local/prod 인프라 차이

Backend 분석 요청 계약:

- Public API는 분석 대상 `imageId`를 받는다.
- Backend는 `imageId`로 이미지 메타데이터를 조회한다.
- RGB 이미지는 `RGB_SINGLE`, `RGB_ONLY`로 작업을 생성한다.
- 열화상 이미지는 `THERMAL_SINGLE`, `THERMAL_ONLY`로 작업을 생성한다.
- Backend는 Pair 또는 Fusion 분석 작업을 생성하지 않는다.
- 동일 이미지에 대한 재요청은 새로운 `jobId`를 가진 별도 분석 Job으로 생성할 수 있다.

## 22. 테스트 및 검증 기준

문서 및 구현 기준 점검 항목:

- 메시지 스키마가 현재 Worker 파싱 규칙과 맞는지
- 분석 메시지에 `imageId`가 필수로 포함되는지
- `RGB_SINGLE`이 `RGB_ONLY`로 라우팅되는지
- `THERMAL_SINGLE`이 `THERMAL_ONLY`로 라우팅되는지
- 메시지의 `inputType`과 DB 이미지의 `imageType`이 일치하는지
- Pair 식별자 없이 단건 분석이 처리되는지
- Fusion 모델 설정 없이 Worker가 정상 기동하는지
- AI Worker가 공개 API가 아님을 명시했는지
- local/prod 구조가 현재 구현과 맞는지
- 환경변수 상세 기준을 17번 문서로 단일화했는지
- 과거 키가 현재 필수값처럼 남아 있지 않은지
- 성공 처리 후에만 SQS 메시지가 삭제되는지
- 실패 시 `FAILED`, `failureCode`, `failureMessage`가 반영되는지
- 중복 메시지 수신 시 동일 Job 결과가 중복 저장되지 않는지
- Heatmap과 Mask가 생성되지 않은 경우 `null`로 처리 가능한지

## 23. 남은 확인 필요 항목

| 항목 | 상태 | 이유 |
| --- | --- | --- |
| 결과 저장 방식 | DB_DIRECT | 현재 코드 기준 AI Worker 런타임은 `PostgresResultRepository`를 통해 DB에 직접 저장한다. `BACKEND_CALLBACK`은 Backend 입력 계약 참고 경로이다. |
| 실제 enum 정리 | 확인 필요 | Backend와 Worker의 단건 enum 및 과거 호환 필드 정리 범위 확인 필요 |
| object key 최종 규칙 | 확인 필요 | `jobId` 기준 또는 `resultId` 기준 선택 필요 |
| 모델 Manifest 형식 | 확인 필요 | 필수 필드와 JSON/YAML 구조 확정 필요 |
| Worker 동시 처리 수 | 확인 필요 | 운영 리소스와 CPU 추론 시간 기준 조정 필요 |
| Visibility Timeout | 확인 필요 | RGB/Thermal 최대 추론 시간 측정 후 확정 필요 |
| DLQ 운영 정책 | 향후 확장 후보 | 현재 코드 필수 환경변수 아님 |
| Heatmap 생성 기준 | 확인 필요 | Thermal 또는 RGB 모델에서 실제 생성 가능한 조건 확인 필요 |
| Mask 생성 기준 | 확인 필요 | RGB segmentation 결과가 존재할 때의 저장 및 응답 기준 확인 필요 |

## 24. 요약

- Frontend는 Backend만 호출한다.
- Backend는 `imageId` 기준 이미지 단건 분석 Job을 만들고 SQS에 최소 메시지를 넣는다.
- RGB 이미지는 `RGB_SINGLE`, `RGB_ONLY`로 처리한다.
- 열화상 이미지는 `THERMAL_SINGLE`, `THERMAL_ONLY`로 처리한다.
- AI Worker는 메시지를 그대로 신뢰하지 않고 DB와 Storage에서 이미지 메타데이터와 원본 파일을 다시 조회한다.
- 같은 점검의 RGB 이미지와 열화상 이미지는 각각 별도의 Job으로 분석한다.
- Pair 생성·관리와 Fusion 분석은 현재 운영 AI Worker 계약에 포함하지 않는다.
- local은 PostgreSQL Docker, MinIO, LocalStack SQS를 사용한다.
- prod는 RDS, S3, SQS를 사용하며 static AWS credential을 기본 계약으로 요구하지 않는다.
- 환경변수 상세 기준은 `docs/17_environment-variable-secret-contract.md`를 최신 기준으로 사용한다.
- 운영 모델 Manifest는 `RGB_MODEL_MANIFEST_PATH`, `THERMAL_MODEL_MANIFEST_PATH`를 기준으로 관리한다.
- 결과 저장 방식, object key 규칙, Worker 동시 처리 수와 Visibility Timeout은 별도 확정이 필요하다.
