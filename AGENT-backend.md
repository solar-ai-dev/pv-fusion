# AGENT-backend.md

## 1. 적용 범위

이 문서는 Backend 작업 시 적용한다.

대상 작업:

- Spring Boot Backend
- API Controller
- Service / UseCase
- Repository / Persistence Adapter
- 인증 / 권한
- 이미지 메타데이터
- 분석 Job 생성
- 결과 조회 API
- Backend 테스트

공통 판단 기준은 `AGENT.md`를 우선한다.

---

## 2. 기본 원칙

Backend는 인증, 권한 검증, 서비스 데이터 관리, 이미지 메타데이터 관리, 분석 Job 생성, 결과 조회를 담당한다.

Frontend는 Backend Public API만 호출해야 하며, Backend는 외부 리소스 접근과 권한 검증의 중심 경계이다.

AI Worker는 외부 사용자에게 직접 노출하지 않는다.

---

## 3. API 작업 규칙

API 작업 전 다음을 확인한다.

- `/docs`의 API 명세
- `/docs`의 요구사항 명세
- `/docs`의 정책 정의서
- `/docs`의 ERD
- 기존 Controller / DTO / Service 패턴

기본 방향:

- API 응답 형식은 기존 공통 응답 형식을 따른다.
- 성공 코드, 오류 코드, 권한 조건을 기존 명세와 맞춘다.
- `204 No Content` 응답은 Body를 반환하지 않는다.
- 이미지 Stream 응답은 공통 JSON 응답을 사용하지 않을 수 있다.
- Frontend 편의를 위한 응답 필드와 DB 저장 컬럼을 혼동하지 않는다.

주의:

- API endpoint를 임의로 바꾸지 않는다.
- 인증 방식이 Session인지 JWT인지 불확실하면 임의 확정하지 않는다.
- 관리자 API와 일반 사용자 API의 데이터 범위를 섞지 않는다.

---

## 4. 인증 / 권한 규칙

Backend에서 인증과 권한을 최종 검증한다.

Frontend 라우팅 가드는 보조 수단이며, 보안 기준이 아니다.

반드시 확인할 것:

- 로그인 여부
- 승인 상태
- 사용자 역할
- 발전소 접근 권한
- 본인 데이터 또는 접근 가능한 데이터 여부
- 관리자 전용 기능 여부

일반 사용자는 본인이 생성했거나 접근 권한이 있는 데이터만 조회·수정할 수 있다.

관리자는 전체 데이터 조회가 가능하지만, 관리자 작업은 로그 기록 대상이 될 수 있다.

---

## 5. 계층 구조 규칙

기존 Backend 구조를 따른다.

기본 방향:

- Controller는 요청/응답 경계에 집중한다.
- 핵심 비즈니스 규칙은 Service 또는 UseCase 계층에 둔다.
- DB 접근은 Repository 또는 Persistence Adapter 경계를 따른다.
- Storage, Queue, 외부 연동은 Adapter 성격으로 분리한다.
- Entity와 API DTO를 무리하게 혼용하지 않는다.

주의:

- Controller에 비즈니스 로직을 과하게 넣지 않는다.
- Repository에서 권한 정책을 직접 흩뿌리지 않는다.
- 외부 연동 코드를 여러 Service에 중복 작성하지 않는다.

---

## 6. 이미지 / Pair / 분석 Job 규칙

이미지 파일 자체는 DB에 저장하지 않는다.

DB에는 이미지 메타데이터와 객체 저장소 경로만 저장한다.

Pair 기준:

- 동일 inspectionId
- 동일 targetType
- 동일 equipmentId 또는 둘 다 null
- 하나는 RGB
- 하나는 THERMAL
- 두 이미지 모두 ACTIVE 상태

분석 Job 기준:

- 단건 분석은 imageId 기준으로 생성한다.
- Pair 분석은 imagePairId 기준으로 생성한다.
- ANALYSIS_JOBS에는 inspectionId를 직접 저장하지 않는 설계를 우선 확인한다.
- 분석 요청은 즉시 완료를 기다리지 않고 Job 생성과 상태 반환을 우선한다.

---

## 7. DB / Entity 작업 주의

Entity 필드 추가 전 ERD와 API 명세 정합성을 확인한다.

특히 다음 값은 응답에는 포함될 수 있지만 저장 컬럼이 아닐 수 있다.

- plantId
- zoneId
- inspectionId
- targetType
- equipmentId
- inputType

저장 컬럼과 조회 편의 필드를 구분한다.

운영 DB 변경은 migration 기준으로 관리한다.

---

## 8. 테스트 기준

가능하면 변경 범위에 맞는 테스트를 실행한다.

권장 확인:

- Backend build
- 관련 unit test
- 관련 integration test
- API request / response 검증
- 권한 조건 검증
- 오류 응답 검증

테스트를 실행하지 못했으면 `실행하지 못함`으로 보고한다. 