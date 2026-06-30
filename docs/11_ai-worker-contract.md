# AI Worker Contract

## 1. 문서 목적

이 문서는 Backend, SQS, AI Worker, Storage, DB 사이의 AI Worker 기능 계약을 정리한다.

- AI Worker는 사용자용 공개 API가 아니다.
- Frontend는 AI Worker에 직접 접근하지 않는다.
- 환경변수 상세 표의 최신 기준은 `docs/17_environment-variable-secret-contract.md`를 따른다.
- 이 문서는 AI Worker의 기능 계약, 메시지 계약, 상태 전이, local/prod 구조를 설명한다.

## 2. 적용 범위

포함:

- Backend에서 발행하는 SQS 메시지 계약
- AI Worker 메시지 파싱과 처리 흐름
- Storage, Queue, DB 사용 경계
- 모델 manifest 기반 실행 계약
- local/prod 실행 구조
- Health check, 운영 보안, 관측성 기준

제외:

- Frontend 공개 API 명세
- Backend Java 클래스명, Port/UseCase 이름 확정
- DB schema 변경
- Dockerfile, Jenkins, K3s manifest 구현
- 실제 AWS/K3s 운영값 주입

## 3. 기준 문서와 코드

최신 기준 문서:

- `docs/17_environment-variable-secret-contract.md`
- `docs/12_cloud-deployment-operations-design.md`
- `docs/08_system-architecture.md`

현재 구현 기준 코드:

- `ai-worker/app/config/settings.py`
- `ai-worker/app/runtime_clients.py`
- `ai-worker/app/runtime.py`
- `ai-worker/app/main.py`
- `ai-worker/app/api/health.py`
- `ai-worker/app/domain/worker_message.py`
- `ai-worker/app/workers/sqs_worker.py`
- `ai-worker/.env.example`

## 4. 전체 책임 경계

### 4.1 Frontend

- Backend public API만 호출한다.
- AI Worker, SQS, S3/MinIO, RDS/PostgreSQL에 직접 접근하지 않는다.

### 4.2 Backend

- 분석 Job 생성
- Job 상태 관리
- SQS 메시지 발행
- 이미지/Pair 메타데이터 관리
- 결과 조회 API 제공

### 4.3 Queue

- local: LocalStack SQS
- prod: AWS SQS
- AI Worker에 최소 메시지만 전달한다.

### 4.4 AI Worker

- SQS 메시지 수신
- 메시지 검증
- DB 조회
- Storage 원본 이미지 조회
- 모델 선택 및 추론
- 결과 이미지 저장
- 결과/실패 상태 반영

### 4.5 Storage

- local: MinIO
- prod: AWS S3
- 원본 RGB/THERMAL 이미지와 결과 시각화 산출물 저장

### 4.6 Database

- local: PostgreSQL Docker
- prod: AWS RDS PostgreSQL
- 이미지 메타데이터, Pair, Job, 결과 메타데이터 저장

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
| `RGB_SINGLE` | RGB 단건 분석 | `imageId` |
| `THERMAL_SINGLE` | Thermal 단건 분석 | `imageId` |
| `RGB_THERMAL_PAIR` | RGB-Thermal Pair 분석 | `imagePairId` |

### 6.2 requestedModelType

현재 메시지 계약 기준 예시:

- `RGB_ONLY`
- `THERMAL_ONLY`
- `FUSION`
- `FUSION_AUTO`
- `AUTO`

[확인 필요]
실제 enum 세부값은 Backend와 AI Worker 공통 계약 기준으로 계속 맞춰야 한다.

### 6.3 jobStatus

| 값 | 의미 | 주체 |
| --- | --- | --- |
| `QUEUED` | 등록 완료, 대기 | Backend |
| `RUNNING` | Worker 처리 중 | AI Worker |
| `SUCCEEDED` | 분석 성공 | AI Worker 또는 내부 결과 반영 계층 |
| `FAILED` | 분석 실패 | AI Worker 또는 내부 결과 반영 계층 |

## 7. Backend -> SQS Message Contract

### 7.1 기본 원칙

- Backend는 DB에 분석 Job을 먼저 생성한 뒤 SQS 메시지를 발행한다.
- 메시지에는 최소 필드만 넣는다.
- `plantId`, `zoneId`, `inspectionId`, object key, Secret, presigned URL은 메시지에 넣지 않는다.
- AI Worker는 `jobId`, `imageId`, `imagePairId`를 기준으로 DB를 다시 조회한다.

