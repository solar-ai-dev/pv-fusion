# 기술 스택 및 Dependency 버전 관리

## 0. 버전 표기 기준

| 표기 | 의미 |
| --- | --- |
| 정확한 버전 | 현재 개발 환경 또는 프로젝트에서 사용할 버전 |
| x | 세부 버전은 초기 세팅 또는 설치 시점에 고정 |
| Spring Boot BOM 관리 | Spring Boot BOM에 따라 의존성 버전을 자동 관리 |
| 관리형 서비스 | AWS에서 관리하는 서비스로 별도 설치 버전 없음 |
| 모델별 관리 | 모델 파일 또는 모델 manifest에서 개별 관리 |
| lock 파일 기준 | 직접 의존성은 넓게 잡되 실제 설치 버전은 lock 파일로 고정 |
| 사용자 로컬 확인값 | 사용자의 실제 로컬 명령어 출력값 기준으로 기록 |
| 확인 필요 | 현재 코드, lock 파일 또는 실제 설치 환경을 확인한 뒤 확정해야 하는 값 |

현재 운영 모델은 RGB-only와 Thermal-only 단건 모델이다.

RGB-Thermal Pair, Synthetic paired dataset, Anomalib 품질 검증, Fusion 모델 실험은 후속 연구 범위로 관리한다.

연구용 Dependency와 모델 파일은 현재 운영 AI Worker의 필수 Dependency 또는 배포 모델로 자동 편입하지 않는다.

---

## 0.1 버전 충돌 방지 기준

| 구분 | 기준 |
| --- | --- |
| Frontend | TypeScript와 `@typescript-eslint/*`는 공식 지원 범위를 맞춰 고정 |
| Frontend | MVP 초기에는 ESLint 8.57.1을 유지하고 ESLint 9 전환은 후순위로 둔다 |
| Backend | Spring Boot는 `3.x`처럼 넓게 두지 않고 실제 `build.gradle`에서 세부 버전 고정 |
| Backend | Gradle `plugins {}` 블록에는 `1.x` 같은 와일드카드 버전 표기를 사용하지 않는다 |
| Backend | Spring Boot BOM이 관리하지 않는 의존성은 직접 버전 명시 |
| Backend DB Migration | PostgreSQL 16 사용 시 Flyway PostgreSQL 지원 모듈을 함께 추가 |
| Flyway | `flyway-core`와 `flyway-database-postgresql`은 같은 Flyway 버전으로 관리 |
| JWT | `io.jsonwebtoken` 계열은 Spring Boot BOM 관리 대상이 아니므로 직접 버전 고정 |
| AI Server | 배포 추론 환경은 NumPy 1.26.4 기준으로 고정 |
| AI Experiment | 학습/실험 환경도 NumPy 1.26.4 기준으로 제한 |
| AI Experiment | Ultralytics는 넓은 범위로 설치하지 않고 실제 검증된 세부 버전까지 lock 파일로 고정 |
| Anomalib | YOLO 학습 환경과 분리하고 `requirements-anomaly.txt` 및 lock 파일로 별도 관리 |
| Local Infra | LocalStack, MinIO, PostgreSQL Docker 이미지는 태그를 고정 |
| Docker Compose | 버전 표기는 `docker compose version` 출력값으로 재확인 후 기록 |
| Docker 이미지 | Dockerfile과 lock 파일 기준으로 재현 가능하게 관리 |
| 모델 배포 | 모델 파일은 Docker 이미지에 포함하지 않고 manifest로 버전 관리 |
| 운영 모델 | RGB-only와 Thermal-only 모델 manifest를 각각 독립적으로 관리 |
| Fusion 연구 | Fusion Dependency와 모델 manifest는 연구 환경에서 분리하고 운영 적용 승인 전에는 운영 배포값으로 사용하지 않는다 |

> [충돌 가능성 있음]
>
> 현재 모델 설계 기준은 YOLO26 계열이지만, 기존 Dependency 기록의 `ultralytics==8.2.10`과 YOLOv8 모델명은 과거 실험 기준일 수 있다.
>
> 실제 YOLO26 실험 코드와 현재 lock 파일에서 사용하는 Ultralytics 세부 버전을 확인한 뒤 최종 버전을 확정해야 한다.
>
> 아래 문서에서는 기존 기록값을 유지하되, YOLO26 호환성 검증이 필요한 항목으로 표시한다.

---

## 1. 언어 / 런타임 / 도구

| 구분 | 항목 | 버전 | 비고 |
| --- | --- | --- | --- |
| Language | Python | 3.10.x | AI Server / AI Experiment 기준 |
| Language | JDK | 17 | Java / Spring 기준 |
| Runtime | Node.js | 20.18.0 | Frontend 실행 환경 |
| Package Manager | npm | 10.8.2 | Frontend 패키지 관리 |
| Database | PostgreSQL | 16.x | 운영 RDS / 로컬 Docker 기준 |
| Build Tool | Gradle Wrapper | 8.x, 최소 8.4 이상 | Spring Boot 3.5.14 호환 기준, 실제 Wrapper 버전 고정 |
| Container | Docker | 29.2.1 | 사용자 로컬 확인값 |
| Container | Docker Compose | 사용자 로컬 확인값 | `docker compose version` 출력 기준으로 재확인 |
| Object Storage | AWS S3 | 관리형 서비스 | 운영 이미지 저장소 |
| Object Storage | MinIO | `minio/minio:RELEASE.2024-07-16T23-46-41Z` | 로컬 S3 대체 |
| Queue | AWS SQS | 관리형 서비스 | 운영 비동기 분석 Queue |
| Queue | LocalStack SQS | `localstack/localstack:3.5.0` | 로컬 SQS 대체 |
| Registry | AWS ECR | 관리형 서비스 | Docker 이미지 저장소 |
| Orchestration | K3s | x | EC2 운영 배포, 설치 시점에 고정 |
| Ingress | Traefik | K3s 기본 포함 | K3s Ingress Controller |
| CI/CD | Jenkins | x | 이미지 빌드 / 배포 |
| CLI | AWS CLI | 2.x | AWS 리소스 관리 |
| CLI | kubectl | K3s 버전 호환 | K3s 버전에 맞춰 고정 |

