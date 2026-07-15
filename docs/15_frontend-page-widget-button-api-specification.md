# Frontend 화면·위젯·버튼·API 구성 정리

## 1. 문서 목적

본 문서는 RGB·열화상 기반 태양광 구역 관리 플랫폼의 Frontend 초기 구현을 위해 필요한 페이지, 페이지별 기능, 통신 API, 공통 위젯, 위젯별 버튼을 정리한다.

본 문서는 디자인 시안을 만들기 전 단계의 기능 골격 정의서이다.

목표는 다음과 같다.

* 어떤 페이지가 필요한지 정리한다.
* 페이지별 필요한 기능, 버튼, 위젯, API 통신을 정리한다.
* 여러 페이지에서 재사용할 공통 위젯을 정의한다.
* Frontend가 직접 접근하면 안 되는 리소스를 명확히 한다.
* 구현 에이전트가 디자인 없이 기능 골격을 만들 수 있도록 기준을 제공한다.

현재 운영 서비스는 RGB 이미지와 열화상 이미지를 각각 독립적인 이미지 단위로 분석한다.

Pair 생성·관리와 Fusion 분석은 현재 Frontend 운영 범위에 포함하지 않는다.

Pair/Fusion 관련 내용은 모델·데이터 실험 설계서의 후속 연구 범위로 관리하며, 별도 검토와 승인 전에는 Frontend Route, Widget, API Module에 추가하지 않는다.

---

## 2. 기본 기준

### 2.1 Frontend 책임

Frontend는 다음을 담당한다.

* 화면 렌더링
* 사용자 입력 처리
* Spring Boot Backend Public API 호출
* RGB·열화상 이미지 업로드 UI
* 이미지 단건 AI 분석 요청 UI
* 분석 상태 조회 UI
* 결과 조회 및 시각화 UI
* 로딩, 빈 데이터, 오류, 권한 없음, 404 등 화면 상태 처리

### 2.2 Frontend가 직접 접근하지 않는 대상

Frontend는 다음 리소스에 직접 접근하지 않는다.

* S3
* MinIO
* SQS
* LocalStack SQS
* RDS
* PostgreSQL
* FastAPI AI Worker

원본 이미지, 분석 결과 이미지, 분석 작업, 분석 상태, 분석 결과는 모두 Backend Public API를 통해 조회한다.

### 2.3 API 표기 기준

이 문서의 API 표기는 기본적으로 `/api/v1`을 제외한 endpoint로 작성한다.

예:

~~~text
GET /plants
~~~

실제 호출 URL은 다음과 같이 구성한다.

~~~text
{VITE_API_BASE_URL}/plants
~~~

로컬 기본 예시는 다음과 같다.

~~~text
http://localhost:8080/api/v1/plants
~~~

### 2.4 인증 방식 기준

인증 방식은 구현 단계에서 Session 또는 JWT 중 확정한다.

따라서 Frontend API Client는 다음 둘 모두를 고려할 수 있는 구조로 둔다.

* Session 방식: `withCredentials: true`
* JWT 방식: `Authorization: Bearer {accessToken}` 확장 가능 구조

단, 인증과 권한 검증의 최종 기준은 Backend이다.

### 2.5 현재 운영 분석 기준

* 분석 요청은 `imageId`로 식별되는 이미지 한 건을 대상으로 한다.
* RGB 이미지는 `RGB_SINGLE`, `RGB_ONLY`로 처리한다.
* 열화상 이미지는 `THERMAL_SINGLE`, `THERMAL_ONLY`로 처리한다.
* Frontend는 분석 요청 시 모델 유형을 임의로 결정하지 않는다.
* Frontend는 선택한 이미지의 `imageId`만 Backend 분석 요청 API에 전달한다.
* Backend가 저장된 이미지 유형을 기준으로 입력 유형과 모델 유형을 결정한다.
* 현재 운영 Frontend에는 `/image-pairs/**` Route와 Pair 전용 API Module을 두지 않는다.
* 현재 운영 Frontend에는 Fusion 분석 요청 버튼과 Fusion 결과 우선 표시 로직을 두지 않는다.

### 2.6 확인 필요 기준

[확인 필요]

다음 항목은 현재 화면 구조에서 사용하고 있으나 최종 정책과 실제 구현을 함께 확인해야 한다.

* 발전소 → 구역 → 점검 구조의 최종 운영 기준
* 점검 한 건에 업로드할 수 있는 이미지 수
* 동일 이미지 유형의 다중 업로드 허용 여부
* 이미지와 검사 대상 위치 또는 설비의 연결 기준
* `equipmentId`와 `targetType`의 필수 여부 및 정확한 관계

---

## 3. 전체 화면 흐름

~~~text
로그인
→ 승인 상태 확인
→ 승인 대기 또는 대시보드
→ 발전소 관리
→ 발전소 상세에서 구역 관리
→ 구역 상세에서 하위 설비와 점검 이력 확인
→ 점검 등록
→ 점검 상세에서 RGB 또는 열화상 이미지 업로드
→ 분석할 이미지 선택
→ 이미지 단건 AI 분석 요청
→ 분석 상태 확인
→ 결과 목록 조회
→ 결과 상세에서 시각화, 조치 후보, 검토 상태 확인
→ 필요 시 변화 추적 확인
→ 관리자는 사용자·운영 관리 접근
~~~

핵심 업무 흐름은 `점검 상세 페이지`를 중심으로 묶는다.

이미지 업로드, 이미지 선택, AI 분석 요청, 분석 상태 확인, 실패 재시도는 별도 페이지로 흩뜨리지 않고 점검 상세 내부 위젯으로 배치한다.

RGB 이미지와 열화상 이미지가 동일한 점검에 함께 등록되어 있더라도 각각 별도의 이미지와 분석 작업으로 표시한다.

---

## 4. Layout 구성

### 4.1 Layout 목록

| Layout | 사용 페이지 | 구성 |
| --- | --- | --- |
| `AuthLayout` | 로그인, 승인 대기 | 로고, 안내 문구, 인증 버튼, 로그아웃 버튼 |
| `AppLayout` | 일반 사용자 페이지 | 상단 네비게이션바, 사이드바, 본문, 토스트 |
| `AdminSection` | 관리자 페이지 내부 | AppLayout 내부 관리자 탭 또는 관리자 전용 섹션 |
| `ErrorLayout` | 권한 없음, 404, 서버 오류 | 안내 문구, 이동 버튼, 재시도 버튼 |

### 4.2 Layout 결정

`AdminLayout`을 별도 레이아웃으로 강제하지 않는다.

