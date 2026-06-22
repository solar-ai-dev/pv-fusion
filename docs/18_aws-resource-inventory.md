# 11단계 AWS 인프라 최종 승인 구성 및 생성 스크립트 메모

## 목적

- 승인된 11단계 AWS 인프라 구성을 문서와 생성 스크립트에 반영한다.
- `scripts/aws/11-create-infrastructure.sh`를 `plan/apply` 이원 구조로 정리한다.
- 이번 단계에서는 AWS 리소스를 실제로 생성하지 않는다.

## 완료 상태

- `부분 완료 - Plan/Apply 분리 및 CloudShell 재검증 대기`

## 승인된 구성

- Region: `ap-northeast-2`
- Environment: `mvp`
- Network:
  - 프로젝트 전용 VPC
  - `10.40.0.0/16`
  - Public Subnet 1개
  - Private DB Subnet 2개
  - Internet Gateway 1개
  - NAT Gateway 없음
  - Load Balancer 없음
- EC2:
  - `t3.large`
  - `gp3 100GB`
  - Elastic IP 1개
  - IMDSv2 필수
  - SSM 접속
  - `80/443`만 공개
- IAM:
  - 단일 EC2 Instance Role
  - EC2 Instance Profile 1개
  - Jenkins Deploy Role 현재 미생성
- RDS:
  - PostgreSQL `16`
  - `db.t4g.micro`
  - `gp3 20GB`
  - Single-AZ
  - Backup Retention `7일`
  - Storage Encryption 활성화
  - Deletion Protection 활성화
  - Publicly Accessible `false`
- SQS:
  - Standard Main Queue 1개
  - DLQ 1개
  - Visibility Timeout `900초`
  - Long Polling `20초`
  - Main Retention `4일`
  - DLQ Retention `14일`
- S3:
  - Bucket 1개
  - `originals/`
  - `results/`
  - `models/`
- ECR:
  - Repository 3개
  - Git SHA Tag 사용
  - Tag Immutability 활성화
  - Basic Scan on Push 활성화
- CloudWatch:
  - `/pv-insight/backend`
  - `/pv-insight/ai-worker`
  - Retention `14일`

## 실행 모드

### `ACTION=plan`

- 읽기 전용 모드
- 허용 목적:
  - 현재 Principal 확인
  - 리전/환경/승인값 확인
  - SSM AMI 조회
  - 기존 동일 이름 리소스 존재 여부 확인
  - 재사용/생성 예정 리소스 출력
- 변경 금지:
  - `create-*`
  - `put-*`
  - `run-instances`
  - `allocate-address`
  - `associate-address`
  - `attach-*`
  - `authorize-security-group-*`
  - `add-role-to-instance-profile`
  - `modify-*`
  - `delete-*`
  - `remove-*`
- 종료 문구:
  - `PLAN COMPLETE`
  - `No AWS resources were created or modified.`

### `ACTION=apply`

- 실제 생성/재사용 모드
- 이번 단계에서는 실행하지 않음
- 승인 게이트 3단계:
  1. `ACTION=apply`
  2. `AWS_CONFIRM_PHASE2_CREATE=yes`
  3. 정확한 승인 문자열 입력

## 승인 게이트

- 승인 문자열 형식:
  - `CREATE pv-insight mvp ap-northeast-2`
- `plan`에서는 승인 문자열을 요구하지 않는다.
- `apply`에서만 승인 문자열과 민감값 입력을 요구한다.

## Plan에서 허용한 AWS 명령 범위

- `sts get-caller-identity`
- `ec2 describe-*`
- `ssm get-parameter`
- `iam get-*`
- `iam list-*`
- `ecr describe-*`
- `s3api head-bucket`
- `s3api list-buckets`
- `sqs get-queue-url`
- `rds describe-*`
- `logs describe-*`

## Apply 전용 변경 함수 보호

- 변경 함수는 모두 `require_apply_mode()`로 보호한다.
- 보호 대상:
  - VPC / IGW / Subnet / Route Table 생성 및 연결
  - Security Group 생성 및 ingress 규칙 추가
  - IAM Role / Policy / Instance Profile 생성 및 연결
  - ECR 생성
  - S3 생성 및 설정 변경
  - SQS 생성 및 Redrive Policy 설정
  - RDS 생성
  - EC2 생성
  - Elastic IP 생성 및 연결
  - CloudWatch Log Group 생성 및 Retention 설정

