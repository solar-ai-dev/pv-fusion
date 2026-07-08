# API 명세서 및 권한 매트릭스

## ERD 정합성 + API 관례 보정본

## 1. 문서 개요

이 문서는 RGB·열화상 기반 태양광 구역 관리 플랫폼의 Backend Public API, API 권한 매트릭스, 내부 AI Worker 처리 계약, 공통 응답 형식, 상태값, 오류 코드를 정의한다.

이 문서는 ERD 기준으로 정합성을 보정하고, REST API 관례를 반영한 API 명세서이다.

---

## 2. API 설계 기준

### 2.1 기본 원칙

* Frontend는 Spring Boot Backend Public API만 호출한다.
* Frontend는 S3, MinIO, SQS, RDS, AI Worker에 직접 접근하지 않는다.
* FastAPI AI Worker는 외부 사용자에게 직접 노출하지 않는다.
* AI 분석은 Backend가 분석 작업을 생성하고 Queue에 등록한 뒤, AI Worker가 비동기로 처리한다.
* 원본 이미지와 분석 결과 이미지는 S3 또는 MinIO에 저장한다.
* DB에는 이미지 파일 자체가 아니라 파일 메타데이터와 객체 저장소 경로를 저장한다.
* 일반 사용자는 본인이 생성했거나 접근 권한이 있는 데이터만 조회·수정할 수 있다.
* 관리자는 전체 사용자, 발전소, 구역, 이미지, 분석 작업, 분석 결과, 점검 결과를 조회할 수 있다.
* 성공 코드가 `204 No Content`인 API는 Response Body를 반환하지 않는다.
* 이미지 Stream 응답은 공통 JSON 응답 형식을 사용하지 않는다.
* Worker Contract는 외부 HTTP API가 아니라 내부 처리 규약이다.
* Pair 생성·관리와 Fusion 분석은 현재 운영 API 및 Worker Contract 범위에 포함하지 않는다.

---

## 3. ERD 정합성 기준

### 3.1 저장 컬럼과 조회 필드 구분

API Request/Response에는 화면 편의를 위해 `plantId`, `zoneId`, `inspectionId`, `targetType`, `equipmentId` 등이 포함될 수 있다.

단, API에 포함된 필드가 반드시 해당 테이블의 저장 컬럼이라는 의미는 아니다.

| 항목 | 기준 |
| --- | --- |
| `plantId` | `zones.plant_id`를 통해 조회되는 값 |
| `zoneId` | `inspections.zone_id`를 통해 조회되는 값 |
| `inspectionId` | 분석 대상 이미지를 통해 조회되는 값 |
| `targetType` | 이미지의 검사 대상 단위 |
| `equipmentId` | Array, Panel, Module 대상일 때 사용, Zone 전체 대상이면 `null` 가능 |
| `imageId` | `inspection_images.id` |
| `jobId` | `analysis_jobs.id` |
| `resultId` | `analysis_results.id` |

### 3.2 ERD 기준 핵심 관계

| 도메인 | 기준 |
| --- | --- |
| 점검 | `INSPECTIONS`는 `zone_id`만 직접 가진다. `plant_id`는 저장하지 않는다. |
| 이미지 | `INSPECTION_IMAGES`는 `inspection_id`를 가진다. `plant_id`, `zone_id`는 저장하지 않는다. |
| 분석 작업 | `ANALYSIS_JOBS`는 `image_id`로 식별되는 이미지 한 건을 대상으로 생성한다. `inspection_id`는 저장하지 않는다. |
| 분석 결과 | `ANALYSIS_RESULTS`는 `analysis_job_id`를 통해 대상 정보를 조회한다. |
| 결함 후보 | `DETECTED_DEFECTS`는 `analysis_result_id`를 기준으로 개별 결함 후보를 저장한다. |
| 검토 이력 | `RESULT_REVIEW_HISTORIES`는 `analysis_result_id`를 기준으로 검토 상태 변경 이력을 저장한다. |
| 운영 로그 | `OPERATION_LOGS`는 주요 이벤트 추적용이며 여러 대상을 선택적으로 참조할 수 있다. |
| 시스템 로그 | MVP DB 테이블로 분리하지 않고 CloudWatch Logs 또는 Console Log 등 외부 로그 체계를 우선 사용한다. |

현재 운영 분석은 RGB 이미지와 열화상 이미지를 각각 단건으로 처리한다.

Pair 생성·관리 및 Fusion 분석은 연구 범위와 분리하며, 현재 운영 ERD와 API 계약에는 포함하지 않는다.

---

## 4. API 설계 범위

### 4.1 Public Backend API

Frontend가 호출하는 API이다.

| 구분 | 설명 |
| --- | --- |
| 호출 주체 | React Frontend |
| 처리 서버 | Spring Boot Backend |
| 주요 역할 | 인증, 권한 검증, 발전소·구역·점검 관리, 이미지 메타데이터 관리, 이미지별 분석 작업 생성, 결과 조회 |
| 외부 노출 | 가능 |
| 인증 필요 | 대부분 필요 |

### 4.2 Internal Worker Contract

Backend, SQS, AI Worker 사이의 내부 처리 규약이다.

| 구분 | 설명 |
| --- | --- |
| 호출 주체 | Spring Boot Backend, FastAPI AI Worker |
| 처리 방식 | SQS 기반 비동기 처리 |
| 주요 역할 | 이미지 단건 분석 작업 메시지 전달, 객체 저장소 이미지 읽기, ONNX 추론, 결과 이미지 저장, 결과 메타데이터 저장 |
| 외부 노출 | 금지 |

---

# 5. 공통 API 규칙

## 5.1 Base URL

| 환경 | Base URL |
| --- | --- |
| 로컬 | `http://localhost:8080/api/v1` |
| 운영 | `https://{domain}/api/v1` |

## 5.2 인증 방식

| 항목 | 기준 |
| --- | --- |
| 로그인 방식 | Google OAuth2 |
| 인증 상태 확인 | `GET /auth/me` |
| 인증 정보 | Session 또는 JWT 중 구현 단계에서 확정 |
| 접근 제어 | Backend 권한 검증을 최종 기준으로 적용 |

## 5.3 공통 Header

### JSON 요청

```http
Content-Type: application/json
```

### 파일 업로드 요청

```http
Content-Type: multipart/form-data
```

### 인증 Header / Cookie

인증 방식은 구현 단계에서 Session 또는 JWT 중 확정한다.

| 인증 방식 | 기준 |
| --- | --- |
| JWT 사용 시 | `Authorization: Bearer {accessToken}` |
| Session 사용 시 | 브라우저 Cookie 기반 인증 |
| 공통 기준 | Backend에서 인증 상태와 권한을 최종 검증한다. |

주의:

* Session 방식을 사용할 경우 모든 요청에 `Authorization: Bearer` Header가 필요한 것은 아니다.
* JWT 방식을 사용할 경우 인증이 필요한 API는 `Authorization` Header를 사용한다.

## 5.4 공통 성공 응답 형식

```json
{
  "success": true,
  "data": {},
  "message": "요청이 성공했습니다."
}
```

## 5.4.1 204 No Content 응답 규칙

성공 코드가 `204`인 API는 Response Body를 반환하지 않는다.

예시:

```http
HTTP/1.1 204 No Content
```

주의:

* `204` 응답에서는 공통 성공 응답 형식의 JSON Body를 사용하지 않는다.
* 성공 메시지나 변경된 데이터를 반환해야 하는 경우 `200 OK`를 사용한다.

## 5.5 공통 목록 응답 형식

```json
{
  "success": true,
  "data": {
    "content": [],
    "page": 0,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0,
    "hasNext": false
  },
  "message": "조회가 완료되었습니다."
}
```

## 5.6 공통 오류 응답 형식

```json
{
  "success": false,
  "error": {
    "status": 403,
    "code": "FORBIDDEN",
    "message": "접근 권한이 없습니다.",
    "detail": "해당 데이터에 접근할 수 없습니다.",
    "path": "/api/v1/plants/1",
    "timestamp": "2026-06-01T10:00:00+09:00",
    "traceId": "req-20260601-0001"
  }
}
```

## 5.7 Pagination 규칙

| Query Parameter | 설명 | 기본값 |
| --- | --- | --- |
| `page` | 페이지 번호 | `0` |
| `size` | 페이지 크기 | `20` |
| `sort` | 정렬 기준 | `createdAt,desc` |

예시:

```http
GET /api/v1/plants?page=0&size=20&sort=createdAt,desc
```

---

# 6. 권한 역할 정의

| 역할 | 설명 |
| --- | --- |
| 비로그인 | 로그인하지 않은 사용자 |
| 승인 대기 | Google 로그인은 완료했지만 관리자 승인을 받지 않은 사용자 |
| 일반 사용자 | 관리자 승인을 받은 일반 사용자 |
| 관리자 | 전체 데이터 조회 및 사용자 관리 권한을 가진 사용자 |
| 시스템/Internal | Backend, AI Worker, Queue 등 내부 시스템 처리 주체 |

## 6.1 권한 표기

| 표기 | 의미 |
| --- | --- |
| O | 접근 허용 |
| - | 접근 불가 |
| 조건부 | 본인 데이터 또는 접근 권한이 있는 데이터만 허용 |
| Internal | 내부 시스템만 허용 |

