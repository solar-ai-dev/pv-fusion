# AGENT-frontend.md

## 1. 적용 범위

이 문서는 Frontend 작업 시 적용한다.

대상 작업:

- React
- TypeScript
- Vite
- Tailwind CSS
- Routing
- API Client
- 화면 상태 처리
- 파일 업로드 UI
- 분석 요청 / 상태 조회 UI
- 결과 조회 / 시각화 UI

공통 판단 기준은 `AGENT.md`를 우선한다.

---

## 2. 기본 원칙

Frontend는 화면 렌더링과 사용자 입력 처리를 담당한다.

Frontend는 Spring Boot Backend Public API만 호출한다.

Frontend는 다음 리소스에 직접 접근하지 않는다.

- S3
- MinIO
- SQS
- RDS
- AI Worker

Backend를 우회하는 구현은 아키텍처 변경으로 본다.

---

## 3. 화면 작업 전 확인

화면 작업 전 다음을 확인한다.

- `/docs`의 화면 구조 설계
- `/docs`의 기능 명세
- `/docs`의 정책 정의서
- `/docs`의 API 명세
- 기존 route / page / component / api client 구조

화면명, 화면 ID, 기능 흐름이 문서와 다르면 보고한다.

---

## 4. UI 상태 처리 규칙

다음 상태를 누락하지 않는다.

- 로딩
- 빈 데이터
- API 오류
- 네트워크 오류
- 권한 없음
- 인증 필요
- 잘못된 경로
- 업로드 진행 중
- 분석 대기
- 분석 중
- 분석 실패
- 분석 완료

사용자에게 내부 오류 상세, Secret, Stack Trace를 노출하지 않는다.

---

## 5. API 호출 규칙

API 호출은 기존 공통 client 또는 기존 API 계층을 사용한다.

주의:

- API Base URL을 컴포넌트 내부에 하드코딩하지 않는다.
- S3 또는 MinIO URL을 직접 호출하지 않는다.
- AI Worker endpoint를 직접 호출하지 않는다.
- 인증 상태와 권한 상태는 Backend 응답을 기준으로 처리한다.
- 공통 오류 응답 형식을 고려한다.

---

## 6. 파일 업로드 UI 규칙

파일 업로드 화면에서는 다음을 처리한다.

- RGB / THERMAL 이미지 유형 선택
- inspectionId 연결
- targetType 선택
- equipmentId 선택 또는 null 처리
- 업로드 진행 상태
- 업로드 성공 / 실패 메시지
- 업로드 이미지 미리보기
- Pair 후보 또는 Pair 연결 상태 표시

Zone 전체 대상이면 equipmentId가 null일 수 있다.

Array, Panel, Module 대상이면 equipmentId가 필요하다.

---

## 7. 분석 요청 / 결과 UI 규칙

분석 요청은 Backend API를 통해 수행한다.

분석 요청 후 즉시 완료를 가정하지 않는다.

화면에서는 다음 상태를 표시한다.

- QUEUED
- RUNNING
- SUCCEEDED
- FAILED

분석 실패 시 사용자에게 실패 사유와 가능한 다음 행동을 표시한다.

결과 상세에서는 가능한 경우 다음 정보를 표시한다.

- 원본 이미지
- 분석 결과 이미지
- Bounding Box
- Heatmap
- Mask
- 이상 유형
- confidence
- 심각도
- 조치 후보
- 우선순위
- 모델 정보
- 검토 상태

---

## 8. 더미 데이터 / Mock 규칙

임시 구현을 하더라도 더미 데이터가 실제 API처럼 남지 않게 한다.

Mock 데이터는 다음 중 하나로 처리한다.

- 명확한 mock 파일로 분리
- 테스트 또는 스토리 용도로 분리
- 작업 완료 전 제거

실제 API가 불확실하면 임의로 응답 구조를 확정하지 않고 보고한다.

---

## 9. 테스트 기준

가능하면 변경 범위에 맞는 테스트를 실행한다.

권장 확인:

- typecheck
- lint
- 관련 화면 렌더링
- API 호출 흐름
- 오류 상태 처리
- 권한 없음 / 인증 필요 처리

테스트를 실행하지 못했으면 `실행하지 못함`으로 보고한다.