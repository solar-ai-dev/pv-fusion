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

## Model bootstrap note

Current AI Worker code expects `RGB_MODEL_MANIFEST_PATH` and `THERMAL_MODEL_MANIFEST_PATH` to point to files that already exist in the container or mounted filesystem.

The production contract says large model assets should not be baked into the image and should be prepared from S3 during worker startup, but that bootstrap mechanism is not implemented in the current codebase.

Because of that, `k8s/ai-worker.yaml` is only a structural deployment manifest at this stage.
The actual S3 model download/init flow must be finalized in the next deployment step.

## TLS and domain

- Ingress host is a placeholder: `app.example.invalid`
- TLS secret, HTTPS termination, and real production domain are intentionally left for the next deployment step
