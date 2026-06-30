# AGENT-backend.md

## 1. 적용 범위

이 문서는 Backend 작업에 적용한다.

- Spring Boot Backend
- API Controller
- Service / UseCase
- Repository / Persistence Adapter
- 인증 / 권한
- 이미지 메타데이터
- 단건 분석 Job 생성
- 결과 조회 API
- Backend 테스트

공통 규칙은 `AGENT.md`를 우선한다.

---

## 2. 기본 원칙

Backend는 인증, 권한 검증, 점검/이미지 메타데이터 관리, 단건 분석 Job 생성, 결과 조회를 담당한다.

Frontend는 Backend Public API만 호출한다.

Backend는 AI Worker를 직접 외부에 노출하지 않는다.

---

## 3. 분석 계약

현재 제품의 분석 입력은 단건 이미지 1건뿐이다.

- RGB 분석
  - 입력: `imageId`
  - `inputType = RGB_SINGLE`
  - `requestedModelType = RGB_ONLY`
  - `modelType = RGB_ONLY`
- Thermal 분석
  - 입력: `imageId`
  - `inputType = THERMAL_SINGLE`
  - `requestedModelType = THERMAL_ONLY`
  - `modelType = THERMAL_ONLY`

Frontend 요청 본문은 `imageId`를 필수로 사용한다.

`traceId`는 기술 추적용 optional 메타데이터로 취급한다.

Backend는 `imageId`로 이미지를 조회한 뒤 DB의 `imageType` 기준으로 RGB/Thermal 단건 계약을 선택한다.

---

## 4. 금지 사항

현재 제품 기능으로 다루지 않는 항목:

- Pair 생성/조회/수정/비활성화
- `imagePairId` 기반 분석 요청
- `RGB_THERMAL_PAIR`
- `FUSION`
- `FUSION_AUTO`
- `EARLY_FUSION`
- `LATE_FUSION`

호환 필드가 DTO에 남아 있더라도 새 기능처럼 문서화하거나 확장하지 않는다.

---

## 5. DB 기준

현재 제품 런타임 DB 계약:

- `image_pairs`, `analysis_jobs.image_pair_id`, `operation_logs.image_pair_id`는 legacy 물리 구조로 남아 있을 수 있다.
- 위 Pair/Fusion 구조는 현재 제품 런타임에서 사용하지 않으며, 물리 삭제는 후속 정리 범위다.
- `analysis_jobs.image_id`는 `NOT NULL`
- 허용 `input_type`: `RGB_SINGLE`, `THERMAL_SINGLE`
- 허용 `requested_model_type`: `RGB_ONLY`, `THERMAL_ONLY`
- 허용 `model_type`: `RGB_ONLY`, `THERMAL_ONLY`
- 허용 `defect_source`: `RGB`, `THERMAL`

기존 V1~V7 migration은 수정하지 않는다.

---

## 6. 테스트 기준

변경 범위에 맞춰 최소 검증을 수행한다.

- API 요청/응답 검증
- 권한 검증
- Backend test
- `bootJar`
- 필요 시 로컬 DB/Flyway 검증

실행하지 못한 검증은 그대로 보고한다.
