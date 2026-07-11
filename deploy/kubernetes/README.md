# Kubernetes deployment

The Helm chart is the scale-out deployment surface. It expects PostgreSQL,
Valkey/Redis, and S3-compatible object storage to be operated externally or by
the cluster platform. It does not silently install database or cache charts.

Install with a values file containing the required connection details:

```sh
helm upgrade --install kombu ./kombu \
  --namespace kombu \
  --create-namespace \
  -f values.production.yaml
```

Start from `values.production.example.yaml`, replace its placeholders, and
keep the resulting file out of version control. Alternatively set
`secrets.existingSecret` to a Secret containing the `KOMBU_*` keys used by the
chart.

The chart creates separate API, UI, and worker Deployments, a pre-install and
pre-upgrade migration Job, internal API/UI Services, a Secret, and an optional
Ingress. API probes use `/healthz` for liveness and `/readyz` for database-aware
readiness.

For S3-compatible storage, set `blobStorage.backend=s3` and provide the
endpoint, bucket, access key, and secret key. For local filesystem storage,
enable `persistence` and use a ReadWriteMany-capable volume if API or worker
replicas need to share files.

The UI release image must be built with `/api` as its browser API base URL. The
runtime `KOMBU_API_BASE_URL` is only the server-side UI-to-API connection.