### 7.2 메시지 스키마

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

### 7.3 필드 규칙

- 단건 분석: `imageId != null`, `imagePairId = null`
- Pair 분석: `imageId = null`, `imagePairId != null`
- `traceId`는 비어 있으면 안 된다.
- 양수 ID만 허용한다.
- 현재 구현은 `ai-worker/app/domain/worker_message.py`에서 위 규칙을 검증한다.

## 8. AI Worker 처리 흐름

```text
SQS 메시지 수신
-> 메시지 파싱/검증
-> jobId 기준 Job 조회
-> RUNNING 상태 반영
-> imageId 또는 imagePairId 기준 메타데이터 조회
-> Storage에서 원본 이미지 로드
-> inputType 기준 모델 선택
-> ONNX Runtime 추론
-> 결과 시각화 생성
-> 결과 이미지 저장
-> 결과 메타데이터 저장 또는 내부 반영
-> SUCCEEDED 또는 FAILED 반영
-> 성공/skip 시 SQS 메시지 삭제
```

현재 구현 근거:

- 메시지 파싱: `ai-worker/app/workers/sqs_worker.py`
- 런타임 조립: `ai-worker/app/runtime.py`
- client 조립: `ai-worker/app/runtime_clients.py`

## 9. 모델 라우팅 계약

| inputType | modelType |
| --- | --- |
| `RGB_SINGLE` | `RGB_ONLY` |
| `THERMAL_SINGLE` | `THERMAL_ONLY` |
| `RGB_THERMAL_PAIR` | `FUSION` |

[확인 필요]
Fusion의 실제 입력 tensor 형식, 정렬 규칙, normalization 세부는 모델 계약 문서에서 별도 확정이 필요하다.

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

### 10.2 Pair 분석

Worker는 `imagePairId` 기준으로 Pair를 조회한 뒤 `rgbImageId`, `thermalImageId`로 각 이미지 메타데이터를 다시 조회한다.

### 10.3 금지 사항

- 이미지 바이너리를 DB에 직접 저장하지 않는다.
- 메시지에 object key 전체를 중복 전달하지 않는다.

## 11. Storage 계약

### 11.1 원본 이미지 조회

- local: MinIO
- prod: AWS S3
- Worker는 메타데이터의 `bucketName`, `objectKey`로 원본 이미지를 읽는다.

### 11.2 결과 이미지 저장

저장 대상 예시:

- bbox image
- heatmap image
- mask image

### 11.3 object key 규칙

[확인 필요]
`jobId` 기준 저장과 `resultId` 기준 저장 중 최종 운영 규칙은 별도 확정이 필요하다.

## 12. AI Worker 성공 결과 계약

성공 시 결과에는 다음 계열 정보가 포함된다.

- 모델 정보
- 결과 상태
- anomaly 수치
- severity/priority/action candidate
- 시각화 object key / file url
- detection 목록

현재 문서의 성공 결과 예시 구조는 유지한다.

## 13. AI Worker 실패 결과 계약

실패 시 결과에는 다음 계열 정보가 포함된다.

- `jobId`
- `jobStatus=FAILED`
- `failureCode`
- `failureMessage`
- 내부 상세 오류 정보

현재 구현의 대표 실패 코드는 다음 범주를 따른다.

- `INVALID_WORKER_MESSAGE`
- `JOB_NOT_FOUND`
- `IMAGE_METADATA_NOT_FOUND`
- `PAIR_METADATA_NOT_FOUND`
- `IMAGE_OBJECT_NOT_FOUND`
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

## 14. 결과 저장 방식

현재 문서상 두 가지 방식을 구분한다.

- `DB_DIRECT`
- `BACKEND_CALLBACK`

[확인 필요]
현재 구현/운영 기준에서 어느 방식을 최종 채택할지는 별도 확정이 필요하다.

다만 공통 원칙은 동일하다.

- Frontend는 어떤 경우에도 AI Worker에 직접 접근하지 않는다.
- AI Worker는 내부 계약으로만 결과를 반영한다.

## 15. SQS 운영 계약

- 메시지는 결과 반영과 상태 갱신이 끝난 뒤 삭제한다.
- 중복 수신을 가정하고 `jobId` 기준 idempotency를 고려한다.
- visibility timeout은 최대 추론 시간보다 길게 잡아야 한다.
- DLQ는 운영 확장 항목이지만 현재 코드 필수 환경변수는 아니다.

