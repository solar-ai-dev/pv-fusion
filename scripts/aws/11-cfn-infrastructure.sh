#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TEMPLATE_FILE="${TEMPLATE_FILE:-${REPO_ROOT}/infrastructure/cloudformation/pv-insight-mvp.yaml}"
PARAM_FILE="${PARAM_FILE:-${REPO_ROOT}/infrastructure/cloudformation/parameters/pv-insight-mvp.example.env}"
STACK_NAME="${STACK_NAME:-pv-insight-mvp}"
AWS_REGION="${AWS_REGION:-ap-northeast-2}"
CHANGE_SET_NAME="${CHANGE_SET_NAME:-${STACK_NAME}-$(date +%Y%m%d%H%M%S)}"
CLOUDFORMATION_EXECUTION_ROLE_ARN="${CLOUDFORMATION_EXECUTION_ROLE_ARN:-}"
TEMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

usage() {
  cat <<'EOF'
Usage:
  bash scripts/aws/11-cfn-infrastructure.sh validate
  bash scripts/aws/11-cfn-infrastructure.sh create-change-set
  bash scripts/aws/11-cfn-infrastructure.sh describe-change-set
  bash scripts/aws/11-cfn-infrastructure.sh execute-change-set
  bash scripts/aws/11-cfn-infrastructure.sh status
  bash scripts/aws/11-cfn-infrastructure.sh outputs

Environment:
  TEMPLATE_FILE
  PARAM_FILE
  STACK_NAME
  AWS_REGION
  CHANGE_SET_NAME
  CLOUDFORMATION_EXECUTION_ROLE_ARN
EOF
}

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

aws_r() {
  aws --no-cli-pager --region "${AWS_REGION}" "$@"
}

require_file() {
  local path="$1"
  [[ -f "${path}" ]] || fail "missing file: ${path}"
}

load_param_file() {
  require_file "${PARAM_FILE}"
  # shellcheck disable=SC1090
  . "${PARAM_FILE}"
}

validate_rds_master_password() {
  local password="$1"
  local length="${#password}"

  (( length >= 8 && length <= 128 )) || fail "RdsMasterPassword must be 8 to 128 characters"
  [[ "${password}" != *" "* ]] || fail "RdsMasterPassword must not contain spaces"
  [[ "${password}" != *"/"* ]] || fail "RdsMasterPassword must not contain '/'"
  [[ "${password}" != *"\""* ]] || fail "RdsMasterPassword must not contain '\"'"
  [[ "${password}" != *"@"* ]] || fail "RdsMasterPassword must not contain '@'"
  if printf '%s' "${password}" | LC_ALL=C grep -q '[^[:print:]]'; then
    fail "RdsMasterPassword must use printable ASCII characters only"
  fi
}

prompt_rds_master_password_if_needed() {
  local first second
  if [[ -n "${RdsMasterPassword:-}" ]]; then
    validate_rds_master_password "${RdsMasterPassword}"
    return
  fi

  read -r -s -p "Enter RdsMasterPassword: " first
  printf '\n'
  read -r -s -p "Confirm RdsMasterPassword: " second
  printf '\n'

  [[ -n "${first}" ]] || fail "RdsMasterPassword cannot be empty"
  [[ "${first}" == "${second}" ]] || fail "RdsMasterPassword confirmation mismatch"
  validate_rds_master_password "${first}"
  RdsMasterPassword="${first}"
}

require_stack_parameters() {
  : "${Environment:?missing Environment in PARAM_FILE}"
  : "${ProjectPrefix:?missing ProjectPrefix in PARAM_FILE}"
  : "${VpcCidr:?missing VpcCidr in PARAM_FILE}"
  : "${PublicSubnetCidr:?missing PublicSubnetCidr in PARAM_FILE}"
  : "${PrivateDbSubnetACidr:?missing PrivateDbSubnetACidr in PARAM_FILE}"
  : "${PrivateDbSubnetBCidr:?missing PrivateDbSubnetBCidr in PARAM_FILE}"
  : "${AvailabilityZoneA:?missing AvailabilityZoneA in PARAM_FILE}"
  : "${AvailabilityZoneB:?missing AvailabilityZoneB in PARAM_FILE}"
  : "${Ec2InstanceType:?missing Ec2InstanceType in PARAM_FILE}"
  : "${Ec2EbsSizeGb:?missing Ec2EbsSizeGb in PARAM_FILE}"
  : "${RdsInstanceClass:?missing RdsInstanceClass in PARAM_FILE}"
  : "${RdsAllocatedStorage:?missing RdsAllocatedStorage in PARAM_FILE}"
  : "${RdsMasterUsername:?missing RdsMasterUsername in PARAM_FILE}"
  : "${S3BucketName:?missing S3BucketName in PARAM_FILE}"
  : "${ImageId:?missing ImageId in PARAM_FILE}"
}