---

# 2. Frontend

| 구분 | 항목 | 버전 | 비고 |
| --- | --- | --- | --- |
| Frontend Framework | React | 18.3.1 | 프론트엔드 프레임워크 |
| Frontend Library | React DOM | 18.3.1 | React 렌더링 |
| Language | TypeScript | 5.6.3 | 타입 안정성 |
| Build Tool | Vite | 5.4.10 | 프론트 빌드 도구 |
| Vite Plugin | @vitejs/plugin-react | 4.3.3 | React 플러그인 |
| Styling | Tailwind CSS | 3.4.x | 스타일링 |
| Routing | react-router-dom | 6.28.0 | 페이지 라우팅 |
| HTTP Client | axios | 1.7.7 | Backend API 통신 |
| State Management | zustand | 5.0.1 | 인증 상태 / UI 상태 관리 |
| Server State | @tanstack/react-query | 5.x | 서버 상태, 캐싱, 재요청 관리 |
| Form | react-hook-form | 7.x | 등록/수정 폼 관리 |
| Validation | zod | 3.x | 입력값 검증 |
| Chart | recharts | 2.x | 대시보드 통계 시각화 |
| Date Utility | dayjs | 1.x | 날짜 포맷 처리 |
| Type Definitions | @types/react | 18.3.12 | React 타입 정의 |
| Type Definitions | @types/react-dom | 18.3.1 | React DOM 타입 정의 |
| Type Definitions | @types/node | 20.17.6 | Node 타입 정의 |
| Lint | ESLint | 8.57.1 | 코드 검사 |
| Lint Plugin | @typescript-eslint/eslint-plugin | 8.10.0 이상 | TypeScript 5.6 대응 |
| Lint Plugin | @typescript-eslint/parser | 8.10.0 이상 | TypeScript 5.6 대응 |
| Lint Plugin | eslint-plugin-react-hooks | 4.6.2 이상 | React Hooks lint |
| Lint Plugin | eslint-plugin-react-refresh | 0.4.14 | React Refresh lint |
| Formatter | Prettier | 3.3.3 | 코드 포맷팅 |

## 2.1 Frontend 버전 주의 사항

| 항목 | 기준 |
| --- | --- |
| TypeScript / ESLint | TypeScript 5.6.x 사용 시 `@typescript-eslint/*`는 v8.10.0 이상으로 맞춘다 |
| ESLint | MVP 초기에는 ESLint 8.57.1을 유지한다 |
| ESLint 9 | ESLint 9 전환은 flat config 전환 부담이 있으므로 초기 세팅 안정화 후 별도 판단한다 |
| package-lock.json | 실제 설치 버전 기준이므로 반드시 커밋한다 |
| Tailwind / React Query / RHF / Zod | 직접 의존성이므로 package.json과 package-lock.json에서 고정한다 |
| 운영 화면 범위 | Pair/Fusion 전용 화면과 Dependency는 현재 Frontend 운영 범위에 포함하지 않는다 |

## 2.2 Frontend 버전 고정 파일

| 구분 | 파일 | 비고 |
| --- | --- | --- |
| Frontend | `frontend/package.json` | 직접 의존성 관리 |
| Frontend | `frontend/package-lock.json` | 실제 설치 버전 고정, 필수 커밋 |
| Frontend | `frontend/tsconfig.json` | TypeScript 설정 |
| Frontend | `frontend/tsconfig.node.json` | Vite / Node TypeScript 설정 |
| Frontend | `frontend/vite.config.ts` | Vite 설정 |
| Frontend | `frontend/.env.example` | 환경변수 예시 |
| Frontend | `frontend/Dockerfile` | Frontend Docker 이미지 기준 |

---

# 3. Backend / Java Spring

| 구분 | 항목 | 버전 | 비고 |
| --- | --- | --- | --- |
| Language | JDK | 17 | Java / Spring 기준 |
| Build Tool | Gradle Wrapper | 8.x, 최소 8.4 이상 | Gradle 버전 고정 |
| Gradle Plugin | org.springframework.boot | 3.5.14 | 실제 `build.gradle`에서도 동일 버전으로 고정 |
| Gradle Plugin | io.spring.dependency-management | 1.1.5 | Gradle plugins 블록은 정확한 버전 필요 |
| Spring Starter | spring-boot-starter-web | Spring Boot BOM 관리 | REST API |
| Spring Starter | spring-boot-starter-security | Spring Boot BOM 관리 | 인증 / 인가 |
| Spring Starter | spring-boot-starter-oauth2-client | Spring Boot BOM 관리 | Google OAuth2 로그인 |
| Spring Starter | spring-boot-starter-data-jpa | Spring Boot BOM 관리 | JPA / Hibernate ORM |
| Spring Starter | spring-boot-starter-validation | Spring Boot BOM 관리 | 요청값 검증 |
| Spring Starter | spring-boot-starter-actuator | Spring Boot BOM 관리 | Health Check / 운영 모니터링 |
| Java Dependency | postgresql | Spring Boot 3.5.14 BOM 관리 | PostgreSQL Driver |
| Java Dependency | software.amazon.awssdk:s3 | 2.x | AWS S3 연동 |
| Java Dependency | software.amazon.awssdk:sqs | 2.x | AWS SQS 연동 |
| Java Dependency | lombok | Spring Boot 3.5.14 BOM 관리 또는 1.18.30 이상 | JDK 17 호환성 기준 |
| Java Dependency | jjwt-api | 0.12.6 | JWT 사용 시 적용 |
| Java Dependency | jjwt-impl | 0.12.6 | runtimeOnly 권장 |
| Java Dependency | jjwt-jackson | 0.12.6 | runtimeOnly 권장 |
| Migration | flyway-core | Spring Boot 3.5.14 BOM 관리 또는 동일 Flyway 버전 | DB Migration 관리 |
| Migration | flyway-database-postgresql | flyway-core와 동일 | PostgreSQL 16 지원 모듈 |
| Test | spring-boot-starter-test | Spring Boot BOM 관리 | Backend 테스트 |
| Test | testcontainers | x | PostgreSQL / LocalStack 통합 테스트 |

