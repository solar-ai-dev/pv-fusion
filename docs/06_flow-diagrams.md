## 1. 사용자 흐름도

### 1.1 흐름도 목적

이 문서는 RGB·열화상 기반 태양광 구역 관리 플랫폼의 사용자 흐름을 텍스트로 정리한 것이다.

나중에 기능, 화면, API, 데이터 흐름, 예외 처리, 분석 흐름을 다시 확인할 때 검색하기 쉽도록 주요 키워드를 포함한다.

사용자 흐름은 일반 사용자가 로그인한 뒤 발전소, 구역, 하위 설비, 점검, 이미지 업로드, 이미지별 AI 분석 요청, 분석 결과 확인, 조치 후보 검토까지 진행하는 과정을 기준으로 한다.

---

### 1.2 기본 사용자 흐름

사용자는 Google 계정으로 로그인한다.

시스템은 로그인한 사용자의 승인 상태와 계정 상태를 확인한다.

승인되지 않은 사용자는 승인 대기 안내 화면으로 이동한다.

비활성화된 사용자는 주요 기능에 접근할 수 없다.

승인된 사용자는 사용자 대시보드로 이동한다.

사용자는 대시보드에서 본인이 등록했거나 접근 권한이 있는 발전소 목록, 구역 현황, 점검 현황, 이상 후보 구역 수, 조치 후보 통계를 확인한다.

등록된 발전소가 없는 경우 사용자는 발전소를 먼저 등록한다.

발전소 등록 후 사용자는 발전소 하위 구역을 등록한다.

구역 등록 후 사용자는 구역 하위의 Array, Panel, Module 구조를 등록하거나 확인한다.

기존 발전소와 구역이 있는 경우 사용자는 발전소를 선택하고, 해당 발전소의 구역 목록으로 이동한다.

사용자는 특정 구역을 선택하여 구역 상세 정보, 하위 설비 구조, 최근 점검 결과, 점검 이력을 확인한다.

사용자는 특정 구역에 대한 점검을 등록한다.

화면에서는 발전소를 먼저 선택할 수 있지만, 점검 저장 기준은 zoneId이다.

발전소 정보는 zoneId를 통해 조회한다.

점검 등록 시 점검명, 촬영 시점, 촬영 방식, 촬영자, 비고를 입력한다.

이미지 업로드 시 사용자는 검사 대상 단위와 검사 대상 위치를 선택한다.

검사 대상 단위는 ZONE, ARRAY, PANEL, MODULE 중 하나이다.

검사 대상 위치는 equipmentId로 표현한다.

Zone 전체 촬영이면 equipmentId는 null일 수 있다.

Array, Panel, Module 촬영이면 equipmentId를 가진다.

사용자는 점검 단위로 RGB 이미지 또는 열화상 이미지를 업로드한다.

업로드 시 사용자는 이미지 유형을 RGB 또는 THERMAL로 선택한다.

시스템은 이미지 파일 형식, 손상 여부, 파일 크기 제한을 검증한다.

업로드가 완료되면 사용자는 업로드 이미지 미리보기를 확인한다.

시스템은 업로드된 이미지를 inspectionId, targetType, equipmentId, imageType 기준으로 관리한다.

plantId와 zoneId는 이미지 테이블에 직접 저장하지 않고 inspectionId를 통해 파생 조회한다.

---

### 1.3 단건 분석 흐름

RGB 이미지는 다른 이미지 유형의 존재 여부와 관계없이 독립적인 단건 분석 대상으로 처리한다.

RGB 단건 분석의 inputType은 RGB_SINGLE이다.

RGB 단건 분석은 RGB_ONLY 모델을 사용한다.

RGB_ONLY 분석은 오염, 먼지, 낙엽, 음영, 식생 침범, 외관 손상 후보를 탐지한다.

열화상 이미지는 다른 이미지 유형의 존재 여부와 관계없이 독립적인 단건 분석 대상으로 처리한다.

열화상 단건 분석의 inputType은 THERMAL_SINGLE이다.

열화상 단건 분석은 THERMAL_ONLY 모델을 사용한다.

