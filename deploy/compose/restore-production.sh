#!/usr/bin/env sh
set -eu

compose_file="${COMPOSE_FILE:-compose.production.yaml}"
backup_dir="${1:?Usage: ./restore-production.sh BACKUP_DIRECTORY}"

if [ ! -f "$backup_dir/database.sql.gz" ]; then
  echo "Missing $backup_dir/database.sql.gz" >&2
  exit 1
fi

echo "This replaces the current Kombu PostgreSQL database."
printf "Type RESTORE to continue: "
read -r confirmation
if [ "$confirmation" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 1
fi

docker compose -f "$compose_file" stop edge ui api
docker compose -f "$compose_file" start db

gunzip -c "$backup_dir/database.sql.gz" \
  | docker compose -f "$compose_file" exec -T db sh -c \
    'psql --dbname="$POSTGRES_DB" --username="$POSTGRES_USER" --set ON_ERROR_STOP=on'

if [ -d "$backup_dir/var" ]; then
  docker compose -f "$compose_file" cp "$backup_dir/var/." api:/app/var
fi

docker compose -f "$compose_file" up -d api ui edge
echo "Restore complete. Check the API and UI health before allowing traffic."
