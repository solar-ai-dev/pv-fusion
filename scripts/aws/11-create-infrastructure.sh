#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-${SCRIPT_DIR}/output}"
SUMMARY_FILE="${OUTPUT_DIR}/11-create-summary.env"
TEMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

ACTION="${ACTION:-plan}"
AWS_REGION="${AWS_REGION:-ap-northeast-2}"
PROJECT_PREFIX="${PROJECT_PREFIX:-pv-insight}"
ENVIRONMENT="${ENVIRONMENT:-mvp}"

VPC_CIDR="${VPC_CIDR:-10.40.0.0/16}"
PUBLIC_SUBNET_CIDR="${PUBLIC_SUBNET_CIDR:-10.40.0.0/24}"
PRIVATE_DB_SUBNET_A_CIDR="${PRIVATE_DB_SUBNET_A_CIDR:-10.40.10.0/24}"
PRIVATE_DB_SUBNET_B_CIDR="${PRIVATE_DB_SUBNET_B_CIDR:-10.40.11.0/24}"
AZ_A="${AZ_A:-ap-northeast-2a}"
AZ_B="${AZ_B:-ap-northeast-2c}"

EC2_INSTANCE_TYPE="${EC2_INSTANCE_TYPE:-t3.large}"
EC2_EBS_TYPE="${EC2_EBS_TYPE:-gp3}"
EC2_EBS_SIZE_GB="${EC2_EBS_SIZE_GB:-100}"
ALLOCATE_ELASTIC_IP="${ALLOCATE_ELASTIC_IP:-yes}"
IMDS_HTTP_TOKENS="${IMDS_HTTP_TOKENS:-required}"
IMDS_ENDPOINT_ENABLED="${IMDS_ENDPOINT_ENABLED:-enabled}"

RDS_INSTANCE_CLASS="${RDS_INSTANCE_CLASS:-db.t4g.micro}"
RDS_STORAGE_TYPE="${RDS_STORAGE_TYPE:-gp3}"
RDS_STORAGE_GB="${RDS_STORAGE_GB:-20}"
RDS_ENGINE="${RDS_ENGINE:-postgres}"
RDS_ENGINE_VERSION="${RDS_ENGINE_VERSION:-16}"
RDS_BACKUP_RETENTION_DAYS="${RDS_BACKUP_RETENTION_DAYS:-7}"
RDS_DELETION_PROTECTION="${RDS_DELETION_PROTECTION:-true}"
RDS_PUBLICLY_ACCESSIBLE="${RDS_PUBLICLY_ACCESSIBLE:-false}"
RDS_STORAGE_ENCRYPTED="${RDS_STORAGE_ENCRYPTED:-true}"
RDS_MULTI_AZ="${RDS_MULTI_AZ:-false}"
RDS_AUTO_MINOR_VERSION_UPGRADE="${RDS_AUTO_MINOR_VERSION_UPGRADE:-true}"
RDS_MASTER_USERNAME="${RDS_MASTER_USERNAME:-pvfusion}"
RDS_DB_NAME="${RDS_DB_NAME:-pv_fusion}"
RDS_MASTER_PASSWORD="${RDS_MASTER_PASSWORD:-}"

S3_BUCKET_NAME="${S3_BUCKET_NAME:-}"
S3_ENABLE_VERSIONING="${S3_ENABLE_VERSIONING:-false}"
S3_CORS_ALLOWED_ORIGINS="${S3_CORS_ALLOWED_ORIGINS:-}"

SQS_VISIBILITY_TIMEOUT_SECONDS="${SQS_VISIBILITY_TIMEOUT_SECONDS:-900}"
SQS_WAIT_TIME_SECONDS="${SQS_WAIT_TIME_SECONDS:-20}"
SQS_MESSAGE_RETENTION_SECONDS="${SQS_MESSAGE_RETENTION_SECONDS:-345600}"
SQS_DLQ_RETENTION_SECONDS="${SQS_DLQ_RETENTION_SECONDS:-1209600}"
SQS_MAX_RECEIVE_COUNT="${SQS_MAX_RECEIVE_COUNT:-3}"

CLOUDWATCH_LOG_RETENTION_DAYS="${CLOUDWATCH_LOG_RETENTION_DAYS:-14}"

IAM_PROPAGATION_RETRIES="${IAM_PROPAGATION_RETRIES:-12}"
IAM_PROPAGATION_SLEEP_SECONDS="${IAM_PROPAGATION_SLEEP_SECONDS:-10}"

VPC_NAME="${PROJECT_PREFIX}-vpc"
IGW_NAME="${PROJECT_PREFIX}-igw"
PUBLIC_SUBNET_NAME="${PROJECT_PREFIX}-public-subnet"
PRIVATE_DB_SUBNET_A_NAME="${PROJECT_PREFIX}-private-db-subnet-a"
PRIVATE_DB_SUBNET_B_NAME="${PROJECT_PREFIX}-private-db-subnet-b"
PUBLIC_ROUTE_TABLE_NAME="${PROJECT_PREFIX}-public-rt"
EC2_SECURITY_GROUP_NAME="${PROJECT_PREFIX}-ec2-sg"
RDS_SECURITY_GROUP_NAME="${PROJECT_PREFIX}-rds-sg"
DB_SUBNET_GROUP_NAME="${PROJECT_PREFIX}-db-subnet-group"
ECR_FRONTEND_REPO="${PROJECT_PREFIX}-frontend"
ECR_BACKEND_REPO="${PROJECT_PREFIX}-backend"
ECR_AI_WORKER_REPO="${PROJECT_PREFIX}-ai-worker"
SQS_MAIN_QUEUE_NAME="${PROJECT_PREFIX}-analysis-jobs"
SQS_DLQ_NAME="${PROJECT_PREFIX}-analysis-jobs-dlq"
EC2_ROLE_NAME="${PROJECT_PREFIX}-ec2-runtime-role"
EC2_INSTANCE_PROFILE_NAME="${PROJECT_PREFIX}-ec2-instance-profile"
RDS_IDENTIFIER="${PROJECT_PREFIX}-postgres"
EC2_NAME_TAG="${PROJECT_PREFIX}-k3s-node"
EIP_NAME="${PROJECT_PREFIX}-eip"
BACKEND_LOG_GROUP="/${PROJECT_PREFIX}/backend"
AI_WORKER_LOG_GROUP="/${PROJECT_PREFIX}/ai-worker"

AWS_ACCOUNT_ID=""
AWS_PRINCIPAL_ARN=""
AMI_ID=""

VPC_ID=""
IGW_ID=""
PUBLIC_SUBNET_ID=""
PRIVATE_DB_SUBNET_A_ID=""
PRIVATE_DB_SUBNET_B_ID=""
PUBLIC_ROUTE_TABLE_ID=""
EC2_SECURITY_GROUP_ID=""
RDS_SECURITY_GROUP_ID=""
MAIN_QUEUE_URL=""
DLQ_URL=""
MAIN_QUEUE_ARN=""
DLQ_ARN=""
RDS_ENDPOINT=""
RDS_PORT=""
EC2_INSTANCE_ID=""
EC2_PUBLIC_IP=""
ELASTIC_IP_ALLOCATION_ID=""
ELASTIC_IP_ADDRESS=""

log() {
  printf '[INFO] %s\n' "$*"
}

warn() {
  printf '[WARN] %s\n' "$*" >&2
}