초기 구현에서는 `AppLayout` 안에 관리자 메뉴와 관리자 페이지를 구성한다.

관리자 화면이 커질 경우 나중에 `AdminLayout`으로 분리할 수 있다.

---

## 5. 상단 네비게이션바

### 5.1 `TopNavbar`

| 영역 | 기능 | 버튼/액션 | 통신 |
| --- | --- | --- | --- |
| 로고 | 대시보드 이동 | `대시보드로 이동` | 없음 |
| 사용자 정보 | 이름, 이메일, 역할 표시 | 사용자 메뉴 열기 | `GET /auth/me` |
| 사용자 메뉴 | 현재 로그인 사용자 정보 확인 | `내 정보` | `GET /auth/me` |
| 인증 | 로그아웃 | `로그아웃` | `POST /auth/logout` |
| 새로고침 | 현재 페이지 데이터 재조회 | `새로고침` | 페이지별 API 재호출 |

### 5.2 상단바에서 제외하는 버튼

상단바에는 전역 생성 버튼을 과하게 넣지 않는다.

| 제외 버튼 | 이유 |
| --- | --- |
| 발전소 등록 | 발전소 목록 페이지 안에서 처리하는 것이 명확함 |
| 점검 등록 | 구역 선택이 필요하므로 점검 목록 또는 구역 상세에서 처리하는 것이 안전함 |
| 이미지 업로드 | `inspectionId`가 필요하므로 점검 상세에서만 처리해야 함 |
| AI 분석 요청 | 분석 대상 `imageId`가 필요하므로 점검 상세의 이미지 목록에서 처리해야 함 |

---

## 6. 사이드바

### 6.1 `Sidebar`

| 메뉴 | Route | 표시 조건 | 설명 |
| --- | --- | --- | --- |
| 대시보드 | `/dashboard` | 승인 사용자 | 전체 현황 요약 |
| 발전소 관리 | `/plants` | 승인 사용자 | 발전소 목록, 등록, 상세 진입 |
| 점검 관리 | `/inspections` | 승인 사용자 | 점검 목록, 등록, 상세 진입 |
| 점검 결과 | `/results` | 승인 사용자 | 분석 결과 목록, 상세 진입 |
| 변화 추적 | `/tracking` | 승인 사용자, 후순위 | 반복 이상, 악화 대상 조회 |
| 관리자 | `/admin` | ADMIN | 사용자 승인, 사용자 관리, 운영 로그 |

### 6.2 사이드바에 넣지 않는 기능

| 기능 | 이유 |
| --- | --- |
| 이미지 업로드 | 점검 상세에 종속됨 |
| AI 분석 요청 | 분석 대상 이미지 선택 후 가능 |
| 구역 상세 | 발전소 상세에서 진입하는 하위 화면 |
| 하위 설비 관리 | 구역 상세 내부 기능 |
| Pair/Fusion | 현재 운영 Frontend 범위에 포함하지 않음 |

---

## 7. 페이지 목록

| 페이지 | Route | 우선순위 | 설명 |
| --- | --- | ---: | --- |
| 로그인 | `/login` | 필수 | Google 로그인 시작 |
| 승인 대기 | `/pending` | 필수 | 승인 전 사용자 안내 |
| 대시보드 | `/dashboard` | 필수 | KPI, 통계, 우선 점검 대상 |
| 발전소 목록/등록 | `/plants` | 필수 | 발전소 조회, 검색, 등록 |
| 발전소 상세/수정 | `/plants/:plantId` | 필수 | 발전소 상세, 수정, 비활성화, 구역 목록 |
| 구역 상세/수정 | `/zones/:zoneId` | 필수 | 구역 정보, 설비 구조, 점검 이력 |
| 점검 목록/등록 | `/inspections` | 필수 | 점검 조회, 검색, 등록 |
| 점검 상세 | `/inspections/:inspectionId` | 핵심 | 이미지 업로드, 이미지별 분석 요청, 상태 확인 |
| 결과 목록 | `/results` | 필수 | 이미지 단건 분석 결과 목록, 필터 |
| 결과 상세 | `/results/:resultId` | 핵심 | 원본/결과 비교, 조치 후보, 검토 상태 |
| 변화 추적 | `/tracking` | 후순위 | 반복 이상, 악화, 이전 점검 비교 |
| 관리자 | `/admin` | 필수 | 사용자 승인, 사용자 관리, 운영 로그 |
| 권한 없음 | `/forbidden` 또는 상태 화면 | 필수 | 권한 없는 접근 안내 |
| 404 | `*` | 필수 | 잘못된 경로 처리 |

---

# 8. 페이지별 기능 / 통신 / 위젯 / 버튼

## 8.1 로그인 페이지

### `LoginPage`

| 항목 | 내용 |
| --- | --- |
| Route | `/login` |
| 주요 목적 | Google OAuth 로그인 시작 |
| 주요 위젯 | `AuthCard`, `GoogleLoginButton`, `AuthErrorMessage` |
| 주요 버튼 | `Google로 로그인` |
| 통신 | `GET /auth/google`, `GET /auth/me` |
| 이동 | 승인 대기면 `/pending`, 승인 사용자면 `/dashboard`, 관리자는 `/dashboard` 진입 후 `/admin` 접근 가능 |

### 버튼

| 버튼 | 동작 |
| --- | --- |
| `Google로 로그인` | 브라우저를 `/api/v1/auth/google`로 이동시킨다. 일반 AJAX 호출이 아니라 redirect 방식으로 처리한다. |
| `다시 시도` | 로그인 실패 상태를 초기화한다. |

---

## 8.2 승인 대기 페이지

### `PendingApprovalPage`

| 항목 | 내용 |
| --- | --- |
| Route | `/pending` |
| 주요 목적 | 승인 대기 사용자 안내 |
| 주요 위젯 | `PendingStatusCard`, `UserSummaryCard` |
| 주요 버튼 | `상태 다시 확인`, `로그아웃` |
| 통신 | `GET /auth/me`, `POST /auth/logout` |

### 버튼

| 버튼 | 동작 |
| --- | --- |
| `상태 다시 확인` | `GET /auth/me` 재조회 |
| `로그아웃` | `POST /auth/logout` 호출 후 `/login` 이동 |

---

## 8.3 대시보드 페이지

### `DashboardPage`