## 16. 운영 보안 계약

- AI Worker는 외부 공개 대상이 아니다.
- Ingress에서 AI Worker 경로를 외부에 노출하지 않는다.
- Secret은 코드, 문서, 로그에 직접 기록하지 않는다.
- prod AWS 접근은 IAM Role 또는 기본 credential chain을 우선한다.

## 17. 운영 관측성 계약

권장 로그 필드:

- `jobId`
- `traceId`
- `inputType`
- `event`
- `durationMs`
- `errorCode`

권장 이벤트:

- `message_received`
- `message_invalid`
- `job_started`
- `image_loaded`
- `model_loaded`
- `inference_succeeded`
- `inference_failed`
- `result_saved`
- `job_succeeded`
- `job_failed`
- `message_deleted`

## 18. Health Check 계약

### 18.1 Backend Health Check

- 공개 health 응답에는 내부 세부 정보 노출을 최소화한다.

### 18.2 AI Worker Health Check

현재 구현 기준 엔드포인트:

- `/health`
- `/internal/health`

운영 기준:

- liveness: `/health` 응답 확인
- readiness: `/internal/health`와 worker runtime 상태 확인

## 19. 모델 파일 운영 계약

### 19.1 기본 기준

- 대용량 모델 파일은 Docker 이미지에 직접 포함하지 않는다.
- 운영에서는 S3 또는 별도 모델 저장소에서 Worker 기동 시 로드한다.
- 모델 다운로드 실패 시 Worker 기동 실패로 처리한다.

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
| `AWS_ENDPOINT_URL` | deprecated | storage/sqs endpoint 분리 계약으로 대체 |
| `LOG_LEVEL` | 현재 미사용 | `Settings` 필드 없음 |
| `MODEL_DIR` | 현재 미사용 | 배포 구현 단계에서 별도 결정 필요 |
| `WORKER_CONCURRENCY` | 현재 미사용 | 현재는 `workerMaxMessages`, `workerPollIntervalSeconds`만 존재 |

## 21. Backend 계약 작업과의 관계

이 문서는 Backend의 구체적 Java 인터페이스명, DTO 이름, DB 컬럼을 확정하지 않는다.

대신 Backend 작업에서 다음 기준을 참조한다.

- SQS 메시지 필드
- Job 상태 전이
- 결과 반영 구조
- 내부 비공개 원칙
- local/prod 인프라 차이

## 22. 테스트 및 검증 기준

문서 기준 점검 항목:

- 메시지 스키마가 현재 Worker 파싱 규칙과 맞는지
- AI Worker가 공개 API가 아님을 명시했는지
- local/prod 구조가 현재 구현과 맞는지
- 환경변수 상세 기준을 17번 문서로 단일화했는지
- 과거 키가 현재 필수값처럼 남아 있지 않은지

## 23. 남은 확인 필요 항목

| 항목 | 상태 | 이유 |
| --- | --- | --- |
| 결과 저장 방식 | 확인 필요 | `DB_DIRECT`와 `BACKEND_CALLBACK` 중 최종 선택 필요 |
| 실제 enum 값 | 확인 필요 | Backend와 공통 계약 정합성 유지 필요 |
| Fusion 입력 tensor 형식 | 확인 필요 | 최종 모델 선정 후 확정 필요 |
| object key 최종 규칙 | 확인 필요 | `jobId` 기준 또는 `resultId` 기준 선택 필요 |
| Worker 동시 처리 수 | 확인 필요 | 운영 리소스 기준 조정 필요 |
| Visibility Timeout | 확인 필요 | 최대 추론 시간 측정 후 확정 필요 |
| DLQ 운영 정책 | 향후 확장 후보 | 현재 코드 필수 환경변수 아님 |

## 24. 요약

- Frontend는 Backend만 호출한다.
- Backend는 분석 Job을 만들고 SQS에 최소 메시지를 넣는다.
- AI Worker는 메시지를 그대로 신뢰하지 않고 DB와 Storage를 다시 조회한다.
- local은 PostgreSQL Docker, MinIO, LocalStack SQS를 사용한다.
- prod는 RDS, S3, SQS를 사용하며 static AWS credential을 기본 계약으로 요구하지 않는다.
- 환경변수 상세 기준은 `docs/17_environment-variable-secret-contract.md`를 최신 기준으로 사용한다.
