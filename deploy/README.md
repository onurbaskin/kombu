# Deploying Kombu

Kombu is container-first and is delivered in three deployment scales. The API
and UI are always separate containers.

## Choose a deployment

| Deployment | Best for | Persistent dependencies | Guide |
| --- | --- | --- | --- |
| Basic | Demo, individual, household | SQLite and local filesystem | [`compose.basic.yaml`](compose/compose.basic.yaml) |
| Production | Team, business, single server | PostgreSQL and local filesystem | [`compose.production.yaml`](compose/compose.production.yaml) |
| Scale-out | Multiple replicas, Compose or Kubernetes | PostgreSQL, Valkey, S3-compatible storage | [`compose.scale-out.yaml`](compose/compose.scale-out.yaml), [`kubernetes/`](kubernetes/) |

The Basic, Production, and Scale-out Compose files are the low-friction
reference surfaces. Rootless Podman Quadlet parity is maintained under
`deploy/podman/`, and the Helm chart under `deploy/kubernetes/` is the
scale-out orchestrator surface.

## Basic Compose

```sh
cd deploy/compose
cp .env.basic.example .env
docker compose -f compose.basic.yaml up -d --build
```

Open `http://localhost:8080`. This mode includes a Caddy edge container, the
separate API and UI containers, SQLite, and a persistent application volume.

## Production Compose

```sh
cd deploy/compose
cp .env.production.example .env
# Change KOMBU_POSTGRES_PASSWORD and KOMBU_DATABASE_URL in .env.
docker compose -f compose.production.yaml up -d --build
```

The migration service completes before the API starts. PostgreSQL is not
published to the host. Use an external PostgreSQL service by removing the
bundled `db` service and setting `KOMBU_DATABASE_URL` to the provider URL.

For the full deployment contract, backup policy, scaling model, and roadmap,
see [`SELF_HOSTING.md`](../SELF_HOSTING.md).

## Podman

```sh
podman compose up --build
```

For long-running rootless deployments, use the Quadlet examples under
`deploy/podman/`. Build or publish the API and UI images first, then install the
`.container` and `.network` units into your user systemd container directory.

## Required Runtime Variables

- `KOMBU_DATABASE_URL`
- `KOMBU_CORS_ORIGINS`
- `KOMBU_PUBLIC_WEB_URL`
- `KOMBU_API_BASE_URL` for the UI server

Keep real values in `.env` or your secret manager. Commit only examples and
placeholders.
