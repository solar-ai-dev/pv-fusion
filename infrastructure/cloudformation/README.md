# CloudFormation Deployment Guide

## 목적

- `pv-insight` MVP의 승인된 AWS 배포 아키텍처는 유지한다.
- AWS Infrastructure 생성과 변경은 CloudFormation Stack과 Change Set으로만 수행한다.
- EC2 내부 K3s, Traefik, Frontend/Backend/AI Worker Pod 구조는 변경하지 않는다.

## 범위

CloudFormation이 관리하는 범위:

- VPC, Subnet, Route Table, Internet Gateway
- EC2, Elastic IP
- RDS PostgreSQL
- S3
- SQS Main Queue / DLQ
- ECR 3개 저장소
- CloudWatch Log Group 2개
- EC2 Runtime IAM Role / Instance Profile

CloudFormation이 관리하지 않는 범위:

- EC2 내부 K3s 설치와 운영
- Kubernetes manifest 배포
- Jenkins build/push 흐름
- Frontend, Backend, AI Worker 애플리케이션 코드

## 디렉터리 구조

- `pv-insight-mvp.yaml`
  - AWS Infrastructure의 단일 기준 템플릿
- `parameters/pv-insight-mvp.example.env`
  - 비밀값 없는 예시 파라미터 값
- `iam/`
  - CloudFormation 실행 Role, B 배포 Role, B Session Manager 정책 초안
- `policies/pv-insight-mvp-stack-policy.proposal.json`
  - 확정 전 검토용 Stack Policy 제안안

## 실행 전 조건

- AWS CLI 설치
- Region: `ap-northeast-2`
- B 개인 로그인 및 MFA 완료
- `pv-insight-b-deployer-role` 또는 동등 권한 Role assume 완료
- `pv-insight-cloudformation-execution-role` 준비 완료
- `pv-insight-b-session-manager-policy.json` 검토 및 생성/연결 준비 완료
- 실제 비밀값은 Git, 문서, 명령 히스토리에 기록하지 않음

## 단일 기준 파일

- 실제 AWS Infrastructure 정의의 단일 기준은 `pv-insight-mvp.yaml`이다.
- 리소스 생성 순서, 존재 여부 판단, 재시도 로직을 Bash에서 다시 구현하지 않는다.
- 개별 AWS 서비스의 `create-*` 명령으로 동일 리소스를 수동 생성하지 않는다.

## 공식 실행 흐름

### 1. 사전 확인

```bash
aws sts get-caller-identity
aws cloudformation get-template-summary \
  --region ap-northeast-2 \
  --template-body file://infrastructure/cloudformation/pv-insight-mvp.yaml
```

### 2. 템플릿 검증

```bash
aws cloudformation validate-template \
  --region ap-northeast-2 \
  --template-body file://infrastructure/cloudformation/pv-insight-mvp.yaml
```

`cfn-lint`가 설치되어 있으면 추가로 실행한다.

```bash
cfn-lint infrastructure/cloudformation/pv-insight-mvp.yaml
```

### 3. 비밀값 없는 파라미터 준비

예시 파일:

- `infrastructure/cloudformation/parameters/pv-insight-mvp.example.env`

실제 비밀값은 파일에 저장하지 않는다. `RdsMasterPassword`는 Change Set 생성 직전에 셸에서 안전하게 입력한다.

```bash
read -r -s -p "Enter RdsMasterPassword: " RDS_MASTER_PASSWORD
printf '\n'
export RDS_MASTER_PASSWORD
```

### 4. Change Set 생성

신규 Stack이면 `CREATE`, 기존 Stack이면 `UPDATE`를 사용한다.

```bash
STACK_NAME=pv-insight-mvp
CHANGE_SET_NAME="${STACK_NAME}-$(date +%Y%m%d%H%M%S)"
CFN_EXEC_ROLE_ARN="arn:aws:iam::<ACCOUNT_ID>:role/pv-insight-cloudformation-execution-role"
```

