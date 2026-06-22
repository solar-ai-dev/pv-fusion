# B 담당 실제 배포 인계 문서

## 1. 문서 목적

- 이 문서는 현재 승인된 CloudFormation 기반 배포 구조와 AWS 권한 구성을 기준으로, B 담당자가 실제 배포를 이어서 수행할 수 있도록 정리한 최신 인계 문서다.
- B에게 직접 부여된 권한, CloudFormation 실행 Role의 책임, EC2 Runtime Role의 책임을 구분한다.
- B에게 관리자 권한이나 AWS 리소스 직접 생성 권한이 있는 것처럼 오해되지 않도록 현재 구조만 기록한다.

## 2. 현재 권한 구성 요약

### B IAM 사용자

- 이름: `pv-platform-b`
- 연결 정책: `PVInsightAssumeBDeployerRole`
- 허용 작업: `pv-insight-b-deployer-role`에 대한 `sts:AssumeRole`
- 상태: [사용자 확인 완료]

### B 배포 Role

- 이름: `pv-insight-b-deployer-role`
- 신뢰 주체: `pv-platform-b`
- MFA 조건: 필수
- 연결 정책:
  - `AWSCloudShellFullAccess`
  - `PVInsightBCloudFormationOperatorPolicy`
  - `PVInsightBSessionManagerPolicy`
- 상태: [사용자 확인 완료]

### CloudFormation 실행 Role

- 이름: `pv-insight-cloudformation-execution-role`
- 신뢰 주체: `cloudformation.amazonaws.com`
- 연결 정책: `PVInsightCloudFormationExecutionPolicy`
- 상태: [사용자 확인 완료]

### EC2 Runtime Role

- CloudFormation 템플릿이 EC2에 연결하는 Runtime Role
- 용도:
  - SSM Agent 동작
  - Jenkins의 ECR push
  - 애플리케이션 runtime의 AWS 리소스 접근
- 상태: [소스 근거 있음]

## 3. Role별 책임 구분

### `pv-platform-b`

- MFA로 로그인
- `pv-insight-b-deployer-role` Assume
- 상태: [사용자 확인 완료]

### `pv-insight-b-deployer-role`

- CloudShell 사용
- CloudFormation 템플릿 검증
- `pv-insight-mvp` Stack의 Change Set 생성, 조회, 삭제, 실행
- Stack 상태, 이벤트, 리소스, Outputs 조회
- Drift 검사
- `pv-insight-cloudformation-execution-role`에 대한 제한된 `iam:PassRole`
- MVP EC2에 대한 Session Manager 접속
- 상태: [사용자 확인 완료]

### `pv-insight-cloudformation-execution-role`

- CloudFormation이 실제 AWS 인프라를 생성하거나 변경할 때 사용하는 실행 주체
- EC2, RDS, S3, SQS, ECR, IAM 관련 실제 생성·변경은 이 Role 책임이다
- B 사용자가 직접 Assume하는 Role이 아니다
- 상태: [사용자 확인 완료]

### EC2 Runtime Role

- EC2 내부 Jenkins와 애플리케이션 runtime이 사용하는 Role
- B 사용자 권한이 아니다
- B 배포 Role과 별도다
- 상태: [소스 근거 있음]

## 4. B에게 직접 부여된 권한

### AssumeRole

- `pv-platform-b` -> `pv-insight-b-deployer-role`
- MFA 필수
- 상태: [사용자 확인 완료]

### CloudFormation

- 템플릿 검증
- Change Set 생성
- Change Set 조회
- Change Set 삭제
- Change Set 실행
- Stack 상태, 이벤트, Outputs 조회
- Drift 검사
- 상태: [사용자 확인 완료]

### PassRole

- 대상 Role:
  - `pv-insight-cloudformation-execution-role`
- 전달 대상 서비스:
  - `cloudformation.amazonaws.com`
- B는 실행 Role을 직접 Assume하지 않는다
- 상태: [사용자 확인 완료]

### Session Manager

- 프로젝트 태그가 적용된 MVP EC2에 Session Manager Session 시작
- 기본 Session Manager Shell 문서 사용
- 본인이 시작한 Session에 대한 Resume, Terminate, Data Channel 연결
- Session, SSM 관리 대상, EC2 상태 조회
- 상태: [사용자 확인 완료]

### CloudShell

- `AWSCloudShellFullAccess`는 CloudShell 환경 사용 권한이다
- 관리자 권한이 아니다
- 상태: [사용자 확인 완료]

## 5. B가 직접 가지지 않는 권한

- `AdministratorAccess`
- `PowerUserAccess`
- `IAMFullAccess`
- `AmazonSSMFullAccess`
- 전체 AWS 리소스 직접 생성 권한
- 다른 CloudFormation Stack 운영 권한
- CloudFormation 실행 Role 직접 Assume 권한
- Root 또는 관리자 계정 사용 권한
- 운영 Secret 원문 조회 권한

이 항목들은 현재 B에게 부여되지 않은 것으로 정리한다. 상태: [사용자 확인 완료]

## 6. 현재 공식 실행 구조

다음 흐름이 현재 공식 배포 구조다.

1. `pv-platform-b`가 MFA 인증
2. `pv-insight-b-deployer-role` Assume
3. CloudShell 또는 승인된 AWS CLI 환경에서 CloudFormation Change Set 작업 수행
4. `iam:PassRole`로 `pv-insight-cloudformation-execution-role` 전달
5. CloudFormation이 실행 Role을 사용해 실제 AWS 리소스 생성 또는 변경

