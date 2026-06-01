# AGENT-worker.md

## 1. 적용 범위

이 문서는 AI Worker 작업 시 적용한다.

대상 작업:

- FastAPI AI Worker
- SQS 작업 수신
- 이미지 로딩
- ONNX Runtime 추론
- RGB-only 분석
- Thermal-only 분석
- RGB-Thermal Fusion 분석
- bbox / heatmap / mask 생성
- 분석 결과 저장
- 모델 파일 로딩

공통 판단 기준은 `AGENT.md`를 우선한다.

---

## 2. 기본 원칙

AI Worker는 분석 작업 처리자이며 외부 사용자용 API 서버가 아니다.

AI Worker는 외부 사용자에게 직접 노출하지 않는다.

Frontend는 AI Worker를 직접 호출하지 않는다.

Backend 또는 Queue를 통해 전달된 작업만 처리한다.

---

## 3. 작업 처리 흐름

기본 흐름은 다음을 따른다.

1. Queue에서 분석 작업 메시지 수신
2. jobId 기준으로 분석 Job 조회
3. imageId 또는 imagePairId 기준으로 이미지 메타데이터 조회
4. 객체 저장소에서 원본 이미지 읽기
5. inputType에 따라 모델 선택
6. ONNX Runtime 기반 추론
7. bbox / heatmap / mask 등 결과 생성
8. 결과 이미지 객체 저장소 저장
9. 결과 메타데이터 저장
10. Job 상태 갱신

이 흐름을 임의로 우회하지 않는다.

---

## 4. 입력 유형 / 모델 선택 규칙

입력 유형 기준:

- RGB_SINGLE → RGB-only 모델
- THERMAL_SINGLE → Thermal-only 모델
- RGB_THERMAL_PAIR → Fusion 모델

Pair 분석은 RGB 이미지와 열화상 이미지를 함께 입력한다.

Fusion 분석 입력 형식이 불확실하면 임의로 확정하지 않는다.

모델 입력 크기, threshold, runtime, modelVersion은 재현성 정보로 관리한다.

---

## 5. 객체 저장소 규칙

이미지는 DB에서 직접 읽지 않는다.

원본 이미지와 결과 이미지는 객체 저장소에서 읽고 저장한다.

운영 환경은 S3를 기준으로 한다.

로컬 환경은 MinIO를 기준으로 한다.

bucketName, objectKey, fileUrl 등 경로 정보는 기존 메타데이터 구조를 따른다.

---

## 6. 결과 생성 규칙

분석 결과에는 가능한 경우 다음 정보를 포함한다.

- bbox
- class
- confidence
- heatmap
- mask
- anomaly count
- area ratio
- severity score
- severity level
- action candidate
- priority level
- model name
- model version
- model format
- runtime
- input size
- threshold

출력 형식이 문서 또는 기존 코드와 다르면 보고한다.

---

## 7. 실패 처리 규칙

분석 실패 시 실패를 숨기지 않는다.

다음 정보를 남길 수 있게 처리한다.

- failureCode
- failureMessage
- jobStatus
- startedAt
- completedAt
- traceId 또는 추적 가능한 식별자

실패한 작업을 성공으로 저장하지 않는다.

이미지 문제, 모델 로딩 실패, 객체 저장소 오류, Queue 오류, DB 오류는 구분 가능한 형태로 남긴다.

---

## 8. 모델 파일 규칙

모델 파일을 Git에 무단 포함하지 않는다.

대용량 모델 파일은 서비스 코드와 분리한다.

운영 환경에서는 모델 파일을 외부 저장소에서 가져오는 구조를 우선한다.

모델 다운로드 실패 시 조용히 무시하지 않는다.

모델 버전과 경로는 config 또는 환경 변수 기준을 따른다.

---

## 9. 테스트 기준

가능하면 변경 범위에 맞는 테스트를 실행한다.

권장 확인:

- unit test
- 샘플 입력 추론
- Queue message 처리
- 객체 저장소 read/write mock 또는 local 확인
- 실패 케이스 처리
- ONNX Runtime 로딩 확인

테스트를 실행하지 못했으면 `실행하지 못함`으로 보고한다.