## 3.1 Backend 버전 주의 사항

| 항목 | 기준 |
| --- | --- |
| Spring Boot | Spring Boot는 `3.5.14`로 확정하고, 실제 `build.gradle`에도 `3.5.14`를 정확히 작성한다 |
| Gradle Wrapper | Spring Boot 3.5.14 호환을 위해 Gradle Wrapper는 최소 8.4 이상을 사용하고 실제 Wrapper 버전을 고정한다 |
| Gradle Plugin | `plugins {}` 블록에는 `1.x`, `3.5.x` 같은 와일드카드 표기를 그대로 넣지 않는다 |
| JJWT | Spring Boot BOM 관리 대상이 아니므로 `jjwt-api`, `jjwt-impl`, `jjwt-jackson` 버전을 모두 동일하게 고정한다 |
| JJWT 구조 | `jjwt-api`는 implementation, `jjwt-impl`과 `jjwt-jackson`은 runtimeOnly로 관리한다 |
| Flyway | PostgreSQL 16 사용 시 `flyway-core`만 두지 않고 `flyway-database-postgresql`을 함께 추가한다 |
| Flyway 버전 | `flyway-core`와 `flyway-database-postgresql`은 같은 Flyway 버전으로 관리한다 |
| Lombok | JDK 17 기준 최소 1.18.30 이상을 사용한다 |
| PostgreSQL Driver | PostgreSQL 16.x와 맞춰 Spring Boot 3.5.14 BOM 관리 버전을 사용한다 |
| AWS SDK | S3와 SQS 모듈은 같은 2.x 계열로 맞춘다 |
| 분석 계약 | Backend 분석 요청은 `imageId` 기준 단건 분석으로 처리하며 Pair/Fusion Dependency를 운영 필수 의존성으로 추가하지 않는다 |

## 3.2 Backend Gradle 의존성 기준

```gradle
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.5.14'
    id 'io.spring.dependency-management' version '1.1.5'
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.springframework.boot:spring-boot-starter-oauth2-client'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'

    implementation 'org.postgresql:postgresql'

    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-database-postgresql'

    implementation 'software.amazon.awssdk:s3'
    implementation 'software.amazon.awssdk:sqs'

    implementation 'io.jsonwebtoken:jjwt-api:0.12.6'
    runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.6'
    runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.6'

    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```

> 위 예시는 Spring Boot 3.5.14 확정 기준이다. 실제 `build.gradle`에는 `3.5.x`처럼 와일드카드로 작성하지 않는다.

> `flyway-core`와 `flyway-database-postgresql`은 Spring Boot BOM으로 함께 관리하거나, 직접 버전을 명시할 경우 둘 다 같은 Flyway 버전을 작성한다.

## 3.3 Backend 버전 고정 파일

| 구분 | 파일 | 비고 |
| --- | --- | --- |
| Backend | `backend/build.gradle` | Gradle 의존성 관리 |
| Backend | `backend/settings.gradle` | Gradle 프로젝트 설정 |
| Backend | `backend/gradle/wrapper/gradle-wrapper.properties` | Gradle Wrapper 버전 고정 |
| Backend | `backend/src/main/resources/application-local.yml` | 로컬 Backend 설정 |
| Backend | `backend/src/main/resources/application-prod.yml` | 운영 Backend 설정 |
| Backend | `backend/src/main/resources/db/migration/` | Flyway Migration 파일 |
| Backend | `backend/Dockerfile` | Backend Docker 이미지 기준 |

## 3.4 Backend 제외 대상

- JSP 관련 설정
- war
- javax.servlet-api
- javax.servlet:jstl
- tomcat-embed-jasper
- MyBatis 관련 의존성
- MyBatis Mapper 인터페이스
- MyBatis XML Mapper
- DB에 이미지 바이너리 직접 저장하는 방식
- 현재 운영 범위에 없는 Pair/Fusion 전용 API와 Dependency
- `image_pair_id`를 현재 운영 분석 입력으로 사용하는 구현

---

# 4. AI Server / Python FastAPI

