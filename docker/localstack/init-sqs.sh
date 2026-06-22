#!/bin/sh
set -eu

: "${AWS_DEFAULT_REGION:?AWS_DEFAULT_REGION is required}"
: "${SQS_QUEUE_NAME:?SQS_QUEUE_NAME is required}"
: "${LOCALSTACK_ENDPOINT:?LOCALSTACK_ENDPOINT is required}"

echo "Ensuring LocalStack SQS queue: ${SQS_QUEUE_NAME}"

awslocal sqs create-queue \
  --endpoint-url "${LOCALSTACK_ENDPOINT}" \
  --queue-name "${SQS_QUEUE_NAME}" \
  --region "${AWS_DEFAULT_REGION}" >/dev/null

awslocal sqs get-queue-url \
  --endpoint-url "${LOCALSTACK_ENDPOINT}" \
  --queue-name "${SQS_QUEUE_NAME}" \
  --region "${AWS_DEFAULT_REGION}"

echo "LocalStack SQS queue ensured: ${SQS_QUEUE_NAME}"
