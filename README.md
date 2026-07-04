# Kombu

Kombu is an open source kitchen operating system for recipes, pantry inventory,
expiry alerts, shopping lists, scanner workflows, and smart cooking assistance.

It is built for self-hosting from day one:

- FastAPI, Pydantic, SQLAlchemy, Alembic, uv, ruff, and ty for the API.
- React Router, shadcn/ui, pnpm, Biome, and TypeScript for the UI.
- OpenAPI-generated frontend types and SDK helpers.
- Docker and Podman friendly deployment files.
- MIT licensed and designed for personal, household, team, or company use.

See [.github/README.md](.github/README.md) for the fuller project overview.

## Quick Start

```sh
uv sync
uv run alembic -c api/alembic.ini upgrade head
uv run uvicorn api.app.main:app --reload

pnpm --dir ui install
pnpm --dir ui dev
```

Or run the bundled container stack:

```sh
cp .env.example .env
docker compose up --build
```
