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
cp .env.example .env
# Generate a stable encryption key before configuring AI providers in Settings.
uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Set the generated value as KOMBU_ENCRYPTION_KEY in .env.
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

## AI Provider Encryption

AI providers and models are configured in **Settings → AI Providers**. Kombu
stores provider API keys encrypted in the database, using the stable deployment
secret in `KOMBU_ENCRYPTION_KEY`.

Generate it once:

```sh
uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Set the output in `.env`:

```dotenv
KOMBU_ENCRYPTION_KEY=your-generated-fernet-key
```

Keep this value stable. Changing or losing it makes previously stored provider
keys unreadable. Do not commit `.env` or the encryption key.

The same encryption key protects recipe-source credentials configured through
Settings. Source definitions ship with Kombu; self-hosters provide only the
account credentials required by a source, and those credentials are stored in
SQLite rather than environment variables.

## Database Upgrades

Revision `9c41f7a0d2e8` adds administrator-managed users and invitations,
persisted feature and AI capability switches, and encrypted integration
credentials. Apply and verify it with:

```sh
uv run alembic -c api/alembic.ini upgrade head
uv run alembic -c api/alembic.ini current
```

A successful installation reports `9c41f7a0d2e8 (head)`.