---

# 7. API 권한 매트릭스

| API ID | API명 | Method | Endpoint | 비로그인 | 승인 대기 | 일반 사용자 | 관리자 | 시스템/Internal | 데이터 범위 |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| API-AUTH-001 | Google 로그인 시작 | GET | `/auth/google` | O | O | O | O | - | 없음 |
| API-AUTH-002 | OAuth2 Callback | GET | `/auth/oauth2/callback/{registrationId}` | O | O | O | O | - | 없음 |
| API-AUTH-003 | 내 정보 조회 | GET | `/auth/me` | - | O | O | O | - | 본인 |
| API-AUTH-004 | 로그아웃 | POST | `/auth/logout` | - | O | O | O | - | 본인 |
| API-ADMIN-USER-001 | 승인 대기 회원 목록 조회 | GET | `/admin/users/pending` | - | - | - | O | - | 전체 |
| API-ADMIN-USER-002 | 전체 사용자 목록 조회 | GET | `/admin/users` | - | - | - | O | - | 전체 |
| API-ADMIN-USER-003 | 사용자 상세 조회 | GET | `/admin/users/{userId}` | - | - | - | O | - | 전체 |
| API-ADMIN-USER-004 | 회원 승인 | PATCH | `/admin/users/{userId}/approve` | - | - | - | O | - | 전체 |
| API-ADMIN-USER-005 | 사용자 권한 변경 | PATCH | `/admin/users/{userId}/role` | - | - | - | O | - | 전체 |
| API-ADMIN-USER-006 | 사용자 비활성화 | PATCH | `/admin/users/{userId}/deactivate` | - | - | - | O | - | 전체 |
| API-PLANT-001 | 발전소 목록 조회 | GET | `/plants` | - | - | O | O | - | 일반: 접근 가능 / 관리자: 전체 |
| API-PLANT-002 | 발전소 등록 | POST | `/plants` | - | - | O | O | - | 생성자 기준 |
| API-PLANT-003 | 발전소 상세 조회 | GET | `/plants/{plantId}` | - | - | 조건부 | O | - | 접근 가능 발전소 |
| API-PLANT-004 | 발전소 정보 수정 | PATCH | `/plants/{plantId}` | - | - | 조건부 | O | - | 소유 또는 관리 권한 |
| API-PLANT-005 | 발전소 비활성화 | PATCH | `/plants/{plantId}/deactivate` | - | - | 조건부 | O | - | 소유 또는 관리 권한 |
| API-ZONE-001 | 구역 목록 조회 | GET | `/plants/{plantId}/zones` | - | - | 조건부 | O | - | 접근 가능 발전소 |
| API-ZONE-002 | 구역 등록 | POST | `/plants/{plantId}/zones` | - | - | 조건부 | O | - | 접근 가능 발전소 |
| API-ZONE-003 | 구역 상세 조회 | GET | `/zones/{zoneId}` | - | - | 조건부 | O | - | 접근 가능 구역 |
| API-ZONE-004 | 구역 정보 수정 | PATCH | `/zones/{zoneId}` | - | - | 조건부 | O | - | 소유 또는 관리 권한 |
| API-ZONE-005 | 구역 비활성화 | PATCH | `/zones/{zoneId}/deactivate` | - | - | 조건부 | O | - | 소유 또는 관리 권한 |
| API-EQUIP-001 | 하위 설비 구조 조회 | GET | `/zones/{zoneId}/equipments` | - | - | 조건부 | O | - | 접근 가능 구역 |
| API-EQUIP-002 | 하위 설비 등록 | POST | `/zones/{zoneId}/equipments` | - | - | 조건부 | O | - | 접근 가능 구역 |
| API-EQUIP-003 | 하위 설비 수정 | PATCH | `/equipments/{equipmentId}` | - | - | 조건부 | O | - | 접근 가능 설비 |
| API-EQUIP-004 | 하위 설비 비활성화 | PATCH | `/equipments/{equipmentId}/deactivate` | - | - | 조건부 | O | - | 접근 가능 설비 |
| API-INSPECT-001 | 점검 목록 조회 | GET | `/inspections` | - | - | O | O | - | 일반: 접근 가능 / 관리자: 전체 |
| API-INSPECT-002 | 점검 등록 | POST | `/inspections` | - | - | O | O | - | 접근 가능 구역 |
| API-INSPECT-003 | 점검 상세 조회 | GET | `/inspections/{inspectionId}` | - | - | 조건부 | O | - | 접근 가능 점검 |
| API-INSPECT-004 | 점검 정보 수정 | PATCH | `/inspections/{inspectionId}` | - | - | 조건부 | O | - | 접근 가능 점검 |
| API-IMAGE-001 | 이미지 업로드 | POST | `/images` | - | - | O | O | - | 접근 가능 점검/검사 대상 |
| API-IMAGE-002 | 이미지 목록 조회 | GET | `/images` | - | - | O | O | - | 일반: 접근 가능 / 관리자: 전체 |
| API-IMAGE-003 | 이미지 상세 조회 | GET | `/images/{imageId}` | - | - | 조건부 | O | - | 접근 가능 이미지 |
| API-IMAGE-004 | 이미지 미리보기 조회 | GET | `/images/{imageId}/preview` | - | - | 조건부 | O | - | 접근 가능 이미지 |
| API-IMAGE-005 | 이미지 비활성화 | PATCH | `/images/{imageId}/deactivate` | - | - | 조건부 | O | - | 접근 가능 이미지 |
| API-AI-JOB-001 | AI 분석 요청 | POST | `/analysis-jobs` | - | - | O | O | - | 접근 가능 이미지 |
| API-AI-JOB-002 | 분석 작업 목록 조회 | GET | `/analysis-jobs` | - | - | O | O | - | 일반: 접근 가능 / 관리자: 전체 |
| API-AI-JOB-003 | 분석 작업 상태 조회 | GET | `/analysis-jobs/{jobId}` | - | - | 조건부 | O | - | 접근 가능 작업 |
| API-AI-JOB-004 | 분석 재요청 | POST | `/analysis-jobs/{jobId}/retry` | - | - | 조건부 | O | - | 실패 또는 재검토 필요 작업 |
| API-RESULT-001 | 점검 결과 목록 조회 | GET | `/results` | - | - | O | O | - | 일반: 접근 가능 / 관리자: 전체 |
| API-RESULT-002 | 점검 결과 상세 조회 | GET | `/results/{resultId}` | - | - | 조건부 | O | - | 접근 가능 결과 |
| API-RESULT-003 | 분석 결과 이미지 조회 | GET | `/results/{resultId}/visualization` | - | - | 조건부 | O | - | 접근 가능 결과 이미지 |
| API-RESULT-004 | 검토 상태 변경 | PATCH | `/results/{resultId}/review-status` | - | - | 조건부 | O | - | 접근 가능 결과 |
| API-RESULT-005 | 조치 후보 수정 | PATCH | `/results/{resultId}/action` | - | - | 조건부 | O | - | 접근 가능 결과 |
| API-TRACK-001 | 변화 추적 조회 | GET | `/tracking` | - | - | O | O | - | 접근 가능 대상 |
| API-TRACK-002 | 이전 점검 비교 조회 | GET | `/tracking/compare` | - | - | O | O | - | 접근 가능 대상 |
| API-DASH-001 | 사용자 대시보드 조회 | GET | `/dashboard` | - | - | O | O | - | 일반: 접근 가능 / 관리자: 전체 |
| API-DASH-002 | 조치 유형별 통계 조회 | GET | `/dashboard/action-stats` | - | - | O | O | - | 접근 가능 범위 |
| API-DASH-003 | 심각도 분포 조회 | GET | `/dashboard/severity-stats` | - | - | O | O | - | 접근 가능 범위 |
| API-DASH-004 | 기간별 점검 추이 조회 | GET | `/dashboard/trends` | - | - | O | O | - | 접근 가능 범위 |
| API-ADMIN-001 | 전체 발전소·구역 조회 | GET | `/admin/plants` | - | - | - | O | - | 전체 |
| API-ADMIN-002 | 전체 업로드 이미지 조회 | GET | `/admin/images` | - | - | - | O | - | 전체 |
| API-ADMIN-003 | 전체 AI 분석 작업 조회 | GET | `/admin/analysis-jobs` | - | - | - | O | - | 전체 |
| API-ADMIN-004 | 전체 점검 결과 조회 | GET | `/admin/results` | - | - | - | O | - | 전체 |
| API-ADMIN-005 | 관리자 대시보드 조회 | GET | `/admin/dashboard` | - | - | - | O | - | 전체 |
| API-LOG-001 | 운영 로그 조회 | GET | `/admin/operation-logs` | - | - | - | O | - | 전체 |
| API-HEALTH-001 | Backend Health Check | GET | `/health` | O | O | O | O | O | 없음 |
| API-HEALTH-002 | Internal Health Check | GET | `/internal/health` | - | - | - | - | Internal | 내부 상태 |
| CONTRACT-WORKER-001 | AI Worker 작업 수신 | SQS Message | `analysis-job-queue` | - | - | - | - | Internal | 내부 작업 |
| CONTRACT-WORKER-002 | AI Worker 결과 처리 | Internal Process | `DB/S3 or Backend Callback` | - | - | - | - | Internal | 내부 작업 |

