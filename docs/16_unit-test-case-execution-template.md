# 단위테스트 시나리오표

## 작성 기준

| 항목 | 기준 |
| --- | --- |
| 목적 | Backend / AI Worker / Frontend 단위테스트를 실제 수행하면서 결과를 기록하기 위한 표 |
| 범위 | 메서드, 함수, 서비스, 유틸, 라우터, 어댑터 단위테스트 |
| 제외 | API 통합 테스트, 전체 E2E, 실제 DB / Storage / Queue 실연동 검증 |
| 판정값 | Pass / Fail / Skip / Blocked / N/A |
| 작성 방식 | 테스트 실행 전에는 `실제 결과`, `판정`, `실패 원인`을 비워두고 실행 후 채운다. |
| 운영 분석 기준 | RGB 이미지와 Thermal 이미지는 각각 독립적인 단건 분석으로 처리한다. |
| 분석 대상 기준 | 분석 요청과 Queue 메시지는 `imageId`를 기준으로 한다. |
| 현재 제외 범위 | Pair 생성·관리와 Fusion 분석은 현재 운영 단위테스트 범위에 포함하지 않는다. |

### 판정 기준

| 판정 | 의미 |
| --- | --- |
| `Pass` | 기대 결과와 실제 결과가 일치함 |
| `Fail` | 테스트가 실행됐지만 기대 결과와 다름 |
| `Skip` | 현재 테스트 대상 또는 실행 환경에서 의도적으로 제외함 |
| `Blocked` | 정책, 구현, 의존성 또는 테스트 환경이 확정되지 않아 실행할 수 없음 |
| `N/A` | 현재 구현 구조에 해당 테스트가 적용되지 않음 |

### 작성 주의사항

- 실제 실행하지 않은 테스트를 `Pass`로 작성하지 않는다.
- 테스트 파일이 실제 저장소에 없는 경우 테스트 파일명을 확정해서 작성하지 않는다.
- `실제 파일 확인 필요`, `신규 작성 필요`와 같은 상태를 비고에 남긴다.
- 실제 DB, MinIO/S3, SQS를 호출하는 검증은 단위테스트가 아니라 통합테스트로 분리한다.
- Mock을 사용하더라도 인증·권한·상태 전이·메시지 계약은 실제 운영 규칙과 일치해야 한다.
- 현재 운영 입력 유형은 `RGB_SINGLE`, `THERMAL_SINGLE`이다.
- 현재 운영 모델 유형은 `RGB_ONLY`, `THERMAL_ONLY`이다.
- 현재 분석 요청에는 `imageId`를 사용한다.
- 현재 단위테스트에서 Pair 전용 Repository, Service, Widget, 전처리, Metadata Loader, 모델 라우팅을 테스트하지 않는다.

---

## 1. Backend 단위테스트 시나리오표