| 항목 | 내용 |
| --- | --- |
| Route | `/dashboard` |
| 주요 목적 | 접근 가능한 발전소, 구역, 점검, 이상 후보 현황 요약 |
| 주요 위젯 | `KpiCardGrid`, `ActionStatsChart`, `SeverityStatsChart`, `TrendChart`, `PriorityTargetList`, `RecentInspectionList`, `RecentResultList` |
| 주요 버튼 | `발전소 보기`, `점검 보기`, `결과 보기`, `상세 보기`, `새로고침` |
| 통신 | `GET /dashboard`, `GET /dashboard/action-stats`, `GET /dashboard/severity-stats`, `GET /dashboard/trends` |

### 버튼

| 버튼 | 동작 |
| --- | --- |
| `발전소 보기` | `/plants` 이동 |
| `점검 보기` | `/inspections` 이동 |
| `결과 보기` | `/results` 이동 |
| `우선 대상 상세` | 관련 zone 또는 result 상세 이동 |
| `새로고침` | 대시보드 API 재조회 |

---

## 8.4 발전소 목록/등록 페이지

### `PlantListPage`

| 항목 | 내용 |
| --- | --- |
| Route | `/plants` |
| 주요 목적 | 발전소 목록 조회, 검색, 등록 |
| 주요 위젯 | `SearchFilterBar`, `PlantTable`, `Pagination`, `PlantCreateModal`, `EmptyState` |
| 주요 버튼 | `발전소 등록`, `검색`, `초기화`, `상세 보기` |
| 통신 | `GET /plants`, `POST /plants` |

### 버튼

| 버튼 | 동작 |
| --- | --- |
| `발전소 등록` | 등록 모달 열기 |
| `저장` | `POST /plants` |
| `검색` | `GET /plants?keyword=&status=&page=&size=` |
| `초기화` | 필터 초기화 후 재조회 |
| `상세 보기` | `/plants/:plantId` 이동 |

---

## 8.5 발전소 상세/수정 페이지

### `PlantDetailPage`

| 항목 | 내용 |
| --- | --- |
| Route | `/plants/:plantId` |
| 주요 목적 | 발전소 상세, 수정, 비활성화, 구역 목록/등록 |
| 주요 위젯 | `PlantInfoCard`, `PlantEditForm`, `ZoneSummaryTable`, `ZoneCreateModal`, `ConfirmModal` |
| 주요 버튼 | `수정`, `저장`, `취소`, `비활성화`, `구역 등록`, `구역 상세`, `점검 등록` |
| 통신 | `GET /plants/{plantId}`, `PATCH /plants/{plantId}`, `PATCH /plants/{plantId}/deactivate`, `GET /plants/{plantId}/zones`, `POST /plants/{plantId}/zones` |

### 버튼

| 버튼 | 동작 |
| --- | --- |
| `수정` | 수정 모드 전환 |
| `저장` | `PATCH /plants/{plantId}` |
| `비활성화` | 확인 모달 후 `PATCH /plants/{plantId}/deactivate` |
| `구역 등록` | 구역 등록 모달 열기 |
| `구역 상세` | `/zones/:zoneId` 이동 |
| `점검 등록` | 구역 선택 후 점검 등록 흐름으로 이동 |

---

## 8.6 구역 상세/수정 페이지

### `ZoneDetailPage`

| 항목 | 내용 |
| --- | --- |
| Route | `/zones/:zoneId` |
| 주요 목적 | 구역 정보, 하위 설비 구조, 점검 이력, 변화 요약 |
| 주요 위젯 | `ZoneInfoCard`, `ZoneEditForm`, `EquipmentTree`, `EquipmentCreateModal`, `InspectionHistoryTable`, `ZoneTrackingPanel` |
| 주요 버튼 | `구역 수정`, `구역 비활성화`, `Array 등록`, `Panel 등록`, `Module 등록`, `설비 수정`, `설비 비활성화`, `점검 등록`, `결과 보기` |
| 통신 | `GET /zones/{zoneId}`, `PATCH /zones/{zoneId}`, `PATCH /zones/{zoneId}/deactivate`, `GET /zones/{zoneId}/equipments`, `POST /zones/{zoneId}/equipments`, `PATCH /equipments/{equipmentId}`, `PATCH /equipments/{equipmentId}/deactivate`, `GET /tracking` |

### 버튼

| 버튼 | 동작 |
| --- | --- |
| `점검 등록` | `zoneId`를 기준으로 점검 등록 모달 또는 `/inspections` 이동 |
| `Array 등록` | Zone 하위 Array 등록 |
| `Panel 등록` | 선택한 Array 하위 Panel 등록 |
| `Module 등록` | 선택한 Panel 하위 Module 등록 |
| `설비 수정` | 선택 설비 수정 모달 |
| `설비 비활성화` | 확인 모달 후 비활성화 API 호출 |
| `결과 보기` | 해당 zone 필터로 `/results` 이동 |

---

## 8.7 점검 목록/등록 페이지

### `InspectionListPage`

| 항목 | 내용 |
| --- | --- |
| Route | `/inspections` |
| 주요 목적 | 점검 목록 조회, 검색, 등록 |
| 주요 위젯 | `SearchFilterBar`, `InspectionTable`, `InspectionCreateModal`, `Pagination` |
| 주요 버튼 | `점검 등록`, `검색`, `초기화`, `상세 보기`, `이미지 업로드` |
| 통신 | `GET /inspections`, `POST /inspections` |

### 버튼

| 버튼 | 동작 |
| --- | --- |
| `점검 등록` | 점검 등록 모달 열기 |
| `저장` | `POST /inspections` |
| `상세 보기` | `/inspections/:inspectionId` 이동 |
| `이미지 업로드` | 점검 상세로 이동 후 이미지 탭 또는 업로드 영역 포커스 |

---

## 8.8 점검 상세 페이지

### `InspectionDetailPage`

| 항목 | 내용 |
| --- | --- |
| Route | `/inspections/:inspectionId` |
| 주요 목적 | 점검 상세 조회, 이미지 업로드, 이미지별 단건 분석 요청, 분석 상태 확인, 실패 재시도 |
| 주요 위젯 | `InspectionInfoCard`, `InspectionEditForm`, `ImageUploadPanel`, `ImageListPanel`, `ImagePreviewGrid`, `ImageAnalysisActionPanel`, `AnalysisJobStatusPanel`, `FailureRetryPanel`, `ResultSummaryPanel` |
| 주요 버튼 | `점검 수정`, `이미지 업로드`, `미리보기`, `분석 요청`, `상태 새로고침`, `재요청`, `결과 보기` |
| 통신 | `GET /inspections/{inspectionId}`, `PATCH /inspections/{inspectionId}`, `POST /images`, `GET /images?inspectionId=`, `GET /images/{imageId}/preview`, `POST /analysis-jobs`, `GET /analysis-jobs?inspectionId=`, `GET /analysis-jobs/{jobId}`, `POST /analysis-jobs/{jobId}/retry` |

