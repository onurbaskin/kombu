#!/usr/bin/env sh
set -eu

mode="${1:-basic}"
base_url="${2:-http://localhost:8080}"

case "$mode" in
  basic)
    compose_file="compose.basic.yaml"
    ;;
  production)
    compose_file="compose.production.yaml"
    ;;
  *)
    echo "Usage: ./doctor.sh [basic|production] [base-url]" >&2
    exit 2
    ;;
esac

echo "Checking Compose configuration: $compose_file"
docker compose -f "$compose_file" config --quiet

echo "Checking container status"
docker compose -f "$compose_file" ps

echo "Checking public liveness endpoint: $base_url/healthz"
curl --fail --silent --show-error "$base_url/healthz" >/dev/null

echo "Kombu deployment looks healthy."
