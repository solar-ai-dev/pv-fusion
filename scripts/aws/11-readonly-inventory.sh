#!/usr/bin/env bash

set -u

AWS_REGION="${AWS_REGION:-ap-northeast-2}"
PROJECT_PREFIX="${PROJECT_PREFIX:-pv-insight}"
VPC_NAME="${PROJECT_PREFIX}-vpc"
IGW_NAME="${PROJECT_PREFIX}-igw"
PUBLIC_SUBNET_NAME="${PROJECT_PREFIX}-public-subnet"
PRIVATE_DB_SUBNET_A_NAME="${PROJECT_PREFIX}-private-db-subnet-a"
PRIVATE_DB_SUBNET_B_NAME="${PROJECT_PREFIX}-private-db-subnet-b"
PUBLIC_ROUTE_TABLE_NAME="${PROJECT_PREFIX}-public-rt"
EC2_SECURITY_GROUP_NAME="${PROJECT_PREFIX}-ec2-sg"
RDS_SECURITY_GROUP_NAME="${PROJECT_PREFIX}-rds-sg"
EC2_ROLE_NAME="${PROJECT_PREFIX}-ec2-runtime-role"
EC2_INSTANCE_PROFILE_NAME="${PROJECT_PREFIX}-ec2-instance-profile"
ECR_FRONTEND_REPO="${PROJECT_PREFIX}-frontend"
ECR_BACKEND_REPO="${PROJECT_PREFIX}-backend"
ECR_AI_WORKER_REPO="${PROJECT_PREFIX}-ai-worker"
SQS_MAIN_QUEUE_NAME="${PROJECT_PREFIX}-analysis-jobs"
SQS_DLQ_NAME="${PROJECT_PREFIX}-analysis-jobs-dlq"
RDS_IDENTIFIER="${PROJECT_PREFIX}-postgres"
BACKEND_LOG_GROUP="/${PROJECT_PREFIX}/backend"
AI_WORKER_LOG_GROUP="/${PROJECT_PREFIX}/ai-worker"
S3_BUCKET_NAME="${S3_BUCKET_NAME:-}"

print_header() {
  printf '\n========== %s ==========\n' "$1"
}

run_cmd() {
  local label="$1"
  shift

  print_header "$label"
  if "$@"; then
    return 0
  fi

  local exit_code=$?
  printf '[WARN] command failed: %s (exit=%s)\n' "$label" "$exit_code"
  return 0
}

run_regional() {
  local label="$1"
  shift
  run_cmd "$label" aws --no-cli-pager --region "$AWS_REGION" "$@"
}

run_global() {
  local label="$1"
  shift
  run_cmd "$label" aws --no-cli-pager "$@"
}

print_header "INFO"
printf 'This script is read-only. It does not create, modify, or delete AWS resources.\n'
printf 'Preferred runtime: AWS CloudShell with B personal login and deployment role assumed.\n'
printf 'Region candidate: %s\n' "$AWS_REGION"
printf 'Project prefix: %s\n' "$PROJECT_PREFIX"

run_global "STS caller identity" sts get-caller-identity
run_regional "EC2 VPC" ec2 describe-vpcs --filters "Name=tag:Name,Values=${VPC_NAME}"
run_regional "EC2 public subnet" ec2 describe-subnets --filters "Name=tag:Name,Values=${PUBLIC_SUBNET_NAME}"
run_regional "EC2 private DB subnet A" ec2 describe-subnets --filters "Name=tag:Name,Values=${PRIVATE_DB_SUBNET_A_NAME}"
run_regional "EC2 private DB subnet B" ec2 describe-subnets --filters "Name=tag:Name,Values=${PRIVATE_DB_SUBNET_B_NAME}"
run_regional "EC2 route table" ec2 describe-route-tables --filters "Name=tag:Name,Values=${PUBLIC_ROUTE_TABLE_NAME}"
run_regional "EC2 internet gateway" ec2 describe-internet-gateways --filters "Name=tag:Name,Values=${IGW_NAME}"
run_regional "EC2 security group" ec2 describe-security-groups --filters "Name=group-name,Values=${EC2_SECURITY_GROUP_NAME}"
run_regional "RDS security group" ec2 describe-security-groups --filters "Name=group-name,Values=${RDS_SECURITY_GROUP_NAME}"
run_global "IAM runtime role" iam get-role --role-name "${EC2_ROLE_NAME}"
run_global "IAM instance profile" iam get-instance-profile --instance-profile-name "${EC2_INSTANCE_PROFILE_NAME}"
run_regional "ECR frontend repository" ecr describe-repositories --repository-names "${ECR_FRONTEND_REPO}"
run_regional "ECR backend repository" ecr describe-repositories --repository-names "${ECR_BACKEND_REPO}"
run_regional "ECR ai-worker repository" ecr describe-repositories --repository-names "${ECR_AI_WORKER_REPO}"

if [[ -n "${S3_BUCKET_NAME}" ]]; then
  run_regional "S3 bucket location" s3api get-bucket-location --bucket "${S3_BUCKET_NAME}"
else
  print_header "S3 bucket location"
  printf '[확인 필요] S3_BUCKET_NAME is not set. Bucket lookup was skipped.\n'
fi

run_regional "SQS main queue" sqs get-queue-url --queue-name "${SQS_MAIN_QUEUE_NAME}"
run_regional "SQS DLQ" sqs get-queue-url --queue-name "${SQS_DLQ_NAME}"
run_regional "RDS DB instance" rds describe-db-instances --db-instance-identifier "${RDS_IDENTIFIER}"
run_regional "CloudWatch backend log group" logs describe-log-groups --log-group-name-prefix "${BACKEND_LOG_GROUP}"
run_regional "CloudWatch ai-worker log group" logs describe-log-groups --log-group-name-prefix "${AI_WORKER_LOG_GROUP}"
