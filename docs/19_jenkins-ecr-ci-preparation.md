# Jenkins ECR CI Preparation

## 1. 범위

- 이번 단계는 Jenkins 기반 CI 준비 범위만 다룬다.
- 실제 AWS 리소스 생성, 실제 ECR push, 실제 K3s 배포는 포함하지 않는다.
- 루트 `Jenkinsfile`은 테스트, 빌드, Docker image build, Git SHA tag 규칙, 선택적 ECR push 게이트만 준비한다.

## 2. Pipeline 단계

`Jenkinsfile`은 다음 순서로 동작한다.

1. `Checkout`
2. `Resolve Build Metadata`
3. `Validate Build Environment`
4. `Frontend Test/Build`
5. `Backend Test/Build`
6. `AI Worker Test`
7. `Docker Build`
8. `Image Metadata Summary`
9. `Optional ECR Push`
10. `K3s Rollout`

K3s rollout 단계는 `ENABLE_ECR_PUSH=true` 이고 branch가 `main`일 때만 실행한다.

## 3. 서비스별 실제 명령

### Frontend

- install: `npm ci`
- verify: `npm run lint`
- verify: `npm run typecheck`
- build: `npm run build`
- docker build:

```bash
docker build --build-arg VITE_API_BASE_URL=/api/v1 -t pv-insight-frontend:<git-sha> ./frontend
```

근거:

- `frontend/package-lock.json` 존재
- `frontend/package.json`의 실제 스크립트는 `lint`, `typecheck`, `build`
- 별도 `npm test` 스크립트는 없음

### Backend

- test + build:

```bash
./gradlew test bootJar --no-daemon
```

- docker build:

```bash
docker build -t pv-insight-backend:<git-sha> ./backend
```

근거:

- `backend/gradlew` 존재
- `backend/Dockerfile`은 `bootJar` 결과 jar를 runtime image에 복사
- 이번 범위에서는 제품 코드나 테스트 구조를 바꾸지 않음

### AI Worker

- test:

```bash
python3 -m venv .venv-ci
. .venv-ci/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
pytest
```

- docker build:

```bash
docker build -t pv-insight-ai-worker:<git-sha> ./ai-worker
```

근거:

- `ai-worker/requirements.txt`에 `pytest` 포함
- `ai-worker/tests/` 존재
- `ai-worker/Dockerfile`은 `requirements.txt` 기반 설치 구조

## 4. Docker Build Context

- Frontend: `./frontend`
- Backend: `./backend`
- AI Worker: `./ai-worker`

모든 Docker build는 서비스별 디렉터리를 그대로 context로 사용한다.

## 5. Git SHA Tag 규칙

- 기본 image tag는 전체 Git commit SHA를 사용한다.
- 운영 기준에서 `latest`는 사용하지 않는다.

예시:

- `pv-insight-frontend:<git-sha>`
- `pv-insight-backend:<git-sha>`
- `pv-insight-ai-worker:<git-sha>`

Jenkins 로그에는 다음만 출력한다.

- Git commit SHA
- branch name
- 로컬 image 이름
- ECR push 활성 여부

실제 Account ID, Access Key, Secret, Token 값은 로그에 출력하지 않는다.

## 6. ECR 계약

- region: `ap-northeast-2`
- repository:
  - `pv-insight-frontend`
  - `pv-insight-backend`
  - `pv-insight-ai-worker`

ECR registry URI는 Jenkinsfile에 하드코딩하지 않는다.
실제 push가 활성화된 경우에만 `aws sts get-caller-identity`로 Account ID를 조회해 runtime에 조합한다.

예시 형식:

```text
<account-id>.dkr.ecr.ap-northeast-2.amazonaws.com/pv-insight-frontend:<git-sha>
<account-id>.dkr.ecr.ap-northeast-2.amazonaws.com/pv-insight-backend:<git-sha>
<account-id>.dkr.ecr.ap-northeast-2.amazonaws.com/pv-insight-ai-worker:<git-sha>
```

## 7. Push Gate

- Jenkins parameter 기본값: `ENABLE_ECR_PUSH=false`
- 기본 상태에서는 다음을 실행하지 않는다.
  - `aws sts get-caller-identity`
  - `aws ecr describe-repositories`
  - `aws ecr get-login-password`
  - `docker push`

Push 경로 진입 조건:

1. `ENABLE_ECR_PUSH=true`
2. 브랜치가 `main`
3. `aws` CLI 사용 가능
4. `docker` 사용 가능
5. 대상 ECR repository 3개가 이미 존재

repository가 없으면 Jenkinsfile이 생성하지 않고 실패 처리한다.

## 8. 브랜치 정책

- 모든 브랜치:
  - checkout
  - 테스트
  - 빌드
  - Docker build
  - Git SHA tag 생성
- `main` 브랜치:
  - `ENABLE_ECR_PUSH=true`일 때만 push 경로 허용

feature branch에서 `ENABLE_ECR_PUSH=true`를 주더라도 기본 정책상 push는 실행하지 않는다.

## 9. 보안 기준

- Jenkinsfile, 문서, 로그에 실제 Secret 값을 기록하지 않는다.
- AWS 인증은 장기 Access Key 대신 EC2 Instance Role 사용을 전제로 한다.
- AI 모델 파일은 image에 포함하지 않는다.
- `kubectl` 배포는 `ENABLE_ECR_PUSH=true` + `main` branch에서만 수행한다.

## 10. K3s 정합성 확인

현재 `k8s/frontend.yaml`, `k8s/backend.yaml`, `k8s/ai-worker.yaml`은 모두 다음 형식을 사용한다.

- `example.invalid/<service>:replace-me-git-sha`

정합성 확인 결과:

- namespace는 `pv-insight`
- 서비스명은 ECR repository 계약과 일치
- 실제 배포 전 단계에서 registry와 Git SHA를 치환 주입하는 구조로 볼 수 있음

`k8s/` 파일은 이번 단계에서 수정하지 않는다.

## 11. Jenkins 운영 메모

- Jenkins와 운영 Pod가 단일 EC2 자원을 공유할 예정이므로 build 병렬화는 기본 비활성화한다.
- `disableConcurrentBuilds`, `timeout`, `buildDiscarder`, `timestamps`를 적용한다.
- Docker 전체 정리 명령 (`docker system prune -af`, `docker volume prune -f`)은 넣지 않는다.

## 12. 다음 단계

- 실제 EC2 Jenkins 실행 환경 준비
- EC2 Instance Role 검증
- 실제 ECR repository 생성 완료 확인
- Jenkins job 연결
- K3s rollout stage는 Frontend / Backend / AI Worker Deployment를 Git SHA 이미지로 갱신한다