| 테스트 ID | 모듈/영역 | 테스트 대상 | 테스트 목적 | 관련 요구사항/정책 | 사전 조건 / Mock | 입력값 / 테스트 데이터 | 실행 절차 | 기대 결과 | 실제 결과 | 판정 | 실패 원인 | 우선순위 | 테스트 파일 | 비고 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- |
| BE-UNIT-AUTH-001 | 인증/인가 | OAuth 사용자 생성 로직 | 최초 Google 로그인 사용자를 승인 대기 상태로 생성하는지 검증 | FR-001, FR-002, PO-003 | UserRepository Mock | 신규 Google 사용자 email, providerUserId | 신규 사용자로 OAuth 로그인 처리 후 저장 객체 확인 | `accountStatus=PENDING`으로 저장된다. |  |  |  | 1 |  | 최초 로그인 핵심 |
| BE-UNIT-AUTH-002 | 인증/인가 | 내 정보 조회 로직 | 승인된 사용자의 계정 상태와 권한 정보를 반환하는지 검증 | FR-006, FR-009, API 인증 명세 | UserRepository Mock | APPROVED 사용자 ID | 승인 사용자로 내 정보 조회 후 응답 DTO 확인 | `userId`, `email`, `name`, `role`, `accountStatus`가 정상 매핑된다. |  |  |  | 1 |  | `/auth/me` 관련 |
| BE-UNIT-AUTH-003 | 인증/인가 | 비활성 사용자 검증 로직 | INACTIVE 사용자의 주요 기능 접근을 차단하는지 검증 | PO-011, PO-012 | UserRepository Mock, 권한 검증 Mock | INACTIVE 사용자 ID | 비활성 사용자로 권한 검증 실행 | 접근 불가 예외 또는 실패 결과를 반환한다. |  |  |  | 1 |  | 권한 정책 핵심 |
| BE-UNIT-AUTH-004 | 관리자 사용자 | 사용자 승인 로직 | 관리자만 승인 대기 사용자를 승인할 수 있는지 검증 | FR-004, FR-005, PO-006 | UserRepository Mock, 관리자 권한 Mock | adminId, pendingUserId | 관리자로 승인 처리 후 대상 사용자 상태 확인 | 대상 사용자의 `accountStatus`가 `APPROVED`로 변경된다. |  |  |  | 1 |  | 관리자 기능 |
| BE-UNIT-AUTH-005 | 관리자 사용자 | 사용자 권한 변경 로직 | 관리자만 USER / ADMIN 권한을 변경할 수 있는지 검증 | FR-007, PO-010 | UserRepository Mock, 관리자 권한 Mock | targetUserId, role=ADMIN | 관리자로 권한 변경 요청 후 사용자 Role 확인 | 사용자의 `role`이 요청값으로 변경된다. |  |  |  | 1 |  | 권한 변경 |
| BE-UNIT-AUTH-006 | 관리자 사용자 | 사용자 비활성화 로직 | 사용자 비활성화가 실제 삭제가 아니라 상태 변경으로 처리되는지 검증 | FR-008, PO-011 | UserRepository Mock | userId | 활성 사용자를 비활성화한 후 상태 확인 | `accountStatus=INACTIVE`로 변경된다. |  |  |  | 1 |  | Soft Delete 성격 |
| BE-UNIT-PLANT-001 | Plant Service | 발전소 등록 로직 | 발전소 등록 요청이 도메인 객체로 정상 변환되는지 검증 | FR-011, PO-015 | PlantRepository Mock | name, location, description, createdByUserId | 등록 Command로 발전소 생성 후 저장 객체 확인 | Plant가 `ACTIVE` 상태로 생성된다. |  |  |  | 1 |  | 기본 생성 |
| BE-UNIT-PLANT-002 | Plant Service | 발전소 목록 조회 로직 | 일반 사용자가 접근 가능한 발전소만 조회하는지 검증 | FR-012, PO-008 | PlantRepository Mock, 권한 Mock | userId, page, size | 사용자 ID로 발전소 목록 조회 | 접근 가능한 발전소 목록만 반환한다. |  |  |  | 1 |  | 데이터 접근 범위 |
| BE-UNIT-PLANT-003 | Plant Service | 발전소 상세 조회 로직 | 권한 없는 사용자의 발전소 상세 조회를 차단하는지 검증 | FR-013, PO-008 | PlantRepository Mock, 권한 Mock | userId, plantId | 권한 없는 사용자로 발전소 상세 조회 | Forbidden 또는 도메인 권한 예외가 발생한다. |  |  |  | 1 |  | 보안 핵심 |
| BE-UNIT-PLANT-004 | Plant Service | 발전소 수정 로직 | 발전소 수정 시 허용된 필드만 변경되는지 검증 | FR-014 | PlantRepository Mock | plantId, 수정 name / location / description | 기존 Plant에 수정 요청 적용 후 필드 확인 | 허용된 필드만 변경된다. |  |  |  | 2 |  | 부분 수정 |
| BE-UNIT-PLANT-005 | Plant Service | 발전소 비활성화 로직 | 발전소 삭제 요청을 Soft Delete로 처리하는지 검증 | FR-015, PO-016 | PlantRepository Mock | plantId | 활성 Plant를 비활성화한 후 상태 확인 | `status=INACTIVE`로 변경된다. |  |  |  | 1 |  | 실제 삭제 금지 |
| BE-UNIT-ZONE-001 | Zone Service | 구역 등록 로직 | 발전소 하위에 구역이 정상 생성되는지 검증 | FR-016, PO-017 | PlantRepository Mock, ZoneRepository Mock | plantId, zone name, location | Plant 하위에 Zone 생성 후 저장 객체 확인 | Zone이 해당 Plant 하위로 생성된다. |  |  |  | 1 |  | 기본 흐름 |
| BE-UNIT-ZONE-002 | Zone Service | 구역 등록 권한 검증 | 접근 권한 없는 발전소에 구역 생성을 차단하는지 검증 | FR-016, PO-008 | 권한 Mock | userId, plantId | 권한 없는 Plant에 Zone 생성 요청 | 권한 예외가 발생한다. |  |  |  | 1 |  | 권한 핵심 |
| BE-UNIT-ZONE-003 | Zone Service | 구역 상세 조회 로직 | zoneId 기준으로 구역 정보를 조회하는지 검증 | FR-018 | ZoneRepository Mock | zoneId | zoneId로 상세 조회 후 응답 확인 | 구역 상세 정보가 반환된다. |  |  |  | 1 |  | 상세 화면 |
| BE-UNIT-ZONE-004 | Zone Service | 구역 비활성화 로직 | 구역 비활성화 시 이력은 보존하고 상태만 변경하는지 검증 | FR-020, PO-021 | ZoneRepository Mock | zoneId | 활성 Zone을 비활성화한 후 상태 확인 | Zone의 `status`가 `INACTIVE`로 변경된다. |  |  |  | 2 |  | 하위 설비 처리 정책 확인 필요 |
| BE-UNIT-EQUIP-001 | Equipment Service | 설비 계층 생성 로직 | Zone → Array → Panel → Module 계층 생성이 가능한지 검증 | FR-022, FR-023, PO-019 | EquipmentRepository Mock | equipmentType, parentEquipmentId | Parent 설비를 지정해 하위 설비 생성 | 올바른 Parent-Child 관계로 저장된다. |  |  |  | 1 |  | 설비 구조 핵심 |
| BE-UNIT-EQUIP-002 | Equipment Service | parentEquipmentId 검증 | 잘못된 parentEquipmentId로 설비 생성을 차단하는지 검증 | FR-024 | EquipmentRepository Mock | 존재하지 않는 parentEquipmentId | 유효하지 않은 Parent로 설비 생성 요청 | 검증 예외가 발생한다. |  |  |  | 1 |  | 정합성 검증 |
| BE-UNIT-EQUIP-003 | Equipment Service | 설비 비활성화 로직 | 설비 삭제 요청을 실제 삭제하지 않고 비활성화하는지 검증 | FR-024, PO-020 | EquipmentRepository Mock | equipmentId | 활성 설비를 비활성화한 후 상태 확인 | `status=INACTIVE`로 변경된다. |  |  |  | 2 |  | 이력 보존 |
| BE-UNIT-INSP-001 | Inspection Service | 점검 등록 로직 | 점검이 zoneId 기준으로 생성되는지 검증 | FR-025, FR-026, PO-022 | ZoneRepository Mock, InspectionRepository Mock | zoneId, name, capturedAt, captureMethod | 점검 Command로 생성 후 저장 객체 확인 | Inspection이 `zoneId`와 연결되어 저장된다. |  |  |  | 1 |  | 점검 기준 |
| BE-UNIT-INSP-002 | Inspection Service | 점검 필수값 검증 | 점검명, 촬영시점, 촬영방식 누락 시 실패하는지 검증 | FR-026, PO-023 | DTO Validation 또는 Service Validation | name=null, capturedAt=null 등 | 필수값이 누락된 생성 요청 실행 | Validation 예외가 발생한다. |  |  |  | 1 |  | 입력 검증 |
| BE-UNIT-INSP-003 | Inspection Service | 점검 권한 검증 | 접근 권한 없는 Zone에 점검 생성을 차단하는지 검증 | PO-008, PO-022 | 권한 Mock | userId, zoneId | 권한 없는 Zone에 점검 생성 요청 | 권한 예외가 발생한다. |  |  |  | 1 |  | 보안 핵심 |
| BE-UNIT-INSP-004 | Inspection Service | 점검 상태 전이 로직 | 점검 상태가 정책 범위 안에서 전이되는지 검증 | PO-023 | Inspection 도메인 객체 | 허용 상태 전이와 비허용 상태 전이 | 상태 변경 메서드 실행 후 결과 확인 | 허용 전이는 성공하고 비허용 전이는 실패한다. |  |  |  | 2 |  | 실제 상태값 확인 필요 |
| BE-UNIT-IMAGE-001 | Image Service | RGB 이미지 메타데이터 저장 | RGB 이미지 업로드 메타데이터가 정상 저장되는지 검증 | 이미지 업로드 요구사항, Storage 설계 | StoragePort Mock, ImageRepository Mock | imageType=RGB, inspectionId, file metadata | RGB 파일 저장 처리 후 Repository 전달 객체 확인 | `bucketName`, `objectKey`, `mimeType`, `fileSize` 등이 정상 저장된다. |  |  |  | 1 |  | DB에 바이너리 저장 금지 |
| BE-UNIT-IMAGE-002 | Image Service | Thermal 이미지 메타데이터 저장 | Thermal 이미지 업로드 메타데이터가 정상 저장되는지 검증 | 이미지 업로드 요구사항, Storage 설계 | StoragePort Mock, ImageRepository Mock | imageType=THERMAL, inspectionId, file metadata | Thermal 파일 저장 처리 후 Repository 전달 객체 확인 | Thermal 이미지 메타데이터가 정상 저장된다. |  |  |  | 1 |  | 열화상 업로드 |
| BE-UNIT-IMAGE-003 | Image Service | imageType 검증 | RGB / THERMAL 외 imageType을 차단하는지 검증 | 이미지 유형 정책 | Validation Mock | imageType=UNKNOWN | 잘못된 imageType으로 저장 요청 | 검증 예외가 발생한다. |  |  |  | 1 |  | 입력 검증 |
| BE-UNIT-IMAGE-004 | Image Service | targetType ZONE 검증 | targetType이 ZONE이면 equipmentId=null을 허용하는지 검증 | 이미지 대상 정책 | Inspection Mock | targetType=ZONE, equipmentId=null | Zone 전체 촬영 이미지 저장 요청 | 저장 검증을 통과한다. |  |  |  | 1 |  | Zone 전체 이미지 |
| BE-UNIT-IMAGE-005 | Image Service | 설비 대상 검증 | ARRAY / PANEL / MODULE 대상이면 유효한 equipmentId가 필요한지 검증 | 이미지 대상 정책 | EquipmentRepository Mock | targetType=PANEL, equipmentId=null | 설비 대상 이미지 저장 요청 | 검증 예외가 발생한다. |  |  |  | 1 |  | 위치 정합성 |
| BE-UNIT-IMAGE-006 | Image Service | 이미지 중복 업로드 정책 | 동일 점검·대상·이미지 유형 업로드가 현재 정책에 따라 처리되는지 검증 | Storage / Indexing 설계 | ImageRepository Mock | 동일 inspectionId / targetType / equipmentId / imageType | 기존 활성 이미지가 있는 상태에서 추가 업로드 요청 | 확정된 정책에 따라 허용 또는 차단된다. 정책 미확정 시 테스트는 `Blocked`로 기록한다. |  |  |  | 2 |  | 정책 확정 전 성공·실패 단정 금지 |
| BE-UNIT-IMAGE-007 | Image Service | 파일 형식 검증 | 지원하지 않는 파일 형식을 차단하는지 검증 | 파일 업로드 정책 | MultipartFile Mock | mimeType=text/plain | 지원하지 않는 파일 업로드 요청 | 파일 검증 예외가 발생한다. |  |  |  | 1 |  | 확장자만으로 판단 금지 |
| BE-UNIT-IMAGE-008 | Image Service | Storage 저장 실패 처리 | Storage 저장 실패 시 정상 업로드로 처리하지 않는지 검증 | Storage 설계 | StoragePort Mock 실패, ImageRepository Mock | 정상 이미지 파일, Storage 예외 | 업로드 처리 중 Storage 예외 발생 | 성공 응답과 정상 완료 상태를 반환하지 않는다. |  |  |  | 1 |  | 실패 보상 처리 확인 |
| BE-UNIT-JOB-001 | Analysis Job Service | RGB_SINGLE Job 생성 | RGB 이미지 단건 분석 요청의 정합성을 검증 | 분석 요청 API, AI Worker Contract | ImageRepository Mock, QueuePublisher Mock | RGB imageId | RGB 이미지로 분석 Job 생성 | `jobStatus=QUEUED`, `inputType=RGB_SINGLE`, `requestedModelType=RGB_ONLY`, `imageId`가 저장된다. |  |  |  | 1 |  | 단건 분석 핵심 |
| BE-UNIT-JOB-002 | Analysis Job Service | THERMAL_SINGLE Job 생성 | Thermal 이미지 단건 분석 요청의 정합성을 검증 | 분석 요청 API, AI Worker Contract | ImageRepository Mock, QueuePublisher Mock | Thermal imageId | Thermal 이미지로 분석 Job 생성 | `jobStatus=QUEUED`, `inputType=THERMAL_SINGLE`, `requestedModelType=THERMAL_ONLY`, `imageId`가 저장된다. |  |  |  | 1 |  | 단건 분석 핵심 |
| BE-UNIT-JOB-003 | Analysis Job Service | 지원하지 않는 입력 유형 차단 | 현재 지원하지 않는 분석 입력 유형을 차단하는지 검증 | 분석 요청 API, AI Worker Contract | Validation Fixture | inputType=UNKNOWN | 지원하지 않는 입력 유형으로 Job 생성 요청 | 검증 예외가 발생하고 Queue를 호출하지 않는다. |  |  |  | 1 |  | 허용값 검증 |
| BE-UNIT-JOB-004 | Analysis Job Service | 모델 라우팅 값 결정 | 이미지 유형에 따라 요청 모델 유형이 결정되는지 검증 | AI Worker Contract | ImageRepository Mock | RGB imageId, Thermal imageId | 각 이미지 유형으로 Job 생성 | RGB는 `RGB_ONLY`, Thermal은 `THERMAL_ONLY`로 설정된다. |  |  |  | 1 |  | 모델 선택 |
| BE-UNIT-JOB-005 | Analysis Job Service | Queue 발행 Port 호출 | Job 저장 후 Queue 발행 Port가 호출되는지 검증 | 분석 처리 흐름 | QueuePublisher Mock | 유효한 imageId 분석 요청 | Job 생성 후 Publish 호출 여부 확인 | Job 저장 성공 후 Publish가 1회 호출된다. |  |  |  | 1 |  | Backend-Worker 연결 |
| BE-UNIT-JOB-006 | Analysis Job Service | 분석 요청 권한 검증 | 권한 없는 imageId 분석 요청을 차단하는지 검증 | 데이터 접근 권한 정책 | 권한 Mock, ImageRepository Mock | 다른 사용자의 imageId | 권한 없는 이미지로 Job 생성 요청 | 권한 예외가 발생하고 Job과 Queue 메시지가 생성되지 않는다. |  |  |  | 1 |  | 보안 핵심 |
| BE-UNIT-JOB-007 | Analysis Job Service | 이미지 상태 검증 | 업로드 실패 또는 비활성 이미지를 분석 대상으로 사용할 수 없는지 검증 | 이미지 상태 정책 | ImageRepository Mock | 비활성 또는 업로드 실패 imageId | 유효하지 않은 이미지 상태로 분석 요청 | 검증 예외가 발생하고 Queue를 호출하지 않는다. |  |  |  | 1 |  | 상태 정합성 |
| BE-UNIT-RESULT-001 | Result Service | 분석 결과 저장 | analysisJobId 기준으로 결과 요약을 저장하는지 검증 | 결과 저장 요구사항 | ResultRepository Mock | analysisJobId, result summary | 결과 DTO 저장 처리 후 Repository 호출 확인 | AnalysisResult 저장 메서드가 정상 호출된다. |  |  |  | 1 |  | 결과 저장 |
| BE-UNIT-RESULT-002 | Result Service | 결함 후보 저장 | Detected Defect 목록이 analysisResultId 기준으로 저장되는지 검증 | 결과 상세 요구사항 | DefectRepository Mock | defects list | 결함 목록 저장 처리 | 모든 결함 후보가 해당 분석 결과에 연결되어 저장된다. |  |  |  | 1 |  | 결함 상세 |
| BE-UNIT-RESULT-003 | Result Service | resultStatus 매핑 | NORMAL / ANOMALY / LOW_CONFIDENCE 상태 매핑을 검증 | 결과 상태 정책 | Result DTO | resultStatus 값 | 결과 상태 변환 실행 | 도메인 상태가 정상 매핑된다. 분석 실패는 Job의 FAILED 상태와 실패 정보로 관리한다. |  |  |  | 2 |  | 상태값 |
| BE-UNIT-RESULT-004 | Result Service | actionCandidate 매핑 | CLEANING / RETAKE / FIELD_INSPECTION / REPLACEMENT_REVIEW 매핑을 검증 | 조치 후보 정책 | Result DTO | actionCandidate 값 | 조치 후보 변환 실행 | 조치 후보가 정상 매핑된다. |  |  |  | 2 |  | 조치 후보 |
| BE-UNIT-RESULT-005 | Result Service | 결과 이미지 권한 검증 | 결과 이미지 조회 시 권한 검증을 수행하는지 검증 | 파일 접근 정책 | 권한 Mock | userId, resultId | 권한 없는 사용자로 결과 이미지 조회 | 권한 예외가 발생한다. |  |  |  | 1 |  | 파일 접근 제어 |
| BE-UNIT-RESULT-006 | Result Service | 검토 상태 변경 이력 | 검토 상태 변경 시 이력이 저장되는지 검증 | 결과 검토 정책 | ReviewHistoryRepository Mock | UNCHECKED → CONFIRMED | 검토 상태 변경 요청 처리 | 변경 상태와 사용자·시각을 포함한 이력이 저장된다. |  |  |  | 1 |  | 결과 검토 |
| BE-UNIT-RESULT-007 | Result Service | 선택적 결과 이미지 처리 | 생성되지 않은 Heatmap 또는 Mask 경로를 null로 허용하는지 검증 | Storage 설계, 결과 계약 | ResultRepository Mock | bbox 경로만 존재하는 결과 | 선택적 시각화 필드가 일부 없는 결과 저장 | 실제 생성된 경로만 저장되고 없는 경로는 null로 처리된다. |  |  |  | 2 |  | 모든 시각화 생성 가정 금지 |
| BE-UNIT-DASH-001 | Dashboard Service | KPI 요약 계산 | 접근 가능한 데이터 기준으로 대시보드 요약을 계산하는지 검증 | Dashboard 요구사항 | DashboardRepository Mock | userId | 사용자 기준 Dashboard 조회 | 접근 범위 내의 요약값만 반환한다. |  |  |  | 2 |  | 대시보드 |
| BE-UNIT-DASH-002 | Dashboard Service | 조치 후보별 통계 | actionCandidate별 통계가 정상 집계되는지 검증 | 조치 후보 정책 | ResultRepository Mock | result list | 결과 목록으로 통계 계산 | 조치 후보별 건수를 반환한다. |  |  |  | 2 |  | 통계 |
| BE-UNIT-TRACK-001 | Tracking Service | 이전 점검 비교 | 같은 Zone 또는 Equipment 기준으로 이전 점검과 비교하는지 검증 | 변화 추적 요구사항 | TrackingRepository Mock | zoneId 또는 equipmentId | 이전·현재 결과 비교 | 이상 면적 또는 심각도 변화값을 반환한다. |  |  |  | 2 |  | 변화 추적 |
| BE-UNIT-TRACK-002 | Tracking Service | 빈 데이터 처리 | 비교 대상이 없을 때 오류 없이 빈 응답을 반환하는지 검증 | 변화 추적 요구사항 | TrackingRepository Mock | 비교 결과 없음 | 변화 추적 조회 | 빈 목록 또는 기본 응답을 반환한다. |  |  |  | 2 |  | Null-Safe |
| BE-UNIT-ADAPTER-001 | Persistence Adapter | JPA Adapter 매핑 | Entity와 Domain 간 매핑이 정상인지 검증 | ERD 기준 | JPA Entity Fixture | 주요 필드가 채워진 Entity | Entity를 Domain으로 변환 | 주요 필드가 누락 없이 매핑된다. |  |  |  | 2 |  | 기존 테스트 존재 여부 확인 |
| BE-UNIT-ADAPTER-002 | Storage Adapter | S3 / MinIO 저장 어댑터 | 파일 저장 요청이 Bucket / Object Key 기반으로 위임되는지 검증 | Storage 설계 | Storage Client Mock | file bytes, bucketName, objectKey | Storage Adapter 저장 메서드 호출 | Storage Client가 기대한 Bucket과 Object Key로 호출된다. |  |  |  | 2 |  | 실제 Storage 호출 금지 |
| BE-UNIT-ADAPTER-003 | Queue Adapter | SQS 발행 어댑터 | 이미지 단건 분석 Job 메시지가 Queue로 발행되는지 검증 | AI Worker Contract | SQS Client Mock | jobId, inputType, imageId, requestedModelType | Queue Adapter 발행 메서드 호출 | SQS Send 요청에 `jobId`, `imageId`, 단건 입력 유형과 모델 유형이 포함된다. |  |  |  | 1 |  | 실제 SQS 호출 금지 |
| BE-UNIT-ERR-001 | Exception Handler | 공통 예외 매핑 | 도메인 예외가 공통 오류 응답으로 변환되는지 검증 | API 오류 응답 규칙 | Exception Fixture | Forbidden / NotFound / Validation 예외 | 공통 Exception Handler 호출 | `status`, `code`, `message`, `path`, `traceId` 구조로 반환된다. |  |  |  | 1 |  | 전용 테스트 확인 필요 |