THERMAL_ONLY 분석은 핫스팟, 과열 영역, 비정상 발열 후보를 탐지한다.

사용자는 업로드된 개별 이미지에 대해 AI 분석을 요청할 수 있다.

단건 분석 요청은 imageId를 대상으로 생성한다.

시스템은 분석 요청을 즉시 완료하지 않고 비동기 분석 작업으로 등록한다.

분석 작업이 생성되면 jobId가 발급된다.

분석 작업 상태는 jobStatus로 관리한다.

사용자는 분석 상태 화면에서 QUEUED, RUNNING, SUCCEEDED, FAILED 상태를 확인한다.

---

### 1.4 이미지별 독립 분석 흐름

RGB 이미지와 열화상 이미지는 각각 독립적인 이미지 레코드로 저장한다.

각 이미지는 고유한 imageId로 식별한다.

사용자는 분석하려는 이미지를 선택하여 이미지별로 분석을 요청한다.

RGB 이미지의 분석 요청은 RGB_SINGLE 입력 유형과 RGB_ONLY 모델로 처리한다.

열화상 이미지의 분석 요청은 THERMAL_SINGLE 입력 유형과 THERMAL_ONLY 모델로 처리한다.

한 이미지의 분석 상태와 결과는 다른 이미지의 분석 상태와 결과에 영향을 주지 않는다.

동일한 점검에 RGB 이미지와 열화상 이미지가 모두 등록되어 있어도 각 이미지는 별도의 분석 작업으로 처리한다.

분석 결과는 분석 대상 imageId와 분석 작업 jobId를 기준으로 각각 저장하고 조회한다.

Pair 생성·조회·수정·비활성화 기능은 현재 운영 범위에서 사용하지 않는다.

Fusion 분석은 현재 운영 범위에서 사용하지 않는다.

---

### 1.5 분석 결과 확인 흐름

분석이 완료되면 사용자는 점검 결과 목록 또는 분석 결과 상세 화면에서 결과를 확인한다.

분석 결과 상세 화면에서는 원본 이미지와 해당 이미지의 분석 결과를 비교한다.

분석 결과는 Bounding Box, Heatmap, Mask 형태로 이상 후보 영역을 표시할 수 있다.

Heatmap과 Mask는 해당 분석 결과가 생성된 경우 표시한다.

사용자는 이상 유형, confidence, 이상 면적 비율, 심각도, 조치 후보, 우선순위를 확인한다.

조치 후보는 CLEANING, RETAKE, FIELD_INSPECTION, REPLACEMENT_REVIEW로 구분한다.

CLEANING은 오염, 먼지, 낙엽, 조류 배설물, 식생 침범 등이 의심되는 경우 표시한다.

RETAKE는 이미지 흐림, 반사, 과노출, 촬영 품질 저하, 모델 저신뢰도 결과가 발생한 경우 표시한다.

FIELD_INSPECTION은 핫스팟, 과열 영역 또는 확인이 필요한 외관 이상이 발견된 경우 표시한다.

REPLACEMENT_REVIEW는 심각한 외관 손상, 넓은 열 이상 또는 반복 악화 패턴이 확인된 경우 표시한다.

사용자는 분석 결과의 검토 상태를 UNCHECKED, CONFIRMED, RECHECK_REQUIRED, ACTION_COMPLETED로 변경할 수 있다.

시스템은 검토 상태 변경 이력을 RESULT_REVIEW_HISTORIES에 저장한다.

---

### 1.6 분석 실패 및 재요청 흐름

AI 분석 중 오류가 발생하면 시스템은 분석 작업 상태를 FAILED로 변경한다.

분석 실패 시 시스템은 failureCode와 failureMessage를 저장한다.

사용자는 분석 실패 메시지를 확인한다.

실패 원인이 이미지 문제인 경우 사용자는 이미지를 다시 업로드할 수 있다.

실패 원인이 지원하지 않는 이미지 유형 또는 잘못된 이미지 정보인 경우 사용자는 이미지 정보를 확인하고 수정 가능한 항목을 정리한다.

실패 원인이 일시적인 서버 또는 AI Worker 오류인 경우 사용자는 분석을 재요청할 수 있다.

