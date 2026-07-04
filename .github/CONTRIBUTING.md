# Contributing

Thanks for helping make Kombu better.

## Ground Rules

- Keep contributions generic and safe for a public repository.
- Do not include secrets, private URLs, personal data, or real household data.
- Keep backend, frontend, docs, and deployment changes in separate commits when
  possible.
- Add or update tests and generated OpenAPI types when API contracts change.

## Checks

Run the relevant checks before opening a pull request:

```sh
uv run ruff format --check .
uv run ruff check .
uv run ty check .
pnpm --dir ui lint
pnpm --dir ui typecheck
pnpm --dir ui build
git diff --check
scripts/secret_scan.sh
```
