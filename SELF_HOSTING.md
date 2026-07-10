# Kombu Self-Hosting and Delivery Plan

This document defines the deployment contract for Kombu. It is intentionally
about delivery, maintenance, persistence, upgrades, and scaling rather than
about application features. The API and UI remain separate services and their
underlying technologies do not change.

## Outcome

Kombu will ship three deployment scales with progressively stronger operational
requirements:

| Scale | Audience | Database | Blob storage | Cache/jobs | Runtime |
| --- | --- | --- | --- | --- | --- |
| Basic | Individual or household | SQLite | Local filesystem | None required | Docker Compose or rootless Podman |
| Production | Team, business, or serious single host | PostgreSQL | Local filesystem by default; S3-compatible optional | Valkey optional initially, required for distributed jobs | Docker Compose or rootless Podman |
| Scale-out | Multiple replicas or Kubernetes | PostgreSQL | S3-compatible object storage | Valkey/Redis plus workers | Kubernetes/Helm or an equivalent orchestrator |

The smallest deployment must be usable with one downloaded Compose file, one
generated environment file, and one `up -d` command. The larger deployments
must have explicit backup, restore, migration, health, upgrade, and rollback
contracts.

## Supported delivery surfaces

### Primary: Docker Compose

Docker Compose is the reference implementation because it has the lowest
barrier to entry and can run the complete dependency group on one host.
Published release files should use immutable Kombu image versions rather than
requiring users to build from source.

Planned files:

- `deploy/compose/compose.basic.yaml`: API, UI, SQLite, and filesystem storage.
- `deploy/compose/compose.production.yaml`: API, UI, PostgreSQL, and optional
  local storage services.
- `deploy/compose/compose.scale-out.yaml`: API, UI, worker, PostgreSQL,
  Valkey, and S3-compatible storage configuration.
- optional reverse-proxy overlay for Caddy, with examples for external Nginx,
  Traefik, and Cloudflare/Tailscale access.

### Rootless Podman

Rootless Podman Quadlets are the second supported single-host surface. They
should consume the same published API and UI images as Compose and use the same
environment names, persistent data layout, health checks, and upgrade routine.

### Kubernetes

Kubernetes is a scale-out surface, not the first-run path. A Helm chart should
be added after the worker, object-storage, readiness, and migration contracts
are stable. The chart should support external PostgreSQL and Valkey by default,
with bundled development dependencies available as optional subcharts or
examples rather than hidden requirements.

## Deployment principles

1. API and UI stay separate containers and independently deployable images.
2. The public network should expose one HTTP entry point through a reverse
   proxy; the database, cache, and worker network remain private.
3. SQLite is single-node only. PostgreSQL is the supported production database
   and the only database target for horizontal scaling.
4. Cache data is disposable. Recipes, inventory, users, jobs, and settings are
   durable database state.
5. Long-running work must run in a worker process, not in an API-local thread.
6. Local filesystem storage is valid for basic and single-host production
   deployments. Scale-out requires shared or S3-compatible object storage.
7. Schema migrations run as an explicit deployment operation or a dedicated
   migration job, never independently in every API replica.
8. Every release has a documented upgrade path and a tested restore path.
9. Secrets are generated or supplied through secret files/secret stores; real
   values never appear in committed Compose, Quadlet, or Helm files.
10. Every supported deployment has a smoke test that proves the UI, API,
    database, persistence, and health checks work together.

## Basic deployment

The basic deployment is the demo and personal-installation experience:

- API container.
- UI container.
- SQLite database inside a named or bind-mounted application data volume.
- Local directories for scanner/import/blob data.
- No PostgreSQL, Valkey, object store, or reverse proxy required.

It must support:

```sh
docker compose -f compose.basic.yaml up -d
```

The user should be able to open the UI without manually configuring a second
browser-visible API hostname. Same-origin routing or a generated public API URL
must be the default.

## Production deployment

The production deployment is still a single host, but has service boundaries
that can be maintained independently:

- API container.
- UI container.
- PostgreSQL container or external PostgreSQL service.
- Optional Valkey container or external Valkey service.
- Local persistent storage for files unless S3-compatible storage is enabled.
- Optional Caddy container, or an external reverse proxy.

The deployment must provide:

- database-aware readiness checks;
- explicit migration command;
- database dump and restore scripts;
- application data backup guidance;
- version-pinned images;
- secret-file support;
- rootless Podman parity;
- resource and restart examples.

## Scale-out deployment

Scale-out separates stateless request handling from durable and asynchronous
work:

```text
Ingress / reverse proxy
        |
   +----+----+
   |         |
  UI       API replicas
                  |
       +----------+----------+
       |                     |
   PostgreSQL          Valkey/Redis
       |
  S3-compatible blob storage
                  |
              Worker replicas
```

The API must be safe to run with more than one replica. Imports, image work,
and other long-running operations must be represented by durable jobs and
executed by workers. Local process memory, local-only locks, and local-only
files must not be correctness requirements.

## Database policy

Kombu will support two database modes first:

- SQLite for basic, single-node installations.
- PostgreSQL for production and scale-out installations.

MariaDB/MySQL should not be added without a clear user demand because every
additional SQL backend expands migration, query, indexing, backup, and test
support. SQLAlchemy URLs, Alembic migrations, and CI should make the supported
SQLite/PostgreSQL boundary explicit.

