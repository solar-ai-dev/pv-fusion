#!/usr/bin/env bash

set -u

AWS_REGION="${AWS_REGION:-ap-northeast-2}"

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
printf 'Preferred runtime: AWS CloudShell logged in as the console IAM admin user.\n'
printf 'Region candidate: %s\n' "$AWS_REGION"

run_global "STS caller identity" sts get-caller-identity
run_global "Free Tier account plan state" freetier get-account-plan-state
run_global "Free Tier usage" freetier get-free-tier-usage

run_regional "EC2 VPCs" ec2 describe-vpcs
run_regional "EC2 subnets" ec2 describe-subnets
run_regional "EC2 route tables" ec2 describe-route-tables
run_regional "EC2 internet gateways" ec2 describe-internet-gateways
run_regional "EC2 security groups" ec2 describe-security-groups
run_regional "EC2 instances" ec2 describe-instances

run_regional "ECR repositories" ecr describe-repositories
run_regional "S3 buckets" s3api list-buckets
run_regional "SQS queues" sqs list-queues
run_regional "RDS DB instances" rds describe-db-instances
run_regional "RDS DB subnet groups" rds describe-db-subnet-groups
run_regional "CloudWatch log groups" logs describe-log-groups

run_global "IAM roles" iam list-roles
run_global "IAM instance profiles" iam list-instance-profiles