### 탭 구성

| 탭 | 위젯 |
| --- | --- |
| 기본 정보 | `InspectionInfoCard`, `InspectionEditForm` |
| 이미지 | `ImageUploadPanel`, `ImageListPanel`, `ImagePreviewGrid` |
| 분석 | `ImageAnalysisActionPanel`, `AnalysisJobStatusPanel`, `FailureRetryPanel` |
| 결과 요약 | `ResultSummaryPanel` |

### 이미지별 표시 정보

| 항목 | 설명 |
| --- | --- |
| 이미지 유형 | RGB / THERMAL |
| 원본 파일명 | 업로드한 파일명 |
| 검사 대상 | targetType 및 equipment 정보 |
| 업로드 상태 | 업로드 완료 또는 실패 |
| 분석 상태 | 미요청 / 대기 / 분석 중 / 완료 / 실패 |
| 최근 분석 결과 | 결과가 있는 경우 resultId와 결과 요약 |
| 분석 액션 | 현재 이미지의 `imageId` 기준 단건 분석 요청 |

### 버튼

| 버튼 | 동작 |
| --- | --- |
| `점검 수정` | 점검 수정 폼 열기 |
| `이미지 업로드` | `POST /images` |
| `미리보기` | `GET /images/{imageId}/preview` |
| `분석 요청` | 선택한 이미지의 `imageId`로 `POST /analysis-jobs` |
| `상태 새로고침` | `GET /analysis-jobs/{jobId}` |
| `분석 재요청` | `POST /analysis-jobs/{jobId}/retry` |
| `결과 보기` | `/results/:resultId` 이동 |

### 분석 요청 기준

* 분석 요청 Body에는 현재 운영 기준으로 `imageId`만 전달한다.
* RGB 이미지인지 열화상 이미지인지는 업로드된 이미지 정보로 표시한다.
* Backend가 이미지 유형을 확인하여 RGB 또는 Thermal 단건 모델로 라우팅한다.
* 동일 이미지에 진행 중인 분석 작업이 있으면 중복 요청 버튼을 비활성화한다.
* 같은 점검에 여러 이미지가 있는 경우 각 이미지별로 별도의 분석 작업을 생성한다.
* Pair 구성 여부를 확인하거나 기다리지 않는다.

Request 예시:

~~~json
{
  "imageId": 100
}
~~~

---

## 8.9 결과 목록 페이지

### `ResultListPage`

| 항목 | 내용 |
| --- | --- |
| Route | `/results` |
| 주요 목적 | 이미지 단건 분석 결과 목록 조회, 필터링 |
| 주요 위젯 | `SearchFilterBar`, `ResultTable`, `StatusBadge`, `Pagination` |
| 주요 버튼 | `검색`, `초기화`, `상세 보기` |
| 통신 | `GET /results` |

### 필터

| 필터 | 값 |
| --- | --- |
| 발전소 | `plantId` |
| 구역 | `zoneId` |
| 점검 | `inspectionId` |
| 이미지 | `imageId` |
| 입력 유형 | `RGB_SINGLE`, `THERMAL_SINGLE` |
| 모델 유형 | `RGB_ONLY`, `THERMAL_ONLY` |
| 결과 상태 | `NORMAL`, `ANOMALY`, `LOW_CONFIDENCE` |
| 조치 후보 | `CLEANING`, `RETAKE`, `FIELD_INSPECTION`, `REPLACEMENT_REVIEW` |
| 검토 상태 | `UNCHECKED`, `CONFIRMED`, `RECHECK_REQUIRED`, `ACTION_COMPLETED` |
| 심각도 | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| 우선순위 | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |

---

## 8.10 결과 상세 페이지

### `ResultDetailPage`

| 항목 | 내용 |
| --- | --- |
| Route | `/results/:resultId` |
| 주요 목적 | 이미지 단건 분석 결과 상세 확인, 원본/결과 비교, 조치 후보 확인, 검토 상태 변경 |
| 주요 위젯 | `ResultSummaryCard`, `ImageCompareViewer`, `VisualizationOverlayViewer`, `DefectCandidateTable`, `ActionCandidatePanel`, `ReviewStatusPanel`, `ModelInfoPanel`, `TrackingComparePanel` |
| 주요 버튼 | `원본 보기`, `결과 보기`, `BBox`, `Heatmap`, `Mask`, `검토 상태 변경`, `조치 후보 수정`, `이전 점검 비교`, `점검 상세로`, `목록으로` |
| 통신 | `GET /results/{resultId}`, `GET /results/{resultId}/visualization`, `PATCH /results/{resultId}/review-status`, `PATCH /results/{resultId}/action`, `GET /tracking/compare` |

### 주의

`GET /results/{resultId}/visualization`은 이미지 Stream 응답일 수 있으므로 공통 JSON 응답으로 가정하지 않는다.

Bounding Box, Heatmap, Mask는 해당 분석 결과에서 실제로 생성된 시각화만 제공한다.

생성되지 않은 시각화 유형의 버튼은 숨기거나 비활성화한다.

RGB segmentation 결과에 Mask가 존재하는 경우에만 Mask 표시 기능을 제공한다.

현재 지원 시각화는 BBox와 Mask이다.

Heatmap 버튼은 화면에는 유지하되 비활성화 상태로 표시하며, 클릭·키보드 조작으로도 활성화하지 않는다.

후보가 0건인 정상 분석 결과는 결과 상세 화면에서 원본 이미지를 표시한다.

RGB 원본 클래스 표시 기준:

* `broken` → `파손`
* `bitki` → `식생`
* `dusty` → `먼지·오염`
* `missing` → `누락`
* `shading` → `음영`
* 원본 클래스 정보가 없는 과거 `APPEARANCE_DAMAGE` 결과는 `외관 이상`으로 표시한다.

### 버튼

| 버튼 | 동작 |
| --- | --- |
| `BBox 보기` | Bounding Box 결과가 있는 경우 overlay 표시 |
| `Heatmap 보기` | 버튼은 표시하되 disabled 상태를 유지하고 현재 지원하지 않음을 안내 |
| `Mask 보기` | Mask 결과가 있는 경우 overlay 표시 |
| `검토 상태 저장` | `PATCH /results/{resultId}/review-status` |
| `조치 후보 수정` | `PATCH /results/{resultId}/action` |
| `이전 점검 비교` | `GET /tracking/compare` |
| `점검 상세로 이동` | `/inspections/:inspectionId` 이동 |
| `목록으로` | `/results` 이동 |