## Blob and file storage policy

The application now has a storage boundary that can use:

- local filesystem paths for basic/single-host installations;
- S3-compatible object storage for scale-out installations.

S3 compatibility should cover self-hosted Garage or MinIO as well as managed
providers such as Amazon S3, Cloudflare R2, and Backblaze B2. The exact service
is an operator choice; Kombu should depend on the protocol, not the vendor.

Generated recipe images are stored through this boundary and delivered through
Kombu’s `/blobs/...` route. They are no longer embedded as base64 data URLs in
database records.

The backup contract must identify database state, uploaded files, generated
files, configuration, and the encryption key separately. A database dump alone
is not a complete Kombu backup when files are stored outside the database.

## Cache and asynchronous work

Valkey/Redis is optional in basic mode and becomes part of the production
scale-out contract when distributed jobs, locks, rate limits, or fan-out are
enabled. Cache contents must be rebuildable.

Import jobs now cross a worker boundary with persisted job state. When
`KOMBU_CACHE_URL` is configured, Valkey/Redis provides a shared claim lock so
multiple workers do not claim the same job. A durable queue with retry and
stale-job recovery remains part of the next worker-hardening slice.

## Current repository risks to resolve

- The current Compose stack defaults to PostgreSQL while `.env.example`
  defaults to SQLite. The deployment modes need to be separated rather than
  relying on conflicting defaults.
- The current API startup command runs Alembic migrations inside the API
  container. This is convenient for a demo but unsafe when multiple replicas
  start concurrently.
- The importer now runs in a separate worker process. Retry, stale-job recovery,
  and a full broker-backed queue remain to be hardened for production scale.
- Scanner/import directories are still local filesystem paths. Generated image
  blobs support the local and S3 backends; scanner/import artifact migration to
  the same abstraction remains work for the next storage slice.
- The UI browser client currently has a separate public/internal API URL
  problem. The deployment should use same-origin routing or a deliberate public
  API URL mechanism.
- Health checks currently provide liveness, but production orchestration also
  needs database-aware readiness.
- Container images should run as non-root where practical and support pinned
  release tags.
- `.env.example` contains duplicated encryption-key entries and should be
  reduced to one authoritative setting.

## Delivery roadmap

### Slice 1: deployment contract and basic Compose

- Save and maintain this document.
- Add a basic SQLite/filesystem Compose deployment.
- Keep API and UI separate.
- Add a single public entry point and persistent volume layout.
- Add a deployment smoke test.

### Slice 2: production Compose

- Add PostgreSQL Compose deployment.
- Add explicit migration service/command.
- Add backup and restore scripts.
- Add secret-file support and generated secrets.
- Add optional Valkey and Caddy overlays.

### Slice 3: rootless Podman parity

- Update Quadlets to consume release images.
- Add API/UI/worker/storage dependencies as appropriate.
- Document install, update, backup, restore, and rollback.
- Verify with rootless Podman smoke tests.

### Slice 4: scale-out foundations

- Harden worker retries, stale-job recovery, and distributed queue semantics.
- Add a Compose scale-out rehearsal with Valkey and MinIO dependencies.
- Extend the storage abstraction to scanner/import artifacts and add lifecycle
  cleanup for replaced blobs.
- Add Valkey-backed coordination.
- Make API replicas stateless.
- Add readiness and graceful-shutdown behavior.

### Slice 5: Kubernetes

- Add Helm chart with API, UI, worker, migration Job, Secret, ConfigMap,
  Services, Ingress, and persistence options.
- Document external PostgreSQL, Valkey, and S3-compatible storage.
- Add upgrade/rollback and backup/restore runbooks.

## Research references

- [Paperless-ngx setup](https://docs.paperless-ngx.com/setup/): guided install,
  Compose variants, PostgreSQL recommendation, Docker secrets, and optional
  Redis.
- [Paperless-ngx administration](https://docs.paperless-ngx.com/administration/):
  backup and operational guidance.
- [Immich Docker Compose](https://immich.app/docs/install/docker-compose/):
  release-provided Compose files and minimal installation flow.
- [Immich backup and restore](https://immich.app/docs/administration/backup-and-restore):
  database plus asset backup requirements.
- [Immich upgrades](https://docs.immich.app/install/upgrading/): versioned
  upgrade and release policy.
- [Immich Kubernetes](https://docs.immich.app/install/kubernetes/): official
  Helm deployment as a separate scale-out path.
- [Nextcloud AIO](https://github.com/nextcloud/all-in-one): integrated
  deployment, PostgreSQL, Redis, backups, updates, and restore.
- [Nextcloud reverse proxy guidance](https://github.com/nextcloud/all-in-one/blob/main/reverse-proxy.md):
  external proxy, tunnels, and single-host routing patterns.
- [Gitea Docker installation](https://docs.gitea.com/1.24/installation/install-with-docker):
  simple SQLite mode and external PostgreSQL/MySQL options.
- [Valkey container images](https://hub.docker.com/r/valkey/valkey): pinned
  Valkey image tags used by the scale-out rehearsal.
- [MinIO container images](https://hub.docker.com/r/minio/minio): pinned
  S3-compatible object-storage image used by the scale-out rehearsal.
