# Kombu Agent Guide

Kombu is a public MIT-licensed recipe, inventory, shopping, scanner, and kitchen
automation project. Treat it as public by default.

## Non-Negotiables

- Never commit credentials, private hostnames, personal infrastructure details,
  API keys, tokens, cookies, or real household data.
- Keep examples generic and self-hosting friendly.
- Prefer container-first workflows that work with Docker and Podman.
- Keep the Python project metadata and uv-managed `.venv` at the repository
  root.
- Keep backend code under `api/` and frontend code under `ui/`.
- Generate frontend API types from FastAPI OpenAPI output; do not hand-write
  duplicated API contracts.
- Keep changes logical and commit regularly with descriptive messages.

## Backend

- Use FastAPI, Pydantic, SQLAlchemy 2 style, Alembic, and uvicorn.
- Keep route packages in `api/app/routes/<resource>/`.
- Add Alembic migrations for every database schema change.
- Run `uv run ruff format --check .`, `uv run ruff check .`, and
  `uv run ty check .` before committing Python changes.

## Frontend

- Use React Router framework mode in `ui/`.
- Use shadcn/ui components and the local `~/` aliases.
- Use pnpm, Biome, and TypeScript typechecking.
- Run `pnpm --dir ui lint`, `pnpm --dir ui typecheck`, and
  `pnpm --dir ui build` before committing frontend changes.

## Public Safety

When in doubt, replace deployment-specific details with placeholders such as
`example.com`, `change-me`, or `your-domain.test`.
