# Kombu

Kombu is a modern, self-hostable kitchen platform. It starts with recipes,
inventory, expiry alerts, shopping lists, recipe imports, scanner workflows, and
AI-ready assistance, then leaves space for multi-user deployments, SSO, and
company-scale kitchens.

## Repository Layout

```text
api/      FastAPI application, SQLAlchemy models, route packages, Alembic
ui/       React Router application with shadcn/ui
deploy/   Container and self-hosting deployment examples
skills/   Repo-level agent skills and workflow notes
```

## Local Development

```sh
uv sync
uv run alembic -c api/alembic.ini upgrade head
uv run uvicorn api.app.main:app --reload

pnpm --dir ui install
pnpm --dir ui dev
```

## Container Development

```sh
cp .env.example .env
docker compose up --build
```

Podman users can run the same Compose file through `podman compose` or adapt the
Quadlet examples under `deploy/podman/`.

The Compose stack bundles PostgreSQL, but users can set `KOMBU_DATABASE_URL` to
an existing PostgreSQL-compatible database instead.

## License

Kombu is released under the MIT license.