---

## 8.11 변화 추적 페이지 또는 위젯

### 결정

변화 추적은 초기 MVP에서 독립 페이지로 크게 만들지 않는다.

우선 다음 위치에 위젯으로 배치한다.

| 위젯 | 위치 |
| --- | --- |
| `ZoneTrackingPanel` | 구역 상세 |
| `TrackingComparePanel` | 결과 상세 |

후속 확장 시 `/tracking` 독립 페이지를 만든다.

### `TrackingPage`

| 항목 | 내용 |
| --- | --- |
| Route | `/tracking` |
| 우선순위 | 후순위 |
| 주요 목적 | 반복 이상, 악화 대상, 우선 관리 대상 조회 |
| 주요 위젯 | `TrackingFilterBar`, `TrackingSummaryCard`, `RepeatedAnomalyTable`, `WorsenedTargetTable`, `InspectionComparePanel` |
| 주요 버튼 | `검색`, `초기화`, `결과 상세`, `구역 상세`, `이전 점검 비교` |
| 통신 | `GET /tracking`, `GET /tracking/compare` |

---

## 8.12 관리자 페이지

### `AdminPage`

| 항목 | 내용 |
| --- | --- |
| Route | `/admin` |
| 주요 목적 | 사용자 승인, 사용자 관리, 전체 데이터 조회, 운영 로그 확인 |
| 주요 위젯 | `PendingUserApprovalWidget`, `UserManagementWidget`, `AdminPlantOverviewWidget`, `AdminImageOverviewWidget`, `AdminAnalysisJobWidget`, `AdminResultWidget`, `OperationLogWidget`, `SystemLogPlaceholder` |
| 주요 버튼 | `승인`, `권한 변경`, `비활성화`, `상세 보기`, `로그 보기`, `검색`, `초기화` |
| 통신 | `/admin/*` 계열 API |

### 관리자 탭

| 탭 | 위젯 | API | 상태 |
| --- | --- | --- | --- |
| 승인 대기 | `PendingUserApprovalWidget` | `GET /admin/users/pending`, `PATCH /admin/users/{userId}/approve` | 1차 |
| 사용자 관리 | `UserManagementWidget` | `GET /admin/users`, `GET /admin/users/{userId}`, `PATCH /admin/users/{userId}/role`, `PATCH /admin/users/{userId}/deactivate` | 1차 |
| 발전소/구역 | `AdminPlantOverviewWidget` | `GET /admin/plants` | 2차 |
| 이미지 | `AdminImageOverviewWidget` | `GET /admin/images` | 2차 |
| 분석 작업 | `AdminAnalysisJobWidget` | `GET /admin/analysis-jobs` | 2차 |
| 결과 | `AdminResultWidget` | `GET /admin/results` | 2차 |
| 운영 로그 | `OperationLogWidget` | `GET /admin/operation-logs` | 2차 |
| 시스템 로그 | `SystemLogPlaceholder` | 확인 필요 | 후순위 |

### 주의

시스템 로그는 화면 구조 설계에는 포함되어 있으나, Backend Public API가 명확히 확정되지 않았다면 placeholder만 둔다.

시스템 오류 상세 로그는 CloudWatch Logs 또는 Console Log 등 외부 로그 체계를 우선 사용한다.

---

# 9. 공통 위젯 정리

## 9.1 레이아웃 위젯

| 위젯 | 기능 | 버튼 | 통신 |
| --- | --- | --- | --- |
| `TopNavbar` | 로고, 사용자 정보, 로그아웃 | `로그아웃`, `내 정보`, `새로고침` | `GET /auth/me`, `POST /auth/logout` |
| `Sidebar` | 주요 메뉴 이동 | 메뉴 클릭 | 없음 |
| `PageHeader` | 페이지 제목, 설명, 주요 액션 | `등록`, `수정`, `새로고침` | 페이지별 |
| `Breadcrumb` | 현재 위치 표시 | 상위 이동 | 없음 |

---

## 9.2 상태 처리 위젯

| 위젯 | 기능 | 버튼 | 통신 |
| --- | --- | --- | --- |
| `LoadingState` | 로딩 표시 | 없음 | 없음 |
| `PartialLoadingOverlay` | 일부 영역 로딩 | 없음 | 없음 |
| `EmptyState` | 빈 데이터 안내 | `등록하기`, `초기화` | 페이지별 |
| `SearchEmptyState` | 검색 결과 없음 안내 | `필터 초기화` | 목록 API 재조회 |
| `ErrorState` | API 오류 안내 | `다시 시도` | 마지막 요청 재호출 |
| `NetworkErrorState` | 네트워크 오류 안내 | `다시 시도` | 마지막 요청 재호출 |
| `ForbiddenState` | 권한 없음 안내 | `대시보드로` | 없음 |
| `PendingOnlyState` | 승인 대기 안내 | `상태 다시 확인`, `로그아웃` | `GET /auth/me`, `POST /auth/logout` |
| `NotFoundPage` | 잘못된 경로 안내 | `대시보드로`, `이전으로` | 없음 |
| `ToastProvider` | 성공/실패 메시지 | 닫기 | 없음 |

---

## 9.3 목록/검색 위젯

| 위젯 | 기능 | 버튼 | 통신 |
| --- | --- | --- | --- |
| `SearchFilterBar` | keyword, status, date, type 필터 | `검색`, `초기화` | 목록 API |
| `DataTable` | 목록 표시 | row 클릭, `상세 보기` | 없음 |
| `Pagination` | 페이지 이동 | 이전, 다음, 페이지 번호 | 목록 API |
| `SortHeader` | 정렬 | 컬럼 클릭 | 목록 API |

---

## 9.4 폼/모달 위젯

| 위젯 | 기능 | 버튼 | 통신 |
| --- | --- | --- | --- |
| `ConfirmModal` | 위험 작업 확인 | `확인`, `취소` | 비활성화 API |
| `PlantForm` | 발전소 등록/수정 | `저장`, `취소` | `POST /plants`, `PATCH /plants/{plantId}` |
| `ZoneForm` | 구역 등록/수정 | `저장`, `취소` | `POST /plants/{plantId}/zones`, `PATCH /zones/{zoneId}` |
| `EquipmentForm` | 설비 등록/수정 | `저장`, `취소` | `POST /zones/{zoneId}/equipments`, `PATCH /equipments/{equipmentId}` |
| `InspectionForm` | 점검 등록/수정 | `저장`, `취소` | `POST /inspections`, `PATCH /inspections/{inspectionId}` |