분석 재요청 시 기존 분석 대상 imageId를 기준으로 새로운 분석 작업을 생성할 수 있다.

새로 생성된 분석 작업은 새로운 jobId를 발급받고 QUEUED 상태로 등록된다.

저신뢰도 분석 결과가 발생한 경우 시스템은 해당 결과를 재촬영 후보 또는 재검토 후보로 분리한다.

---

## 2. 데이터·추론 흐름도

### 2.1 흐름도 목적

이 문서는 RGB·열화상 기반 태양광 구역 관리 플랫폼의 데이터 흐름과 AI 추론 흐름을 텍스트로 정리한 것이다.

나중에 이미지 업로드, 메타데이터 저장, 이미지 단건 관리, 분석 Job 생성, SQS 비동기 처리, AI Worker 추론, 결과 저장, 결과 조회 구조를 검색하기 쉽도록 주요 키워드를 포함한다.

---

### 2.2 이미지 업로드 데이터 흐름

사용자는 React Frontend 화면에서 RGB 이미지 또는 열화상 이미지를 업로드한다.

Frontend는 이미지 파일과 imageType, inspectionId, targetType, equipmentId, capturedAt, memo를 Spring Boot Backend로 전송한다.

Frontend는 S3, MinIO, SQS, RDS, AI Worker에 직접 접근하지 않는다.

Frontend는 Spring Boot Backend Public API만 호출한다.

Backend는 인증 상태와 데이터 접근 권한을 검증한다.

Backend는 inspectionId 기준으로 점검 정보를 조회한다.

Backend는 inspectionId를 통해 zoneId와 plantId를 파생 조회한다.

Backend는 targetType과 equipmentId의 정합성을 검증한다.

targetType이 ZONE이면 equipmentId는 null일 수 있다.

targetType이 ARRAY, PANEL, MODULE이면 equipmentId가 필요하다.

Backend는 이미지 파일 형식, 손상 여부, 파일 크기 제한을 검증한다.

검증에 실패하면 Backend는 업로드 실패 응답을 반환하고, Frontend는 사용자에게 실패 사유를 표시한다.

검증에 성공하면 Backend는 원본 이미지 파일을 객체 저장소에 저장한다.

운영 환경에서는 원본 이미지를 AWS S3에 저장한다.

로컬 테스트 환경에서는 원본 이미지를 MinIO에 저장한다.

Backend는 이미지 파일 자체를 DB에 저장하지 않는다.

Backend는 이미지 메타데이터와 객체 저장소 경로를 PostgreSQL DB에 저장한다.

이미지 메타데이터 저장 기준은 다음과 같다.

* imageId
* inspectionId
* equipmentId
* targetType
* imageType
* originalFilename
* mimeType
* fileSize
* bucketName
* objectKey
* fileUrl
* capturedAt
* uploadStatus
* status
* uploadedByUserId
* createdAt
* updatedAt

plantId와 zoneId는 INSPECTION_IMAGES에 직접 저장하지 않는다.

plantId와 zoneId는 inspectionId → INSPECTIONS → ZONES 관계를 통해 조회한다.

Backend는 업로드된 이미지가 RGB 이미지인지 THERMAL 이미지인지 기록한다.

Backend는 동일 inspectionId, targetType, equipmentId, imageType 조합의 중복 업로드 여부를 검증한다.

---

### 2.3 이미지 단건 관리 데이터 흐름

시스템은 업로드된 RGB 이미지와 열화상 이미지를 INSPECTION_IMAGES에 각각 독립적으로 저장한다.

각 이미지에는 고유한 imageId를 부여한다.

이미지 유형은 imageType으로 구분한다.

RGB 이미지는 imageType이 RGB이다.

열화상 이미지는 imageType이 THERMAL이다.

이미지의 점검 및 검사 대상 정보는 inspectionId, targetType, equipmentId를 기준으로 관리한다.

Zone 전체 대상이면 equipmentId는 null일 수 있다.

Array, Panel, Module 대상이면 equipmentId를 가진다.

plantId와 zoneId는 INSPECTION_IMAGES에 직접 저장하지 않는다.