fail() {
  printf '[ERROR] %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"
}

require_env() {
  local name="$1"
  [[ -n "${!name:-}" ]] || fail "missing required environment variable: ${name}"
}

validate_action() {
  case "${ACTION}" in
    plan|apply) ;;
    *) fail "ACTION must be plan or apply" ;;
  esac
}

require_apply_mode() {
  [[ "${ACTION}" == "apply" ]] || fail "mutation attempted outside apply mode"
}

to_bool() {
  case "${1,,}" in
    yes|true|1) printf 'true' ;;
    no|false|0) printf 'false' ;;
    *) fail "invalid boolean value: $1" ;;
  esac
}

aws_r() {
  aws --no-cli-pager --region "${AWS_REGION}" "$@"
}

aws_g() {
  aws --no-cli-pager "$@"
}

record_output() {
  require_apply_mode
  local key="$1"
  local value="$2"
  printf '%s=%s\n' "${key}" "${value}" >>"${SUMMARY_FILE}"
}

init_output_dir() {
  require_apply_mode
  mkdir -p "${OUTPUT_DIR}"
  : > "${SUMMARY_FILE}"
  chmod 600 "${SUMMARY_FILE}"
}

tag_spec() {
  local resource_type="$1"
  local name="$2"
  local purpose="$3"
  printf 'ResourceType=%s,Tags=[{Key=Name,Value=%s},{Key=Project,Value=%s},{Key=Environment,Value=%s},{Key=ManagedBy,Value=manual},{Key=Purpose,Value=%s}]' \
    "${resource_type}" "${name}" "${PROJECT_PREFIX}" "${ENVIRONMENT}" "${purpose}"
}

create_tags() {
  require_apply_mode
  local resource_id="$1"
  local name="$2"
  local purpose="$3"
  aws_r ec2 create-tags \
    --resources "${resource_id}" \
    --tags \
      "Key=Name,Value=${name}" \
      "Key=Project,Value=${PROJECT_PREFIX}" \
      "Key=Environment,Value=${ENVIRONMENT}" \
      "Key=ManagedBy,Value=manual" \
      "Key=Purpose,Value=${purpose}" >/dev/null
}

confirm_exact_approval() {
  local expected="CREATE ${PROJECT_PREFIX} ${ENVIRONMENT} ${AWS_REGION}"
  local answer
  printf '\nThis script can create AWS resources in %s for %s.\n' "${AWS_REGION}" "${ENVIRONMENT}"
  printf 'Exact approval string required: %s\n' "${expected}"
  read -r -p "Type the exact approval string to continue: " answer
  [[ "${answer}" == "${expected}" ]] || fail "approval string mismatch"
}

list_from_text() {
  local text="$1"
  if [[ -z "${text}" || "${text}" == "None" ]]; then
    return 0
  fi
  tr '\t' '\n' <<<"${text}" | sed '/^$/d;/^None$/d'
}

