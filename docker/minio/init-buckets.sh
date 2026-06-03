#!/bin/sh
set -eu

until mc alias set local "${MINIO_INTERNAL_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"; do
  echo "Waiting for MinIO to be ready..."
  sleep 2
done

mc mb --ignore-existing "local/${MINIO_BUCKET_NAME}"
echo "MinIO bucket ensured: ${MINIO_BUCKET_NAME}"