plantId와 zoneId는 inspectionId → INSPECTIONS → ZONES 관계를 통해 조회한다.

RGB 이미지와 열화상 이미지는 다른 이미지 유형의 존재 여부와 관계없이 업로드, 조회, 분석할 수 있다.

현재 운영 DB에는 이미지 Pair 관계를 저장하지 않는다.

현재 운영 분석 입력은 imageId로 식별되는 이미지 한 건이다.

---

### 2.4 분석 요청 데이터 흐름

사용자는 업로드된 RGB 이미지 또는 열화상 이미지에 대해 AI 분석을 요청한다.

Frontend는 분석 요청을 Backend API로 전송한다.

분석 요청은 imageId를 포함한다.

Backend는 분석 대상 이미지에 대한 접근 권한을 검증한다.

Backend는 imageId 기준으로 분석 대상 이미지와 점검 정보를 확인한다.

Backend는 분석 요청 기준으로 ANALYSIS_JOBS에 분석 Job을 생성한다.

분석 Job 저장 기준은 다음과 같다.

* jobId
* imageId
* inputType
* requestedModelType
* modelType
* jobStatus
* requestedByUserId
* requestedAt
* startedAt
* completedAt
* failureCode
* failureMessage
* createdAt
* updatedAt

ANALYSIS_JOBS에는 inspectionId를 직접 저장하지 않는다.

점검, 구역, 발전소 정보는 imageId를 통해 조회한다.

inputType은 RGB_SINGLE 또는 THERMAL_SINGLE 중 하나로 관리한다.

modelType은 RGB_ONLY 또는 THERMAL_ONLY 중 하나로 관리한다.

Backend는 분석 Job 상태를 QUEUED로 설정한다.

Backend는 분석 Job 정보를 PostgreSQL DB에 저장한다.

Backend는 분석 작업 메시지를 AWS SQS Queue에 등록한다.

로컬 테스트 환경에서는 LocalStack SQS를 사용할 수 있다.

분석 요청 API는 실제 AI 분석 완료를 기다리지 않고 jobId와 jobStatus를 먼저 반환한다.

---

### 2.5 SQS 분석 작업 메시지 흐름

Backend는 분석 Job 생성 후 SQS에 분석 작업 메시지를 등록한다.

SQS 메시지는 분석 대상 식별에 필요한 최소 정보만 포함한다.

SQS 메시지에는 다음 정보가 포함될 수 있다.

* jobId
* inputType
* imageId
* requestedModelType
* requestedByUserId
* traceId
* createdAt

SQS 메시지에는 plantId, zoneId, inspectionId를 포함하지 않는다.

plantId, zoneId, inspectionId가 필요한 경우 AI Worker 또는 Backend가 jobId와 imageId를 기준으로 조회한다.

SQS 메시지는 AI Worker가 비동기로 수신한다.

AI Worker는 사용자의 HTTP 요청을 직접 받지 않는다.

---

### 2.6 AI Worker 추론 흐름

FastAPI AI Worker는 SQS Queue에서 분석 작업 메시지를 수신한다.

AI Worker는 jobId를 기준으로 PostgreSQL DB에서 분석 Job 정보를 조회한다.

AI Worker는 imageId 기준으로 이미지 메타데이터를 조회한다.

AI Worker는 INSPECTION_IMAGES에서 분석 대상 이미지 한 건을 조회한다.

AI Worker는 이미지 메타데이터의 bucketName과 objectKey를 기준으로 객체 저장소에서 원본 이미지를 읽는다.

운영 환경에서는 AWS S3에서 원본 이미지를 읽는다.

로컬 테스트 환경에서는 MinIO에서 원본 이미지를 읽는다.

AI Worker는 입력 유형을 확인한다.

입력 유형이 RGB_SINGLE이면 RGB_ONLY ONNX 모델을 사용한다.

입력 유형이 THERMAL_SINGLE이면 THERMAL_ONLY ONNX 모델을 사용한다.

RGB_ONLY 모델은 RGB 이미지의 오염, 낙엽, 음영, 식생 침범, 외관 손상 후보를 분석한다.

THERMAL_ONLY 모델은 열화상 이미지의 핫스팟, 과열 영역, 비정상 발열 후보를 분석한다.