---

# 8. Public Backend API 명세

## 8.1 인증 / 사용자 API

### API-AUTH-001. Google 로그인 시작

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/auth/google` |
| 설명 | Google OAuth2 로그인 화면으로 이동한다. |
| 권한 | 비로그인 포함 전체 |
| 성공 코드 | 302 |
| 관련 요구사항 | FR-001 |

---

### API-AUTH-002. OAuth2 Callback

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/auth/oauth2/callback/{registrationId}` |
| 설명 | Google OAuth2 인증 결과를 처리한다. 최초 로그인 사용자는 승인 대기 상태로 등록한다. 현재 provider 식별자는 `google`을 사용하며 예시는 `/api/v1/auth/oauth2/callback/google`이다. |
| 권한 | 비로그인 포함 전체 |
| 성공 코드 | 302 |
| 관련 요구사항 | FR-001, FR-002, FR-003 |

---

### API-AUTH-003. 내 정보 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/auth/me` |
| 설명 | 현재 로그인한 사용자의 계정 상태와 권한을 조회한다. |
| 권한 | 승인 대기, 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-006, FR-009 |

Response 예시:

```json
{
  "success": true,
  "data": {
    "userId": 1,
    "email": "user@example.com",
    "name": "홍길동",
    "role": "USER",
    "accountStatus": "APPROVED"
  },
  "message": "사용자 정보를 조회했습니다."
}
```

---

### API-AUTH-004. 로그아웃

| 항목 | 내용 |
| --- | --- |
| Method | POST |
| Endpoint | `/api/v1/auth/logout` |
| 설명 | 현재 로그인 세션을 종료한다. |
| 권한 | 승인 대기, 일반 사용자, 관리자 |
| 성공 코드 | 204 |
| 관련 요구사항 | FR-010 |

주의:

* 성공 코드가 `204`이므로 Response Body를 반환하지 않는다.
* 로그아웃 후 Frontend는 클라이언트 인증 상태를 초기화한다.

---

## 8.2 관리자 사용자 API

### API-ADMIN-USER-001. 승인 대기 회원 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/admin/users/pending` |
| 설명 | 승인 대기 상태의 회원 목록을 조회한다. |
| 권한 | 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-004 |

---

### API-ADMIN-USER-002. 전체 사용자 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/admin/users` |
| 설명 | 전체 사용자 목록을 조회한다. |
| 권한 | 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-007, FR-008 |

Query Parameter:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `keyword` | string | N | 이메일 또는 이름 검색 |
| `role` | string | N | USER / ADMIN |
| `accountStatus` | string | N | PENDING / APPROVED / INACTIVE |
| `page` | number | N | 페이지 번호 |
| `size` | number | N | 페이지 크기 |

---

### API-ADMIN-USER-003. 사용자 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/admin/users/{userId}` |
| 설명 | 사용자 상세 정보와 주요 활동 요약을 조회한다. |
| 권한 | 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-007, FR-008 |

---

### API-ADMIN-USER-004. 회원 승인

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/admin/users/{userId}/approve` |
| 설명 | 승인 대기 회원을 승인 완료 상태로 변경한다. |
| 권한 | 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-005 |

---

### API-ADMIN-USER-005. 사용자 권한 변경

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/admin/users/{userId}/role` |
| 설명 | 사용자의 권한을 일반 사용자 또는 관리자로 변경한다. |
| 권한 | 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-007 |

Request 예시:

```json
{
  "role": "ADMIN"
}
```

---

### API-ADMIN-USER-006. 사용자 비활성화

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/admin/users/{userId}/deactivate` |
| 설명 | 사용자를 비활성화한다. 기존 등록 데이터는 삭제하지 않는다. |
| 권한 | 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-008 |

---

## 8.3 발전소 API

### API-PLANT-001. 발전소 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/plants` |
| 설명 | 접근 가능한 발전소 목록을 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-012 |

Query Parameter:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `keyword` | string | N | 발전소명 검색 |
| `status` | string | N | ACTIVE / INACTIVE |
| `page` | number | N | 페이지 번호 |
| `size` | number | N | 페이지 크기 |

---

### API-PLANT-002. 발전소 등록

| 항목 | 내용 |
| --- | --- |
| Method | POST |
| Endpoint | `/api/v1/plants` |
| 설명 | 발전소 기본 정보를 등록한다. 생성자는 발전소 접근 권한을 가진 사용자로 등록된다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 201 |
| 관련 요구사항 | FR-011 |

Request 예시:

```json
{
  "name": "서산 태양광 발전소",
  "location": "충청남도 서산시",
  "description": "1구역 중심 발전소"
}
```

---

### API-PLANT-003. 발전소 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/plants/{plantId}` |
| 설명 | 발전소 상세 정보와 연결된 구역 요약을 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 권한 조건 | 일반 사용자는 접근 권한이 있는 발전소만 가능 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-013 |

Response 주요 필드:

| 필드 | 설명 |
| --- | --- |
| `plantId` | 발전소 ID |
| `name` | 발전소명 |
| `location` | 위치 |
| `description` | 설명 |
| `status` | ACTIVE / INACTIVE |
| `zoneCount` | 구역 수 |
| `latestInspectionAt` | 최근 점검일 |
| `createdAt` | 생성 시각 |

---

### API-PLANT-004. 발전소 정보 수정

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/plants/{plantId}` |
| 설명 | 발전소 기본 정보를 수정한다. |
| 권한 | 일반 사용자, 관리자 |
| 권한 조건 | 소유자 또는 관리 권한 보유자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-014 |

Request 예시:

```json
{
  "name": "서산 태양광 발전소",
  "location": "충청남도 서산시",
  "description": "수정된 설명"
}
```

---

### API-PLANT-005. 발전소 비활성화

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/plants/{plantId}/deactivate` |
| 설명 | 발전소를 실제 삭제하지 않고 비활성화한다. |
| 권한 | 일반 사용자, 관리자 |
| 권한 조건 | 소유자 또는 관리 권한 보유자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-015 |

---

## 8.4 구역 API

### API-ZONE-001. 구역 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/plants/{plantId}/zones` |
| 설명 | 특정 발전소 하위 구역 목록과 요약 정보를 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 권한 조건 | 접근 가능한 발전소 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-017 |

Response 주요 필드:

| 필드 | 설명 |
| --- | --- |
| `zoneId` | 구역 ID |
| `plantId` | 발전소 ID |
| `name` | 구역명 |
| `arrayCount` | Array 수 |
| `panelCount` | Panel 수 |
| `latestInspectionAt` | 최근 점검일 |
| `anomalyCandidateCount` | 이상 후보 수 |
| `topActionCandidate` | 대표 조치 후보 |
| `priorityLevel` | 우선순위 |

---

### API-ZONE-002. 구역 등록

| 항목 | 내용 |
| --- | --- |
| Method | POST |
| Endpoint | `/api/v1/plants/{plantId}/zones` |
| 설명 | 발전소 하위 구역을 등록한다. |
| 권한 | 일반 사용자, 관리자 |
| 권한 조건 | 접근 가능한 발전소 |
| 성공 코드 | 201 |
| 관련 요구사항 | FR-016 |

Request 예시:

```json
{
  "name": "Zone-A",
  "location": "1구역 북측",
  "description": "A구역"
}
```

---

### API-ZONE-003. 구역 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/zones/{zoneId}` |
| 설명 | 구역 기본 정보, 하위 설비 구조, 최근 점검 결과, 점검 이력을 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 권한 조건 | 접근 가능한 구역 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-018 |

---

### API-ZONE-004. 구역 정보 수정

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/zones/{zoneId}` |
| 설명 | 구역명, 위치, 설명 등 기본 정보를 수정한다. |
| 권한 | 일반 사용자, 관리자 |
| 권한 조건 | 소유자 또는 관리 권한 보유자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-019 |

---

### API-ZONE-005. 구역 비활성화

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/zones/{zoneId}/deactivate` |
| 설명 | 구역과 하위 설비를 실제 삭제하지 않고 비활성화한다. |
| 권한 | 일반 사용자, 관리자 |
| 권한 조건 | 소유자 또는 관리 권한 보유자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-020 |

---

## 8.5 하위 설비 API

### API-EQUIP-001. 하위 설비 구조 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/zones/{zoneId}/equipments` |
| 설명 | Zone 하위의 Array, Panel, Module 구조를 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-023 |

Query Parameter:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `equipmentType` | string | N | ARRAY / PANEL / MODULE |
| `status` | string | N | ACTIVE / INACTIVE |

---

### API-EQUIP-002. 하위 설비 등록

| 항목 | 내용 |
| --- | --- |
| Method | POST |
| Endpoint | `/api/v1/zones/{zoneId}/equipments` |
| 설명 | Zone 하위에 Array, Panel, Module 구조를 등록한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 201 |
| 관련 요구사항 | FR-022 |

Request 예시:

```json
{
  "equipmentType": "PANEL",
  "name": "Panel-001",
  "parentEquipmentId": 10,
  "positionCode": "A01-P001"
}
```

설명:

| 필드 | 설명 |
| --- | --- |
| `equipmentType` | ARRAY / PANEL / MODULE |
| `parentEquipmentId` | 상위 설비 ID. 최상위 Array는 `null` 가능 |
| `positionCode` | A01-P001-M001 같은 위치 식별 코드 |

---

### API-EQUIP-003. 하위 설비 수정

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/equipments/{equipmentId}` |
| 설명 | 하위 설비 정보를 수정한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-024 |

---

### API-EQUIP-004. 하위 설비 비활성화

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/equipments/{equipmentId}/deactivate` |
| 설명 | 하위 설비를 실제 삭제하지 않고 비활성화한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-024 |

---

## 8.6 점검 API

### API-INSPECT-001. 점검 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/inspections` |
| 설명 | 접근 가능한 점검 목록을 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-025, FR-026 |

Query Parameter:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `plantId` | number | N | 발전소 기준 필터. `zones.plant_id` 기준 Join 조회 |
| `zoneId` | number | N | 구역 기준 필터 |
| `inspectionStatus` | string | N | READY / UPLOADING / ANALYZING / COMPLETED / FAILED |
| `from` | date | N | 시작일 |
| `to` | date | N | 종료일 |
| `page` | number | N | 페이지 번호 |
| `size` | number | N | 페이지 크기 |

주의:

* `plantId`는 `INSPECTIONS` 저장 컬럼이 아니다.
* 점검은 `zoneId` 기준으로 생성된다.
* 발전소 정보는 `zoneId → ZONES.plant_id` 관계로 조회한다.

---

### API-INSPECT-002. 점검 등록

| 항목 | 내용 |
| --- | --- |
| Method | POST |
| Endpoint | `/api/v1/inspections` |
| 설명 | 특정 구역에 대한 점검 정보를 등록한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 201 |
| 관련 요구사항 | FR-025, FR-026 |

Request 예시:

```json
{
  "zoneId": 10,
  "name": "2026년 6월 1차 점검",
  "capturedAt": "2026-06-01T10:00:00+09:00",
  "captureMethod": "DRONE",
  "inspectorName": "홍길동",
  "memo": "정기 점검"
}
```

저장 기준:

| 필드 | 저장 여부 | 설명 |
| --- | ---: | --- |
| `zoneId` | O | `inspections.zone_id` |
| `plantId` | X | `zoneId`를 통해 조회 |
| `name` | O | 점검명 |
| `capturedAt` | O | 촬영 또는 점검 시점 |
| `captureMethod` | O | DRONE / MANUAL / OTHER |
| `inspectorName` | O | 촬영자 또는 점검자 |
| `memo` | O | 비고 |

---

### API-INSPECT-003. 점검 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/inspections/{inspectionId}` |
| 설명 | 점검 정보, 연결 이미지, 이미지별 분석 상태, 결과 요약을 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-025, FR-026 |

Response 주요 필드:

| 필드 | 설명 |
| --- | --- |
| `inspectionId` | 점검 ID |
| `zoneId` | 구역 ID |
| `plantId` | 구역을 통해 조회된 발전소 ID |
| `name` | 점검명 |
| `capturedAt` | 촬영 또는 점검 시점 |
| `captureMethod` | 촬영 방식 |
| `inspectionStatus` | 점검 상태 |
| `images` | 연결 이미지 목록 |
| `analysisJobs` | 이미지별 분석 작업 요약 |

---

### API-INSPECT-004. 점검 정보 수정

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/inspections/{inspectionId}` |
| 설명 | 점검명, 촬영 시점, 촬영 방식, 촬영자, 비고를 수정한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-026 |

---

## 8.7 이미지 API

### API-IMAGE-001. 이미지 업로드

| 항목 | 내용 |
| --- | --- |
| Method | POST |
| Endpoint | `/api/v1/images` |
| Content-Type | `multipart/form-data` |
| 설명 | 점검 단위로 RGB 또는 열화상 이미지를 업로드한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 201 |
| 관련 요구사항 | FR-027, FR-028, FR-030, FR-032, FR-033, FR-036, FR-037, FR-038 |

Multipart Form Data:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `file` | file | Y | 이미지 파일 |
| `inspectionId` | number | Y | 점검 ID |
| `targetType` | string | Y | ZONE / ARRAY / PANEL / MODULE |
| `equipmentId` | number | N | Array, Panel, Module 대상 ID. Zone 전체 촬영이면 `null` |
| `imageType` | string | Y | RGB / THERMAL |
| `capturedAt` | datetime | N | 촬영 시각 |
| `memo` | string | N | 비고 |

정합성 기준:

| 항목 | 기준 |
| --- | --- |
| `plantId` | Request에서 받지 않는다. `inspectionId → zoneId → plantId`로 조회한다. |
| `zoneId` | Request에서 받지 않는다. `inspectionId → zoneId`로 조회한다. |
| `equipmentId` | `targetType`이 ARRAY / PANEL / MODULE이면 필요하다. |
| `equipmentId = null` | `targetType`이 ZONE이면 허용한다. |
| 중복 업로드 | 동일 `inspectionId`, `targetType`, `equipmentId`, `imageType` 조합 중복 여부를 검증한다. |

Response 예시:

```json
{
  "success": true,
  "data": {
    "imageId": 100,
    "inspectionId": 1,
    "zoneId": 10,
    "plantId": 1,
    "targetType": "PANEL",
    "equipmentId": 200,
    "imageType": "RGB",
    "originalFilename": "rgb_001.jpg",
    "bucketName": "pv-images",
    "objectKey": "inspections/1/rgb_001.jpg",
    "fileUrl": "/api/v1/images/100/preview",
    "uploadStatus": "UPLOADED",
    "status": "ACTIVE"
  },
  "message": "이미지가 업로드되었습니다."
}
```

주의:

* `zoneId`, `plantId`는 응답 편의를 위한 파생 조회 필드이다.
* 실제 이미지 파일은 S3 또는 MinIO에 저장한다.
* DB에는 `bucketName`, `objectKey`, `fileUrl`, 파일명, MIME 타입, 파일 크기 등을 저장한다.

---

### API-IMAGE-002. 이미지 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/images` |
| 설명 | 접근 가능한 업로드 이미지 목록을 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-034, FR-035 |

Query Parameter:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `plantId` | number | N | 발전소 기준 필터. Join 조회 |
| `zoneId` | number | N | 구역 기준 필터. Join 조회 |
| `inspectionId` | number | N | 점검 ID |
| `imageType` | string | N | RGB / THERMAL |
| `targetType` | string | N | ZONE / ARRAY / PANEL / MODULE |
| `equipmentId` | number | N | 설비 ID |
| `status` | string | N | ACTIVE / INACTIVE |

---

### API-IMAGE-003. 이미지 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/images/{imageId}` |
| 설명 | 이미지 메타데이터와 연결 정보를 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-033, FR-034 |

---

### API-IMAGE-004. 이미지 미리보기 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/images/{imageId}/preview` |
| 설명 | 권한 검증 후 이미지 미리보기 URL 또는 스트림을 제공한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-034 |

Query Parameter:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `mode` | string | N | URL / STREAM |

응답 방식:

| 방식 | 설명 |
| --- | --- |
| URL 응답 | Backend가 권한 검증 후 Presigned URL 또는 Backend 프록시 URL을 JSON으로 반환 |
| Stream 응답 | Backend가 권한 검증 후 이미지 바이너리를 직접 반환 |

URL 응답 예시:

```json
{
  "success": true,
  "data": {
    "imageId": 100,
    "url": "/api/v1/images/100/preview?mode=STREAM",
    "expiresAt": "2026-06-01T10:10:00+09:00"
  },
  "message": "이미지 미리보기 URL을 조회했습니다."
}
```

Stream 응답 기준:

```http
HTTP/1.1 200 OK
Content-Type: image/jpeg
```

주의:

* Stream 응답은 공통 JSON 응답 형식을 사용하지 않는다.
* URL 응답은 공통 JSON 응답 형식을 사용한다.
* S3 또는 MinIO 원본 URL을 직접 공개하지 않는다.
* Backend가 권한 검증 후 Presigned URL 또는 스트림을 제공한다.

---

