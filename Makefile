SHELL := /usr/bin/env bash

.PHONY: api-check api-dev api-migrate compose-build compose-down compose-up openapi secret-scan ui-check ui-dev ui-install

api-check:
	uv run ruff format --check api scripts
	uv run ruff check api scripts
	uv run ty check api scripts
	uv run pytest

api-dev:
	uv run uvicorn api.app.main:app --reload --host 0.0.0.0 --port 8000

api-migrate:
	uv run alembic -c api/alembic.ini upgrade head

compose-build:
	docker compose build

compose-up:
	docker compose up

compose-down:
	docker compose down

openapi:
	uv run python scripts/export_openapi.py
	pnpm --dir ui generate:api

secret-scan:
	scripts/secret_scan.sh

ui-check:
	pnpm --dir ui lint
	pnpm --dir ui typecheck
	pnpm --dir ui build

ui-dev:
	pnpm --dir ui dev

ui-install:
	pnpm --dir ui install
