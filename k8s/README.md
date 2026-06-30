# K3s Deployment Notes

## Scope

These manifests prepare the MVP K3s deployment structure for:

- `pv-insight` namespace
- Frontend Deployment + ClusterIP Service
- Backend Deployment + ClusterIP Service
- AI Worker Deployment
- Traefik Ingress
- non-secret ConfigMaps
- placeholder Secrets example

These files do not create AWS resources, real secrets, TLS, or ECR auth.

## Apply order

1. `k8s/namespace.yaml`
2. `k8s/configmap.yaml`
3. Create real secrets from `k8s/_examples/secret-example.yaml`
4. `k8s/frontend.yaml`
5. `k8s/backend.yaml`
6. `k8s/ai-worker.yaml`
7. `k8s/ingress.yaml`

`k8s/_examples/secret-example.yaml` is a template only and should not be applied as-is in production.

## Current assumptions

- Namespace: `pv-insight`
- Ingress controller: Traefik
- `/` routes to frontend
- `/api` routes to backend
- Frontend and backend use `ClusterIP`
- AI Worker is not exposed through `Service` or `Ingress`
- Backend runs with `SPRING_PROFILES_ACTIVE=prod`
- Backend uses RDS, S3, SQS in production
- AI Worker uses RDS, S3, SQS in production
- MinIO and LocalStack endpoint overrides are not injected in production manifests

## Frontend API URL note

Frontend currently uses `VITE_API_BASE_URL` at build time, not runtime.

For K3s deployment, the frontend image must already be built with the intended production API base URL.
If a single-domain Traefik route is used, `/api/v1` is the preferred build-time value.

## AI Worker v0-dev smoke note

Current AI Worker code expects `RGB_MODEL_MANIFEST_PATH` and `THERMAL_MODEL_MANIFEST_PATH` to point to files that already exist in the container or mounted filesystem.

For the current smoke deployment, `k8s/ai-worker.yaml` mounts a temporary hostPath:

- Host path: `/opt/pv-insight/models/v0-dev`
- Container path: `/models`
- Manifest paths:
  - `/models/rgb/model-manifest.dev.yaml`
  - `/models/thermal/model-manifest.dev.yaml`

This `v0-dev` model set is temporary and is only for Pod startup, model loading, SQS worker execution, and Jenkins rollout smoke checks.

Large model assets still must not be baked into the image or committed to Git. The final production model delivery path should move to an S3 download/initContainer or equivalent external artifact bootstrap flow in a later step.

## TLS and domain

- Ingress host is a placeholder: `app.example.invalid`
- TLS secret, HTTPS termination, and real production domain are intentionally left for the next deployment step