---

## 9.5 상태 배지 위젯

### `StatusBadge`

| 대상 | 표시 값 |
| --- | --- |
| 계정 상태 | `PENDING`, `APPROVED`, `INACTIVE` |
| 리소스 상태 | `ACTIVE`, `INACTIVE` |
| 이미지 유형 | `RGB`, `THERMAL` |
| 입력 유형 | `RGB_SINGLE`, `THERMAL_SINGLE` |
| 모델 유형 | `RGB_ONLY`, `THERMAL_ONLY` |
| 분석 상태 | `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED` |
| 결과 상태 | `NORMAL`, `ANOMALY`, `LOW_CONFIDENCE` |
| 조치 후보 | `CLEANING`, `RETAKE`, `FIELD_INSPECTION`, `REPLACEMENT_REVIEW` |
| 검토 상태 | `UNCHECKED`, `CONFIRMED`, `RECHECK_REQUIRED`, `ACTION_COMPLETED` |
| 우선순위 | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| 심각도 | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |

---

# 10. 도메인별 위젯 상세

## 10.1 발전소 / 구역 / 설비 위젯

| 위젯 | 들어갈 페이지 | 기능 | 버튼 | API |
| --- | --- | --- | --- | --- |
| `PlantTable` | 발전소 목록 | 발전소 목록 표시 | `상세 보기` | `GET /plants` |
| `PlantCreateModal` | 발전소 목록 | 발전소 등록 | `저장`, `취소` | `POST /plants` |
| `PlantInfoCard` | 발전소 상세 | 발전소 정보 표시 | `수정`, `비활성화` | `GET /plants/{plantId}` |
| `ZoneSummaryTable` | 발전소 상세 | 구역 요약 목록 | `구역 상세`, `점검 등록` | `GET /plants/{plantId}/zones` |
| `ZoneCreateModal` | 발전소 상세 | 구역 등록 | `저장`, `취소` | `POST /plants/{plantId}/zones` |
| `ZoneInfoCard` | 구역 상세 | 구역 정보 표시 | `수정`, `비활성화` | `GET /zones/{zoneId}` |
| `EquipmentTree` | 구역 상세 | Array, Panel, Module 구조 표시 | `하위 등록`, `수정`, `비활성화` | `GET /zones/{zoneId}/equipments` |

---

## 10.2 점검 / 이미지 위젯

| 위젯 | 들어갈 페이지 | 기능 | 버튼 | API |
| --- | --- | --- | --- | --- |
| `InspectionTable` | 점검 목록 | 점검 목록 표시 | `상세 보기`, `이미지 업로드` | `GET /inspections` |
| `InspectionCreateModal` | 점검 목록 | 점검 등록 | `저장`, `취소` | `POST /inspections` |
| `InspectionInfoCard` | 점검 상세 | 점검 기본 정보 | `수정` | `GET /inspections/{inspectionId}` |
| `ImageUploadPanel` | 점검 상세 | RGB/THERMAL 이미지 업로드 | `파일 선택`, `업로드`, `취소` | `POST /images` |
| `ImagePreviewGrid` | 점검 상세 | 업로드 이미지 미리보기 | `미리보기`, `비활성화` | `GET /images/{imageId}/preview`, `PATCH /images/{imageId}/deactivate` |
| `ImageListPanel` | 점검 상세 | 점검 이미지 목록과 분석 상태 표시 | `미리보기`, `분석 요청`, `결과 보기` | `GET /images?inspectionId=` |

---

## 10.3 이미지 분석 요청 위젯

| 위젯 | 들어갈 페이지 | 기능 | 버튼 | API |
| --- | --- | --- | --- | --- |
| `ImageAnalysisActionPanel` | 점검 상세 | 선택한 이미지의 유형과 분석 가능 상태 확인 | `분석 요청` | `POST /analysis-jobs` |
| `ImageTypeIndicator` | 점검 상세 | RGB 또는 THERMAL 이미지 유형 표시 | 없음 | 없음 |
| `ImageAnalysisEligibilityAlert` | 점검 상세 | 비활성 이미지, 업로드 실패, 진행 중 작업 등 분석 불가 사유 표시 | `이미지 다시 확인` | 필요 시 이미지 목록 재조회 |

### `ImageAnalysisActionPanel` 기준

* 선택된 이미지 한 건만 분석 대상으로 사용한다.
* Request에는 `imageId`만 전달한다.
* 모델 선택 UI를 사용자에게 필수로 제공하지 않는다.
* RGB 이미지는 Backend에서 RGB-only 모델로 라우팅한다.
* 열화상 이미지는 Backend에서 Thermal-only 모델로 라우팅한다.
* Pair 및 Fusion 선택 UI는 제공하지 않는다.

---

## 10.4 분석 작업 위젯

| 위젯 | 들어갈 페이지 | 기능 | 버튼 | API |
| --- | --- | --- | --- | --- |
| `AnalysisRequestPanel` | 점검 상세 | 선택 이미지 단건 분석 요청 | `분석 요청` | `POST /analysis-jobs` |
| `AnalysisJobStatusPanel` | 점검 상세 | 분석 상태 표시 | `상태 새로고침` | `GET /analysis-jobs/{jobId}` |
| `AnalysisJobTable` | 점검 상세, 관리자 | 이미지별 분석 작업 목록 | `상세`, `재요청` | `GET /analysis-jobs` |
| `FailureRetryPanel` | 점검 상세 | 실패 사유 표시 및 재요청 | `재요청`, `이미지 다시 업로드` | `POST /analysis-jobs/{jobId}/retry` |

---

## 10.5 결과 위젯

| 위젯 | 들어갈 페이지 | 기능 | 버튼 | API |
| --- | --- | --- | --- | --- |
| `ResultTable` | 결과 목록 | 결과 목록 표시 | `상세 보기` | `GET /results` |
| `ResultSummaryCard` | 결과 상세 | 이미지 단건 분석 결과 요약 | `점검 상세로` | `GET /results/{resultId}` |
| `ImageCompareViewer` | 결과 상세 | 원본/결과 비교 | `원본`, `결과`, `나란히 보기` | `GET /results/{resultId}/visualization` |
| `VisualizationOverlayViewer` | 결과 상세 | 생성된 bbox, mask 표시와 heatmap 비활성화 안내 | `BBox`, `Heatmap`, `Mask` | `GET /results/{resultId}/visualization` |
| `DefectCandidateTable` | 결과 상세 | 개별 이상 후보 목록과 RGB 원본 클래스 한글 표시 | `행 선택` | `GET /results/{resultId}` |
| `ActionCandidatePanel` | 결과 상세 | 조치 후보 표시/수정 | `조치 후보 수정`, `저장` | `PATCH /results/{resultId}/action` |
| `ReviewStatusPanel` | 결과 상세 | 검토 상태 변경 | `확인됨`, `재점검 필요`, `조치 완료`, `저장` | `PATCH /results/{resultId}/review-status` |

