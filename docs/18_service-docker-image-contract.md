# Service Docker Image Contract

## 1. 목적

Frontend, Backend, AI Worker를 각각 독립 Docker Image로 빌드하기 위한 최소 실행 계약을 정의한다.

- 이미지에는 Secret을 포함하지 않는다.
- 환경별 값은 실행 시점의 env 또는 외부 설정으로 주입한다.
- Docker Compose, Jenkins, K3s, AWS 배포 리소스 구현은 이 문서 범위에 포함하지 않는다.

## 2. 아키텍처 기준

- 외부 Ingress와 라우팅 책임은 Traefik이 가진다.
- Traefik은 `/` 요청을 Frontend Service로, `/api` 요청을 Backend Service로 전달한다.
- Frontend Pod 내부의 nginx는 Vite build 산출물인 `dist` 정적 파일만 제공한다.
- nginx는 Traefik을 대체하지 않고, Backend 앞단 reverse proxy 역할도 하지 않는다.
- AI Worker는 외부 Ingress에 공개하지 않고 내부적으로 SQS 작업만 처리한다.

## 3. Frontend Image

### 빌드

- 파일: `frontend/Dockerfile`
- build stage: `node:20-alpine`
- runtime stage: `nginx:1.27-alpine`
- build 명령:

```bash
docker build -t pvfusion-frontend --build-arg VITE_API_BASE_URL=https://app.example.com/api/v1 ./frontend
```

### 실행

- 컨테이너 포트: `80`
- 정적 파일 서버: nginx
- SPA fallback: `index.html`
- Health 경로: `/health`

### 환경변수 계약

- `VITE_API_BASE_URL`은 Vite build-time 변수다.
- Dockerfile은 이 값을 기본값으로 고정하지 않는다.
- 빌드 시 값을 명시적으로 주입해야 한다.

### 확인 필요

- 현재 프론트 소스는 `VITE_API_BASE_URL`이 비어 있으면 `http://localhost:8080/api/v1`로 fallback한다.
- 로컬 개발 문서와 API 명세에는 이 localhost 값이 존재하지만, 운영용 Dockerfile 기본값으로 고정할 근거는 없다.
- 운영 빌드에서 어떤 public base URL을 넣을지는 배포 단계에서 명시적으로 결정해야 한다.

## 4. Backend Image

### 빌드

- 파일: `backend/Dockerfile`
- build stage: `eclipse-temurin:17-jdk`
- runtime stage: `eclipse-temurin:17-jre`
- Gradle Wrapper로 `bootJar`를 생성한다.
- `*-plain.jar`를 제외한 실행 가능한 Spring Boot jar 하나만 선택해 runtime image에 복사한다.

### 실행

- 컨테이너 포트: `8080`
- 실행 명령:

```bash
java -jar /app/app.jar
```

- Health 경로: `/actuator/health`

### 환경 주입

- `SPRING_PROFILES_ACTIVE`, DB, OAuth, Storage, Queue 설정은 이미지가 아니라 env에서 주입한다.
- local/prod 공통 이미지 재사용을 전제로 한다.

## 5. AI Worker Image

### 빌드

- 파일: `ai-worker/Dockerfile`
- base image: `python:3.10-slim`
- `requirements.txt` 기반으로 의존성을 설치한다.
- ONNX Runtime CPU 구성을 사용한다.

### 실행

- 컨테이너 포트: `8000`
- 실행 명령:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- liveness 경로: `/health`
- 내부 상태 경로: `/internal/health`

### 환경변수 계약

- `AI_WORKER_WORKER_ENABLED=false` 같은 Dockerfile 기본 비활성화 설정은 사용하지 않는다.
- AI Worker는 기존 설정 계약대로 필요한 env가 없으면 명확하게 실패해야 한다.
- 대표 필수 값:
  - `APP_ENV`
  - `DATABASE_URI`
  - `SQS_QUEUE_URL`
  - `STORAGE_DEFAULT_BUCKET`
- local에서는 추가로 LocalStack/MinIO endpoint와 credential env가 필요하다.

### 모델 공급 계약

- 이미지에는 대용량 모델 파일과 manifest를 포함하지 않는다.
- local은 외부 볼륨 또는 로컬 파일 마운트로 모델 경로를 공급해야 한다.
- 운영 설계 기준으로는 AI Worker 시작 전 또는 시작 시점에 외부 저장소에서 모델을 공급하는 방식이 필요하다.
- 현재 코드가 직접 참조하는 계약 경로는 `RGB_MODEL_MANIFEST_PATH`, `THERMAL_MODEL_MANIFEST_PATH`다.

## 6. Build Context 제외 기준

각 서비스 `.dockerignore`는 다음 항목을 기본 제외 대상으로 둔다.

- `.env`, `.env.*`
- build output
- cache 디렉터리
- test 산출물
- IDE/로그 파일
- 대용량 모델 파일

`*.example` 파일은 계약 확인 용도로만 남기고, 이미지에는 복사하지 않는다.