### API-IMAGE-005. 이미지 비활성화

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/images/{imageId}/deactivate` |
| 설명 | 이미지를 실제 삭제하지 않고 비활성화한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-033 |

---

## 8.8 AI 분석 작업 API

### API-AI-JOB-001. AI 분석 요청

| 항목 | 내용 |
| --- | --- |
| Method | POST |
| Endpoint | `/api/v1/analysis-jobs` |
| 설명 | 업로드된 RGB 이미지 또는 열화상 이미지 한 건에 대한 분석 작업을 생성한다. 실제 분석은 비동기로 처리한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 202 |
| 관련 요구사항 | FR-039, FR-040, FR-044, FR-045, FR-046 |

Request 예시:

```json
{
  "imageId": 100
}
```

검증 및 라우팅 기준:

| 조건 | 기준 |
| --- | --- |
| 분석 대상 | `imageId`로 식별되는 활성 이미지 한 건 |
| RGB 단건 | 대상 이미지의 `imageType`이 `RGB`이면 `RGB_SINGLE`, `RGB_ONLY`로 라우팅 |
| Thermal 단건 | 대상 이미지의 `imageType`이 `THERMAL`이면 `THERMAL_SINGLE`, `THERMAL_ONLY`로 라우팅 |
| 지원하지 않는 유형 | RGB 또는 THERMAL이 아닌 이미지 유형은 분석 요청 거부 |
| 중복 분석 | 동일 이미지에 진행 중인 Job이 있으면 중복 생성 제한 가능 |
| 재분석 | 재요청 또는 모델 버전 변경 시 동일 `imageId`에 새 Job을 생성할 수 있음 |

Response 예시:

```json
{
  "success": true,
  "data": {
    "jobId": 1000,
    "jobStatus": "QUEUED",
    "inputType": "RGB_SINGLE",
    "modelType": "RGB_ONLY",
    "imageId": 100,
    "requestedAt": "2026-06-01T10:00:00+09:00"
  },
  "message": "분석 작업이 등록되었습니다."
}
```

주의:

* 분석 요청 Request는 현재 운영 기준으로 `imageId`만 받는다.
* `inputType`과 `modelType`은 대상 이미지의 `imageType`을 기준으로 Backend가 결정한다.
* `ANALYSIS_JOBS`는 `inspection_id`를 직접 저장하지 않는다.
* 점검, 구역, 발전소 정보는 `imageId`를 통해 조회한다.
* 분석 작업 상태 필드는 `status`가 아니라 `jobStatus`로 표현한다.
* Pair 입력과 Fusion 모델 요청은 현재 운영 API에서 지원하지 않는다.

---

### API-AI-JOB-002. 분석 작업 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/analysis-jobs` |
| 설명 | 접근 가능한 이미지 단건 분석 작업 목록을 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-041, FR-049 |

Query Parameter:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `plantId` | number | N | 발전소 기준 필터. Join 조회 |
| `zoneId` | number | N | 구역 기준 필터. Join 조회 |
| `inspectionId` | number | N | 점검 기준 필터. Join 조회 |
| `imageId` | number | N | 분석 대상 이미지 ID |
| `jobStatus` | string | N | QUEUED / RUNNING / SUCCEEDED / FAILED |
| `inputType` | string | N | RGB_SINGLE / THERMAL_SINGLE |
| `modelType` | string | N | RGB_ONLY / THERMAL_ONLY |
| `page` | number | N | 페이지 번호 |
| `size` | number | N | 페이지 크기 |

주의:

* `plantId`, `zoneId`, `inspectionId`는 `analysis_jobs` 저장 컬럼이 아니다.
* 목록 조회 시 `analysis_jobs.image_id → inspection_images → inspections → zones → plants` 관계를 이용한다.

---

### API-AI-JOB-003. 분석 작업 상태 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/analysis-jobs/{jobId}` |
| 설명 | 이미지 단건 분석 작업의 현재 상태와 실패 사유를 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-041, FR-042 |

Response 예시:

```json
{
  "success": true,
  "data": {
    "jobId": 1000,
    "jobStatus": "RUNNING",
    "inputType": "RGB_SINGLE",
    "modelType": "RGB_ONLY",
    "imageId": 100,
    "requestedAt": "2026-06-01T10:00:00+09:00",
    "startedAt": "2026-06-01T10:01:00+09:00",
    "completedAt": null,
    "failureCode": null,
    "failureMessage": null
  },
  "message": "분석 작업 상태를 조회했습니다."
}
```

---

### API-AI-JOB-004. 분석 재요청

| 항목 | 내용 |
| --- | --- |
| Method | POST |
| Endpoint | `/api/v1/analysis-jobs/{jobId}/retry` |
| 설명 | 실패했거나 재검토가 필요한 이미지 단건 분석 작업을 다시 요청한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 202 |
| 관련 요구사항 | FR-042, FR-047 |

Response 예시:

```json
{
  "success": true,
  "data": {
    "jobId": 1001,
    "originalJobId": 1000,
    "imageId": 100,
    "jobStatus": "QUEUED"
  },
  "message": "분석 재요청이 등록되었습니다."
}
```

주의:

* 재요청은 기존 분석 대상 `imageId`를 유지하고 새로운 Job을 생성한다.
* 새 Job에는 새로운 `jobId`가 발급된다.

---

## 8.9 분석 결과 API

### API-RESULT-001. 점검 결과 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/results` |
| 설명 | 접근 가능한 이미지 단건 분석 결과 목록을 조회하고 조건별로 필터링한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-067, FR-068 |

Query Parameter:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `plantId` | number | N | 발전소 기준 필터. Join 조회 |
| `zoneId` | number | N | 구역 기준 필터. Join 조회 |
| `inspectionId` | number | N | 점검 기준 필터. Join 조회 |
| `imageId` | number | N | 분석 대상 이미지 ID |
| `targetType` | string | N | ZONE / ARRAY / PANEL / MODULE |
| `equipmentId` | number | N | 설비 ID |
| `inputType` | string | N | RGB_SINGLE / THERMAL_SINGLE |
| `modelType` | string | N | RGB_ONLY / THERMAL_ONLY |
| `jobStatus` | string | N | QUEUED / RUNNING / SUCCEEDED / FAILED |
| `resultStatus` | string | N | NORMAL / ANOMALY / LOW_CONFIDENCE |
| `actionCandidate` | string | N | CLEANING / RETAKE / FIELD_INSPECTION / REPLACEMENT_REVIEW |
| `severityLevel` | string | N | LOW / MEDIUM / HIGH / CRITICAL |
| `reviewStatus` | string | N | UNCHECKED / CONFIRMED / RECHECK_REQUIRED / ACTION_COMPLETED |
| `page` | number | N | 페이지 번호 |
| `size` | number | N | 페이지 크기 |

주의:

* `ANALYSIS_RESULTS`에는 `plant_id`, `zone_id`, `inspection_id`, `equipment_id`, `target_type`, `input_type`을 직접 저장하지 않는다.
* 위 필터들은 `analysis_job_id → analysis_jobs → inspection_images → inspections → zones → plants` 관계를 통해 조회한다.
* 조회 성능이 부족하면 중복 컬럼 추가보다 View, Materialized View, Index를 우선 검토한다.

---

### API-RESULT-002. 점검 결과 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/results/{resultId}` |
| 설명 | 분석 대상 이미지 한 건의 결과, 조치 후보, 심각도, 우선순위, 모델 정보, 시각화 정보를 상세 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-069 |

Response 주요 필드:

| 필드 | 설명 |
| --- | --- |
| `resultId` | 결과 ID |
| `jobId` | 분석 작업 ID |
| `imageId` | 분석 대상 이미지 ID |
| `plantId` | 파생 조회 필드 |
| `zoneId` | 파생 조회 필드 |
| `inspectionId` | 파생 조회 필드 |
| `inputType` | RGB_SINGLE / THERMAL_SINGLE |
| `modelType` | RGB_ONLY / THERMAL_ONLY |
| `targetType` | ZONE / ARRAY / PANEL / MODULE |
| `equipmentId` | 설비 ID |
| `detections` | bbox, class, confidence 목록 |
| `visualization` | 생성된 bbox, heatmap, mask 결과 이미지 정보 |
| `actionCandidate` | 조치 후보 |
| `severityScore` | 심각도 점수 |
| `severityLevel` | 심각도 등급 |
| `priorityLevel` | 우선순위 |
| `reviewStatus` | 검토 상태 |
| `modelInfo` | 모델명, 버전, Runtime, 입력 크기 |

Response 예시:

```json
{
  "success": true,
  "data": {
    "resultId": 5000,
    "jobId": 1000,
    "imageId": 101,
    "plantId": 1,
    "zoneId": 10,
    "inspectionId": 1,
    "inputType": "THERMAL_SINGLE",
    "modelType": "THERMAL_ONLY",
    "targetType": "PANEL",
    "equipmentId": 200,
    "resultStatus": "ANOMALY",
    "anomalyCount": 2,
    "maxConfidence": 0.91,
    "areaRatio": 0.034,
    "severityScore": 82.5,
    "severityLevel": "HIGH",
    "actionCandidate": "FIELD_INSPECTION",
    "priorityLevel": "HIGH",
    "reviewStatus": "UNCHECKED",
    "detections": [
      {
        "defectId": 1,
        "defectType": "HOTSPOT",
        "defectSource": "THERMAL",
        "confidence": 0.91,
        "areaRatio": 0.034,
        "bbox": {
          "x": 120,
          "y": 80,
          "width": 50,
          "height": 40
        },
        "severityLevel": "HIGH",
        "actionCandidate": "FIELD_INSPECTION"
      }
    ],
    "visualization": {
      "bboxImageUrl": "/api/v1/results/5000/visualization?type=BBOX",
      "heatmapUrl": null,
      "maskUrl": null
    },
    "modelInfo": {
      "modelName": "thermal-yolo26s",
      "modelVersion": "v1.0.0",
      "modelFormat": "ONNX_FP32",
      "runtime": "ONNX_RUNTIME",
      "inputSize": 640,
      "threshold": 0.25
    },
    "analyzedAt": "2026-06-01T10:03:00+09:00"
  },
  "message": "분석 결과를 조회했습니다."
}
```

주의:

