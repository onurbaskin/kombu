# Kombu Compose deployments

These files are the first self-hosting delivery surfaces. Run commands from
this directory so Compose resolves the relative build context and Caddyfile
paths predictably.

## Basic

The basic deployment includes separate API and UI containers, a Caddy edge
container, SQLite, and local persistent storage:

```sh
cp .env.basic.example .env
docker compose -f compose.basic.yaml up -d --build
```

Open `http://localhost:8080`. Only the edge container publishes a host port.
The database and application files are stored in the `kombu-var` volume.

Stop the deployment without deleting data:

```sh
docker compose -f compose.basic.yaml down
```

To delete the database and uploaded files as well, explicitly remove the
volume:

```sh
docker compose -f compose.basic.yaml down -v
```

This basic profile is single-node only. PostgreSQL, Valkey, object storage,
backups, and scale-out deployment files will be added as separate delivery
slices.

Check a running deployment:

```sh
./doctor.sh basic http://localhost:8080
```

## Production

The production deployment adds PostgreSQL and runs migrations as a one-shot
service before starting the API:

```sh
cp .env.production.example .env
docker compose -f compose.production.yaml up -d --build
```

Open `http://localhost:8080`. Only the edge container publishes a host port.
PostgreSQL data is stored in `kombu-postgres`; application files are stored in
`kombu-var`.

For an externally managed PostgreSQL instance, remove the `db` service and set
`KOMBU_DATABASE_URL` to the provider's connection URL. The migration service
must still be able to reach that database before the API starts.

Before upgrading, back up PostgreSQL and application files. Then pull or
rebuild the new version and run:

```sh
docker compose -f compose.production.yaml up -d --build
```

The migration service is safe to rerun because Alembic applies only pending
revisions.

Production can run one worker without Valkey. Multiple worker replicas require
`KOMBU_CACHE_URL` so they share a distributed claim lock; the scale-out
override supplies `redis://valkey:6379/0`.

## Production backup and restore

Create a database and application-volume backup while the production stack is
running:

```sh
./backup-production.sh ./backups
```

Restore requires an explicit confirmation because it replaces the current
database:

```sh
./restore-production.sh ./backups/kombu-YYYYMMDDTHHMMSSZ
```

Keep the encryption key from the deployment environment with the backup. A
database dump and application files without the stable
`KOMBU_ENCRYPTION_KEY` cannot decrypt previously stored integration secrets.

Check the production deployment:

```sh
./doctor.sh production http://localhost:8080
```

## Scale-out rehearsal

The scale-out override adds Valkey, MinIO, and a second API/UI/worker replica
configuration. Blob storage and distributed worker claiming are wired through
the application configuration:

```sh
cp .env.production.example .env
cat .env.scale-out.example >> .env
docker compose \
  -f compose.production.yaml \
  -f compose.scale-out.yaml \
  up -d --build --scale api=2 --scale ui=2 --scale worker=2
```

Use an external S3-compatible endpoint and managed Valkey by replacing the
corresponding variables. The bundled MinIO image is pinned for reproducible
testing; it is not a substitute for an operator-managed object-storage backup
strategy.
