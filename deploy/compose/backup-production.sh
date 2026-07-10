#!/usr/bin/env sh
set -eu

compose_file="${COMPOSE_FILE:-compose.production.yaml}"
backup_root="${1:-./backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${backup_root%/}/kombu-${timestamp}"

mkdir -p "$backup_dir"

echo "Creating PostgreSQL backup in $backup_dir"
docker compose -f "$compose_file" exec -T db sh -c \
  'pg_dump --clean --if-exists --dbname="$POSTGRES_DB" --username="$POSTGRES_USER"' \
  | gzip > "$backup_dir/database.sql.gz"

echo "Copying application files from the API volume"
docker compose -f "$compose_file" cp api:/app/var "$backup_dir/var"

echo "Backup complete: $backup_dir"
