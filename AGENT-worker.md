# AGENT-worker.md

## 1. 적용 범위

이 문서는 AI Worker 작업에 적용한다.

- FastAPI AI Worker
- SQS 작업 수신
- 이미지 로딩
- ONNX Runtime 추론
- RGB 단건 분석
- Thermal 단건 분석
- bbox / heatmap / mask 생성
- 분석 결과 저장
- 모델 파일 로딩

공통 규칙은 `AGENT.md`를 우선한다.

---

## 2. 기본 원칙

AI Worker는 분석 작업 처리 전용 내부 서비스다.

AI Worker는 사용자 브라우저에 직접 노출하지 않는다.

Frontend는 AI Worker를 직접 호출하지 않는다.

Backend가 Queue를 통해 전달한 작업만 처리한다.

---

## 3. 작업 흐름

1. Queue에서 분석 메시지 수신
2. `jobId`로 Job 조회
3. `imageId`로 이미지 메타데이터 조회
4. 객체 저장소에서 원본 이미지 로드
5. `inputType`에 따라 모델 선택
6. ONNX Runtime 추론
7. bbox / heatmap / mask 생성
8. 결과 이미지 저장
9. 결과 메타데이터 저장
10. Job 상태 갱신

---

## 4. 입력/모델 계약

현재 Worker가 허용하는 입력:

- `RGB_SINGLE` -> `RGB_ONLY`
- `THERMAL_SINGLE` -> `THERMAL_ONLY`

Worker는 Pair/Fusion 입력을 처리하지 않는다.

`imagePairId`는 현재 제품 계약이 아니며, legacy null 호환 필드는 무시할 수 있다.

---

## 5. 저장소 규칙

원본 이미지와 결과 이미지는 객체 저장소에 저장한다.

- 운영: S3
- 로컬: MinIO

DB에는 메타데이터와 경로만 저장한다.

---

## 6. 실패 처리

실패를 숨기지 않는다.

다음을 명확히 남긴다.

- `failureCode`
- `failureMessage`
- `jobStatus`
- `startedAt`
- `completedAt`
- `traceId`

---

## 7. 금지 사항

현재 제품 기능으로 다루지 않는 항목:

- Pair 메타데이터 조회
- `image_pairs` SQL 조회
- Fusion route
- Fusion inference
- `ModelType.FUSION`

legacy reject 테스트가 남아 있어도 runtime 계약으로 되돌리지 않는다.

---

## 8. 테스트 기준

변경 범위에 맞춰 최소 검증을 수행한다.

- pytest
- queue message 처리 검증
- 실패 케이스 검증
- `compileall`

실행하지 못한 검증은 그대로 보고한다.
