---
name: kombu-development-flow
description: Repo-level workflow for Kombu API, UI, OpenAPI generation, containers, public-safety checks, and self-hosting docs.
---

# Kombu Development Flow

Use this skill for Kombu code, docs, deployment, or automation changes.

## Public Project Rule

Kombu is public. Never add secrets, private hostnames, personal names, household
data, private infrastructure details, cookies, API keys, tokens, or production
credentials.

## Standard Workflow

1. Inspect `AGENTS.md` and nearby code before editing.
2. Keep Python tooling at the repository root and backend code in `api/`.
3. Keep React Router tooling and UI code in `ui/`.
4. Add Alembic migrations for database schema changes.
5. Regenerate OpenAPI and frontend types after API contract changes.
6. Prefer container-first deployment examples that work with Docker and Podman.
7. Run the relevant checks before committing.

## Commands

```sh
uv sync
uv run alembic -c api/alembic.ini upgrade head
uv run python scripts/export_openapi.py
pnpm --dir ui generate:api
uv run ruff format --check .
uv run ruff check .
uv run ty check .
pnpm --dir ui lint
pnpm --dir ui typecheck
pnpm --dir ui build
scripts/secret_scan.sh
```