| 구분 | 항목 | 버전 | 비고 |
| --- | --- | --- | --- |
| Language | Python | 3.10.x | AI Server 기준 |
| Python Library | FastAPI | 0.115.5 | AI Worker Health Check / 내부 처리 |
| Python Library | pydantic | 2.9.2 | 데이터 검증 |
| Python Library | pydantic_core | 2.23.4 | pydantic 연계 |
| Python Library | pydantic-settings | 2.6.1 | 설정 관리 |
| Python Library | uvicorn | 0.32.0 | ASGI 서버 |
| Python Library | python-dotenv | 1.0.1 | 로컬 환경변수 관리 |
| Python Library | boto3 | 1.x | AWS S3 / SQS 연동 |
| Python Library | botocore | boto3 호환 | boto3 내부 의존성 |
| Python Library | onnxruntime | 1.19.x | ONNX 모델 CPU 추론 |
| Python Library | onnx | 1.16.x | ONNX 변환 및 검증 |
| Python Library | opencv-python-headless | 4.10.0.84 | 이미지 전처리 / 후처리 |
| Python Library | numpy | 1.26.4 | 이미지 / 수치 처리 |
| Python Library | pillow | 11.0.0 | 이미지 파일 처리 |
| Python Library | psycopg | 3.x | PostgreSQL 접근 |
| Python Library | SQLAlchemy | 2.x | DB 접근 추상화 |
| Python Library | python-multipart | 0.0.12 | 내부 파일 처리 시 사용 가능 |
| Python Library | requests | 2.32.3 | HTTP 요청 |
| Python Library | httpx | 0.27.2 | 비동기 HTTP 요청 |
| Test | pytest | 8.3.3 | 테스트 |
| Formatter | black | 24.10.0 | 코드 포맷팅 |
| Lint | ruff | 0.7.3 | 린트 / 정적 분석 |

## 4.1 AI Server 버전 주의 사항

| 항목 | 기준 |
| --- | --- |
| NumPy | AI Server는 `numpy==1.26.4`로 고정한다 |
| ONNX Runtime | NumPy 1.26.4와 함께 검증된 버전을 lock 파일로 고정한다 |
| OpenCV | 서버 환경에서는 GUI 의존성이 없는 `opencv-python-headless`를 사용한다 |
| boto3 / botocore | boto3 설치 시 botocore가 함께 결정되므로 lock 파일 기준으로 고정한다 |
| DB 접근 | AI Worker가 DB에 직접 접근하는 구조로 확정될 경우 psycopg / SQLAlchemy 버전을 고정한다 |
| Backend Callback | AI Worker가 Backend Internal API로 결과를 전달하는 구조라면 DB 접근 의존성은 최소화할 수 있다 |
| 운영 모델 | AI Worker는 RGB-only와 Thermal-only 모델만 운영 필수 모델로 로드한다 |
| Fusion | Fusion Dependency와 모델 파일은 현재 운영 AI Worker의 필수 항목으로 취급하지 않는다 |

## 4.2 AI Server 모델 추론 의존성

| 구분 | 항목 | 버전 | 비고 |
| --- | --- | --- | --- |
| Model Runtime | ONNX Runtime | 1.19.x | 배포 추론 기본 Runtime |
| Model Format | ONNX FP32 | 모델별 관리 | RGB-only / Thermal-only 기본 배포 후보 |
| Model Format | ONNX INT8 | 모델별 관리 | 양자화 성능 검증 후 적용 |
| Python Library | onnxruntime-tools | 사용 여부 확인 | 양자화 방식에 따라 필요 여부 결정 |

## 4.3 AI Server 버전 고정 파일

| 구분 | 파일 | 비고 |
| --- | --- | --- |
| AI Server | `ai-worker/.python-version` | Python 3.10.x 고정 |
| AI Server | `ai-worker/requirements.txt` | Python 직접 의존성 관리 |
| AI Server | `ai-worker/requirements.lock.txt` | 실제 설치 버전 고정 |
| AI Server | `ai-worker/.env.example` | AI Worker 환경변수 예시 |
| AI Server | `ai-worker/Dockerfile` | AI Worker Docker 이미지 기준 |

---

# 5. AI Experiment / Model Training

| 구분 | 항목 | 버전 | 비고 |
| --- | --- | --- | --- |
| Language | Python | 3.10.x | AI Server와 동일 계열 |
| Python Library | numpy | 1.26.4 | AI Server와 호환성 유지 |
| Python Library | torch | 2.3.1 | 초기 실험 기준 |
| Python Library | torchvision | 0.18.1 | torch 2.3.1 호환 |
| Python Library | ultralytics | 8.2.10 | 기존 기록값. YOLO26 실험 코드와 실제 호환 여부 확인 필요 |
| Python Library | anomalib | requirements-anomaly.txt 기준 | 후속 연구용 Synthetic 품질 검증 환경 |
| Python Library | lightning | requirements-anomaly.txt 기준 | Anomalib 환경에서만 관리 |
| Python Library | mlflow | x | 선택, CSV/JSON Logger로 대체 가능 |
| Python Library | pandas | 2.2.x | 실험 결과 정리 |
| Python Library | matplotlib | 3.9.x | 실험 결과 시각화 |
| Python Library | scikit-learn | 1.5.x | 지표 계산 |
| Python Library | onnx | 1.16.x | ONNX 변환 및 검증 |
| Python Library | onnxruntime | 1.19.x | ONNX 추론 결과 검증 |

## 5.1 AI Experiment 버전 주의 사항

