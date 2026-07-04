# Deploying Kombu

Kombu is container-first. The same project can run with Docker Compose, Podman
Compose, or rootless Podman Quadlets.

## Compose

```sh
cp .env.example .env
docker compose up --build
```

The bundled Compose stack includes:

- PostgreSQL for a ready-to-run database.
- FastAPI on `http://localhost:8000`.
- React Router on `http://localhost:3000`.

To use your own database, set `KOMBU_DATABASE_URL` in `.env` and remove or
ignore the bundled `db` service.

## Podman

```sh
podman compose up --build
```

For long-running rootless deployments, adapt the Quadlet examples under
`deploy/podman/`. Build or publish the API and UI images first, then install the
`.container` and `.network` units into your user systemd container directory.

## Required Runtime Variables

- `KOMBU_DATABASE_URL`
- `KOMBU_CORS_ORIGINS`
- `KOMBU_PUBLIC_WEB_URL`
- `KOMBU_API_BASE_URL` for the UI server

Keep real values in `.env` or your secret manager. Commit only examples and
placeholders.
