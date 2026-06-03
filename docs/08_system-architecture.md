## 2. 시스템 아키텍처

### 2-1. 전체 시스템 아키텍처

본 시스템은 EC2 기반 K3s Cluster 내부에 Traefik Ingress Controller, React Frontend Pod, Spring Boot Backend Pod, FastAPI AI Worker Pod를 배치하여 운영한다. 사용자 브라우저의 HTTPS 요청은 Traefik Ingress Controller를 통해 Frontend 또는 Backend API로 라우팅된다. Frontend는 화면 렌더링과 업로드·결과 조회 요청을 담당하고, Backend는 인증·권한 검증, 서비스 데이터 관리, 이미지 메타데이터 저장, 분석 작업 생성 및 결과 조회 API를 담당한다.

AI 분석은 AWS SQS 기반 비동기 구조로 처리된다. Backend가 분석 작업을 SQS에 등록하면 FastAPI AI Worker가 작업을 수신하고, AWS S3에 저장된 원본 이미지를 읽어 ONNX Runtime 기반 추론을 수행한다. 생성된 분석 결과 이미지는 S3에 저장되며, 분석 상태와 결과 메타데이터는 AWS RDS PostgreSQL에 저장된다. Backend와 AI Worker의 운영 로그는 CloudWatch Logs로 전송된다.

CI/CD는 Jenkins와 AWS ECR을 통해 수행한다. Jenkins가 Frontend, Backend, AI Worker의 Docker 이미지를 빌드하고 AWS ECR에 저장하면, K3s Cluster는 해당 이미지를 배포하여 각 Pod를 갱신한다. AWS SQS, S3, RDS, CloudWatch Logs는 K3s 외부의 AWS 관리형 서비스로 분리하여 사용한다.


### 2-2. 시스템 아키텍처 구성요소별 역할

| 구성요소 | 핵심 역할 |
| --- | --- |
| React Frontend | 화면 렌더링, 이미지 업로드 UI, 분석 요청, 분석 상태/결과 조회, 대시보드 표시 |
| Spring Boot Backend | 로그인/권한 검증, 발전소·구역·점검 관리, 이미지 메타데이터 관리, 분석 작업 생성/상태 관리, 결과 저장/조회 |
| FastAPI AI Worker | SQS 작업 수신, S3 이미지 읽기, ONNX Runtime 추론, bbox/heatmap/mask 생성, 결과 이미지 저장 |
| AWS SQS | AI 분석 작업을 비동기 큐로 관리 |
| AWS S3 | 원본 이미지와 분석 결과 이미지 저장 |
| AWS RDS PostgreSQL | 사용자, 발전소, 구역, 점검, 분석 상태, 결과 메타데이터 저장 |
| Traefik Ingress Controller | 외부 요청을 Frontend와 Backend로 라우팅 |
| CloudWatch Logs | 운영 로그 수집 |
| Jenkins / ECR | Docker 이미지 빌드, 저장, K3s 배포 |

### 2-3. 기술 스택

| 영역 | 주요 기술 |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Spring Boot, Spring Security, JPA, Hexagonal Architecture |
| AI Server | FastAPI, Python, ONNX Runtime, OpenCV |
| Database | AWS RDS PostgreSQL, PostgreSQL Docker |
| Storage | AWS S3, MinIO |
| Queue | AWS SQS, LocalStack SQS |
| Infra / Deploy | Docker, EC2, K3s, Traefik, Jenkins, ECR |
| Logs / Secret | CloudWatch Logs, Kubernetes Secret, AWS Secrets Manager |

### 2-4. 운영 환경 / 로컬 테스트 환경

| 구분 | 운영 환경 | 로컬 테스트 환경 |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | React + TypeScript + Vite |
| Backend | Spring Boot | Spring Boot Local Profile |
| AI Server | FastAPI AI Worker | FastAPI Local Worker |
| Model Runtime | ONNX Runtime | ONNX Runtime CPU |
| DB | AWS RDS PostgreSQL | PostgreSQL Docker |
| Storage | AWS S3 | MinIO |
| Queue | AWS SQS | LocalStack SQS |
| Ingress | Traefik Ingress Controller | localhost / Local Traefik |
| Container | Docker | Docker / Docker Compose |
| Orchestration | EC2 + K3s | Docker Compose / Local K3s |
| CI/CD | Jenkins + AWS ECR | 수동 실행 또는 로컬 Docker Build |
| Logs | CloudWatch Logs | Console Log |
| Secret | Kubernetes Secret / AWS Secrets Manager | .env.local / local profile |