---

## 2. AI Worker 단위테스트 시나리오표

| 테스트 ID | 모듈/영역 | 테스트 대상 | 테스트 목적 | 관련 요구사항/정책 | 사전 조건 / Mock | 입력값 / 테스트 데이터 | 실행 절차 | 기대 결과 | 실제 결과 | 판정 | 실패 원인 | 우선순위 | 테스트 파일 | 비고 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- |
| AI-UNIT-MSG-001 | Worker Message | WorkerMessage 검증 | jobId 누락 메시지를 차단하는지 검증 | AI Worker Contract | Validator Fixture | jobId 누락 메시지 | 메시지 Validate 실행 | Validation Error를 반환한다. |  |  |  | 1 | `ai-worker/tests/domain/test_worker_message.py` | 기존 테스트 확인 |
| AI-UNIT-MSG-002 | Worker Message | WorkerMessage 검증 | inputType 누락 메시지를 차단하는지 검증 | AI Worker Contract | Validator Fixture | inputType 누락 메시지 | 메시지 Validate 실행 | Validation Error를 반환한다. |  |  |  | 1 | `ai-worker/tests/domain/test_worker_message.py` | 필수값 |
| AI-UNIT-MSG-003 | Worker Message | WorkerMessage 검증 | 지원하지 않는 inputType을 차단하는지 검증 | AI Worker Contract | Validator Fixture | inputType=UNKNOWN | 메시지 Validate 실행 | Validation Error를 반환한다. |  |  |  | 1 | `ai-worker/tests/domain/test_worker_message.py` | 허용값 검증 |
| AI-UNIT-MSG-004 | Worker Message | RGB_SINGLE 정합성 | RGB_SINGLE에서 imageId가 null이면 실패하는지 검증 | AI Worker Contract | Validator Fixture | inputType=RGB_SINGLE, imageId=null | 메시지 Validate 실행 | Validation Error를 반환한다. |  |  |  | 1 | `ai-worker/tests/domain/test_worker_message.py` | 단건 분석 |
| AI-UNIT-MSG-005 | Worker Message | THERMAL_SINGLE 정합성 | THERMAL_SINGLE에서 imageId가 null이면 실패하는지 검증 | AI Worker Contract | Validator Fixture | inputType=THERMAL_SINGLE, imageId=null | 메시지 Validate 실행 | Validation Error를 반환한다. |  |  |  | 1 | `ai-worker/tests/domain/test_worker_message.py` | 단건 분석 |
| AI-UNIT-MSG-006 | Worker Message | 모델 유형 정합성 | inputType과 requestedModelType이 일치하지 않으면 실패하는지 검증 | AI Worker Contract | Validator Fixture | RGB_SINGLE + THERMAL_ONLY | 메시지 Validate 실행 | Validation Error를 반환한다. |  |  |  | 1 | `ai-worker/tests/domain/test_worker_message.py` | 라우팅 정합성 |
| AI-UNIT-MSG-007 | Worker Message | Storage 메타데이터 검증 | 분석에 필요한 원본 이미지 Storage 정보가 없을 때 실패하는지 검증 | AI Worker Contract, Storage 설계 | Validator 또는 Metadata Fixture | bucketName 또는 objectKey 누락 | 메시지 또는 Metadata 검증 실행 | 명확한 Validation 또는 Metadata 오류를 반환한다. |  |  |  | 1 |  | 실제 메시지 계약 확인 필요 |
| AI-UNIT-PROC-001 | Analysis Processor | AnalysisJobProcessor | QUEUED Job 수신 시 RUNNING으로 변경하는지 검증 | AI Worker Contract | JobRepository Mock | QUEUED Job | Processor 실행 후 상태 업데이트 확인 | RUNNING 상태 업데이트가 호출된다. |  |  |  | 1 | `ai-worker/tests/application/test_analysis_job_processor.py` | 기존 테스트 확인 |
| AI-UNIT-PROC-002 | Analysis Processor | AnalysisJobProcessor | 성공 처리 후 SUCCEEDED로 변경하는지 검증 | AI Worker Contract | Inference / Storage / Repository Mock | 정상 RGB 또는 Thermal 메시지 | Processor 실행 | 결과 저장 후 SUCCEEDED 상태로 변경된다. |  |  |  | 1 | `ai-worker/tests/application/test_analysis_job_processor.py` | 성공 흐름 |
| AI-UNIT-PROC-003 | Analysis Processor | AnalysisJobProcessor | 처리 실패 시 FAILED와 실패 정보를 저장하는지 검증 | AI Worker Contract | Inference Mock 실패 | 추론 예외 발생 케이스 | Processor 실행 | FAILED 상태와 `failureCode`, `failureMessage`가 저장된다. |  |  |  | 1 | `ai-worker/tests/application/test_analysis_job_processor.py` | 실패 처리 |
| AI-UNIT-PROC-004 | Analysis Processor | AnalysisJobProcessor | 이미 SUCCEEDED인 Job을 중복 처리하지 않는지 검증 | 멱등성 정책 | JobRepository Mock | SUCCEEDED Job | Processor 실행 | 추론과 결과 저장을 다시 수행하지 않는다. |  |  |  | 1 | `ai-worker/tests/application/test_analysis_job_processor.py` | Idempotency |
| AI-UNIT-PROC-005 | Analysis Processor | AnalysisJobProcessor | 이미지 유형에 맞는 전처리와 Runner를 호출하는지 검증 | AI Worker Contract | Registry / Preprocess Mock | RGB 메시지, Thermal 메시지 | 각 입력 유형으로 Processor 실행 | RGB와 Thermal 경로가 각각 올바른 전처리와 Runner를 호출한다. |  |  |  | 1 | `ai-worker/tests/application/test_analysis_job_processor.py` | 단건 라우팅 |
| AI-UNIT-PORT-001 | Port Contract | Application Ports | Application 계층 Port 계약이 유지되는지 검증 | AI Worker 아키텍처 기준 | Port 구현 Mock | 각 Port Method 호출 | Port Interface 호출 | 계약된 Method와 반환 구조가 유지된다. |  |  |  | 2 | `ai-worker/tests/application/test_ports_contract.py` | 아키텍처 경계 |
| AI-UNIT-META-001 | Metadata Loader | Image Metadata Loader | imageId 기준 RGB 이미지 메타데이터를 조회하는지 검증 | AI Worker Contract | Repository Mock | RGB imageId | Metadata Load 실행 | RGB 이미지의 Bucket, Object Key, Image Type 등을 반환한다. |  |  |  | 1 |  | 실제 파일 확인 필요 |
| AI-UNIT-META-002 | Metadata Loader | Image Metadata Loader | imageId 기준 Thermal 이미지 메타데이터를 조회하는지 검증 | AI Worker Contract | Repository Mock | Thermal imageId | Metadata Load 실행 | Thermal 이미지의 Bucket, Object Key, Image Type 등을 반환한다. |  |  |  | 1 |  | 실제 파일 확인 필요 |
| AI-UNIT-META-003 | Metadata Loader | 이미지 상태 검증 | 업로드 실패 또는 비활성 이미지 메타데이터를 분석에 사용하지 않는지 검증 | 이미지 상태 정책 | Repository Mock | 비활성 또는 업로드 실패 imageId | Metadata Load 실행 | 분석 불가 오류를 반환한다. |  |  |  | 1 |  | 상태 검증 |
| AI-UNIT-REG-001 | Model Registry | Model Registry | RGB_SINGLE 요청 시 RGB_ONLY 모델을 선택하는지 검증 | AI Worker Contract | Model Registry Fixture | inputType=RGB_SINGLE | Model Lookup 실행 | RGB_ONLY Runner를 반환한다. |  |  |  | 1 | `ai-worker/tests/infrastructure/test_model_registry.py` | 기존 테스트 확인 |
| AI-UNIT-REG-002 | Model Registry | Model Registry | THERMAL_SINGLE 요청 시 THERMAL_ONLY 모델을 선택하는지 검증 | AI Worker Contract | Model Registry Fixture | inputType=THERMAL_SINGLE | Model Lookup 실행 | THERMAL_ONLY Runner를 반환한다. |  |  |  | 1 | `ai-worker/tests/infrastructure/test_model_registry.py` | 기존 테스트 확인 |
| AI-UNIT-REG-003 | Model Registry | Model Registry | 지원하지 않는 입력 또는 모델 유형을 차단하는지 검증 | AI Worker Contract | Model Registry Fixture | 지원하지 않는 Model Type | Model Lookup 실행 | 지원하지 않는 모델 오류를 반환한다. |  |  |  | 1 | `ai-worker/tests/infrastructure/test_model_registry.py` | 허용값 검증 |
| AI-UNIT-REG-004 | Model Registry | Model Registry | 모델 파일이 없을 때 명확한 실패를 반환하는지 검증 | 모델 로딩 정책 | Missing Model Path | 존재하지 않는 모델 경로 | Model Load 실행 | MODEL_NOT_FOUND 계열 오류를 반환한다. |  |  |  | 1 | `ai-worker/tests/infrastructure/test_model_registry.py` | 환경 차이 주의 |
| AI-UNIT-ONNX-001 | ONNX Runner | ONNX Model Runner | ONNX Runtime Session 실행을 정상 호출하는지 검증 | ONNX Runner 계약 | ONNX Runtime Session Mock | 정상 Input Tensor | Runner 실행 | Inference Output을 반환한다. |  |  |  | 1 | `ai-worker/tests/infrastructure/test_onnx_model_runner.py` | 기존 테스트 확인 |
| AI-UNIT-ONNX-002 | ONNX Runner | ONNX Model Runner | 입력 Shape가 맞지 않으면 실패하는지 검증 | 모델 입력 계약 | Session Mock | 잘못된 Shape Tensor | Runner 실행 | Shape 관련 오류 또는 명확한 실패를 반환한다. |  |  |  | 2 | `ai-worker/tests/infrastructure/test_onnx_model_runner.py` | 입력 검증 |
| AI-UNIT-PREP-001 | Preprocess | RGB 전처리 함수 | RGB Resize / Normalize 결과 Shape가 모델 입력과 맞는지 검증 | RGB 모델 입력 계약 | Sample RGB Array | RGB 이미지 | RGB Preprocess 실행 | 기대 Shape와 Data Type의 Tensor를 반환한다. |  |  |  | 1 | `ai-worker/tests/infrastructure/test_preprocess.py` | 기존 테스트 확인 |
| AI-UNIT-PREP-002 | Preprocess | Thermal 전처리 함수 | Thermal Resize / Normalize 결과 Shape가 모델 입력과 맞는지 검증 | Thermal 모델 입력 계약 | Sample Thermal Array | Thermal 이미지 | Thermal Preprocess 실행 | 기대 Shape와 Data Type의 Tensor를 반환한다. |  |  |  | 1 | `ai-worker/tests/infrastructure/test_preprocess.py` | 기존 테스트 확인 |
| AI-UNIT-PREP-003 | Preprocess | 잘못된 이미지 입력 처리 | Decode할 수 없는 이미지 입력을 차단하는지 검증 | 전처리 오류 정책 | Invalid Image Fixture | 손상된 이미지 Bytes | Preprocess 실행 | 명확한 Decode 또는 Preprocess 오류를 반환한다. |  |  |  | 1 | `ai-worker/tests/infrastructure/test_preprocess.py` | 장애 처리 |
| AI-UNIT-POST-001 | Output Parser | 출력 파서 | Bounding Box / Class / Confidence 결과를 내부 DTO로 변환하는지 검증 | 모델 출력 계약 | Inference Output Mock | Raw Output | Output Parse 실행 | Detection DTO 목록을 반환한다. |  |  |  | 1 | `ai-worker/tests/infrastructure/test_output_parser.py` | 기존 테스트 확인 |
| AI-UNIT-POST-002 | Output Parser | Threshold 처리 | Confidence Threshold 미만 결과를 제외하거나 저신뢰도로 분리하는지 검증 | 후처리 정책 | Threshold Config | Low Confidence Output | Output Parse 실행 | 정책에 따라 제외하거나 LOW_CONFIDENCE로 처리한다. |  |  |  | 1 | `ai-worker/tests/infrastructure/test_output_parser.py` | 후처리 |
| AI-UNIT-POST-003 | Output Parser | 빈 탐지 처리 | 빈 탐지 결과를 NORMAL로 처리하는지 검증 | 결과 상태 정책 | Empty Output | Detection 없음 | Output Parse 실행 | `resultStatus=NORMAL`로 처리한다. |  |  |  | 1 | `ai-worker/tests/infrastructure/test_output_parser.py` | 정상 결과 |
| AI-UNIT-POST-004 | Output Parser | 선택적 Mask 처리 | Segmentation Mask가 존재할 때만 Mask 결과를 생성하는지 검증 | 결과 시각화 계약 | Segmentation Output Mock | Mask 포함 또는 미포함 Output | Output Parse 실행 | Mask가 있을 때만 Mask 메타데이터를 생성한다. |  |  |  | 2 | `ai-worker/tests/infrastructure/test_output_parser.py` | 실제 모델 출력 확인 필요 |
| AI-UNIT-OVERLAY-001 | Overlay | Bounding Box Overlay 생성 | Bounding Box 시각화 이미지를 생성하는지 검증 | 결과 시각화 계약 | Image + Bounding Box Fixture | Detection List | Overlay 생성 실행 | Bounding Box가 반영된 이미지가 생성된다. |  |  |  | 2 | `ai-worker/tests/infrastructure/test_overlay.py` | 기존 테스트 확인 |
| AI-UNIT-OVERLAY-002 | Overlay | Heatmap Overlay 생성 | Heatmap 데이터가 있을 때 시각화 이미지를 생성하는지 검증 | 결과 시각화 계약 | Image + Heatmap Fixture | Heatmap Data | Overlay 생성 실행 | Heatmap 이미지가 생성된다. |  |  |  | 2 | `ai-worker/tests/infrastructure/test_overlay.py` | 구현 범위 확인 필요 |
| AI-UNIT-OVERLAY-003 | Overlay | Overlay 실패 처리 | 잘못된 이미지 입력에서 실패 원인을 반환하는지 검증 | 시각화 오류 정책 | Invalid Image Fixture | Invalid Image | Overlay 실행 | 명확한 실패 원인을 반환한다. |  |  |  | 2 | `ai-worker/tests/infrastructure/test_overlay.py` | 장애 처리 |
| AI-UNIT-RESULT-001 | Result Repository | 결과 저장소 | 분석 결과 요약을 저장하는지 검증 | 결과 저장 계약 | Repository Mock | Result Summary | Save 실행 | 저장 메서드가 정상 호출된다. |  |  |  | 1 | `ai-worker/tests/infrastructure/test_result_repository.py` | 기존 테스트 확인 |
| AI-UNIT-RESULT-002 | Result Repository | 결함 후보 저장 | Detected Defect 목록을 저장하는지 검증 | 결과 저장 계약 | Repository Mock | Defects List | Save Defects 실행 | 결함 후보가 분석 결과에 연결되어 저장된다. |  |  |  | 1 | `ai-worker/tests/infrastructure/test_result_repository.py` | 결과 상세 |
| AI-UNIT-RESULT-003 | Result Repository | 선택적 결과 경로 저장 | 생성된 시각화 경로만 저장하는지 검증 | Storage 설계 | Repository Mock | BBox만 존재하는 결과 | Result Save 실행 | BBox 경로만 저장하고 Heatmap과 Mask는 null로 처리한다. |  |  |  | 2 | `ai-worker/tests/infrastructure/test_result_repository.py` | 선택적 시각화 |
| AI-UNIT-STOR-001 | Object Storage | Storage Adapter | Bucket Name / Object Key 기준으로 원본 이미지를 읽는지 검증 | Storage 설계 | Storage Client Mock | bucketName, objectKey | Read 실행 | Image Bytes를 반환한다. |  |  |  | 1 |  | 관련 테스트 확인 필요 |
| AI-UNIT-STOR-002 | Object Storage | Storage Adapter | Object Key가 없으면 실패 처리하는지 검증 | Storage 설계 | Storage Client Mock | 존재하지 않는 objectKey | Read 실행 | Storage Error를 반환한다. |  |  |  | 1 |  | 실패 처리 |
| AI-UNIT-STOR-003 | Object Storage | Storage Adapter | 결과 이미지를 지정된 결과 Object Key에 저장하는지 검증 | Storage 설계 | Storage Client Mock | result bytes, result objectKey | Write 실행 | 지정된 Bucket과 Object Key로 저장 호출한다. |  |  |  | 1 |  | 실제 Storage 호출 금지 |
| AI-UNIT-SQS-001 | SQS Worker | SQS Worker | SQS 메시지를 Processor에 전달하는지 검증 | AI Worker Contract | SQS Client Mock, Processor Mock | Queue Message | Poll 후 Process 실행 | Processor가 메시지 정보로 호출된다. |  |  |  | 1 | `ai-worker/tests/workers/test_sqs_worker.py` | 기존 테스트 확인 |
| AI-UNIT-SQS-002 | SQS Worker | SQS Worker | 처리 성공 시 메시지를 삭제하는지 검증 | Queue 처리 정책 | SQS Client Mock | 성공 처리 메시지 | Process 성공 처리 | `delete_message`가 호출된다. |  |  |  | 1 | `ai-worker/tests/workers/test_sqs_worker.py` | 중복 방지 |
| AI-UNIT-SQS-003 | SQS Worker | SQS Worker | 처리 실패 시 메시지 삭제 및 재시도 정책을 지키는지 검증 | Queue 재시도 정책 | Processor Mock 실패 | 실패 메시지 | Process 실패 처리 | 계약에 따라 삭제하지 않거나 재시도·DLQ 처리를 적용한다. |  |  |  | 2 | `ai-worker/tests/workers/test_sqs_worker.py` | 실제 재시도 정책 확인 필요 |
| AI-UNIT-HEALTH-001 | FastAPI Health | Health Handler | Health API Handler가 정상 응답 객체를 반환하는지 검증 | Worker Health 계약 | TestClient 또는 함수 단위 | Health 요청 | Handler 호출 | 정상 상태 응답을 반환한다. |  |  |  | 2 | `ai-worker/tests/api/test_health.py` | FastAPI 의존성 필요 |