* `plantId`, `zoneId`, `inspectionId`, `targetType`, `equipmentId`, `inputType`은 응답 편의용 파생 조회 필드이다.
* 저장 기준은 `analysis_results.analysis_job_id`이다.
* Heatmap과 Mask는 해당 분석 결과가 실제로 생성된 경우에만 제공한다.

---

### API-RESULT-003. 분석 결과 이미지 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/results/{resultId}/visualization` |
| 설명 | 권한 검증 후 생성된 분석 결과 시각화 이미지 URL 또는 스트림을 제공한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-050, FR-051, FR-052, FR-053, FR-054, FR-055 |

Query Parameter:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `type` | string | Y | BBOX / HEATMAP / MASK |
| `mode` | string | N | URL / STREAM |

응답 방식:

| 방식 | 설명 |
| --- | --- |
| URL 응답 | Backend가 권한 검증 후 Presigned URL 또는 Backend 프록시 URL을 JSON으로 반환 |
| Stream 응답 | Backend가 권한 검증 후 이미지 바이너리를 직접 반환 |

URL 응답 예시:

```json
{
  "success": true,
  "data": {
    "type": "BBOX",
    "url": "/api/v1/results/5000/visualization?type=BBOX&mode=STREAM",
    "expiresAt": "2026-06-01T10:10:00+09:00"
  },
  "message": "분석 결과 이미지 URL을 조회했습니다."
}
```

Stream 응답 기준:

```http
HTTP/1.1 200 OK
Content-Type: image/png
```

주의:

* Stream 응답은 공통 JSON 응답 형식을 사용하지 않는다.
* URL 응답은 공통 JSON 응답 형식을 사용한다.
* 실제 S3 또는 MinIO 원본 URL은 직접 공개하지 않는다.
* 요청한 시각화 유형이 생성되지 않은 결과라면 사용 불가 응답을 반환한다.

---

### API-RESULT-004. 검토 상태 변경

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/results/{resultId}/review-status` |
| 설명 | 분석 결과의 검토 상태를 변경하고 이력을 저장한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-070 |

Request 예시:

```json
{
  "reviewStatus": "CONFIRMED",
  "memo": "현장 확인 완료"
}
```

검토 이력 저장 기준:

| 항목 | 저장 테이블 |
| --- | --- |
| 이전 검토 상태 | `result_review_histories.previous_review_status` |
| 변경 검토 상태 | `result_review_histories.new_review_status` |
| 검토자 | `result_review_histories.reviewer_user_id` |
| 메모 | `result_review_histories.memo` |

---

### API-RESULT-005. 조치 후보 수정

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/results/{resultId}/action` |
| 설명 | 분석 결과의 조치 후보를 사용자가 수정하고 이력을 저장한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-071 |

Request 예시:

```json
{
  "actionCandidate": "REPLACEMENT_REVIEW",
  "memo": "반복 발생으로 교체 검토 필요"
}
```

---

## 8.10 변화 추적 API

### API-TRACK-001. 변화 추적 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/tracking` |
| 설명 | 동일 구역 또는 동일 검사 대상 단위의 이상 발생 이력과 변화 추이를 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-073 ~ FR-079 |

Query Parameter:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `plantId` | number | N | 발전소 기준 필터 |
| `zoneId` | number | N | 구역 기준 필터 |
| `targetType` | string | N | ZONE / ARRAY / PANEL / MODULE |
| `equipmentId` | number | N | 설비 ID |
| `from` | date | N | 시작일 |
| `to` | date | N | 종료일 |

---

### API-TRACK-002. 이전 점검 비교 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/tracking/compare` |
| 설명 | 동일 구역 또는 동일 검사 대상의 이전 점검 결과와 현재 점검 결과를 비교한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-074, FR-075, FR-076, FR-077, FR-078 |

Query Parameter:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `currentResultId` | number | Y | 현재 분석 결과 ID |
| `previousResultId` | number | N | 비교할 이전 분석 결과 ID. 없으면 시스템이 직전 결과 선택 |

Response 주요 필드:

| 필드 | 설명 |
| --- | --- |
| `currentResult` | 현재 분석 결과 요약 |
| `previousResult` | 이전 분석 결과 요약 |
| `areaRatioChange` | 이상 면적 변화 |
| `severityScoreChange` | 심각도 변화 |
| `isRepeatedAnomaly` | 반복 이상 여부 |
| `isWorsened` | 악화 여부 |
| `priorityReason` | 우선 관리 근거 |

---

## 8.11 대시보드 API

### API-DASH-001. 사용자 대시보드 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/dashboard` |
| 설명 | 접근 가능한 발전소와 구역의 점검 현황 및 이상 후보 현황을 요약 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-080, FR-081 |

Query Parameter:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `plantId` | number | N | 발전소 기준 필터 |
| `zoneId` | number | N | 구역 기준 필터 |
| `from` | date | N | 시작일 |
| `to` | date | N | 종료일 |

Response 주요 필드:

| 필드 | 설명 |
| --- | --- |
| `plantCount` | 접근 가능한 발전소 수 |
| `zoneCount` | 접근 가능한 구역 수 |
| `inspectionCount` | 점검 수 |
| `analysisJobCount` | 분석 작업 수 |
| `anomalyZoneCount` | 이상 후보 구역 수 |
| `highPriorityCount` | 우선 관리 대상 수 |
| `recentResults` | 최근 분석 결과 목록 |

---

### API-DASH-002. 조치 유형별 통계 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/dashboard/action-stats` |
| 설명 | 청소, 재촬영, 현장 점검, 교체 검토 후보 수를 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-082 |

---

### API-DASH-003. 심각도 분포 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/dashboard/severity-stats` |
| 설명 | 점검 결과의 심각도 분포를 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-083 |

---

### API-DASH-004. 기간별 점검 추이 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/dashboard/trends` |
| 설명 | 기간별 점검 수, 이상 후보 수, 조치 후보 추이를 조회한다. |
| 권한 | 일반 사용자, 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-085 |

Query Parameter:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `plantId` | number | N | 발전소 기준 필터 |
| `zoneId` | number | N | 구역 기준 필터 |
| `from` | date | N | 시작일 |
| `to` | date | N | 종료일 |
| `interval` | string | N | DAILY / WEEKLY / MONTHLY |

---

## 8.12 관리자 조회 API

### API-ADMIN-001. 전체 발전소·구역 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/admin/plants` |
| 설명 | 관리자가 전체 발전소와 구역 정보를 조회한다. |
| 권한 | 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-021 |

---

### API-ADMIN-002. 전체 업로드 이미지 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/admin/images` |
| 설명 | 관리자가 전체 업로드 이미지 목록과 이미지 유형, 점검 정보, 검사 대상 정보를 조회한다. |
| 권한 | 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-035 |

---

### API-ADMIN-003. 전체 AI 분석 작업 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/admin/analysis-jobs` |
| 설명 | 관리자가 전체 AI 분석 작업을 조회한다. |
| 권한 | 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-049 |

---

### API-ADMIN-004. 전체 점검 결과 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/admin/results` |
| 설명 | 관리자가 전체 점검 결과 목록과 상세 정보를 조회한다. |
| 권한 | 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-072 |

---

### API-ADMIN-005. 관리자 대시보드 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/admin/dashboard` |
| 설명 | 서비스 전체 기준의 회원 수, 업로드 건수, 분석 건수, 점검 결과 현황을 조회한다. |
| 권한 | 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | FR-089 |

---

## 8.13 운영 로그 API

### API-LOG-001. 운영 로그 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/admin/operation-logs` |
| 설명 | 로그인, 이미지 업로드, 분석 요청, 분석 실패, 결과 검토, 관리자 작업 등 주요 운영 이벤트 로그를 조회한다. |
| 권한 | 관리자 |
| 성공 코드 | 200 |
| 관련 요구사항 | NFR-063 |

Query Parameter:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | ---: | --- |
| `actorUserId` | number | N | 수행 사용자 ID |
| `eventCategory` | string | N | AUTH / IMAGE / ANALYSIS / RESULT / ADMIN |
| `eventType` | string | N | 이벤트 유형 |
| `plantId` | number | N | 발전소 ID |
| `zoneId` | number | N | 구역 ID |
| `inspectionId` | number | N | 점검 ID |
| `imageId` | number | N | 이미지 ID |
| `analysisJobId` | number | N | 분석 작업 ID |
| `analysisResultId` | number | N | 분석 결과 ID |
| `from` | datetime | N | 시작 시각 |
| `to` | datetime | N | 종료 시각 |
| `page` | number | N | 페이지 번호 |
| `size` | number | N | 페이지 크기 |

주의:

* 운영 로그는 `OPERATION_LOGS` 기반이다.
* 시스템 오류 상세 로그는 MVP DB 테이블로 분리하지 않는다.
* 시스템 오류 상세는 CloudWatch Logs 또는 Console Log 등 외부 로그 체계를 우선 사용한다.

---

## 8.14 Health Check API

### API-HEALTH-001. Backend Health Check

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/health` |
| 설명 | Backend 서버의 기본 상태를 확인한다. |
| 권한 | 전체 |
| 성공 코드 | 200 |

Response 예시:

```json
{
  "success": true,
  "data": {
    "status": "UP",
    "service": "backend",
    "timestamp": "2026-06-01T10:00:00+09:00"
  },
  "message": "Backend is healthy."
}
```

주의:

* 공개 Health Check에서는 DB, Storage, Queue 상세 오류 정보를 과도하게 노출하지 않는다.
* 상세 상태 점검이 필요하면 내부 모니터링용 Health Check를 별도 구성한다.

---

### API-HEALTH-002. Internal Health Check

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/internal/health` |
| 설명 | 내부 모니터링용 상세 상태를 확인한다. |
| 권한 | Internal |
| 성공 코드 | 200 |