find_single_ec2_tagged_resource() {
  local describe_target="$1"
  local query="$2"
  local name="$3"
  local output
  output="$(aws_r ec2 "${describe_target}" \
    --filters "Name=tag:Name,Values=${name}" \
    --query "${query}" \
    --output text)"
  mapfile -t lines < <(list_from_text "${output}")
  if (( ${#lines[@]} == 0 )); then
    printf ''
    return 0
  fi
  if (( ${#lines[@]} > 1 )); then
    fail "multiple resources found for Name tag ${name}"
  fi
  printf '%s' "${lines[0]}"
}

find_single_security_group_in_vpc() {
  local name="$1"
  local output
  output="$(aws_r ec2 describe-security-groups \
    --filters "Name=vpc-id,Values=${VPC_ID}" "Name=group-name,Values=${name}" \
    --query 'SecurityGroups[].GroupId' \
    --output text)"
  mapfile -t lines < <(list_from_text "${output}")
  if (( ${#lines[@]} == 0 )); then
    printf ''
    return 0
  fi
  if (( ${#lines[@]} > 1 )); then
    fail "multiple security groups found for ${name}"
  fi
  printf '%s' "${lines[0]}"
}

find_single_rds_instance() {
  local result
  result="$(aws_r rds describe-db-instances \
    --db-instance-identifier "${RDS_IDENTIFIER}" \
    --query 'DBInstances[0].DBInstanceIdentifier' \
    --output text 2>/dev/null || true)"
  [[ "${result}" == "None" ]] && result=""
  printf '%s' "${result}"
}

find_single_db_subnet_group() {
  local result
  result="$(aws_r rds describe-db-subnet-groups \
    --db-subnet-group-name "${DB_SUBNET_GROUP_NAME}" \
    --query 'DBSubnetGroups[0].DBSubnetGroupName' \
    --output text 2>/dev/null || true)"
  [[ "${result}" == "None" ]] && result=""
  printf '%s' "${result}"
}

find_single_role() {
  local result
  result="$(aws_g iam get-role --role-name "${1}" --query 'Role.RoleName' --output text 2>/dev/null || true)"
  [[ "${result}" == "None" ]] && result=""
  printf '%s' "${result}"
}

find_single_instance_profile() {
  local result
  result="$(aws_g iam get-instance-profile --instance-profile-name "${1}" --query 'InstanceProfile.InstanceProfileName' --output text 2>/dev/null || true)"
  [[ "${result}" == "None" ]] && result=""
  printf '%s' "${result}"
}

find_single_ecr_repo() {
  local result
  result="$(aws_r ecr describe-repositories --repository-names "${1}" --query 'repositories[0].repositoryName' --output text 2>/dev/null || true)"
  [[ "${result}" == "None" ]] && result=""
  printf '%s' "${result}"
}

find_single_bucket() {
  local bucket="$1"
  local result
  result="$(aws_r s3api head-bucket --bucket "${bucket}" >/dev/null 2>&1 && printf '%s' "${bucket}" || true)"
  printf '%s' "${result}"
}

find_single_queue_url() {
  local result
  result="$(aws_r sqs get-queue-url --queue-name "${1}" --query 'QueueUrl' --output text 2>/dev/null || true)"
  [[ "${result}" == "None" ]] && result=""
  printf '%s' "${result}"
}

find_single_log_group() {
  local result
  result="$(aws_r logs describe-log-groups \
    --log-group-name-prefix "${1}" \
    --query 'logGroups[?logGroupName==`'"${1}"'`].logGroupName' \
    --output text)"
  [[ "${result}" == "None" ]] && result=""
  printf '%s' "${result}"
}

find_single_instance_by_name() {
  local output
  output="$(aws_r ec2 describe-instances \
    --filters \
      "Name=tag:Name,Values=${EC2_NAME_TAG}" \
      "Name=instance-state-name,Values=pending,running,stopping,stopped,shutting-down,terminated" \
    --query 'Reservations[].Instances[].InstanceId' \
    --output text)"
  mapfile -t lines < <(list_from_text "${output}")
  if (( ${#lines[@]} == 0 )); then
    printf ''
    return 0
  fi
  if (( ${#lines[@]} > 1 )); then
    fail "multiple EC2 instances found for Name tag ${EC2_NAME_TAG}"
  fi
  printf '%s' "${lines[0]}"
}

find_single_eip_by_name() {
  local output
  output="$(aws_r ec2 describe-addresses \
    --filters "Name=tag:Name,Values=${EIP_NAME}" \
    --query 'Addresses[].AllocationId' \
    --output text)"
  mapfile -t lines < <(list_from_text "${output}")
  if (( ${#lines[@]} == 0 )); then
    printf ''
    return 0
  fi
  if (( ${#lines[@]} > 1 )); then
    fail "multiple Elastic IPs found for Name tag ${EIP_NAME}"
  fi
  printf '%s' "${lines[0]}"
}

ensure_account_context() {
  AWS_ACCOUNT_ID="$(aws_g sts get-caller-identity --query 'Account' --output text)"
  AWS_PRINCIPAL_ARN="$(aws_g sts get-caller-identity --query 'Arn' --output text)"
  [[ -n "${AWS_ACCOUNT_ID}" && "${AWS_ACCOUNT_ID}" != "None" ]] || fail "failed to resolve AWS account ID"
}

lookup_ami_id() {
  aws_r ssm get-parameter \
    --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64 \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || true
}

print_existing_resource_status() {
  local label="$1"
  local value="$2"
  if [[ -n "${value}" ]]; then
    printf '  - %s: exists\n' "${label}"
  else
    printf '  - %s: will be created\n' "${label}"
  fi
}

print_plan_summary() {
  cat <<EOF
PLAN SUMMARY
Principal ARN: ${AWS_PRINCIPAL_ARN}
Root principal: $([[ "${AWS_PRINCIPAL_ARN}" == *":root" ]] && printf 'yes' || printf 'no')
Region: ${AWS_REGION}
Environment: ${ENVIRONMENT}
Project prefix: ${PROJECT_PREFIX}
VPC CIDR: ${VPC_CIDR}
Public subnet CIDR: ${PUBLIC_SUBNET_CIDR}
Private DB subnet A CIDR: ${PRIVATE_DB_SUBNET_A_CIDR}
Private DB subnet B CIDR: ${PRIVATE_DB_SUBNET_B_CIDR}
Availability Zones: ${AZ_A}, ${AZ_B}
AMI ID: ${AMI_ID}
EC2: ${EC2_INSTANCE_TYPE} / ${EC2_EBS_TYPE} ${EC2_EBS_SIZE_GB}GB / Elastic IP=${ALLOCATE_ELASTIC_IP}
RDS: ${RDS_ENGINE} ${RDS_ENGINE_VERSION} / ${RDS_INSTANCE_CLASS} / ${RDS_STORAGE_TYPE} ${RDS_STORAGE_GB}GB
S3 bucket: ${S3_BUCKET_NAME}
SQS visibility timeout: ${SQS_VISIBILITY_TIMEOUT_SECONDS}
SQS long polling: ${SQS_WAIT_TIME_SECONDS}
CloudWatch retention: ${CLOUDWATCH_LOG_RETENTION_DAYS}
EOF
}

run_plan() {
  ensure_account_context
  AMI_ID="$(lookup_ami_id)"
  [[ -n "${AMI_ID}" && "${AMI_ID}" != "None" ]] || fail "failed to resolve AMI ID from SSM public parameter"

  VPC_ID="$(find_single_ec2_tagged_resource 'describe-vpcs' 'Vpcs[].VpcId' "${VPC_NAME}")"
  IGW_ID="$(find_single_ec2_tagged_resource 'describe-internet-gateways' 'InternetGateways[].InternetGatewayId' "${IGW_NAME}")"
  PUBLIC_SUBNET_ID="$(find_single_ec2_tagged_resource 'describe-subnets' 'Subnets[].SubnetId' "${PUBLIC_SUBNET_NAME}")"
  PRIVATE_DB_SUBNET_A_ID="$(find_single_ec2_tagged_resource 'describe-subnets' 'Subnets[].SubnetId' "${PRIVATE_DB_SUBNET_A_NAME}")"
  PRIVATE_DB_SUBNET_B_ID="$(find_single_ec2_tagged_resource 'describe-subnets' 'Subnets[].SubnetId' "${PRIVATE_DB_SUBNET_B_NAME}")"
  PUBLIC_ROUTE_TABLE_ID="$(find_single_ec2_tagged_resource 'describe-route-tables' 'RouteTables[].RouteTableId' "${PUBLIC_ROUTE_TABLE_NAME}")"

  if [[ -n "${VPC_ID}" ]]; then
    EC2_SECURITY_GROUP_ID="$(find_single_security_group_in_vpc "${EC2_SECURITY_GROUP_NAME}")"
    RDS_SECURITY_GROUP_ID="$(find_single_security_group_in_vpc "${RDS_SECURITY_GROUP_NAME}")"
  fi

  print_plan_summary
  printf 'Existing resource check:\n'
  print_existing_resource_status "VPC" "${VPC_ID}"
  print_existing_resource_status "Internet Gateway" "${IGW_ID}"
  print_existing_resource_status "Public subnet" "${PUBLIC_SUBNET_ID}"
  print_existing_resource_status "Private DB subnet A" "${PRIVATE_DB_SUBNET_A_ID}"
  print_existing_resource_status "Private DB subnet B" "${PRIVATE_DB_SUBNET_B_ID}"
  print_existing_resource_status "Public route table" "${PUBLIC_ROUTE_TABLE_ID}"
  print_existing_resource_status "EC2 security group" "${EC2_SECURITY_GROUP_ID}"
  print_existing_resource_status "RDS security group" "${RDS_SECURITY_GROUP_ID}"
  print_existing_resource_status "DB subnet group" "$(find_single_db_subnet_group)"
  print_existing_resource_status "IAM role" "$(find_single_role "${EC2_ROLE_NAME}")"
  print_existing_resource_status "Instance profile" "$(find_single_instance_profile "${EC2_INSTANCE_PROFILE_NAME}")"
  print_existing_resource_status "ECR frontend" "$(find_single_ecr_repo "${ECR_FRONTEND_REPO}")"
  print_existing_resource_status "ECR backend" "$(find_single_ecr_repo "${ECR_BACKEND_REPO}")"
  print_existing_resource_status "ECR ai-worker" "$(find_single_ecr_repo "${ECR_AI_WORKER_REPO}")"
  print_existing_resource_status "S3 bucket" "$(find_single_bucket "${S3_BUCKET_NAME}")"
  print_existing_resource_status "SQS DLQ" "$(find_single_queue_url "${SQS_DLQ_NAME}")"
  print_existing_resource_status "SQS main queue" "$(find_single_queue_url "${SQS_MAIN_QUEUE_NAME}")"
  print_existing_resource_status "RDS instance" "$(find_single_rds_instance)"
  print_existing_resource_status "EC2 instance" "$(find_single_instance_by_name)"
  print_existing_resource_status "Elastic IP" "$(find_single_eip_by_name)"
  print_existing_resource_status "CloudWatch backend log group" "$(find_single_log_group "${BACKEND_LOG_GROUP}")"
  print_existing_resource_status "CloudWatch ai-worker log group" "$(find_single_log_group "${AI_WORKER_LOG_GROUP}")"
  printf 'No AWS resources were created or modified.\n'
  printf 'PLAN COMPLETE\n'
}

wait_for_instance_profile_ready() {
  require_apply_mode
  local attempt output
  for attempt in $(seq 1 "${IAM_PROPAGATION_RETRIES}"); do
    output="$(aws_g iam get-instance-profile \
      --instance-profile-name "${EC2_INSTANCE_PROFILE_NAME}" \
      --query 'InstanceProfile.Roles[?RoleName==`'"${EC2_ROLE_NAME}"'`].RoleName' \
      --output text 2>/dev/null || true)"
    if grep -q "${EC2_ROLE_NAME}" <<<"${output}"; then
      log "instance profile propagation ready after ${attempt} attempt(s)"
      return 0
    fi
    log "waiting for instance profile propagation (${attempt}/${IAM_PROPAGATION_RETRIES})"
    sleep "${IAM_PROPAGATION_SLEEP_SECONDS}"
  done
  fail "instance profile propagation did not complete in time"
}

ensure_vpc() {
  require_apply_mode
  VPC_ID="$(find_single_ec2_tagged_resource 'describe-vpcs' 'Vpcs[].VpcId' "${VPC_NAME}")"
  if [[ -n "${VPC_ID}" ]]; then
    log "reusing VPC ${VPC_NAME}"
    record_output "VPC_ID" "${VPC_ID}"
    return
  fi

  log "creating VPC ${VPC_NAME}"
  VPC_ID="$(aws_r ec2 create-vpc \
    --cidr-block "${VPC_CIDR}" \
    --tag-specifications "$(tag_spec vpc "${VPC_NAME}" vpc)" \
    --query 'Vpc.VpcId' \
    --output text)"
  aws_r ec2 modify-vpc-attribute --vpc-id "${VPC_ID}" --enable-dns-support '{"Value":true}' >/dev/null
  aws_r ec2 modify-vpc-attribute --vpc-id "${VPC_ID}" --enable-dns-hostnames '{"Value":true}' >/dev/null
  record_output "VPC_ID" "${VPC_ID}"
}

ensure_internet_gateway() {
  require_apply_mode
  IGW_ID="$(find_single_ec2_tagged_resource 'describe-internet-gateways' 'InternetGateways[].InternetGatewayId' "${IGW_NAME}")"
  if [[ -z "${IGW_ID}" ]]; then
    log "creating Internet Gateway ${IGW_NAME}"
    IGW_ID="$(aws_r ec2 create-internet-gateway \
      --tag-specifications "$(tag_spec internet-gateway "${IGW_NAME}" internet-gateway)" \
      --query 'InternetGateway.InternetGatewayId' \
      --output text)"
  else
    log "reusing Internet Gateway ${IGW_NAME}"
  fi

  local attached_vpc
  attached_vpc="$(aws_r ec2 describe-internet-gateways \
    --internet-gateway-ids "${IGW_ID}" \
    --query 'InternetGateways[0].Attachments[0].VpcId' \
    --output text)"
  if [[ "${attached_vpc}" == "None" || -z "${attached_vpc}" ]]; then
    aws_r ec2 attach-internet-gateway --internet-gateway-id "${IGW_ID}" --vpc-id "${VPC_ID}" >/dev/null
  elif [[ "${attached_vpc}" != "${VPC_ID}" ]]; then
    fail "internet gateway ${IGW_ID} is attached to a different VPC"
  fi
  record_output "IGW_ID" "${IGW_ID}"
}

ensure_subnet() {
  require_apply_mode
  local name="$1"
  local cidr="$2"
  local az="$3"
  local purpose="$4"
  local make_public="$5"
  local subnet_id

  subnet_id="$(find_single_ec2_tagged_resource 'describe-subnets' 'Subnets[].SubnetId' "${name}")"
  if [[ -z "${subnet_id}" ]]; then
    log "creating subnet ${name}"
    subnet_id="$(aws_r ec2 create-subnet \
      --vpc-id "${VPC_ID}" \
      --cidr-block "${cidr}" \
      --availability-zone "${az}" \
      --tag-specifications "$(tag_spec subnet "${name}" "${purpose}")" \
      --query 'Subnet.SubnetId' \
      --output text)"
  else
    log "reusing subnet ${name}"
  fi

  if [[ "$(to_bool "${make_public}")" == "true" ]]; then
    aws_r ec2 modify-subnet-attribute --subnet-id "${subnet_id}" --map-public-ip-on-launch >/dev/null
  fi

  case "${name}" in
    "${PUBLIC_SUBNET_NAME}") PUBLIC_SUBNET_ID="${subnet_id}" ;;
    "${PRIVATE_DB_SUBNET_A_NAME}") PRIVATE_DB_SUBNET_A_ID="${subnet_id}" ;;
    "${PRIVATE_DB_SUBNET_B_NAME}") PRIVATE_DB_SUBNET_B_ID="${subnet_id}" ;;
  esac
  record_output "$(tr '[:lower:]-' '[:upper:]_' <<<"${name}")_ID" "${subnet_id}"
}

ensure_public_route_table() {
  require_apply_mode
  PUBLIC_ROUTE_TABLE_ID="$(find_single_ec2_tagged_resource 'describe-route-tables' 'RouteTables[].RouteTableId' "${PUBLIC_ROUTE_TABLE_NAME}")"
  if [[ -z "${PUBLIC_ROUTE_TABLE_ID}" ]]; then
    log "creating public route table ${PUBLIC_ROUTE_TABLE_NAME}"
    PUBLIC_ROUTE_TABLE_ID="$(aws_r ec2 create-route-table \
      --vpc-id "${VPC_ID}" \
      --tag-specifications "$(tag_spec route-table "${PUBLIC_ROUTE_TABLE_NAME}" public-route-table)" \
      --query 'RouteTable.RouteTableId' \
      --output text)"
  else
    log "reusing public route table ${PUBLIC_ROUTE_TABLE_NAME}"
  fi

  if ! aws_r ec2 describe-route-tables \
    --route-table-ids "${PUBLIC_ROUTE_TABLE_ID}" \
    --query 'RouteTables[0].Routes[?DestinationCidrBlock==`0.0.0.0/0` && GatewayId==`'"${IGW_ID}"'`].RouteTableId' \
    --output text | grep -q "${PUBLIC_ROUTE_TABLE_ID}"; then
    aws_r ec2 create-route \
      --route-table-id "${PUBLIC_ROUTE_TABLE_ID}" \
      --destination-cidr-block 0.0.0.0/0 \
      --gateway-id "${IGW_ID}" >/dev/null
  fi

  if ! aws_r ec2 describe-route-tables \
    --route-table-ids "${PUBLIC_ROUTE_TABLE_ID}" \
    --query 'RouteTables[0].Associations[?SubnetId==`'"${PUBLIC_SUBNET_ID}"'`].RouteTableAssociationId' \
    --output text | grep -q .; then
    aws_r ec2 associate-route-table \
      --route-table-id "${PUBLIC_ROUTE_TABLE_ID}" \
      --subnet-id "${PUBLIC_SUBNET_ID}" >/dev/null
  fi
  record_output "PUBLIC_ROUTE_TABLE_ID" "${PUBLIC_ROUTE_TABLE_ID}"
}

ensure_security_group() {
  require_apply_mode
  local name="$1"
  local description="$2"
  local purpose="$3"
  local group_id

  group_id="$(find_single_security_group_in_vpc "${name}")"
  if [[ -z "${group_id}" ]]; then
    group_id="$(aws_r ec2 create-security-group \
      --group-name "${name}" \
      --description "${description}" \
      --vpc-id "${VPC_ID}" \
      --query 'GroupId' \
      --output text)"
    create_tags "${group_id}" "${name}" "${purpose}"
  else
    log "reusing security group ${name}"
  fi

  case "${name}" in
    "${EC2_SECURITY_GROUP_NAME}") EC2_SECURITY_GROUP_ID="${group_id}" ;;
    "${RDS_SECURITY_GROUP_NAME}") RDS_SECURITY_GROUP_ID="${group_id}" ;;
  esac
}

ensure_ec2_sg_rules() {
  require_apply_mode
  if ! aws_r ec2 describe-security-groups \
    --group-ids "${EC2_SECURITY_GROUP_ID}" \
    --query 'SecurityGroups[0].IpPermissions[?FromPort==`80` && ToPort==`80`].FromPort' \
    --output text | grep -q 80; then
    aws_r ec2 authorize-security-group-ingress \
      --group-id "${EC2_SECURITY_GROUP_ID}" \
      --ip-permissions '[{"IpProtocol":"tcp","FromPort":80,"ToPort":80,"IpRanges":[{"CidrIp":"0.0.0.0/0","Description":"HTTP"}]}]' >/dev/null
  fi

  if ! aws_r ec2 describe-security-groups \
    --group-ids "${EC2_SECURITY_GROUP_ID}" \
    --query 'SecurityGroups[0].IpPermissions[?FromPort==`443` && ToPort==`443`].FromPort' \
    --output text | grep -q 443; then
    aws_r ec2 authorize-security-group-ingress \
      --group-id "${EC2_SECURITY_GROUP_ID}" \
      --ip-permissions '[{"IpProtocol":"tcp","FromPort":443,"ToPort":443,"IpRanges":[{"CidrIp":"0.0.0.0/0","Description":"HTTPS"}]}]' >/dev/null
  fi
}

ensure_rds_sg_rules() {
  require_apply_mode
  if ! aws_r ec2 describe-security-groups \
    --group-ids "${RDS_SECURITY_GROUP_ID}" \
    --query 'SecurityGroups[0].IpPermissions[?FromPort==`5432` && ToPort==`5432`].UserIdGroupPairs[?GroupId==`'"${EC2_SECURITY_GROUP_ID}"'`].GroupId' \
    --output text | grep -q "${EC2_SECURITY_GROUP_ID}"; then
    aws_r ec2 authorize-security-group-ingress \
      --group-id "${RDS_SECURITY_GROUP_ID}" \
      --ip-permissions "[{\"IpProtocol\":\"tcp\",\"FromPort\":5432,\"ToPort\":5432,\"UserIdGroupPairs\":[{\"GroupId\":\"${EC2_SECURITY_GROUP_ID}\",\"Description\":\"PostgreSQL from EC2 SG\"}]}]" >/dev/null
  fi
}

ensure_db_subnet_group() {
  require_apply_mode
  if [[ -n "$(find_single_db_subnet_group)" ]]; then
    log "reusing DB subnet group ${DB_SUBNET_GROUP_NAME}"
    record_output "DB_SUBNET_GROUP_NAME" "${DB_SUBNET_GROUP_NAME}"
    return
  fi

  aws_r rds create-db-subnet-group \
    --db-subnet-group-name "${DB_SUBNET_GROUP_NAME}" \
    --db-subnet-group-description "${PROJECT_PREFIX} DB subnet group" \
    --subnet-ids "${PRIVATE_DB_SUBNET_A_ID}" "${PRIVATE_DB_SUBNET_B_ID}" \
    --tags "Key=Project,Value=${PROJECT_PREFIX}" "Key=Environment,Value=${ENVIRONMENT}" "Key=ManagedBy,Value=manual" "Key=Purpose,Value=db-subnet-group" >/dev/null
  record_output "DB_SUBNET_GROUP_NAME" "${DB_SUBNET_GROUP_NAME}"
}

write_ec2_trust_policy() {
  cat >"${TEMP_DIR}/ec2-trust-policy.json" <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

write_ec2_inline_policy() {
  local backend_log_group_arn="arn:aws:logs:${AWS_REGION}:${AWS_ACCOUNT_ID}:log-group:${BACKEND_LOG_GROUP}:*"
  local ai_log_group_arn="arn:aws:logs:${AWS_REGION}:${AWS_ACCOUNT_ID}:log-group:${AI_WORKER_LOG_GROUP}:*"
  local frontend_repo_arn="arn:aws:ecr:${AWS_REGION}:${AWS_ACCOUNT_ID}:repository/${ECR_FRONTEND_REPO}"
  local backend_repo_arn="arn:aws:ecr:${AWS_REGION}:${AWS_ACCOUNT_ID}:repository/${ECR_BACKEND_REPO}"
  local ai_repo_arn="arn:aws:ecr:${AWS_REGION}:${AWS_ACCOUNT_ID}:repository/${ECR_AI_WORKER_REPO}"
  local main_queue_arn="arn:aws:sqs:${AWS_REGION}:${AWS_ACCOUNT_ID}:${SQS_MAIN_QUEUE_NAME}"
  local dlq_arn="arn:aws:sqs:${AWS_REGION}:${AWS_ACCOUNT_ID}:${SQS_DLQ_NAME}"
  local bucket_arn="arn:aws:s3:::${S3_BUCKET_NAME}"

  cat >"${TEMP_DIR}/ec2-inline-policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcrAuth",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
      "Sid": "EcrPushPull",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeImages",
        "ecr:DescribeRepositories",
        "ecr:GetDownloadUrlForLayer",
        "ecr:InitiateLayerUpload",
        "ecr:ListImages",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": [
        "${frontend_repo_arn}",
        "${backend_repo_arn}",
        "${ai_repo_arn}"
      ]
    },
    {
      "Sid": "S3BucketList",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "${bucket_arn}",
      "Condition": {
        "StringLike": {
          "s3:prefix": [
            "originals/*",
            "results/*",
            "models/*"
          ]
        }
      }
    },
    {
      "Sid": "S3PrefixReadWrite",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "${bucket_arn}/originals/*",
        "${bucket_arn}/results/*",
        "${bucket_arn}/models/*"
      ]
    },
    {
      "Sid": "SqsAccess",
      "Effect": "Allow",
      "Action": [
        "sqs:ChangeMessageVisibility",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "sqs:ReceiveMessage",
        "sqs:SendMessage"
      ],
      "Resource": [
        "${main_queue_arn}",
        "${dlq_arn}"
      ]
    },
    {
      "Sid": "CloudWatchLogsWrite",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:DescribeLogStreams",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "${backend_log_group_arn}",
        "${ai_log_group_arn}"
      ]
    }
  ]
}
EOF
}

ensure_ec2_role() {
  require_apply_mode
  write_ec2_trust_policy
  write_ec2_inline_policy

  if [[ -z "$(find_single_role "${EC2_ROLE_NAME}")" ]]; then
    aws_g iam create-role \
      --role-name "${EC2_ROLE_NAME}" \
      --assume-role-policy-document "file://${TEMP_DIR}/ec2-trust-policy.json" \
      --description "${PROJECT_PREFIX} EC2 runtime role" \
      --tags "Key=Project,Value=${PROJECT_PREFIX}" "Key=Environment,Value=${ENVIRONMENT}" "Key=ManagedBy,Value=manual" "Key=Purpose,Value=ec2-runtime-role" >/dev/null
  else
    log "reusing IAM role ${EC2_ROLE_NAME}"
  fi

  aws_g iam put-role-policy \
    --role-name "${EC2_ROLE_NAME}" \
    --policy-name "${PROJECT_PREFIX}-ec2-inline-policy" \
    --policy-document "file://${TEMP_DIR}/ec2-inline-policy.json" >/dev/null

  if ! aws_g iam list-attached-role-policies --role-name "${EC2_ROLE_NAME}" \
    --query 'AttachedPolicies[?PolicyArn==`arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore`].PolicyArn' \
    --output text | grep -q 'AmazonSSMManagedInstanceCore'; then
    aws_g iam attach-role-policy \
      --role-name "${EC2_ROLE_NAME}" \
      --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore >/dev/null
  fi
  record_output "EC2_ROLE_NAME" "${EC2_ROLE_NAME}"
}

ensure_instance_profile() {
  require_apply_mode
  if [[ -z "$(find_single_instance_profile "${EC2_INSTANCE_PROFILE_NAME}")" ]]; then
    aws_g iam create-instance-profile \
      --instance-profile-name "${EC2_INSTANCE_PROFILE_NAME}" \
      --tags "Key=Project,Value=${PROJECT_PREFIX}" "Key=Environment,Value=${ENVIRONMENT}" "Key=ManagedBy,Value=manual" "Key=Purpose,Value=ec2-instance-profile" >/dev/null
  else
    log "reusing instance profile ${EC2_INSTANCE_PROFILE_NAME}"
  fi

  if ! aws_g iam get-instance-profile \
    --instance-profile-name "${EC2_INSTANCE_PROFILE_NAME}" \
    --query 'InstanceProfile.Roles[?RoleName==`'"${EC2_ROLE_NAME}"'`].RoleName' \
    --output text | grep -q "${EC2_ROLE_NAME}"; then
    aws_g iam add-role-to-instance-profile \
      --instance-profile-name "${EC2_INSTANCE_PROFILE_NAME}" \
      --role-name "${EC2_ROLE_NAME}" >/dev/null
  fi

  wait_for_instance_profile_ready
  record_output "EC2_INSTANCE_PROFILE_NAME" "${EC2_INSTANCE_PROFILE_NAME}"
}

ensure_ecr_repository() {
  require_apply_mode
  local repo_name="$1"
  if [[ -z "$(find_single_ecr_repo "${repo_name}")" ]]; then
    aws_r ecr create-repository \
      --repository-name "${repo_name}" \
      --image-tag-mutability IMMUTABLE \
      --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256 \
      --tags "Key=Project,Value=${PROJECT_PREFIX}" "Key=Environment,Value=${ENVIRONMENT}" "Key=ManagedBy,Value=manual" "Key=Purpose,Value=ecr-repository" >/dev/null
  else
    log "reusing ECR repository ${repo_name}"
  fi

  local uri
  uri="$(aws_r ecr describe-repositories --repository-names "${repo_name}" --query 'repositories[0].repositoryUri' --output text)"
  record_output "ECR_$(tr '[:lower:]-' '[:upper:]_' <<<"${repo_name}")_URI" "${uri}"
}

ensure_s3_bucket() {
  require_apply_mode
  if [[ -z "$(find_single_bucket "${S3_BUCKET_NAME}")" ]]; then
    aws_r s3api create-bucket \
      --bucket "${S3_BUCKET_NAME}" \
      --create-bucket-configuration "LocationConstraint=${AWS_REGION}" >/dev/null
  else
    log "reusing S3 bucket ${S3_BUCKET_NAME}"
  fi

  aws_r s3api put-public-access-block \
    --bucket "${S3_BUCKET_NAME}" \
    --public-access-block-configuration 'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true' >/dev/null

  aws_r s3api put-bucket-encryption \
    --bucket "${S3_BUCKET_NAME}" \
    --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' >/dev/null

  if [[ "$(to_bool "${S3_ENABLE_VERSIONING}")" == "true" ]]; then
    aws_r s3api put-bucket-versioning --bucket "${S3_BUCKET_NAME}" --versioning-configuration Status=Enabled >/dev/null
  else
    aws_r s3api put-bucket-versioning --bucket "${S3_BUCKET_NAME}" --versioning-configuration Status=Suspended >/dev/null
  fi
  record_output "S3_BUCKET_NAME" "${S3_BUCKET_NAME}"
}

configure_s3_cors() {
  require_apply_mode
  [[ -n "${S3_CORS_ALLOWED_ORIGINS}" ]] || fail "S3_CORS_ALLOWED_ORIGINS is required for explicit CORS configuration"
}

ensure_queue() {
  require_apply_mode
  local queue_name="$1"
  local retention_seconds="$2"
  local visibility_timeout="$3"
  local queue_url
  queue_url="$(find_single_queue_url "${queue_name}")"

  if [[ -z "${queue_url}" ]]; then
    queue_url="$(aws_r sqs create-queue \
      --queue-name "${queue_name}" \
      --attributes \
        "VisibilityTimeout=${visibility_timeout},MessageRetentionPeriod=${retention_seconds},ReceiveMessageWaitTimeSeconds=${SQS_WAIT_TIME_SECONDS}" \
      --tags "Project=${PROJECT_PREFIX},Environment=${ENVIRONMENT},ManagedBy=manual" \
      --query 'QueueUrl' \
      --output text)"
  else
    log "reusing SQS queue ${queue_name}"
  fi

  if [[ "${queue_name}" == "${SQS_DLQ_NAME}" ]]; then
    DLQ_URL="${queue_url}"
    DLQ_ARN="$(aws_r sqs get-queue-attributes --queue-url "${DLQ_URL}" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)"
    record_output "SQS_DLQ_URL" "${DLQ_URL}"
  else
    MAIN_QUEUE_URL="${queue_url}"
    MAIN_QUEUE_ARN="$(aws_r sqs get-queue-attributes --queue-url "${MAIN_QUEUE_URL}" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)"
    record_output "SQS_MAIN_QUEUE_URL" "${MAIN_QUEUE_URL}"
  fi
}

ensure_sqs_redrive_policy() {
  require_apply_mode
  local redrive_policy
  redrive_policy="$(printf '{"deadLetterTargetArn":"%s","maxReceiveCount":"%s"}' "${DLQ_ARN}" "${SQS_MAX_RECEIVE_COUNT}")"
  aws_r sqs set-queue-attributes \
    --queue-url "${MAIN_QUEUE_URL}" \
    --attributes \
      "RedrivePolicy=${redrive_policy}" \
      "VisibilityTimeout=${SQS_VISIBILITY_TIMEOUT_SECONDS}" \
      "ReceiveMessageWaitTimeSeconds=${SQS_WAIT_TIME_SECONDS}" \
      "MessageRetentionPeriod=${SQS_MESSAGE_RETENTION_SECONDS}" >/dev/null
}

prompt_rds_password_if_needed() {
  local first second
  if [[ -n "${RDS_MASTER_PASSWORD}" ]]; then
    return
  fi
  read -r -s -p "Enter RDS master password: " first
  printf '\n'
  read -r -s -p "Confirm RDS master password: " second
  printf '\n'
  [[ -n "${first}" ]] || fail "RDS master password cannot be empty"
  [[ "${first}" == "${second}" ]] || fail "RDS master password confirmation mismatch"
  RDS_MASTER_PASSWORD="${first}"
}

wait_for_rds_available() {
  require_apply_mode
  log "waiting for RDS instance to become available"
  aws_r rds wait db-instance-available --db-instance-identifier "${RDS_IDENTIFIER}"
}

load_rds_connection_info() {
  RDS_ENDPOINT="$(aws_r rds describe-db-instances \
    --db-instance-identifier "${RDS_IDENTIFIER}" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)"
  RDS_PORT="$(aws_r rds describe-db-instances \
    --db-instance-identifier "${RDS_IDENTIFIER}" \
    --query 'DBInstances[0].Endpoint.Port' \
    --output text)"
  [[ -n "${RDS_ENDPOINT}" && "${RDS_ENDPOINT}" != "None" ]] || fail "RDS endpoint address is empty"
  [[ -n "${RDS_PORT}" && "${RDS_PORT}" != "None" ]] || fail "RDS port is empty"
  record_output "RDS_ENDPOINT" "${RDS_ENDPOINT}"
  record_output "RDS_PORT" "${RDS_PORT}"
}

ensure_rds_instance() {
  require_apply_mode
  local existing status
  existing="$(find_single_rds_instance)"
  if [[ -n "${existing}" ]]; then
    status="$(aws_r rds describe-db-instances --db-instance-identifier "${RDS_IDENTIFIER}" --query 'DBInstances[0].DBInstanceStatus' --output text)"
    case "${status}" in
      available)
        log "reusing RDS instance ${RDS_IDENTIFIER}"
        load_rds_connection_info
        ;;
      creating)
        wait_for_rds_available
        load_rds_connection_info
        ;;
      deleting|failed|incompatible-restore|incompatible-network)
        fail "existing RDS instance is in unusable state: ${status}"
        ;;
      *)
        fail "existing RDS instance is not ready for reuse: ${status}"
        ;;
    esac
    record_output "RDS_DB_IDENTIFIER" "${RDS_IDENTIFIER}"
    return
  fi

  prompt_rds_password_if_needed
  local rds_args=(
    rds create-db-instance
    --db-instance-identifier "${RDS_IDENTIFIER}"
    --engine "${RDS_ENGINE}"
    --engine-version "${RDS_ENGINE_VERSION}"
    --db-instance-class "${RDS_INSTANCE_CLASS}"
    --allocated-storage "${RDS_STORAGE_GB}"
    --storage-type "${RDS_STORAGE_TYPE}"
    --db-subnet-group-name "${DB_SUBNET_GROUP_NAME}"
    --vpc-security-group-ids "${RDS_SECURITY_GROUP_ID}"
    --master-username "${RDS_MASTER_USERNAME}"
    --master-user-password "${RDS_MASTER_PASSWORD}"
    --db-name "${RDS_DB_NAME}"
    --backup-retention-period "${RDS_BACKUP_RETENTION_DAYS}"
    --copy-tags-to-snapshot
    --tags "Key=Project,Value=${PROJECT_PREFIX}" "Key=Environment,Value=${ENVIRONMENT}" "Key=ManagedBy,Value=manual" "Key=Purpose,Value=rds-postgres"
  )

  if [[ "$(to_bool "${RDS_STORAGE_ENCRYPTED}")" == "true" ]]; then
    rds_args+=(--storage-encrypted)
  else
    rds_args+=(--no-storage-encrypted)
  fi
  if [[ "$(to_bool "${RDS_PUBLICLY_ACCESSIBLE}")" == "true" ]]; then
    rds_args+=(--publicly-accessible)
  else
    rds_args+=(--no-publicly-accessible)
  fi
  if [[ "$(to_bool "${RDS_DELETION_PROTECTION}")" == "true" ]]; then
    rds_args+=(--deletion-protection)
  else
    rds_args+=(--no-deletion-protection)
  fi
  if [[ "$(to_bool "${RDS_MULTI_AZ}")" == "true" ]]; then
    rds_args+=(--multi-az)
  else
    rds_args+=(--no-multi-az)
  fi
  if [[ "$(to_bool "${RDS_AUTO_MINOR_VERSION_UPGRADE}")" == "true" ]]; then
    rds_args+=(--auto-minor-version-upgrade)
  else
    rds_args+=(--no-auto-minor-version-upgrade)
  fi

  aws_r "${rds_args[@]}" >/dev/null
  wait_for_rds_available
  load_rds_connection_info
  record_output "RDS_DB_IDENTIFIER" "${RDS_IDENTIFIER}"
}

ensure_log_group() {
  require_apply_mode
  local name="$1"
  if [[ -z "$(find_single_log_group "${name}")" ]]; then
    aws_r logs create-log-group --log-group-name "${name}" >/dev/null
  else
    log "reusing log group ${name}"
  fi
  aws_r logs put-retention-policy --log-group-name "${name}" --retention-in-days "${CLOUDWATCH_LOG_RETENTION_DAYS}" >/dev/null
  record_output "LOG_GROUP_$(tr '/-' '__' <<<"${name}" | tr '[:lower:]' '[:upper:]')" "${name}"
}

wait_for_instance_running() {
  require_apply_mode
  log "waiting for EC2 instance to become running"
  aws_r ec2 wait instance-running --instance-ids "${EC2_INSTANCE_ID}"
}

wait_for_instance_status_ok() {
  require_apply_mode
  log "waiting for EC2 instance status checks to pass"
  aws_r ec2 wait instance-status-ok --instance-ids "${EC2_INSTANCE_ID}"
}

load_instance_network_info() {
  EC2_PUBLIC_IP="$(aws_r ec2 describe-instances --instance-ids "${EC2_INSTANCE_ID}" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)"
  if [[ "$(to_bool "${ALLOCATE_ELASTIC_IP}")" == "true" ]]; then
    ELASTIC_IP_ADDRESS="$(aws_r ec2 describe-addresses --allocation-ids "${ELASTIC_IP_ALLOCATION_ID}" --query 'Addresses[0].PublicIp' --output text)"
    [[ -n "${ELASTIC_IP_ADDRESS}" && "${ELASTIC_IP_ADDRESS}" != "None" ]] || fail "Elastic IP address is empty"
    record_output "ELASTIC_IP" "${ELASTIC_IP_ADDRESS}"
  fi
  [[ -n "${EC2_PUBLIC_IP}" && "${EC2_PUBLIC_IP}" != "None" ]] || warn "EC2 public IP not yet assigned"
  record_output "EC2_PUBLIC_IP" "${EC2_PUBLIC_IP}"
}

ensure_ec2_instance() {
  require_apply_mode
  local existing state ami_id block_mapping
  existing="$(find_single_instance_by_name)"
  if [[ -n "${existing}" ]]; then
    EC2_INSTANCE_ID="${existing}"
    state="$(aws_r ec2 describe-instances --instance-ids "${EC2_INSTANCE_ID}" --query 'Reservations[0].Instances[0].State.Name' --output text)"
    case "${state}" in
      running)
        log "reusing running EC2 instance ${EC2_NAME_TAG}"
        wait_for_instance_status_ok
        load_instance_network_info
        ;;
      stopped)
        fail "existing EC2 instance is stopped; not starting automatically"
        ;;
      shutting-down|terminated)
        fail "existing EC2 instance is not reusable: ${state}"
        ;;
      pending)
        wait_for_instance_running
        wait_for_instance_status_ok
        load_instance_network_info
        ;;
      *)
        fail "existing EC2 instance is in unexpected state: ${state}"
        ;;
    esac
    record_output "EC2_INSTANCE_ID" "${EC2_INSTANCE_ID}"
    return
  fi

  ami_id="$(lookup_ami_id)"
  [[ -n "${ami_id}" && "${ami_id}" != "None" ]] || fail "failed to resolve AMI ID from SSM public parameter"
  AMI_ID="${ami_id}"
  block_mapping="$(printf '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeType":"%s","VolumeSize":%s,"DeleteOnTermination":true,"Encrypted":true}}]' "${EC2_EBS_TYPE}" "${EC2_EBS_SIZE_GB}")"

  EC2_INSTANCE_ID="$(aws_r ec2 run-instances \
    --image-id "${AMI_ID}" \
    --instance-type "${EC2_INSTANCE_TYPE}" \
    --subnet-id "${PUBLIC_SUBNET_ID}" \
    --security-group-ids "${EC2_SECURITY_GROUP_ID}" \
    --iam-instance-profile "Name=${EC2_INSTANCE_PROFILE_NAME}" \
    --block-device-mappings "${block_mapping}" \
    --metadata-options "HttpTokens=${IMDS_HTTP_TOKENS},HttpEndpoint=${IMDS_ENDPOINT_ENABLED}" \
    --tag-specifications "$(tag_spec instance "${EC2_NAME_TAG}" ec2-k3s-node)" \
    --query 'Instances[0].InstanceId' \
    --output text)"
  [[ -n "${EC2_INSTANCE_ID}" && "${EC2_INSTANCE_ID}" != "None" ]] || fail "EC2 instance ID is empty"
  record_output "EC2_INSTANCE_ID" "${EC2_INSTANCE_ID}"
  wait_for_instance_running
}

ensure_elastic_ip() {
  require_apply_mode
  [[ "$(to_bool "${ALLOCATE_ELASTIC_IP}")" == "true" ]] || return 0

  ELASTIC_IP_ALLOCATION_ID="$(find_single_eip_by_name)"
  if [[ -z "${ELASTIC_IP_ALLOCATION_ID}" ]]; then
    ELASTIC_IP_ALLOCATION_ID="$(aws_r ec2 allocate-address --domain vpc --query 'AllocationId' --output text)"
    create_tags "${ELASTIC_IP_ALLOCATION_ID}" "${EIP_NAME}" elastic-ip
  else
    log "reusing Elastic IP ${EIP_NAME}"
  fi

  local associated_instance
  associated_instance="$(aws_r ec2 describe-addresses --allocation-ids "${ELASTIC_IP_ALLOCATION_ID}" --query 'Addresses[0].InstanceId' --output text)"
  if [[ "${associated_instance}" == "None" || -z "${associated_instance}" ]]; then
    aws_r ec2 associate-address --instance-id "${EC2_INSTANCE_ID}" --allocation-id "${ELASTIC_IP_ALLOCATION_ID}" >/dev/null
  elif [[ "${associated_instance}" != "${EC2_INSTANCE_ID}" ]]; then
    fail "Elastic IP ${EIP_NAME} is already associated with another instance"
  fi
  record_output "ELASTIC_IP_ALLOCATION_ID" "${ELASTIC_IP_ALLOCATION_ID}"
}

print_apply_summary() {
  log "apply finished"
  log "AWS resources created or reused successfully"
  log "non-sensitive output written to ${SUMMARY_FILE}"
}

run_apply() {
  ensure_account_context
  init_output_dir
  record_output "AWS_REGION" "${AWS_REGION}"
  record_output "ENVIRONMENT" "${ENVIRONMENT}"

  ensure_vpc
  ensure_internet_gateway
  ensure_subnet "${PUBLIC_SUBNET_NAME}" "${PUBLIC_SUBNET_CIDR}" "${AZ_A}" public-subnet yes
  ensure_subnet "${PRIVATE_DB_SUBNET_A_NAME}" "${PRIVATE_DB_SUBNET_A_CIDR}" "${AZ_A}" private-db-subnet no
  ensure_subnet "${PRIVATE_DB_SUBNET_B_NAME}" "${PRIVATE_DB_SUBNET_B_CIDR}" "${AZ_B}" private-db-subnet no
  ensure_public_route_table
  ensure_security_group "${EC2_SECURITY_GROUP_NAME}" "${PROJECT_PREFIX} EC2 security group" ec2-security-group
  ensure_security_group "${RDS_SECURITY_GROUP_NAME}" "${PROJECT_PREFIX} RDS security group" rds-security-group
  ensure_ec2_sg_rules
  ensure_rds_sg_rules
  ensure_db_subnet_group
  ensure_ec2_role
  ensure_instance_profile
  ensure_ecr_repository "${ECR_FRONTEND_REPO}"
  ensure_ecr_repository "${ECR_BACKEND_REPO}"
  ensure_ecr_repository "${ECR_AI_WORKER_REPO}"
  ensure_s3_bucket
  ensure_queue "${SQS_DLQ_NAME}" "${SQS_DLQ_RETENTION_SECONDS}" "${SQS_VISIBILITY_TIMEOUT_SECONDS}"
  ensure_queue "${SQS_MAIN_QUEUE_NAME}" "${SQS_MESSAGE_RETENTION_SECONDS}" "${SQS_VISIBILITY_TIMEOUT_SECONDS}"
  ensure_sqs_redrive_policy
  ensure_log_group "${BACKEND_LOG_GROUP}"
  ensure_log_group "${AI_WORKER_LOG_GROUP}"
  ensure_rds_instance
  ensure_ec2_instance
  ensure_elastic_ip
  wait_for_instance_status_ok
  load_instance_network_info
  print_apply_summary
}

print_config_summary() {
  cat <<EOF
Region: ${AWS_REGION}
Environment: ${ENVIRONMENT}
Project prefix: ${PROJECT_PREFIX}
VPC CIDR: ${VPC_CIDR}
Public subnet CIDR: ${PUBLIC_SUBNET_CIDR}
Private DB subnet A CIDR: ${PRIVATE_DB_SUBNET_A_CIDR}
Private DB subnet B CIDR: ${PRIVATE_DB_SUBNET_B_CIDR}
EC2 instance type: ${EC2_INSTANCE_TYPE}
EC2 EBS: ${EC2_EBS_TYPE} ${EC2_EBS_SIZE_GB}GB
Elastic IP enabled: ${ALLOCATE_ELASTIC_IP}
RDS instance class: ${RDS_INSTANCE_CLASS}
RDS engine/version: ${RDS_ENGINE} ${RDS_ENGINE_VERSION}
RDS storage: ${RDS_STORAGE_TYPE} ${RDS_STORAGE_GB}GB
RDS backup retention: ${RDS_BACKUP_RETENTION_DAYS}
RDS deletion protection: ${RDS_DELETION_PROTECTION}
S3 bucket: ${S3_BUCKET_NAME}
SQS visibility timeout: ${SQS_VISIBILITY_TIMEOUT_SECONDS}
SQS long polling: ${SQS_WAIT_TIME_SECONDS}
EOF
}

main() {
  require_cmd aws
  require_cmd mktemp
  require_cmd sleep

  validate_action
  require_env S3_BUCKET_NAME
  print_config_summary

  case "${ACTION}" in
    plan)
      run_plan
      ;;
    apply)
      [[ "${AWS_CONFIRM_PHASE2_CREATE:-}" == "yes" ]] || fail "AWS_CONFIRM_PHASE2_CREATE=yes is required for apply"
      confirm_exact_approval
      run_apply
      ;;
  esac
}

main "$@"