---

## 10.6 변화 추적 위젯

| 위젯 | 들어갈 페이지 | 기능 | 버튼 | API |
| --- | --- | --- | --- | --- |
| `ZoneTrackingPanel` | 구역 상세 | 구역 기준 변화 요약 | `결과 보기`, `이전 비교` | `GET /tracking` |
| `TrackingComparePanel` | 결과 상세 | 이전 점검과 비교 | `비교 조회` | `GET /tracking/compare` |
| `RepeatedAnomalyTable` | 변화 추적 | 반복 이상 목록 | `결과 상세` | `GET /tracking` |
| `WorsenedTargetTable` | 변화 추적 | 악화 대상 목록 | `결과 상세`, `구역 상세` | `GET /tracking` |

---

## 10.7 관리자 위젯

| 위젯 | 들어갈 페이지 | 기능 | 버튼 | API |
| --- | --- | --- | --- | --- |
| `PendingUserApprovalWidget` | 관리자 | 승인 대기 사용자 조회/승인 | `승인`, `상세` | `GET /admin/users/pending`, `PATCH /admin/users/{userId}/approve` |
| `UserManagementWidget` | 관리자 | 전체 사용자 관리 | `상세`, `권한 변경`, `비활성화` | `GET /admin/users`, `GET /admin/users/{userId}`, `PATCH /admin/users/{userId}/role`, `PATCH /admin/users/{userId}/deactivate` |
| `AdminPlantOverviewWidget` | 관리자 | 전체 발전소/구역 조회 | `상세` | `GET /admin/plants` |
| `AdminImageOverviewWidget` | 관리자 | 전체 이미지와 이미지 유형 조회 | `미리보기`, `점검 보기` | `GET /admin/images` |
| `AdminAnalysisJobWidget` | 관리자 | 전체 단건 분석 작업 조회 | `상세` | `GET /admin/analysis-jobs` |
| `AdminResultWidget` | 관리자 | 전체 단건 분석 결과 조회 | `상세` | `GET /admin/results` |
| `OperationLogWidget` | 관리자 | 운영 로그 조회 | `검색`, `초기화` | `GET /admin/operation-logs` |
| `SystemLogPlaceholder` | 관리자 | 시스템 로그 자리 표시 | 없음 | 확인 필요 |

---

# 11. API 모듈 분리안

~~~text
src/shared/api/client.ts
src/shared/api/types.ts

src/features/auth/api/authApi.ts
src/features/dashboard/api/dashboardApi.ts
src/features/plants/api/plantApi.ts
src/features/zones/api/zoneApi.ts
src/features/equipments/api/equipmentApi.ts
src/features/inspections/api/inspectionApi.ts
src/features/images/api/imageApi.ts
src/features/analysisJobs/api/analysisJobApi.ts
src/features/results/api/resultApi.ts
src/features/tracking/api/trackingApi.ts
src/features/admin/api/adminApi.ts
~~~

현재 운영 Frontend에는 다음 모듈을 추가하지 않는다.

~~~text
src/features/imagePairs/api/imagePairApi.ts
src/features/fusion/api/fusionApi.ts
~~~

---

## 12. API Client 공통 처리

| 처리 | 기준 |
| --- | --- |
| Base URL | Vite 환경변수 사용 |
| 인증 | Session/JWT 미확정. `withCredentials`와 Authorization 확장 가능 구조 |
| 성공 응답 | `{ success, data, message }` |
| 목록 응답 | `{ content, page, size, totalElements, totalPages, hasNext }` |
| 오류 응답 | `{ success: false, error: { status, code, message, detail, path, timestamp, traceId } }` |
| 204 응답 | body 없음 처리 |
| 이미지 stream | 공통 JSON 응답으로 가정하지 않음 |
| API 오류 | 사용자용 메시지와 개발자용 오류 정보를 분리 |
| 권한 오류 | 401은 로그인 이동, 403은 권한 없음 안내 |
| 분석 요청 | `{ imageId }` 형식으로 전달 |
| 이미지 유형 | Backend 응답의 `imageType`을 표시하며 Frontend가 임의로 변경하지 않음 |
| 시각화 | 응답에 존재하는 BBOX, HEATMAP, MASK만 활성화 |

---

# 13. 버튼 규칙

## 13.1 버튼 종류

| 버튼 타입 | 예시 | 용도 |
| --- | --- | --- |
| Primary | `등록`, `저장`, `분석 요청` | 주요 생성/요청 액션 |
| Secondary | `취소`, `목록으로`, `초기화` | 보조 액션 |
| Danger | `비활성화`, `로그아웃` | 주의 액션 |
| Ghost/Text | `상세 보기`, `미리보기`, `새로고침` | 가벼운 액션 |
| Toggle | `BBox`, `Heatmap`, `Mask` | 표시 모드 전환. Heatmap은 disabled 유지 |

## 13.2 버튼 공통 상태

| 상태 | 처리 |
| --- | --- |
| API 요청 중 | disabled + loading |
| 권한 없음 | 버튼 숨김 또는 disabled |
| 필수값 없음 | disabled |
| 삭제/비활성화 | ConfirmModal 필수 |
| 분석 진행 중 | 같은 이미지에 대한 중복 요청 방지 |
| 분석 실패 | `재요청` 버튼 표시 |
| 결과 없음 | `결과 보기` 숨김 |
| 승인 대기 | 주요 기능 버튼 숨김 또는 disabled |
| 비활성 리소스 | 신규 점검/업로드 대상 선택 제한 |
| 업로드 실패 이미지 | 분석 요청 disabled |
| 시각화 미생성 | 해당 BBox/Mask 버튼 숨김 또는 disabled |

## 13.3 버튼 수 최소화 기준

* 동일한 동작을 여러 위치에 중복 배치하지 않는다.
* 이미지별 기본 액션은 `미리보기`, `분석 요청`, `결과 보기` 중심으로 제한한다.
* 수정·비활성화 같은 관리 액션은 더보기 메뉴 또는 상세 영역에 배치할 수 있다.
* RGB와 열화상 분석 요청을 서로 다른 API 버튼으로 분리하지 않는다.
* 선택한 이미지 유형에 따라 버튼 라벨 또는 안내 문구만 변경한다.
* 진행 상태는 별도 버튼보다 상태 배지와 진행 영역을 우선 사용한다.