Response 예시:

```json
{
  "success": true,
  "data": {
    "status": "UP",
    "database": "UP",
    "storage": "UP",
    "queue": "UP"
  },
  "message": "서비스가 정상 동작 중입니다."
}
```

주의:

* 내부 Health Check는 외부 사용자에게 노출하지 않는다.
* 운영 환경에서는 Ingress, Network Policy, 인증 또는 내부망 접근 제한으로 보호한다.

---

# 9. Internal Worker Contract

## 9.1 분석 작업 SQS Message Schema

Backend는 이미지 단건 분석 작업 생성 후 SQS에 다음 메시지를 등록한다.

```json
{
  "jobId": 1000,
  "inputType": "THERMAL_SINGLE",
  "imageId": 101,
  "requestedModelType": "THERMAL_ONLY",
  "requestedByUserId": 1,
  "traceId": "req-20260601-0001",
  "createdAt": "2026-06-01T10:00:00+09:00"
}
```

정합성 기준:

| 필드 | 기준 |
| --- | --- |
| `jobId` | `analysis_jobs.id` |
| `inputType` | RGB_SINGLE / THERMAL_SINGLE |
| `imageId` | `inspection_images.id` |
| `requestedModelType` | RGB_ONLY / THERMAL_ONLY |
| `plantId` | 메시지에 포함하지 않는다. 필요 시 Worker가 조회한다. |
| `zoneId` | 메시지에 포함하지 않는다. 필요 시 Worker가 조회한다. |
| `inspectionId` | 메시지에 포함하지 않는다. 필요 시 Worker가 조회한다. |

주의:

* 현재 운영 SQS 메시지는 `imageId` 기준 이미지 한 건만 대상으로 한다.
* Pair 식별자와 Fusion 모델 요청 정보는 현재 운영 메시지에 포함하지 않는다.

---

## 9.2 AI Worker 처리 흐름

```text
SQS 메시지 수신
→ jobId 기준 ANALYSIS_JOBS 조회
→ imageId 기준 이미지 메타데이터 조회
→ 객체 저장소에서 원본 이미지 읽기
→ inputType 기준 RGB_ONLY 또는 THERMAL_ONLY 모델 라우팅
→ ONNX Runtime 추론
→ 모델 출력에 따라 bbox / heatmap / mask 생성 또는 전달
→ 생성된 결과 이미지 객체 저장소 저장
→ ANALYSIS_RESULTS 저장 또는 Backend Internal API로 결과 전달
→ DETECTED_DEFECTS 저장 또는 Backend Internal API로 결과 전달
→ ANALYSIS_JOBS 상태 SUCCEEDED 또는 FAILED 변경
```

주의:

* Worker Contract는 외부 HTTP API가 아니다.
* RGB 입력은 RGB_ONLY 모델로, 열화상 입력은 THERMAL_ONLY 모델로 처리한다.
* Heatmap과 Mask는 해당 모델 출력에서 생성되는 경우에만 저장한다.
* Pair 입력과 Fusion 모델 라우팅은 현재 운영 Worker Contract에서 지원하지 않는다.
* AI Worker 결과 저장 방식은 구현 단계에서 다음 중 하나로 확정한다.
  * AI Worker가 DB/S3에 직접 저장
  * AI Worker가 결과 이미지는 S3/MinIO에 저장하고, 결과 메타데이터는 Backend Internal API로 전달
* 어떤 방식을 선택해도 Frontend는 AI Worker에 직접 접근하지 않는다.

---

## 9.3 AI Worker 성공 결과 Schema

AI Worker가 이미지 단건 분석 성공 시 저장 또는 전달해야 하는 결과 구조이다.