AI Worker는 ONNX Runtime 기반으로 모델 추론을 수행한다.

AI Worker는 모델 출력에 따라 bbox, class, confidence, heatmap, mask 결과를 생성하거나 전달할 수 있다.

AI Worker는 분석 작업 시작 시 jobStatus를 RUNNING으로 변경한다.

---

### 2.7 결과 후처리 및 저장 흐름

AI Worker는 모델 추론 결과를 후처리한다.

후처리 단계에서는 이상 유형, confidence, 이상 면적 비율, 심각도, 조치 후보, 우선순위를 산출한다.

이상 면적 비율은 이상 후보 영역이 이미지에서 차지하는 비율로 계산한다.

심각도는 이상 유형, 이상 면적, 모델 신뢰도, 이미지 유형을 기준으로 산출한다.

우선순위는 심각도, 조치 후보, 반복 이상 여부, 악화 여부를 기준으로 산출한다.

AI Worker는 분석 결과에 따라 Bounding Box 이미지, Heatmap 이미지, Mask 이미지를 생성할 수 있다.

AI Worker는 생성된 분석 결과 이미지를 객체 저장소에 저장한다.

운영 환경에서는 분석 결과 이미지를 AWS S3에 저장한다.

로컬 테스트 환경에서는 분석 결과 이미지를 MinIO에 저장한다.

분석 결과 이미지 경로는 bucketName, objectKey, fileUrl 형태로 관리한다.

AI Worker 또는 Backend는 분석 결과 메타데이터를 PostgreSQL DB에 저장한다.

구현 단계에서 결과 저장 방식은 다음 중 하나로 확정한다.

* AI Worker가 DB와 객체 저장소에 직접 저장한다.
* AI Worker가 결과 이미지는 객체 저장소에 저장하고, 결과 메타데이터는 Backend Internal API로 전달한다.

어떤 방식을 선택해도 Frontend는 AI Worker에 직접 접근하지 않는다.

ANALYSIS_RESULTS 저장 기준은 다음과 같다.

* resultId
* analysisJobId
* modelType
* modelName
* modelVersion
* modelFormat
* runtime
* inputSize
* threshold
* resultStatus
* anomalyCount
* maxConfidence
* areaRatio
* severityScore
* severityLevel
* actionCandidate
* priorityLevel
* reviewStatus
* bboxBucketName
* bboxObjectKey
* bboxFileUrl
* heatmapBucketName
* heatmapObjectKey
* heatmapFileUrl
* maskBucketName
* maskObjectKey
* maskFileUrl
* analyzedAt
* createdAt
* updatedAt

ANALYSIS_RESULTS에는 inspectionId, plantId, zoneId, equipmentId, targetType, inputType을 직접 저장하지 않는다.

점검, 구역, 발전소, 검사 대상 정보는 analysisJobId → ANALYSIS_JOBS → INSPECTION_IMAGES 관계로 조회한다.

개별 결함 후보는 DETECTED_DEFECTS에 저장한다.

DETECTED_DEFECTS 저장 기준은 다음과 같다.

* defectId
* analysisResultId
* defectType
* defectSource
* confidence
* areaRatio
* bboxX
* bboxY
* bboxWidth
* bboxHeight
* maskBucketName
* maskObjectKey
* maskFileUrl
* severityScore
* severityLevel
* actionCandidate
* createdAt
* updatedAt

분석이 성공하면 분석 Job 상태를 SUCCEEDED로 변경한다.

분석이 실패하면 분석 Job 상태를 FAILED로 변경하고 실패 사유를 저장한다.

---

### 2.8 결과 조회 흐름

사용자는 Frontend에서 분석 상태 또는 분석 결과를 조회한다.

Frontend는 Backend API에 분석 상태 조회 또는 결과 조회를 요청한다.

Backend는 PostgreSQL DB에서 분석 Job 상태와 결과 메타데이터를 조회한다.

분석이 QUEUED 또는 RUNNING이면 Backend는 현재 jobStatus를 반환한다.

분석이 FAILED인 경우 Backend는 실패 상태와 실패 사유를 반환한다.