---

## 3. Frontend 단위테스트 시나리오표

| 테스트 ID | 모듈/영역 | 테스트 대상 | 테스트 목적 | 관련 요구사항/정책 | 사전 조건 / Mock | 입력값 / 테스트 데이터 | 실행 절차 | 기대 결과 | 실제 결과 | 판정 | 실패 원인 | 우선순위 | 테스트 파일 | 비고 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- |
| FE-UNIT-AUTH-001 | Auth | LoginPage | Google 로그인 버튼 클릭 시 OAuth 경로로 이동하는지 검증 | 인증 흐름 | window.location Mock | Google 로그인 클릭 | LoginPage에서 로그인 버튼 클릭 | `/oauth2/authorization/google`로 이동한다. |  |  |  | 1 |  | 실제 Frontend 경로 확인 |
| FE-UNIT-AUTH-002 | Auth | Auth 상태 분기 | PENDING 사용자를 승인 대기 페이지로 보내는지 검증 | 계정 승인 정책 | `/auth/me` API Mock | accountStatus=PENDING | Auth Check 실행 | `/pending`으로 이동한다. |  |  |  | 1 |  | 신규 작성 필요 |
| FE-UNIT-AUTH-003 | Auth | Auth 상태 분기 | APPROVED 사용자를 대시보드로 보내는지 검증 | 계정 승인 정책 | `/auth/me` API Mock | accountStatus=APPROVED | Auth Check 실행 | `/dashboard`로 이동한다. |  |  |  | 1 |  | 신규 작성 필요 |
| FE-UNIT-AUTH-004 | Auth | Logout 처리 | 로그아웃 성공 시 로그인 페이지로 이동하는지 검증 | 인증 흐름 | Logout API Mock | 204 Response | 로그인 상태에서 Logout 실행 | 인증 상태 초기화 후 `/login`으로 이동한다. |  |  |  | 1 |  | 204 처리 |
| FE-UNIT-GUARD-001 | Route Guard | ProtectedRoute | 비로그인 사용자의 보호 페이지 접근을 차단하는지 검증 | 인증 정책 | Auth Store Mock | 로그인 없음, `/dashboard` 접근 | Route Render | `/login`으로 이동한다. |  |  |  | 1 |  | 권한 핵심 |
| FE-UNIT-GUARD-002 | Route Guard | Pending Guard | PENDING 사용자의 주요 페이지 접근을 제한하는지 검증 | 승인 대기 정책 | Auth Store Mock | PENDING, `/plants` 접근 | Route Render | `/pending`으로 이동한다. |  |  |  | 1 |  | 승인 대기 |
| FE-UNIT-GUARD-003 | Route Guard | Admin Guard | USER가 관리자 페이지 접근 시 권한 없음 화면을 보는지 검증 | 관리자 권한 정책 | Auth Store Mock | role=USER, `/admin` 접근 | Route Render | Forbidden 또는 접근 불가 UI를 표시한다. |  |  |  | 1 |  | 관리자 제한 |
| FE-UNIT-GUARD-004 | Route Guard | Admin Guard | ADMIN은 관리자 페이지 접근이 가능한지 검증 | 관리자 권한 정책 | Auth Store Mock | role=ADMIN | Route Render | Admin 화면을 표시한다. |  |  |  | 2 |  | 관리자 |
| FE-UNIT-API-001 | API Client | 공통 API Client | 204 No Content를 JSON Parse 없이 처리하는지 검증 | API 204 규칙 | Fetch 또는 Axios Mock | 204 Response | API 호출 | Parse Error 없이 성공 처리한다. |  |  |  | 1 |  | Logout 중요 |
| FE-UNIT-API-002 | API Client | 공통 API Client | 공통 오류 응답을 UI용 오류로 변환하는지 검증 | API 오류 응답 규칙 | API Error Mock | 403 / 404 / 500 Error Body | API 호출 | `status`, `code`, `message`, `traceId` 등을 추출한다. |  |  |  | 1 |  | 오류 처리 |
| FE-UNIT-UI-001 | Common UI | Loading State | API 요청 중 Loading UI가 표시되는지 검증 | UI 상태 정책 | Pending API Mock | Loading 상태 | Component Render | Loading UI를 표시한다. |  |  |  | 2 |  | 공통 상태 |
| FE-UNIT-UI-002 | Common UI | Empty State | 조회 결과가 없을 때 빈 데이터 안내가 표시되는지 검증 | UI 상태 정책 | Empty API Mock | content=[] | Component Render | Empty 안내를 표시한다. |  |  |  | 2 |  | 공통 상태 |
| FE-UNIT-UI-003 | Common UI | Error State | API 오류 시 오류 안내와 재시도 버튼이 표시되는지 검증 | UI 상태 정책 | API Error Mock | 500 Error | Component Render | Error UI와 재시도 버튼을 표시한다. |  |  |  | 1 |  | 사용자 피드백 |
| FE-UNIT-PLANT-001 | Plant Page | PlantListPage | 발전소 목록 조회 결과가 화면에 표시되는지 검증 | 발전소 조회 요구사항 | GET `/plants` Mock | Plant List | Component Render | 발전소 목록을 표시한다. |  |  |  | 1 |  | 실제 UI 구조 확인 |
| FE-UNIT-PLANT-002 | Plant Page | PlantCreateForm | 발전소 등록 Form Validation이 동작하는지 검증 | 발전소 등록 요구사항 | Form Fixture | name empty | Form Submit | Validation Message를 표시한다. |  |  |  | 1 |  | 입력 검증 |
| FE-UNIT-PLANT-003 | Plant Page | PlantDetailPage | 발전소 상세 정보가 표시되는지 검증 | 발전소 상세 요구사항 | GET `/plants/{id}` Mock | Plant Detail | Component Render | 발전소 상세 정보를 표시한다. |  |  |  | 2 |  | 상세 화면 |
| FE-UNIT-ZONE-001 | Zone Page | ZoneDetailPage | 구역 상세 정보가 표시되는지 검증 | 구역 상세 요구사항 | GET `/zones/{id}` Mock | Zone Detail | Component Render | 구역 상세 정보를 표시한다. |  |  |  | 2 |  | 상세 화면 |
| FE-UNIT-ZONE-002 | Zone Page | EquipmentTree | Array / Panel / Module 구조가 표시되는지 검증 | 설비 계층 요구사항 | Equipment API Mock | Equipment Tree Data | Component Render | 설비 계층 구조를 표시한다. |  |  |  | 2 |  | 설비 구조 |
| FE-UNIT-INSP-001 | Inspection Page | InspectionListPage | 점검 목록이 표시되는지 검증 | 점검 조회 요구사항 | GET `/inspections` Mock | Inspection List | Component Render | 점검 목록을 표시한다. |  |  |  | 1 |  | 점검 핵심 |
| FE-UNIT-INSP-002 | Inspection Page | InspectionDetailPage | 점검 상세에서 이미지 업로드·선택·분석·상태 영역이 표시되는지 검증 | Frontend 화면 구성 명세 | API Mock | Inspection Detail, Image List | Component Render | RGB / Thermal 업로드 영역, 이미지 목록, 선택 상태, 분석 요청 영역을 표시한다. |  |  |  | 1 |  | 핵심 화면 |
| FE-UNIT-INSP-003 | Inspection Page | InspectionDetailPage | RGB와 Thermal 이미지를 유형별로 구분해 표시하는지 검증 | 이미지 표시 정책 | Image List Mock | RGB 이미지와 Thermal 이미지 목록 | Component Render | 각 이미지가 올바른 유형으로 구분되어 표시된다. |  |  |  | 1 |  | 이미지 유형 |
| FE-UNIT-IMG-001 | Image Upload Widget | ImageUploadWidget | RGB / THERMAL 타입 선택이 동작하는지 검증 | 이미지 업로드 정책 | Form State Mock | imageType 선택 | Select 실행 | 선택 상태가 RGB 또는 THERMAL로 변경된다. |  |  |  | 1 |  | 이미지 업로드 |
| FE-UNIT-IMG-002 | Image Upload Widget | ImageUploadWidget | ZONE 대상은 equipmentId 없이 유효한지 검증 | 이미지 대상 정책 | Form State Mock | targetType=ZONE, equipmentId=null | Validation 실행 | Valid 상태로 처리한다. |  |  |  | 1 |  | Zone 전체 |
| FE-UNIT-IMG-003 | Image Upload Widget | ImageUploadWidget | PANEL 대상은 equipmentId가 없을 때 업로드를 막는지 검증 | 이미지 대상 정책 | Form State Mock | targetType=PANEL, equipmentId=null | Validation 실행 | Validation Error를 표시한다. |  |  |  | 1 |  | 위치 정합성 |
| FE-UNIT-IMG-004 | Image List | ImageSelection | 사용자가 이미지 한 건을 선택하면 imageId가 선택 상태에 저장되는지 검증 | 단건 분석 UI 흐름 | Image List Fixture | imageId=100 선택 | 이미지 카드 또는 행 클릭 | 선택된 `imageId=100`이 상태에 저장되고 선택 표시가 나타난다. |  |  |  | 1 |  | 분석 대상 선택 |
| FE-UNIT-IMG-005 | Image List | ImageSelection | RGB와 Thermal 이미지 중 한 건만 분석 대상으로 선택되는지 검증 | 단건 분석 UI 흐름 | Image List Fixture | 이미지 두 건 순차 선택 | 첫 이미지 선택 후 다른 이미지 선택 | 마지막에 선택한 이미지 한 건만 활성 선택 상태가 된다. |  |  |  | 1 |  | 단건 선택 |
| FE-UNIT-IMG-006 | Image Upload Widget | 업로드 실패 UI | 이미지 업로드 실패 시 오류 안내와 재시도 동작을 제공하는지 검증 | UI 오류 정책 | Upload API Error Mock | 업로드 실패 응답 | 파일 업로드 실행 | 오류 메시지와 재시도 또는 다시 선택 UI를 표시한다. |  |  |  | 1 |  | 사용자 피드백 |
| FE-UNIT-AI-001 | Analysis Widget | AnalysisRequestButton | 유효한 imageId가 선택되면 분석 요청 버튼이 활성화되는지 검증 | 단건 분석 요청 흐름 | State Mock | imageId 존재 | Component Render | 분석 요청 버튼이 활성화된다. |  |  |  | 1 |  | 단건 분석 |
| FE-UNIT-AI-002 | Analysis Widget | AnalysisRequestButton | 선택된 imageId가 없으면 분석 요청을 막는지 검증 | 단건 분석 요청 흐름 | State Mock | imageId 없음 | Component Render 또는 Click | 버튼이 비활성화되거나 대상 선택 안내를 표시한다. |  |  |  | 1 |  | 입력 검증 |
| FE-UNIT-AI-003 | Analysis Widget | 분석 요청 Payload | 분석 요청 시 선택된 imageId만 API 요청 Body에 포함하는지 검증 | API 명세 | Analysis API Mock | imageId=100 | 분석 요청 버튼 클릭 | 요청 Body에 `imageId=100`이 포함된다. |  |  |  | 1 |  | Public 요청 계약 |
| FE-UNIT-AI-004 | Analysis Status | AnalysisStatusBadge | QUEUED / RUNNING / SUCCEEDED / FAILED 상태를 표시하는지 검증 | 분석 상태 정책 | Status Fixture | 각 jobStatus 값 | Component Render | 상태별 텍스트 또는 Badge를 올바르게 표시한다. |  |  |  | 2 |  | 분석 상태 |
| FE-UNIT-AI-005 | Analysis Status | RetryButton | FAILED 분석에서 재시도 버튼이 표시되고 재요청되는지 검증 | 분석 재시도 정책 | Analysis API Mock | FAILED Job, imageId | 재시도 버튼 클릭 | 해당 이미지 기준 재분석 요청을 호출한다. |  |  |  | 2 |  | 실제 재시도 API 확인 필요 |
| FE-UNIT-AI-006 | Analysis Widget | 중복 요청 방지 | 분석 요청 전송 중 버튼을 반복 클릭할 수 없는지 검증 | UI 상태 정책 | Pending Analysis API Mock | 요청 진행 상태 | 분석 버튼 연속 클릭 | 첫 요청 후 버튼이 비활성화되고 중복 호출이 발생하지 않는다. |  |  |  | 1 |  | 중복 Job 방지 보조 |
| FE-UNIT-RESULT-001 | Result Page | ResultListPage | 분석 결과 목록이 표시되는지 검증 | 결과 조회 요구사항 | Analysis Result API Mock | Result List | Component Render | 결과 목록을 표시한다. |  |  |  | 1 |  | 실제 API 경로 확인 |
| FE-UNIT-RESULT-002 | Result Page | ResultDetailPage | 원본 이미지와 결과 이미지 비교 영역이 표시되는지 검증 | 결과 상세 요구사항 | Result Detail Mock | Original / Result Image URL | Component Render | 원본·결과 비교 Viewer를 표시한다. |  |  |  | 1 |  | 결과 시각화 |
| FE-UNIT-RESULT-003 | Result Page | ResultDetailPage | Detected Defect 목록이 표시되는지 검증 | 결과 상세 요구사항 | Result Detail Mock | Defects List | Component Render | Class, Confidence, Area 등 결함 정보를 표시한다. |  |  |  | 2 |  | 상세 결과 |
| FE-UNIT-RESULT-004 | Result Page | ReviewStatusForm | 검토 상태 변경 API 호출이 되는지 검증 | 결과 검토 정책 | PATCH Mock | CONFIRMED 선택 | Form Submit | 검토 상태 변경 API를 호출하고 화면 상태를 갱신한다. |  |  |  | 2 |  | 리뷰 흐름 |
| FE-UNIT-RESULT-005 | Result Page | 선택적 시각화 UI | Heatmap 또는 Mask가 없는 결과에서 빈 Viewer를 강제로 표시하지 않는지 검증 | 결과 시각화 계약 | Result Detail Mock | BBox만 있는 결과 | Component Render | 실제 존재하는 시각화만 표시하고 없는 항목은 숨기거나 안내한다. |  |  |  | 2 |  | 선택적 결과 |
| FE-UNIT-DASH-001 | Dashboard | DashboardPage | KPI 카드와 통계 차트가 표시되는지 검증 | Dashboard 요구사항 | Dashboard API Mock | Dashboard Summary | Component Render | KPI와 차트를 표시한다. |  |  |  | 2 |  | 대시보드 |
| FE-UNIT-TRACK-001 | Tracking | TrackingPage | 변화 추적 결과가 표시되는지 검증 | 변화 추적 요구사항 | Tracking API Mock | Compare Result | Component Render | 이전·현재 결과의 변화 정보를 표시한다. |  |  |  | 3 |  | 후순위 |
| FE-UNIT-ADMIN-001 | Admin | AdminPage | 승인 대기 사용자 목록이 표시되는지 검증 | 관리자 요구사항 | Admin API Mock | Pending Users | Component Render | 승인 대기 사용자 목록을 표시한다. |  |  |  | 2 |  | 관리자 |
| FE-UNIT-ADMIN-002 | Admin | AdminPage | 사용자 승인 버튼 클릭 시 승인 API가 호출되는지 검증 | 관리자 요구사항 | PATCH Mock | Approve Click | 승인 버튼 클릭 | 승인 API를 호출하고 사용자 상태를 갱신한다. |  |  |  | 2 |  | 관리자 |

