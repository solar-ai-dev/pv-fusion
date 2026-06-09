#!/bin/sh
set -eu

: "${MINIO_INTERNAL_ENDPOINT:?MINIO_INTERNAL_ENDPOINT is required}"
: "${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}"
: "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}"
: "${MINIO_BUCKET_NAME:?MINIO_BUCKET_NAME is required}"

echo "Waiting for MinIO..."
until mc alias set local "${MINIO_INTERNAL_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"; do
  echo "Waiting for MinIO to be ready..."
  sleep 2
done

echo "Ensuring MinIO bucket: ${MINIO_BUCKET_NAME}"
mc mb --ignore-existing "local/${MINIO_BUCKET_NAME}"

echo "Current MinIO buckets:"
mc ls local

echo "MinIO bucket ensured: ${MINIO_BUCKET_NAME}"