분석이 SUCCEEDED인 경우 Backend는 분석 결과 메타데이터와 결과 이미지 접근 정보를 반환한다.

결과 목록 조회에서 plantId, zoneId, inspectionId, targetType, equipmentId, inputType은 Join 기반 필터로 사용할 수 있다.

다만 ANALYSIS_RESULTS에는 plantId, zoneId, inspectionId, equipmentId, targetType, inputType을 직접 저장하지 않는다.

Backend는 analysisJobId를 기준으로 imageId를 따라가서 점검, 구역, 발전소, 검사 대상 정보를 조회한다.

Backend는 사용자의 권한을 검증한 뒤 원본 이미지와 분석 결과 이미지 접근 URL 또는 스트림을 제공한다.

Frontend는 원본 이미지와 해당 이미지의 분석 결과 이미지를 사용자 화면에 표시한다.

사용자는 Bounding Box, Heatmap, Mask 기반 이상 후보 영역을 확인한다.

사용자는 조치 후보, 심각도, 우선순위, 검토 상태를 확인한다.

사용자가 검토 상태를 변경하면 Backend는 변경된 상태와 변경 이력을 DB에 저장한다.

검토 상태 변경 이력은 RESULT_REVIEW_HISTORIES에 저장한다.

---

## 3. 배포·운영 흐름도

### 3.1 흐름도 목적

이 문서는 운영 환경과 로컬 테스트 환경에서 Frontend, Backend, AI Worker, DB, Storage, Queue, Logs, CI/CD가 어떻게 연결되는지 텍스트로 정리한 것이다.

나중에 K3s, Traefik, Jenkins, ECR, S3, SQS, RDS, CloudWatch Logs, MinIO, LocalStack SQS, PostgreSQL Docker 구성을 검색하기 쉽도록 주요 키워드를 포함한다.

---

### 3.2 운영 요청 흐름

사용자 브라우저는 HTTPS로 서비스에 접속한다.

외부 요청은 Traefik Ingress Controller로 진입한다.

Traefik Ingress Controller는 요청 경로에 따라 React Frontend 또는 Spring Boot Backend API로 라우팅한다.

Frontend 정적 화면 요청은 React Frontend Pod로 전달된다.

Backend API 요청은 Spring Boot Backend Pod로 전달된다.

Frontend는 Backend Public API만 호출한다.

Frontend는 S3, SQS, RDS, AI Worker에 직접 접근하지 않는다.

Backend는 인증, 권한 검증, 발전소·구역·점검 관리, 이미지 메타데이터 관리, 분석 Job 생성, 분석 상태 관리, 결과 조회를 담당한다.

AI Worker는 외부 사용자에게 직접 노출하지 않는다.

AI Worker는 SQS Queue에서 작업을 받아 내부적으로 처리한다.

---

### 3.3 운영 데이터 저장 흐름

운영 환경에서 원본 이미지와 분석 결과 이미지는 AWS S3에 저장한다.

운영 환경에서 사용자, 발전소, 구역, 하위 설비, 점검, 이미지 메타데이터, 분석 Job, 분석 결과, 결함 후보, 검토 이력, 운영 로그는 AWS RDS PostgreSQL에 저장한다.

운영 환경에서 분석 작업 Queue는 AWS SQS를 사용한다.

운영 환경에서 Backend와 AI Worker의 운영 로그와 시스템 로그는 CloudWatch Logs로 전송한다.

시스템 로그는 MVP DB 테이블로 분리하지 않는다.

관리자 작업, 이미지 업로드, 분석 요청, 분석 실패, 결과 검토 등 주요 운영 이벤트는 OPERATION_LOGS에 기록할 수 있다.

---

### 3.4 CI/CD 배포 흐름

개발자는 GitHub Repository에 코드를 Push한다.

Jenkins는 Repository 변경을 감지하거나 수동 실행으로 Pipeline을 시작한다.

Jenkins는 Frontend Docker Image를 빌드한다.

Jenkins는 Backend Docker Image를 빌드한다.

Jenkins는 AI Worker Docker Image를 빌드한다.

Jenkins는 빌드된 이미지를 AWS ECR에 Push한다.