---

## 4. 테스트 실행 결과 요약

| 구분 | 전체 | Pass | Fail | Skip | Blocked | N/A |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Backend |  |  |  |  |  |  |
| AI Worker |  |  |  |  |  |  |
| Frontend |  |  |  |  |  |  |
| 합계 |  |  |  |  |  |  |

---

## 5. 실패 테스트 기록

| 테스트 ID | 실행 환경 | 실패 요약 | 원인 | 수정 여부 | 재실행 결과 | 관련 Issue / PR |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

실패 원인을 기록할 때는 다음을 구분한다.

- 실제 코드 결함
- 테스트 코드 결함
- 요구사항 또는 정책 미확정
- 환경 또는 의존성 문제
- Mock 설정 오류
- 테스트 데이터 오류
- 현재 구현 범위 밖의 기능

---

## 6. Blocked 테스트 기록

| 테스트 ID | 차단 원인 | 필요한 결정 또는 작업 | 담당 | 해제 조건 |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

다음 상황에서는 `Fail`보다 `Blocked`를 우선 검토한다.

- 정책이 아직 확정되지 않음
- 테스트 대상 코드가 아직 구현되지 않음
- 테스트 Runner 또는 Dependency가 없음
- 실제 Interface 또는 Method 이름을 확인하지 못함
- 외부 계약이 확정되지 않음
- 테스트 Fixture를 만들기 위한 데이터 구조가 미정임