| 항목 | 기준 |
| --- | --- |
| NumPy | 실험 환경도 `numpy==1.26.4`로 제한한다 |
| Torch / torchvision | 서로 호환되는 버전으로 함께 고정한다 |
| Ultralytics | 넓은 버전 범위로 설치하지 않고 실제 YOLO26 실험 코드에서 검증한 세부 버전으로 고정한다 |
| 기존 Ultralytics 기록 | `8.2.10`은 기존 문서 기록값이며 현재 YOLO26 코드와 호환되는지 확인해야 한다 |
| Anomalib | Torch, Lightning 의존성이 강하므로 운영 모델 학습 환경과 분리한다 |
| Anomalib 분리 | `requirements-anomaly.txt`와 `requirements-anomaly.lock.txt`로 별도 관리한다 |
| Anomalib 설치 | 설치 후 `pip freeze` 또는 lock 도구로 실제 설치 버전을 고정한다 |
| ONNX 변환 | 학습 환경과 배포 환경의 onnx / onnxruntime 버전 차이를 기록한다 |
| CUDA | GPU 사용 시 torch wheel은 CUDA 버전에 따라 별도 설치 명령을 문서화한다 |
| CPU 기준 | MVP 배포 추론은 ONNX Runtime CPU 기준으로 검증한다 |
| 운영/연구 구분 | RGB-only와 Thermal-only는 운영 모델 후보이며, Synthetic·Anomalib·Fusion은 후속 연구 환경으로 분리한다 |

## 5.2 AI Experiment 환경 분리 기준

| 환경 | 목적 | 파일 |
| --- | --- | --- |
| YOLO 운영 모델 실험 환경 | RGB-only / Thermal-only 단건 모델 학습 | `experiments/requirements-train.txt` |
| Fusion 후속 연구 환경 | RGB-Thermal paired dataset 및 Fusion 실험 | `experiments/requirements-fusion.txt` 또는 연구용 별도 환경 |
| Anomalib 검증 환경 | Synthetic defect 품질 검증 | `experiments/requirements-anomaly.txt` |
| Anomalib 검증 lock | Anomalib 실제 설치 버전 고정 | `experiments/requirements-anomaly.lock.txt` |
| Export 환경 | PyTorch → ONNX 변환 및 검증 | `experiments/requirements-export.txt` |
| 배포 검증 환경 | ONNX Runtime CPU 추론 검증 | `experiments/requirements-deploy-check.txt` |

> [구현상 보완 제안]
>
> 현재 저장소에 `requirements-fusion.txt`가 없다면 임의로 운영 필수 파일을 추가하지 않는다.
>
> 실제 Fusion 연구를 시작할 때 운영 모델 학습 환경과의 Dependency 충돌 여부를 확인한 뒤 별도 파일 추가를 검토한다.

## 5.3 requirements-train.txt 작성 기준

```text
numpy==1.26.4
torch==2.3.1
torchvision==0.18.1

# [확인 필요]
# 실제 YOLO26 실험 코드에서 검증된 Ultralytics 세부 버전으로 고정한다.
ultralytics==8.2.10

pandas==2.2.*
matplotlib==3.9.*
scikit-learn==1.5.*
onnx==1.16.*
onnxruntime==1.19.*
```

`ultralytics==8.2.10`은 기존 기록값이다.

현재 YOLO26 실험 코드의 실제 설치 버전이 다르면 코드와 lock 파일을 기준으로 문서 값을 수정한다.

## 5.4 requirements-anomaly.txt 작성 기준

```text
numpy==1.26.4

# Anomalib은 운영 모델 학습 환경과 분리된 별도 venv에서 설치한다.
# 설치 후 requirements-anomaly.lock.txt로 실제 설치 버전을 고정한다.
anomalib
lightning
torch
torchvision
```

Anomalib 환경은 후속 연구용 Synthetic paired dataset 품질 검증에 사용하며, 현재 운영 AI Worker Dependency에 포함하지 않는다.

## 5.5 requirements-anomaly.lock.txt 생성 기준

```bash
python -m venv .venv-anomaly
source .venv-anomaly/bin/activate

pip install -r experiments/requirements-anomaly.txt
pip freeze > experiments/requirements-anomaly.lock.txt
```

> Windows 환경에서는 `source` 대신 `.venv-anomaly\Scripts\activate`를 사용한다.

## 5.6 AI Experiment 버전 고정 파일

| 구분 | 파일 | 비고 |
| --- | --- | --- |
| AI Experiment | `experiments/.python-version` | Python 3.10.x 고정 |
| AI Experiment | `experiments/requirements.txt` | 공통 실험 의존성 관리 |
| AI Experiment | `experiments/requirements-train.txt` | RGB-only / Thermal-only 모델 학습 의존성 |
| AI Experiment | `experiments/requirements-anomaly.txt` | 후속 연구용 Anomalib 품질 검증 의존성 |
| AI Experiment | `experiments/requirements-anomaly.lock.txt` | Anomalib 실제 설치 버전 고정 |
| AI Experiment | `experiments/requirements-export.txt` | ONNX 변환 의존성 |
| AI Experiment | `experiments/requirements.lock.txt` | 실험 재현성 확보 |
| AI Experiment | `experiments/configs/*.yaml` | 실험 설정 관리 |
| AI Experiment | `experiments/results/*.json` | 실험 결과 저장 |
| Model | `model-manifest.yaml` | 운영 모델명, 버전, Runtime, threshold 관리 |

Fusion 연구용 Dependency와 모델 manifest는 현재 운영 모델 파일과 구분해 관리한다.

---

# 6. Local Infra

| 구분 | 항목 | 버전 | 비고 |
| --- | --- | --- | --- |
| Container | Docker | 29.2.1 | 사용자 로컬 확인값 |
| Container | Docker Compose | 사용자 로컬 확인값 | `docker compose version` 출력 기준으로 재확인 |
| Database | PostgreSQL Docker Image | `postgres:16` | 로컬 DB |
| Object Storage | MinIO | `minio/minio:RELEASE.2024-07-16T23-46-41Z` | 로컬 S3 대체 |
| Queue | LocalStack | `localstack/localstack:3.5.0` | 로컬 SQS 대체 |
| Network | Docker Compose Network | Compose 기준 | 서비스 간 로컬 통신 |
| Secret | .env.local | - | 로컬 전용, Git 제외 |
| Secret Example | .env.example | - | 예시 파일, Git 포함 가능 |