중요:

- B가 EC2, RDS, S3, SQS, ECR, IAM 생성 API를 직접 실행하는 구조가 아니다
- 현재 공식 생성 경로는 CloudFormation Change Set + 실행 Role 구조다
- Legacy Bash의 직접 생성 권한 목록은 과거 검토 기록이며 현재 공식 권한 구조가 아니다

## 7. Session Manager 정리

- B는 MVP EC2에 Session Manager로 접속한다
- SSH 22 공개 접속 방식이 아니다
- 접속 대상 EC2와 Session 범위는 정책으로 제한된다
- 본인이 시작한 Session만 Resume, Terminate 가능하다
- `AmazonSSMFullAccess`는 사용하지 않는다

실제 Session 접속 테스트는 아직 이 문서 범위에서 수행되지 않았다. 상태: [실행 확인 필요]

## 8. CloudFormation 실행 Role과 EC2 Runtime Role의 차이

### CloudFormation 실행 Role

- 주체: CloudFormation 서비스
- 목적: 인프라 생성 및 변경
- 사용 시점: Change Set 실행 시

### EC2 Runtime Role

- 주체: EC2 내부 프로세스, Jenkins, 애플리케이션 runtime
- 목적:
  - ECR push/pull
  - SSM Agent
  - 애플리케이션의 S3, SQS 등 접근
- 사용 시점: 인프라 생성 후 운영 단계

이 둘은 같은 Role이 아니며, B 사용자에게 직접 부여된 권한도 아니다.

## 9. A / B 책임 분리

### A 완료 항목

- B 사용자 AssumeRole 권한 준비
- B Role의 MFA 신뢰 정책 준비
- B CloudFormation 운영 정책 연결 준비
- B Session Manager 정책 연결 준비
- CloudFormation 실행 Role 및 실행 정책 준비
- CloudFormation 템플릿과 실행 문서 준비

상태: [사용자 확인 완료]

### B 후속 항목

- 본인 계정과 MFA로 Role 전환 테스트
- `aws sts get-caller-identity`로 Principal 확인
- Change Set 생성, 조회, 실행
- Stack Outputs 수집
- EC2 Session Manager 접속 테스트
- 이후 Jenkins, ECR, K3s, ConfigMap, Secret, Migration, Smoke Test 수행

상태:

- Role 전환: [실행 확인 필요]
- Change Set 실행: [실행 확인 필요]
- Session Manager 접속: [실행 확인 필요]
- Jenkins/ECR/K3s 운영 배포: [실행 확인 필요]

## 10. 준비 완료와 실행 확인 필요 구분

### 준비 완료

- `pv-platform-b` IAM 사용자 정책 연결
- `pv-insight-b-deployer-role` 생성 및 정책 연결
- `pv-insight-cloudformation-execution-role` 생성 및 정책 연결
- `PVInsightBSessionManagerPolicy` 연결
- `PVInsightBCloudFormationOperatorPolicy` 연결
- `PVInsightCloudFormationExecutionPolicy` 연결

상태: [사용자 확인 완료]

### 실행 확인 필요

- B의 실제 Role Assume
- CloudFormation Change Set 실제 실행
- 실제 AWS 리소스 생성
- 실제 EC2 Session Manager 접속
- Jenkins/ECR/K3s 운영 배포

상태: [실행 확인 필요]

## 11. 참고 소스

- [infrastructure/cloudformation/README.md](/C:/solar-ai-dev/pv-fusion/infrastructure/cloudformation/README.md)
- [infrastructure/cloudformation/pv-insight-mvp.yaml](/C:/solar-ai-dev/pv-fusion/infrastructure/cloudformation/pv-insight-mvp.yaml)
- [infrastructure/cloudformation/iam/pv-insight-b-deployer-cloudformation-policy.json](/C:/solar-ai-dev/pv-fusion/infrastructure/cloudformation/iam/pv-insight-b-deployer-cloudformation-policy.json)
- [infrastructure/cloudformation/iam/pv-insight-b-session-manager-policy.json](/C:/solar-ai-dev/pv-fusion/infrastructure/cloudformation/iam/pv-insight-b-session-manager-policy.json)
- [infrastructure/cloudformation/iam/pv-insight-cloudformation-execution-role-trust-policy.json](/C:/solar-ai-dev/pv-fusion/infrastructure/cloudformation/iam/pv-insight-cloudformation-execution-role-trust-policy.json)
- [infrastructure/cloudformation/iam/pv-insight-cloudformation-execution-role-policy.json](/C:/solar-ai-dev/pv-fusion/infrastructure/cloudformation/iam/pv-insight-cloudformation-execution-role-policy.json)
- [docs/18_aws-resource-inventory.md](/C:/solar-ai-dev/pv-fusion/docs/18_aws-resource-inventory.md)
- [docs/19_jenkins-ecr-ci-preparation.md](/C:/solar-ai-dev/pv-fusion/docs/19_jenkins-ecr-ci-preparation.md)

## 12. 메모

- 실제 Account ID, 전체 ARN, 비밀번호, Access Key, Token, Secret은 기록하지 않는다
- B에게 관리자 권한이 있다고 표현하지 않는다
- B가 CloudFormation 실행 Role을 직접 Assume한다고 표현하지 않는다
- EC2 Runtime Role 권한을 B 사용자 권한으로 표현하지 않는다
- Legacy Bash 직접 생성 권한 목록은 현재 공식 권한 구조로 간주하지 않는다