---

# 14. 디자인 없이 만들 때의 구현 순서

## 14.1 1단계: 공통 뼈대

~~~text
AppLayout
AuthLayout
TopNavbar
Sidebar
PageHeader
Breadcrumb
ProtectedRoute
AdminRoute
LoadingState
EmptyState
SearchEmptyState
ErrorState
NetworkErrorState
ForbiddenState
NotFoundPage
StatusBadge
ConfirmModal
ToastProvider
~~~

## 14.2 2단계: 페이지 placeholder

~~~text
LoginPage
PendingApprovalPage
DashboardPage
PlantListPage
PlantDetailPage
ZoneDetailPage
InspectionListPage
InspectionDetailPage
ResultListPage
ResultDetailPage
TrackingPage
AdminPage
~~~

## 14.3 3단계: API 모듈

~~~text
authApi
dashboardApi
plantApi
zoneApi
equipmentApi
inspectionApi
imageApi
analysisJobApi
resultApi
trackingApi
adminApi
~~~

## 14.4 4단계: 핵심 업무 위젯

~~~text
PlantTable
ZoneSummaryTable
EquipmentTree
InspectionTable
ImageUploadPanel
ImagePreviewGrid
ImageListPanel
ImageAnalysisActionPanel
AnalysisJobStatusPanel
FailureRetryPanel
ResultTable
ImageCompareViewer
VisualizationOverlayViewer
ReviewStatusPanel
PendingUserApprovalWidget
~~~

---

# 15. MVP 구현 우선순위

## 15.1 1차 MVP 필수

| 구분 | 만들 것 |
| --- | --- |
| 인증 | 로그인, 승인 대기, 인증 가드, 로그아웃 |
| 레이아웃 | TopNavbar, Sidebar, PageHeader |
| 발전소 | 목록, 등록, 상세, 수정, 비활성화 |
| 구역 | 구역 목록, 등록, 상세, 설비 구조 |
| 점검 | 목록, 등록, 상세 |
| 이미지 | RGB·열화상 업로드, 미리보기, 이미지 목록 |
| 분석 | 이미지 단건 분석 요청, 상태 조회, 실패 재요청 |
| 결과 | 결과 목록, 결과 상세, 이미지 비교, 검토 상태 |
| 관리자 | 승인 대기 사용자 조회/승인 |

## 15.2 2차로 미루는 기능

| 기능 | 이유 |
| --- | --- |
| 관리자 전체 이미지/분석/결과 상세 관리 | 일반 사용자 핵심 흐름 먼저 완성 필요 |
| 운영 로그 UI | Backend 로그 API 구현 상태 확인 필요 |
| 시스템 로그 UI | Public API 확정 필요 |
| Tracking 독립 페이지 | 결과 상세/구역 상세 위젯으로 먼저 충분 |
| 고급 차트 | 대시보드 API 응답 안정화 후 |
| Drag & Drop 설비 구조 편집 | 기능 골격 이후 디자인 단계에서 처리 |
| Pair/Fusion Frontend | 현재 운영 범위가 아니며 연구 결과 채택 후 별도 검토 필요 |

---

# 16. 확인 필요 항목

| 항목 | 이유 |
| --- | --- |
| Session/JWT 최종 인증 방식 | API Client 설정 방식에 영향 |
| 발전소 → 구역 → 점검 구조 | 현재 문서는 이 구조를 사용하지만 최종 운영 구조 확인 필요 |
| 점검당 이미지 허용 개수 | 다중 업로드 UI와 중복 검증 방식에 영향 |
| 동일 유형 이미지 다중 업로드 | RGB 또는 열화상 이미지 여러 장 등록 가능 여부 확인 필요 |
| 이미지와 설비 연결 기준 | `targetType`, `equipmentId` 입력 UI와 검증 방식에 영향 |
| 시스템 로그 API | 화면 설계에는 있으나 Public API 확정 필요 |
| 이미지 visualization 응답 형식 | Stream, URL, JSON metadata 중 실제 구현 확인 필요 |
| Heatmap 생성 조건 | 실제 AI Worker에서 Heatmap을 생성하는 조건 확인 필요 |
| Mask 생성 조건 | RGB segmentation 결과의 Mask 저장 및 응답 조건 확인 필요 |
| `/tracking` 독립 페이지 여부 | 초기에는 위젯으로 충분하나 API와 화면 요구에 따라 확장 가능 |

---

# 17. 결론

Frontend 초기 구조는 다음 방향으로 구현한다.

~~~text
로그인/승인
→ AppLayout
→ 대시보드
→ 발전소 확인 또는 등록
→ 점검 영역 확인 또는 설정
→ 점검 등록
→ 점검 상세에서 RGB·열화상 이미지 업로드
→ 분석할 이미지 한 건 선택
→ imageId 기준 단건 분석 요청
→ 이미지별 분석 상태 확인
→ 결과 목록
→ 결과 상세에서 생성된 시각화, 조치 후보, 검토 상태, 변화 비교 확인
→ 관리자에서 사용자 승인 및 관리
~~~

가장 중요한 결정은 다음과 같다.

이미지 업로드, 이미지 선택, AI 분석 요청, 분석 상태 확인, 실패 재시도는 `점검 상세 페이지` 안의 위젯으로 묶는다.

점검 상세 페이지는 점검 정보, 이미지 업로드, 분석 요청, 분석 상태, 결과 확인을 이어서 수행하는 핵심 업무 화면으로 구성한다.

분석 요청은 선택한 이미지의 `imageId`만 Backend에 전달한다.

Frontend는 모델 유형을 임의로 선택하지 않으며, Backend가 저장된 이미지 유형에 따라 RGB 또는 열화상 단건 모델로 라우팅한다.

RGB 이미지와 열화상 이미지는 각각 독립적인 분석 작업과 결과를 가진다.

설비 위치 구조는 세부 관리가 필요한 경우 사용하는 선택 기능으로 두며, 점검 시작의 필수 선행 단계로 노출하지 않는다.

Pair 생성·관리와 Fusion 분석은 현재 운영 Frontend 범위에서 제외한다.

이 구조는 사용자가 “점검 1건”을 기준으로 이미지 업로드, 이미지별 분석 작업, 분석 상태, 결과와 검토 정보를 하나의 흐름으로 확인할 수 있도록 한다.