## 6.1 Local Infra 버전 주의 사항

| 항목 | 기준 |
| --- | --- |
| PostgreSQL | 운영 RDS PostgreSQL 16.x와 로컬 PostgreSQL Docker 16.x를 맞춘다 |
| MinIO | S3 API 호환성 확인 후 Docker 이미지 태그를 고정한다 |
| LocalStack | SQS 기능 사용 가능 버전을 확인하고 Docker 이미지 태그를 고정한다 |
| Docker Compose | `v5.1.0`처럼 임의 표기하지 않고 `docker compose version` 출력값으로 재확인한다 |
| Docker Compose 문서 표기 | 확인 전에는 `사용자 로컬 확인값`으로 표기한다 |
| 환경 변수 | 실제 Secret은 `.env.local`에만 작성하고 Git에 커밋하지 않는다 |
| Queue 메시지 | local에서도 `imageId` 기준 RGB/Thermal 단건 분석 메시지를 사용한다 |

## 6.2 Docker Compose 버전 확인 명령

```bash
docker compose version
```

기록 예시:

```text
Docker Compose version v2.x.x
```

사용자 환경에서 다르게 출력되는 경우 해당 출력값을 그대로 기록한다.

## 6.3 Local Infra 버전 고정 파일

| 구분 | 파일 | 비고 |
| --- | --- | --- |
| Infra | `docker-compose.local.yml` | 로컬 통합 실행 정의 |
| Infra | `.env.example` | 공통 환경변수 예시 |
| Infra | `.env.local` | 로컬 실제 환경변수, Git 제외 |
| Infra | `docker/` | PostgreSQL / MinIO / LocalStack 보조 설정 |
| Infra | `scripts/local/*` | 로컬 실행 스크립트 |

---

# 7. Production Infra

| 구분 | 항목 | 버전 | 비고 |
| --- | --- | --- | --- |
| Cloud | AWS EC2 | 관리형 서비스 | K3s Cluster 실행 |
| Database | AWS RDS PostgreSQL | 16.x | 운영 DB |
| Object Storage | AWS S3 | 관리형 서비스 | 원본 이미지 / 분석 결과 이미지 저장 |
| Queue | AWS SQS | 관리형 서비스 | AI 단건 분석 작업 Queue |
| Registry | AWS ECR | 관리형 서비스 | Docker 이미지 저장소 |
| Orchestration | K3s | x | 운영 Pod 관리, 설치 시점에 고정 |
| Ingress | Traefik | K3s 기본 포함 | Frontend / Backend 라우팅 |
| Secret | Kubernetes Secret | - | 운영 Secret |
| Secret | AWS Secrets Manager | 관리형 서비스 | 선택 |
| Logs | CloudWatch Logs | 관리형 서비스 | Backend / AI Worker 로그 수집 |
| CI/CD | Jenkins | x | 이미지 빌드 / ECR Push / K3s 배포 |

## 7.1 Production Infra 버전 주의 사항

| 항목 | 기준 |
| --- | --- |
| K3s | kubectl, Traefik, Kubernetes manifest는 K3s 설치 버전에 맞춘다 |
| Jenkins | 단일 EC2에서 빌드와 운영 Pod가 CPU/메모리를 공유하므로 리소스 경합을 주의한다 |
| ECR | Frontend / Backend / AI Worker 이미지는 서비스별 Repository로 분리한다 |
| Image Tag | `git-sha` 기반 태그를 기본으로 사용한다 |
| latest | 개발 편의용으로만 사용하고 운영 배포 기준으로 삼지 않는다 |
| Secret | 운영 Secret은 Kubernetes Secret 또는 AWS Secrets Manager로 관리한다 |
| 모델 파일 | Docker 이미지에 포함하지 않고 AI Worker 기동 시 S3 또는 별도 모델 저장소에서 로드한다 |
| 운영 모델 | RGB-only와 Thermal-only 모델만 운영 Worker 필수 모델로 배포한다 |
| Fusion 모델 | 후속 연구 후보가 선정되고 운영 적용 승인을 받기 전에는 운영 Worker에 배포하지 않는다 |

---

# 8. 버전 고정 파일

| 구분 | 파일 | 비고 |
| --- | --- | --- |
| Frontend | `frontend/package.json` | 직접 의존성 관리 |
| Frontend | `frontend/package-lock.json` | lock 파일, 필수 커밋 |
| Frontend | `frontend/.env.example` | 환경변수 예시 |
| Frontend | `frontend/Dockerfile` | Frontend 이미지 기준 |
| Backend | `backend/build.gradle` | Gradle 의존성 관리, Spring Boot 세부 버전 고정 |
| Backend | `backend/gradle/wrapper/gradle-wrapper.properties` | Gradle 버전 고정 |
| Backend | `backend/src/main/resources/application-local.yml` | 로컬 설정 |
| Backend | `backend/src/main/resources/application-prod.yml` | 운영 설정 |
| Backend | `backend/src/main/resources/db/migration/` | Flyway Migration |
| Backend | `backend/Dockerfile` | Backend 이미지 기준 |
| AI Server | `ai-worker/requirements.txt` | 배포 서버 의존성 |
| AI Server | `ai-worker/requirements.lock.txt` | 실제 설치 버전 고정 |
| AI Server | `ai-worker/.python-version` | Python 버전 고정 |
| AI Server | `ai-worker/.env.example` | 환경변수 예시 |
| AI Server | `ai-worker/Dockerfile` | AI Worker 이미지 기준 |
| AI Experiment | `experiments/requirements*.txt` | 실험 목적별 의존성 분리 |
| AI Experiment | `experiments/requirements-train.txt` | RGB-only / Thermal-only 모델 학습 의존성 |
| AI Experiment | `experiments/requirements-anomaly.txt` | 후속 연구용 Anomalib 전용 의존성 |
| AI Experiment | `experiments/requirements-anomaly.lock.txt` | Anomalib 실제 설치 버전 고정 |
| AI Experiment | `experiments/requirements.lock.txt` | 실험 재현성 확보 |
| Model | `model-manifest.yaml` | RGB-only / Thermal-only 운영 모델명, 버전, Runtime, threshold 관리 |
| Infra | `docker-compose.local.yml` | 로컬 통합 실행 |
| Infra | `k8s/*.yaml` | 운영 배포 Manifest |
| Infra | `k8s/_examples/secret-example.yaml` | Secret 예시, 실제 배포 제외 |
| CI/CD | `Jenkinsfile` | 이미지 빌드 / ECR Push / K3s 배포 |