```json
{
  "jobId": 1000,
  "jobStatus": "SUCCEEDED",
  "result": {
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
      "bboxObjectKey": "results/5000/bbox.jpg",
      "bboxFileUrl": "/api/v1/results/5000/visualization?type=BBOX",
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

주의:

* `modelType`은 `RGB_ONLY` 또는 `THERMAL_ONLY`이다.
* 시각화 경로는 실제 결과가 생성된 항목만 값이 존재한다.
* `defectSource`는 `RGB` 또는 `THERMAL`이다.

---

## 9.4 AI Worker 실패 결과 Schema

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

---

# 10. 상태값 정의

## 10.1 UserRole

| 값 | 설명 |
| --- | --- |
| `USER` | 일반 사용자 |
| `ADMIN` | 관리자 |

## 10.2 AccountStatus

| 값 | 설명 |
| --- | --- |
| `PENDING` | 승인 대기 |
| `APPROVED` | 승인 완료 |
| `INACTIVE` | 비활성화 |

## 10.3 ResourceStatus

| 값 | 설명 |
| --- | --- |
| `ACTIVE` | 활성 |
| `INACTIVE` | 비활성 |

## 10.4 EquipmentType

| 값 | 설명 |
| --- | --- |
| `ARRAY` | Array |
| `PANEL` | Panel |
| `MODULE` | Module |

## 10.5 TargetType

| 값 | 설명 |
| --- | --- |
| `ZONE` | 구역 전체 |
| `ARRAY` | Array |
| `PANEL` | Panel |
| `MODULE` | Module |

## 10.6 ImageType

| 값 | 설명 |
| --- | --- |
| `RGB` | RGB 이미지 |
| `THERMAL` | 열화상 이미지 |

## 10.7 AnalysisInputType

| 값 | 설명 |
| --- | --- |
| `RGB_SINGLE` | RGB 단건 입력 |
| `THERMAL_SINGLE` | 열화상 단건 입력 |

## 10.8 ModelType

| 값 | 설명 |
| --- | --- |
| `RGB_ONLY` | RGB 단건 분석 모델 |
| `THERMAL_ONLY` | 열화상 단건 분석 모델 |

## 10.9 RequestedModelType

| 값 | 설명 |
| --- | --- |
| `AUTO` | 이미지 유형에 따라 자동 선택 |
| `RGB_ONLY` | RGB-only 모델 요청 |
| `THERMAL_ONLY` | Thermal-only 모델 요청 |

현재 Public API의 분석 요청은 `imageId`만 받으며, `requestedModelType`은 Backend의 모델 라우팅 결과 또는 내부 작업 정보로 관리할 수 있다.

## 10.10 JobStatus

| 값 | 설명 |
| --- | --- |
| `QUEUED` | 대기 |
| `RUNNING` | 분석 중 |
| `SUCCEEDED` | 분석 완료 |
| `FAILED` | 분석 실패 |

## 10.11 ResultStatus

| 값 | 설명 |
| --- | --- |
| `NORMAL` | 이상 후보 없음 |
| `ANOMALY` | 이상 후보 있음 |
| `LOW_CONFIDENCE` | 저신뢰도 또는 품질 문제 |

## 10.12 UploadStatus

| 값 | 설명 |
| --- | --- |
| `UPLOADED` | 업로드 완료 |
| `FAILED` | 업로드 실패 |

## 10.13 ReviewStatus

| 값 | 설명 |
| --- | --- |
| `UNCHECKED` | 미확인 |
| `CONFIRMED` | 확인 완료 |
| `RECHECK_REQUIRED` | 재검토 필요 |
| `ACTION_COMPLETED` | 조치 완료 |

## 10.14 ActionCandidate

| 값 | 설명 |
| --- | --- |
| `CLEANING` | 청소 후보 |
| `RETAKE` | 재촬영 후보 |
| `FIELD_INSPECTION` | 현장 점검 후보 |
| `REPLACEMENT_REVIEW` | 교체 검토 후보 |

## 10.15 SeverityLevel

| 값 | 설명 |
| --- | --- |
| `LOW` | 낮음 |
| `MEDIUM` | 보통 |
| `HIGH` | 높음 |
| `CRITICAL` | 심각 |

## 10.16 PriorityLevel

| 값 | 설명 |
| --- | --- |
| `LOW` | 낮음 |
| `MEDIUM` | 보통 |
| `HIGH` | 높음 |
| `URGENT` | 긴급 |

## 10.17 VisualizationType

| 값 | 설명 |
| --- | --- |
| `BBOX` | Bounding Box 결과 이미지 |
| `HEATMAP` | Heatmap 결과 이미지 |
| `MASK` | Mask 결과 이미지 |

## 10.18 VisualizationResponseMode

| 값 | 설명 |
| --- | --- |
| `URL` | URL JSON 응답 |
| `STREAM` | 이미지 바이너리 스트림 응답 |

---

# 11. 오류 코드 정의

| HTTP Status | Code | 설명 |
| ---: | --- | --- |
| 400 | `BAD_REQUEST` | 잘못된 요청 |
| 400 | `INVALID_INPUT` | 입력값 검증 실패 |
| 400 | `INVALID_FILE_FORMAT` | 지원하지 않는 파일 형식 |
| 400 | `FILE_SIZE_EXCEEDED` | 파일 크기 초과 |
| 400 | `INVALID_ANALYSIS_TARGET` | 분석 대상 이미지가 유효하지 않음 |
| 400 | `UNSUPPORTED_IMAGE_TYPE` | 현재 운영 분석에서 지원하지 않는 이미지 유형 |
| 401 | `UNAUTHORIZED` | 인증 필요 |
| 403 | `FORBIDDEN` | 접근 권한 없음 |
| 403 | `APPROVAL_REQUIRED` | 승인 대기 사용자 |
| 403 | `USER_DEACTIVATED` | 비활성화된 사용자 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `DUPLICATE_RESOURCE` | 중복 리소스 |
| 409 | `DUPLICATE_IMAGE_UPLOAD` | 동일 점검·동일 대상·동일 이미지 유형 중복 |
| 409 | `ANALYSIS_JOB_ALREADY_RUNNING` | 동일 이미지 분석 작업 진행 중 |
| 500 | `INTERNAL_SERVER_ERROR` | 서버 내부 오류 |
| 500 | `FILE_STORAGE_FAILED` | 파일 저장 실패 |
| 500 | `AI_INFERENCE_FAILED` | AI 추론 실패 |
| 503 | `QUEUE_UNAVAILABLE` | Queue 사용 불가 |
| 503 | `AI_WORKER_UNAVAILABLE` | AI Worker 사용 불가 |

---

# 12. 정합성 보정 메모

## 12.1 이번 보정에서 변경한 기준

| 항목 | 보정 전 | 보정 후 |
| --- | --- | --- |
| 점검 등록 | `plantId`, `zoneId` 함께 저장처럼 표현 | `zoneId` 기준 생성, `plantId`는 파생 조회 |
| 이미지 업로드 | `plantId`, `zoneId`를 이미지 메타데이터처럼 표현 | `inspectionId`, `targetType`, `equipmentId`, `imageType` 중심 |
| 이미지 미리보기 mode | `mode=stream` 소문자 예시 | `mode=STREAM`으로 enum 대소문자 통일 |
| Pair API | Pair 후보 조회·생성·수정·비활성화를 운영 API로 정의 | Pair 관련 Public API를 현재 운영 범위에서 제거 |
| 분석 Job | `imageId` 또는 `imagePairId`를 대상으로 생성 | `imageId` 한 건만 대상으로 생성하고 이미지 유형에 따라 단건 모델로 라우팅 |
| 분석 요청 Request | `inputType`, `imageId`, `imagePairId`, `requestedModelType`을 함께 전달 | Public API는 `imageId`만 전달하고 Backend가 `inputType`, `modelType`을 결정 |
| 분석 Job 상태 | `status` 혼용 | `jobStatus`로 통일 |
| 분석 Result | `plantId`, `zoneId`, `inspectionId`, `targetType` 저장처럼 표현 | `analysisJobId` 기준 저장, 대상 정보는 `imageId` 관계로 파생 조회 |
| 결과 우선 표시 | Pair가 있으면 Fusion 결과 우선 표시 | 분석 대상 이미지 한 건의 단건 결과를 표시 |
| 이미지 조회 | JSON 응답과 Stream 응답 혼재 가능 | URL 응답과 Stream 응답 기준 분리 |
| 상태값 | `RGB_THERMAL_PAIR`, `FUSION`, Fusion 요청 유형 포함 | `RGB_SINGLE`, `THERMAL_SINGLE`, `RGB_ONLY`, `THERMAL_ONLY`만 현재 운영 값으로 유지 |
| Worker Message | `imagePairId`와 Fusion 모델 요청 정보 포함 | `imageId` 기준 단건 작업 메시지로 통일 |
| 인증 Header | `Authorization: Bearer`만 고정 | JWT/Session 확정 전까지 Header/Cookie 기준 병기 |
| Health Check 권한 | `전체 또는 내부 모니터링`으로 애매한 표현 | `/health`는 전체, `/internal/health`는 Internal로 분리 |
| 시스템 로그 | DB 테이블처럼 오해 가능 | CloudWatch Logs 또는 Console Log 우선 |
| 운영 로그 | Pair 이벤트와 별도 관리자 로그 가능성 포함 | 이미지 업로드·분석 요청·결과 검토·관리자 작업을 `OPERATION_LOGS`로 통합 |
| Worker Contract | API처럼 보이는 표현 | Contract/Message/Internal Process로 구분 |

## 12.2 남은 확인 필요 사항

| 항목 | 확인 필요 내용 |
| --- | --- |
| 인증 방식 | JWT 또는 Session 중 구현 단계에서 확정 필요 |
| AI Worker 결과 저장 방식 | AI Worker 직접 DB 저장 또는 Backend Internal API Callback 방식 중 구현 단계에서 확정 필요 |
| Presigned URL 방식 | Backend 스트림 제공 또는 Presigned URL 제공 중 구현 단계에서 확정 필요 |
| 이미지 중복 기준 | 동일 점검·대상·이미지 유형만으로 중복을 제한할지, 동일 파일 해시 또는 별도 촬영 식별 기준을 적용할지 확인 필요 |
| 점검당 이미지 허용 개수 | RGB와 Thermal 이미지의 점검당 허용 개수와 동일 유형 다중 업로드 정책 확인 필요 |
| Plant Member 관리 API | ERD에는 `PLANT_MEMBERS`가 있어 발전소 접근 권한을 표현하지만, 현재 API 명세에는 발전소 멤버 초대·조회·권한 변경 API가 본문 기능으로 확정되어 있지 않다. MVP에서 생성자 중심으로만 운영할지, 발전소 단위 멤버 관리 API를 추가할지 확인 필요 |

---

# 13. 부록 / 후속 기능: 발전소 멤버 관리 API

이 섹션은 MVP 본문 기능이 아니라 후속 기능 후보이다.

MVP에서 발전소 단위 멤버 관리 기능을 포함하기로 확정할 경우 본문 권한 매트릭스와 상태값 정의에 편입한다. MVP에서 생성자 중심으로 단순 운영하기로 하면 이 섹션은 부록으로 유지한다.

## 13.1 선택 상태값 추가안

### MemberRole

| 값 | 설명 |
| --- | --- |
| `OWNER` | 발전소 소유자 |
| `MANAGER` | 발전소 관리 권한자 |
| `VIEWER` | 조회 권한자 |

---

## 13.2 권한 매트릭스 추가안

| API ID | API명 | Method | Endpoint | 비로그인 | 승인 대기 | 일반 사용자 | 관리자 | 시스템/Internal | 데이터 범위 |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| API-PLANT-MEMBER-001 | 발전소 멤버 목록 조회 | GET | `/plants/{plantId}/members` | - | - | 조건부 | O | - | 접근 가능 발전소 |
| API-PLANT-MEMBER-002 | 발전소 멤버 추가 | POST | `/plants/{plantId}/members` | - | - | 조건부 | O | - | 관리 권한 발전소 |
| API-PLANT-MEMBER-003 | 발전소 멤버 권한 변경 | PATCH | `/plants/{plantId}/members/{userId}/role` | - | - | 조건부 | O | - | 관리 권한 발전소 |
| API-PLANT-MEMBER-004 | 발전소 멤버 비활성화 | PATCH | `/plants/{plantId}/members/{userId}/deactivate` | - | - | 조건부 | O | - | 관리 권한 발전소 |

---

### API-PLANT-MEMBER-001. 발전소 멤버 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | GET |
| Endpoint | `/api/v1/plants/{plantId}/members` |
| 설명 | 발전소 접근 권한을 가진 멤버 목록을 조회한다. |
| 권한 | 발전소 OWNER/MANAGER 또는 관리자 |
| 성공 코드 | 200 |

---

### API-PLANT-MEMBER-002. 발전소 멤버 추가

| 항목 | 내용 |
| --- | --- |
| Method | POST |
| Endpoint | `/api/v1/plants/{plantId}/members` |
| 설명 | 발전소 접근 권한을 가진 멤버를 추가한다. |
| 권한 | 발전소 OWNER/MANAGER 또는 관리자 |
| 성공 코드 | 201 |

Request 예시:

```json
{
  "userId": 2,
  "memberRole": "VIEWER"
}
```

---

### API-PLANT-MEMBER-003. 발전소 멤버 권한 변경

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/plants/{plantId}/members/{userId}/role` |
| 설명 | 발전소 단위 멤버 권한을 변경한다. |
| 권한 | 발전소 OWNER/MANAGER 또는 관리자 |
| 성공 코드 | 200 |

Request 예시:

```json
{
  "memberRole": "MANAGER"
}
```

---

### API-PLANT-MEMBER-004. 발전소 멤버 비활성화

| 항목 | 내용 |
| --- | --- |
| Method | PATCH |
| Endpoint | `/api/v1/plants/{plantId}/members/{userId}/deactivate` |
| 설명 | 발전소 멤버 접근 권한을 비활성화한다. |
| 권한 | 발전소 OWNER/MANAGER 또는 관리자 |
| 성공 코드 | 200 |

주의:

* 발전소 멤버를 비활성화해도 사용자의 계정 자체를 비활성화하는 것은 아니다.
* 사용자 계정 비활성화는 관리자 사용자 API에서 처리한다.