운영 서버의 K3s Cluster는 ECR의 이미지를 Pull한다.

K3s는 Frontend Deployment를 갱신한다.

K3s는 Backend Deployment를 갱신한다.

K3s는 AI Worker Deployment를 갱신한다.

K3s Service는 각 Pod의 내부 통신을 연결한다.

Traefik Ingress Controller는 외부 요청을 Frontend와 Backend로 라우팅한다.

AI Worker는 외부 요청을 받지 않고 SQS 기반으로 작업을 처리한다.

배포 후 Backend Health Check와 Internal Health Check를 확인한다.

Frontend 화면, Backend API, 이미지 업로드, 분석 작업 등록, SQS 작업 수신, AI Worker 처리, 결과 조회 흐름을 확인한다.

---

### 3.5 로컬 테스트 흐름

로컬 테스트 환경에서는 Docker Compose 또는 Local K3s를 사용할 수 있다.

Frontend는 로컬 React 개발 서버 또는 Docker 컨테이너로 실행할 수 있다.

Backend는 Spring Boot Local Profile로 실행한다.

AI Worker는 FastAPI Local Worker로 실행한다.

로컬 DB는 PostgreSQL Docker를 사용한다.

로컬 객체 저장소는 MinIO를 사용한다.

로컬 Queue는 LocalStack SQS를 사용한다.

로컬 로그는 Console Log를 우선 사용한다.

로컬 Secret은 .env.local 또는 local profile을 사용한다.

로컬 환경에서도 Frontend는 Backend API만 호출한다.

로컬 환경에서도 Backend가 이미지 파일을 MinIO에 저장하고, 이미지 메타데이터를 PostgreSQL에 저장한다.

로컬 환경에서도 Backend가 분석 Job을 생성하고 LocalStack SQS에 메시지를 등록한다.

로컬 환경에서도 AI Worker가 LocalStack SQS에서 작업을 수신하고, MinIO에서 이미지를 읽어 ONNX Runtime CPU 기반 추론을 수행한다.

로컬 환경에서도 결과 이미지는 MinIO에 저장하고, 결과 메타데이터는 PostgreSQL에 저장하거나 Backend Internal API로 전달한다.

운영 환경과 로컬 환경의 차이는 코드 분리가 아니라 Profile, 환경 변수, Secret, Storage Adapter, Queue Adapter 설정으로 관리한다.

---

## 4. 핵심 구분 메모

이미지 업로드와 분석 요청은 서로 다른 단계이다.

이미지 업로드는 원본 이미지 파일을 S3 또는 MinIO에 저장하고, 이미지 메타데이터를 PostgreSQL DB에 저장하는 단계이다.

분석 요청은 이미 저장된 imageId를 기준으로 분석 Job을 생성하고, SQS Queue에 작업을 등록하는 단계이다.

imageId는 RGB 또는 열화상 단건 분석 입력이다.

equipmentId는 Array, Panel, Module 대상일 때 사용하는 검사 대상 위치 ID이다.

Zone 전체 대상이면 equipmentId는 null일 수 있다.

targetType은 ZONE, ARRAY, PANEL, MODULE 중 하나이다.

inputType은 RGB_SINGLE 또는 THERMAL_SINGLE 중 하나이다.

modelType은 RGB_ONLY 또는 THERMAL_ONLY 중 하나이다.

jobStatus는 QUEUED, RUNNING, SUCCEEDED, FAILED 중 하나이다.

resultStatus는 NORMAL, ANOMALY, LOW_CONFIDENCE 중 하나이다.

reviewStatus는 UNCHECKED, CONFIRMED, RECHECK_REQUIRED, ACTION_COMPLETED 중 하나이다.

원본 이미지와 분석 결과 이미지는 객체 저장소에 저장한다.

DB에는 이미지 바이너리를 직접 저장하지 않는다.

이미지 메타데이터에는 bucketName, objectKey, fileUrl, originalFilename, mimeType, fileSize 등을 저장한다.

plantId와 zoneId는 INSPECTION_IMAGES에 직접 저장하지 않는다.