---

# 9. Dependency 충돌 위험 항목

| 영역 | 위험 항목 | 기준 |
| --- | --- | --- |
| Frontend | TypeScript 5.6 + typescript-eslint 7.x | typescript-eslint 8.10.0 이상 사용 |
| Frontend | ESLint 9 전환에 따른 flat config 변경 부담 | MVP 초기에는 ESLint 8.57.1 유지 |
| Backend | Spring Boot 3.x / 3.5.x 범위 표기 | 실제 `build.gradle`에서 `3.5.14`로 세부 버전 고정 |
| Backend | Gradle plugin `1.x` 표기 | `io.spring.dependency-management`는 `1.1.5`처럼 정확한 버전 사용 |
| Backend | PostgreSQL 16 + Flyway core only | `flyway-database-postgresql` 추가 |
| Backend | Flyway core와 DB 모듈 버전 불일치 | 두 모듈은 같은 Flyway 버전으로 관리 |
| Backend | JJWT 버전 x | `0.12.6`으로 명시 |
| Backend | Lombok 낮은 1.18.x | JDK 17 기준 1.18.30 이상 또는 Spring Boot 3.5.14 BOM 관리 버전 사용 |
| AI Server | NumPy 2.x 유입 | `numpy==1.26.4` 고정 |
| AI Server | 운영 Worker에 Fusion Dependency 포함 | 현재 운영 Worker는 RGB-only / Thermal-only Dependency만 유지 |
| AI Experiment | 기존 Ultralytics 8.2.10과 YOLO26 코드 불일치 가능성 | 실제 실험 환경과 lock 파일 확인 후 세부 버전 확정 |
| AI Experiment | torch / anomalib 동시 설치 충돌 | Anomalib 환경 분리 및 lock 파일 생성 |
| AI Experiment | CUDA wheel 미정 | CUDA 사용 시 별도 설치 명령 기록 |
| AI Experiment | Fusion 연구 Dependency가 운영 환경으로 유입 | 연구 환경과 운영 Worker 환경을 별도 requirements/lock 파일로 관리 |
| ONNX Export | 학습 환경과 배포 환경의 onnxruntime 차이 | 변환/검증/배포 버전을 manifest에 기록 |
| Local Infra | LocalStack 버전 변동 | `localstack/localstack:3.5.0`으로 고정 |
| Local Infra | MinIO 버전 변동 | MinIO Docker 이미지 태그 고정 |
| Local Infra | Docker Compose 버전 오기재 | `docker compose version` 출력값으로 재확인 |

---

# 10. 모델 버전 관리 기준

| 항목 | 관리 기준 |
| --- | --- |
| 모델 파일 | Git에 직접 커밋하지 않음 |
| 모델 저장소 | 운영은 S3 또는 별도 모델 저장소, 로컬은 지정 디렉터리 사용 |
| 모델 메타데이터 | `model-manifest.yaml`에서 관리 |
| 모델 Runtime | ONNX Runtime 기준 |
| 모델 형식 | ONNX FP32 기본, INT8은 검증 후 적용 |
| 모델 버전 | 모델명, 버전, 입력 크기, threshold, Runtime 기록 |
| 분석 결과 | 분석 시점의 모델명, 모델 버전, 모델 형식, Runtime, threshold 저장 |
| 운영 모델 범위 | RGB-only / Thermal-only 단건 모델 |
| 연구 모델 범위 | Pair/Fusion 모델은 연구 산출물로 별도 관리 |
| 운영 전환 | Fusion 연구 모델을 운영에 반영할 경우 API, DB, Queue, Worker 계약 검토 후 별도 승인 |

## 10.1 model-manifest.yaml 예시

```yaml
models:
  - model_name: rgb-only-yolo26s
    model_version: v0.1.0
    input_type: RGB_SINGLE
    model_type: RGB_ONLY
    format: ONNX
    precision: FP32
    runtime: ONNX_RUNTIME
    input_size: 640
    threshold: 0.25
    object_key: models/rgb-only-yolo26s/v0.1.0/model.onnx

  - model_name: thermal-only-yolo26s
    model_version: v0.1.0
    input_type: THERMAL_SINGLE
    model_type: THERMAL_ONLY
    format: ONNX
    precision: FP32
    runtime: ONNX_RUNTIME
    input_size: 640
    threshold: 0.25
    object_key: models/thermal-only-yolo26s/v0.1.0/model.onnx
```

현재 운영 `model-manifest.yaml`에는 RGB-only와 Thermal-only 모델만 포함한다.

Fusion 연구 후보는 운영 manifest에 바로 추가하지 않는다.

연구용 manifest가 필요한 경우 운영 manifest와 구분되는 경로와 파일명을 사용한다.

예시:

```text
experiments/manifests/fusion-research-manifest.yaml
```

연구 결과가 채택되더라도 운영 manifest 반영 전 다음 항목을 별도로 확인한다.

- 운영 입력 유형
- 모델 유형
- Pair 데이터 구조
- Queue 메시지 계약
- AI Worker 입출력 계약
- ONNX 변환 가능 여부
- CPU 추론 성능
- 배포 리소스 영향

---

# 11. 초기 세팅 시 우선 확정할 항목

| 우선순위 | 항목 | 확정 기준 |
| --- | --- | --- |
| 1 | Spring Boot 3.5.14 | `build.gradle`에서 정확한 버전 고정 |
| 2 | Gradle Wrapper 8.x 세부 버전 | Spring Boot 3.5.14 호환 기준, 최소 8.4 이상 |
| 3 | io.spring.dependency-management | `1.1.5`처럼 정확한 버전 사용 |
| 4 | Frontend package-lock.json | npm install 후 필수 커밋 |
| 5 | typescript-eslint v8 계열 | TypeScript 5.6.3과 맞춤 |
| 6 | JJWT 0.12.6 | Spring Boot BOM 외부 의존성 |
| 7 | Flyway PostgreSQL 모듈 | `flyway-core`와 같은 버전으로 관리 |
| 8 | AI Server requirements.lock.txt | 배포 추론 환경 재현성 확보 |
| 9 | AI Experiment Ultralytics 세부 버전 | YOLO26 실험 코드와 실제 환경 확인 후 고정 |
| 10 | AI Experiment requirements 분리 | 운영 모델 / Anomalib / Export / 후속 연구 충돌 방지 |
| 11 | requirements-anomaly.lock.txt | Anomalib 실제 설치 버전 고정 |
| 12 | Docker Compose 버전 | `docker compose version` 출력값으로 재확인 |
| 13 | Docker 이미지 태그 | PostgreSQL, MinIO, LocalStack 고정 |
| 14 | K3s / kubectl 버전 | 운영 서버 설치 시점에 고정 |
| 15 | 운영 모델 manifest | RGB-only / Thermal-only 모델 경로와 버전 확정 |
| 16 | Fusion 연구 환경 | 실제 연구 시작 시 운영 환경과 분리 여부 확인 |

---

# 12. 최종 결정 요약

| 항목 | 최종 결정 |
| --- | --- |
| TypeScript | 5.6.3 |
| ESLint | 8.57.1 |
| @typescript-eslint | 8.10.0 이상 |
| React | 18.3.1 |
| Vite | 5.4.10 |
| Spring Boot | 3.5.14 |
| io.spring.dependency-management | 1.1.5 |
| JDK | 17 |
| PostgreSQL | 16.x |
| Flyway | `flyway-core` + `flyway-database-postgresql` 함께 사용 |
| JJWT | 0.12.6 |
| Python | 3.10.x |
| NumPy | 1.26.4 |
| Torch | 2.3.1 |
| torchvision | 0.18.1 |
| Ultralytics | 기존 기록 8.2.10, YOLO26 실제 환경 확인 후 최종 확정 |
| ONNX Runtime | 1.19.x |
| LocalStack | `localstack/localstack:3.5.0` |
| MinIO | `minio/minio:RELEASE.2024-07-16T23-46-41Z` |
| PostgreSQL Docker | `postgres:16` |
| Docker Compose | `docker compose version` 출력값 기준 |
| 운영 입력 유형 | `RGB_SINGLE`, `THERMAL_SINGLE` |
| 운영 모델 유형 | `RGB_ONLY`, `THERMAL_ONLY` |
| Pair/Fusion | 후속 연구 범위, 현재 운영 Dependency와 manifest에서 제외 |

---

# 13. 메모 업데이트용 요약

- 기술 스택 및 Dependency 버전 관리 문서를 RGB·Thermal 단건 운영 기준으로 정리함.
- Frontend는 TypeScript 5.6.3, ESLint 8.57.1, @typescript-eslint 8.10.0 이상 조합을 유지함.
- Backend는 Spring Boot 3.5.14를 사용하고 실제 `build.gradle`에도 같은 버전으로 고정하도록 명시함.
- Gradle `io.spring.dependency-management` 플러그인은 `1.1.5`로 정확히 표기함.
- Flyway는 PostgreSQL 16 대응을 위해 `flyway-core`와 `flyway-database-postgresql`을 함께 사용하고 같은 버전으로 관리함.
- JJWT는 0.12.6으로 고정함.
- AI Server와 AI Experiment는 NumPy 1.26.4 기준으로 통일함.
- 현재 운영 AI Worker는 RGB-only와 Thermal-only 모델만 필수 모델로 사용함.
- 운영 모델 manifest에서 RGB-Thermal Fusion 모델 항목을 제거함.
- Pair/Fusion 관련 Dependency와 모델은 후속 연구 산출물로 분리해 관리함.
- 기존 `ultralytics==8.2.10`은 YOLO26 실험 코드와 호환되는지 확인이 필요한 값으로 표시함.
- Anomalib은 운영 모델 학습 환경과 분리하고 `requirements-anomaly.txt`와 lock 파일로 별도 관리함.
- LocalStack은 `localstack/localstack:3.5.0`, MinIO는 `minio/minio:RELEASE.2024-07-16T23-46-41Z`, PostgreSQL Docker는 `postgres:16`으로 유지함.
- Docker Compose 버전은 `docker compose version` 출력값 기준으로 재확인하도록 유지함.
- Fusion 운영 전환이 필요한 경우 API, DB, Queue, AI Worker, Frontend 및 배포 구조를 별도로 검토해야 함.