build_parameter_array() {
  STACK_PARAMETERS=(
    "ParameterKey=Environment,ParameterValue=${Environment}"
    "ParameterKey=ProjectPrefix,ParameterValue=${ProjectPrefix}"
    "ParameterKey=VpcCidr,ParameterValue=${VpcCidr}"
    "ParameterKey=PublicSubnetCidr,ParameterValue=${PublicSubnetCidr}"
    "ParameterKey=PrivateDbSubnetACidr,ParameterValue=${PrivateDbSubnetACidr}"
    "ParameterKey=PrivateDbSubnetBCidr,ParameterValue=${PrivateDbSubnetBCidr}"
    "ParameterKey=AvailabilityZoneA,ParameterValue=${AvailabilityZoneA}"
    "ParameterKey=AvailabilityZoneB,ParameterValue=${AvailabilityZoneB}"
    "ParameterKey=Ec2InstanceType,ParameterValue=${Ec2InstanceType}"
    "ParameterKey=Ec2EbsSizeGb,ParameterValue=${Ec2EbsSizeGb}"
    "ParameterKey=RdsInstanceClass,ParameterValue=${RdsInstanceClass}"
    "ParameterKey=RdsAllocatedStorage,ParameterValue=${RdsAllocatedStorage}"
    "ParameterKey=RdsMasterUsername,ParameterValue=${RdsMasterUsername}"
    "ParameterKey=RdsMasterPassword,ParameterValue=${RdsMasterPassword}"
    "ParameterKey=S3BucketName,ParameterValue=${S3BucketName}"
    "ParameterKey=ImageId,ParameterValue=${ImageId}"
  )
}

stack_exists() {
  aws_r cloudformation describe-stacks --stack-name "${STACK_NAME}" >/dev/null 2>&1
}

validate_template() {
  require_file "${TEMPLATE_FILE}"
  log "validating template ${TEMPLATE_FILE}"
  aws_r cloudformation validate-template --template-body "file://${TEMPLATE_FILE}" >/dev/null

  if command -v cfn-lint >/dev/null 2>&1; then
    log "running cfn-lint"
    cfn-lint "${TEMPLATE_FILE}"
  else
    warn "cfn-lint is not installed; skipped"
  fi
}

create_change_set() {
  require_file "${TEMPLATE_FILE}"
  [[ -n "${CLOUDFORMATION_EXECUTION_ROLE_ARN}" ]] || fail "missing CLOUDFORMATION_EXECUTION_ROLE_ARN"

  load_param_file
  require_stack_parameters
  prompt_rds_master_password_if_needed
  build_parameter_array

  local change_set_type="CREATE"
  if stack_exists; then
    change_set_type="UPDATE"
  fi

  log "creating ${change_set_type} change set ${CHANGE_SET_NAME} for stack ${STACK_NAME}"
  aws_r cloudformation create-change-set \
    --stack-name "${STACK_NAME}" \
    --change-set-name "${CHANGE_SET_NAME}" \
    --change-set-type "${change_set_type}" \
    --template-body "file://${TEMPLATE_FILE}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --role-arn "${CLOUDFORMATION_EXECUTION_ROLE_ARN}" \
    --parameters "${STACK_PARAMETERS[@]}" >/dev/null

  if aws_r cloudformation wait change-set-create-complete \
    --stack-name "${STACK_NAME}" \
    --change-set-name "${CHANGE_SET_NAME}"; then
    log "change set create complete"
  else
    warn "change set waiter reported failure; printing describe-change-set output"
  fi

  describe_change_set
}

describe_change_set() {
  aws_r cloudformation describe-change-set \
    --stack-name "${STACK_NAME}" \
    --change-set-name "${CHANGE_SET_NAME}"
}

execute_change_set() {
  local expected="EXECUTE ${STACK_NAME} ${CHANGE_SET_NAME}"
  local answer

  printf 'Exact approval string required: %s\n' "${expected}"
  read -r -p "Type the exact approval string to continue: " answer
  [[ "${answer}" == "${expected}" ]] || fail "approval string mismatch"

  aws_r cloudformation execute-change-set \
    --stack-name "${STACK_NAME}" \
    --change-set-name "${CHANGE_SET_NAME}" >/dev/null

  log "change set execution requested"
}

show_status() {
  aws_r cloudformation describe-stacks --stack-name "${STACK_NAME}"
  aws_r cloudformation describe-stack-events --stack-name "${STACK_NAME}"
}

show_outputs() {
  aws_r cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --query 'Stacks[0].Outputs' \
    --output table
}

main() {
  require_cmd aws

  local action="${1:-}"
  case "${action}" in
    validate)
      validate_template
      ;;
    create-change-set)
      create_change_set
      ;;
    describe-change-set)
      describe_change_set
      ;;
    execute-change-set)
      execute_change_set
      ;;
    status)
      show_status
      ;;
    outputs)
      show_outputs
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