## EC2 waiter 흐름

- 신규 EC2 생성 시 흐름:
  1. `run-instances`
  2. Instance ID 검증
  3. `aws ec2 wait instance-running`
  4. Elastic IP 연결
  5. `aws ec2 wait instance-status-ok`
  6. Public IP 후속 조회
  7. 비민감 출력 기록

- 기존 EC2 재사용 시:
  - `running`이면 waiter와 후속 검증
  - `pending`이면 waiter 후 검증
  - `stopped`면 자동 시작하지 않고 중단
  - `shutting-down`, `terminated`면 중단

## IAM Instance Profile 전파 처리

- Role 생성 직후 전파 지연을 고려해 반복 조회를 수행한다.
- 방식:
  - `get-instance-profile`로 Role 연결 여부 확인
  - 제한된 재시도 횟수와 대기 시간 사용
- 기본값:
  - 재시도 `12회`
  - 대기 `10초`

## RDS waiter 및 Endpoint 조회 흐름

- 신규 RDS 생성 시:
  1. `create-db-instance`
  2. `aws rds wait db-instance-available`
  3. `Endpoint.Address` 후속 조회
  4. `Endpoint.Port` 후속 조회
  5. 값 검증 후 비민감 출력 기록

- 기존 RDS 재사용 시:
  - `available`이면 재사용
  - `creating`이면 waiter 후 재조회
  - `deleting`, `failed` 등 비정상 상태면 중단

## S3 CORS 처리

[확인 필요]

- 실제 Frontend Origin과 TLS/Domain이 아직 확정되지 않았으므로 S3 CORS는 12단계에서 적용한다.

현재 원칙:

- 11단계 `run_apply()`에서는 `configure_s3_cors()`를 호출하지 않는다.
- `AllowedOrigins=["*"]`는 사용하지 않는다.
- Elastic IP 기반 HTTP/HTTPS Origin 자동 생성은 제거했다.
- 향후 명시적 Origin 값이 있을 때만 별도 단계에서 적용한다.

## 비용 메모

기준:

- Region: `ap-northeast-2`
- 가격 확인일: `2026-06-22`
- 월 가동 시간: `730시간`

기본 월 정가:

- EC2 `t3.large`: `75.92 USD`
- EBS `gp3 100GB`: `9.12 USD`
- Public IPv4 또는 Elastic IP 1개: `3.65 USD`
- RDS `db.t4g.micro`: `18.25 USD`
- RDS `gp3 20GB`: `2.62 USD`
- 합계: `109.56 USD/month`

120 USD Credit 예상 소진:

- 약 `1.10개월`

추가 가능 비용:

- EC2 T3 CPU Credit
- RDS T4g CPU Credit
- S3/SQS/ECR/CloudWatch
- 데이터 전송
- 세금, 환율

## 생성 전 CloudShell 검증 명령

```bash
bash -n scripts/aws/11-create-infrastructure.sh

unset AWS_CONFIRM_PHASE2_CREATE

ACTION=plan \
S3_BUCKET_NAME=<unique-bucket-name> \
bash scripts/aws/11-create-infrastructure.sh
```

`ACTION=apply` 예시는 문서에만 남기고 이번 단계에서 실행하지 않는다.

## 출력값 관리

- 실제 생성 후 비민감 출력 파일:
  - `scripts/aws/output/11-create-summary.env`
- 저장 가능 값:
  - VPC ID
  - Subnet ID
  - Security Group ID
  - IAM Role Name
  - Instance Profile Name
  - ECR Repository URI
  - S3 Bucket Name
  - SQS Queue URL
  - RDS Endpoint
  - EC2 Instance ID
  - Elastic IP
- 저장 금지 값:
  - DB Password
  - Access Key
  - Session Token
  - OAuth Secret
  - 기타 Secret

## 후속 구현 항목

- SQS Visibility 연장:
  - AI Worker 후속 구현 항목
- CloudWatch Agent:
  - EC2 Memory/Disk 지표 수집용 12단계 후속 항목
- Jenkins Role 분리:
  - Jenkins 분리 실행 환경 도입 시 후속 항목
- Object Key Prefix 정합성:
  - Backend 문서와 AI Worker 구현 차이 후속 점검

## 실제 AWS 생성 결과

- `미생성 - CloudShell 재검증 대기`