plantId와 zoneId는 inspectionId → INSPECTIONS → ZONES 관계로 조회한다.

ANALYSIS_JOBS에는 inspectionId를 직접 저장하지 않는다.

점검 정보는 imageId를 통해 조회한다.

ANALYSIS_RESULTS에는 plantId, zoneId, inspectionId, equipmentId, targetType, inputType을 직접 저장하지 않는다.

대상 정보는 analysisJobId를 통해 조회한다.

AI Worker는 사용자의 요청을 직접 받지 않는다.

AI Worker는 SQS Queue에서 작업을 받아 내부적으로 처리한다.

Frontend는 S3, MinIO, SQS, RDS, AI Worker에 직접 접근하지 않는다.

Frontend는 Spring Boot Backend API만 호출한다.

Backend는 인증, 권한 검증, 발전소·구역·점검 관리, 이미지 메타데이터 관리, 분석 Job 생성, 분석 상태 관리, 결과 조회를 담당한다.

AI Worker는 SQS 작업 수신, 원본 이미지 읽기, ONNX Runtime 추론, bbox·heatmap·mask 생성 또는 전달, 결과 이미지 저장, 분석 결과 메타데이터 생성 또는 전달을 담당한다.

Pair 생성·관리 및 Fusion 분석은 현재 운영 범위에서 제외한다.

운영 환경은 AWS S3, AWS SQS, AWS RDS PostgreSQL, CloudWatch Logs를 사용한다.

로컬 테스트 환경은 MinIO, LocalStack SQS, PostgreSQL Docker, Console Log를 사용할 수 있다.

운영 배포 환경에서는 EC2 기반 K3s Cluster 내부에 Traefik Ingress Controller, React Frontend Pod, Spring Boot Backend Pod, FastAPI AI Worker Pod를 배치한다.

CI/CD는 Jenkins가 Docker 이미지를 빌드하고 AWS ECR에 저장한 뒤 K3s에 배포하는 흐름을 사용한다.

---

## 5. 검색용 키워드

사용자 흐름, 로그인, Google OAuth2, 승인 대기, 관리자 승인, 사용자 대시보드, 발전소 등록, 발전소 목록, 구역 등록, 구역 목록, 구역 상세, 하위 설비 구조, Array, Panel, Module, 점검 등록, zoneId, 점검 정보 입력, 이미지 업로드, RGB 이미지, 열화상 이미지, imageType, 이미지 유형 선택, 이미지 파일 검증, 업로드 미리보기, 이미지 단건 관리, 단건 분석, imageId, RGB_SINGLE, THERMAL_SINGLE, RGB_ONLY, THERMAL_ONLY, 이미지별 분석 요청, AI 분석 요청, analysisJob, jobId, jobStatus, QUEUED, RUNNING, SUCCEEDED, FAILED, 실패 사유, 분석 재요청, 분석 결과 조회, resultId, analysisJobId, Bounding Box, Heatmap, Mask, 조치 후보, CLEANING, RETAKE, FIELD_INSPECTION, REPLACEMENT_REVIEW, severityLevel, priorityLevel, reviewStatus, UNCHECKED, CONFIRMED, RECHECK_REQUIRED, ACTION_COMPLETED, 점검 이력, 변화 추적, 반복 이상, 악화 구역, 우선 관리 대상

데이터 흐름, Frontend, Backend, AI Worker, FastAPI, Spring Boot, React, PostgreSQL, AWS RDS, AWS S3, MinIO, AWS SQS, LocalStack SQS, ONNX Runtime, 원본 이미지 저장, 결과 이미지 저장, 이미지 메타데이터, inspectionId, targetType, equipmentId, bucketName, objectKey, fileUrl, originalFilename, mimeType, fileSize, 분석 Job, SQS Message, requestedModelType, requestedByUserId, traceId, 객체 저장소, 비동기 분석, Queue, SQS Queue, DB 저장, 모델 버전, 모델 형식, Runtime, threshold, confidence, areaRatio, actionCandidate, priorityLevel, K3s, Traefik Ingress Controller, Jenkins, ECR, CloudWatch Logs, Docker Compose, Local K3s, PostgreSQL Docker, MinIO, LocalStack