```bash
aws cloudformation create-change-set \
  --region ap-northeast-2 \
  --stack-name "${STACK_NAME}" \
  --change-set-name "${CHANGE_SET_NAME}" \
  --change-set-type CREATE \
  --template-body file://infrastructure/cloudformation/pv-insight-mvp.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --role-arn "${CFN_EXEC_ROLE_ARN}" \
  --parameters \
    ParameterKey=Environment,ParameterValue=mvp \
    ParameterKey=ProjectPrefix,ParameterValue=pv-insight \
    ParameterKey=VpcCidr,ParameterValue=10.40.0.0/16 \
    ParameterKey=PublicSubnetCidr,ParameterValue=10.40.0.0/24 \
    ParameterKey=PrivateDbSubnetACidr,ParameterValue=10.40.10.0/24 \
    ParameterKey=PrivateDbSubnetBCidr,ParameterValue=10.40.11.0/24 \
    ParameterKey=AvailabilityZoneA,ParameterValue=ap-northeast-2a \
    ParameterKey=AvailabilityZoneB,ParameterValue=ap-northeast-2c \
    ParameterKey=Ec2InstanceType,ParameterValue=t3.large \
    ParameterKey=Ec2EbsSizeGb,ParameterValue=100 \
    ParameterKey=RdsInstanceClass,ParameterValue=db.t4g.micro \
    ParameterKey=RdsAllocatedStorage,ParameterValue=20 \
    ParameterKey=RdsMasterUsername,ParameterValue=pvfusion \
    ParameterKey=RdsMasterPassword,ParameterValue="${RDS_MASTER_PASSWORD}" \
    ParameterKey=S3BucketName,ParameterValue=pv-insight-mvp-apne2-5452a92fd82c \
    ParameterKey=ImageId,ParameterValue=/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64
```

기존 Stack 업데이트일 때는 `--change-set-type UPDATE`로 생성한다.

### 5. Change Set 검토

```bash
aws cloudformation describe-change-set \
  --region ap-northeast-2 \
  --stack-name "${STACK_NAME}" \
  --change-set-name "${CHANGE_SET_NAME}"
```

다음을 반드시 확인한다.

- `Add`, `Modify`, `Remove`
- `Replacement=True` 여부
- RDS, EC2, S3, IAM 변경 여부
- 비용과 보안 영향

### 6. 승인 후 실행

```bash
aws cloudformation execute-change-set \
  --region ap-northeast-2 \
  --stack-name "${STACK_NAME}" \
  --change-set-name "${CHANGE_SET_NAME}"
```

Change Set 생성과 실행은 반드시 분리한다.

### 7. 상태, 이벤트, 출력 확인

```bash
aws cloudformation describe-stacks \
  --region ap-northeast-2 \
  --stack-name "${STACK_NAME}"
```

```bash
aws cloudformation describe-stack-events \
  --region ap-northeast-2 \
  --stack-name "${STACK_NAME}"
```

```bash
aws cloudformation describe-stacks \
  --region ap-northeast-2 \
  --stack-name "${STACK_NAME}" \
  --query 'Stacks[0].Outputs' \
  --output table
```

### 8. Drift 확인

```bash
aws cloudformation detect-stack-drift \
  --region ap-northeast-2 \
  --stack-name "${STACK_NAME}"
```

```bash
aws cloudformation describe-stack-drift-detection-status \
  --region ap-northeast-2 \
  --stack-drift-detection-id <DRIFT_DETECTION_ID>
```

## Optional Helper

- `scripts/aws/11-cfn-infrastructure.sh`
  - 위 AWS CLI 명령을 편의상 묶은 선택형 helper다.
  - 공식 실행 기준을 대체하지 않는다.
- `scripts/aws/11-readonly-inventory.sh`
  - 읽기 전용 조사 도구다.
  - Stack 생성이나 변경을 수행하지 않는다.

## B Session Manager 접근

- CloudFormation 템플릿의 EC2 runtime role은 `AmazonSSMManagedInstanceCore`를 포함한다.
- B 담당의 Session Manager 접속 권한은 별도 정책으로 분리한다.
- 정책 초안 파일:
  - `infrastructure/cloudformation/iam/pv-insight-b-session-manager-policy.json`
- 이 정책은 다음 범위만 허용한다.
  - `pv-insight` / `mvp` / `ec2-k3s-node` 태그의 EC2 인스턴스에 대한 `ssm:StartSession`
  - 기본 세션 문서 `SSM-SessionManagerRunShell`
  - 본인이 시작한 세션에 대한 `ssmmessages:OpenDataChannel`
  - 본인 세션에 대한 `ssm:ResumeSession`, `ssm:TerminateSession`
  - 세션 및 인스턴스 상태 확인용 `ssm:DescribeSessions`, `ssm:DescribeInstanceInformation`, `ssm:GetConnectionStatus`, `ec2:DescribeInstances`

## Legacy Bash

- `scripts/aws/11-create-infrastructure.sh`는 reference 전용이다.
- 더 이상 공식 실행 경로가 아니다.
- 동일 리소스를 Legacy Bash와 CloudFormation으로 병행 생성하지 않는다.

## 운영 원칙

- 변경은 Git과 PR을 통해 관리한다.
- 실제 상태 관리는 CloudFormation이 담당한다.
- 중요한 변경은 Change Set 검토 후 실행한다.
- 실제 비밀값은 Stack Output이나 요약 파일로 남기지 않는다.