---

## 7. 완료 기준

단위테스트 작업은 다음 조건을 만족해야 한다.

- 실제 실행한 테스트의 결과를 기록했다.
- 실행하지 않은 테스트를 Pass로 기록하지 않았다.
- 실패한 테스트의 원인과 재실행 결과를 기록했다.
- 구현되지 않은 기능은 Skip 또는 Blocked로 구분했다.
- Backend 단위테스트에서 실제 PostgreSQL, MinIO/S3, SQS를 호출하지 않았다.
- AI Worker 단위테스트에서 실제 S3, SQS, 운영 모델 파일을 필수로 요구하지 않았다.
- Frontend 단위테스트에서 API 응답을 Mock으로 격리했다.
- RGB와 Thermal 단건 분석 흐름을 각각 검증했다.
- 분석 요청과 Queue 메시지가 `imageId` 기준으로 구성되는지 검증했다.
- RGB 입력이 `RGB_ONLY` 모델로 연결되는지 검증했다.
- Thermal 입력이 `THERMAL_ONLY` 모델로 연결되는지 검증했다.
- 현재 운영 범위에 없는 Pair 생성·관리와 Fusion 분석 테스트를 포함하지 않았다.
- 선택적으로 생성되는 Heatmap과 Mask를 모든 결과의 필수값으로 가정하지 않았다.
- 정책 미확정 항목을 임의의 기대 결과로 확정하지 않았다.
- 실제 저장소에 존재하지 않는 테스트 파일을 존재한다고 보고하지 않았다.