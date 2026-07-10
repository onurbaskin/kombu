#!/usr/bin/env sh
set -eu

# Require a token boundary before assignment names so encrypted_api_key and
# encrypted_secret do not look like raw credential assignments.
patterns='(AKIA[0-9A-Z]{16}|-----BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY-----|ghp_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{20,}|(^|[^[:alnum:]_])(password|api[_-]?key|secret)\s*=\s*[^$<{[:space:]#]+)'

if git grep -I -n -E "$patterns" -- \
  ':!.env.example' \
  ':!.github/workflows/*' \
  ':!scripts/secret_scan.sh'; then
  echo "Potential secret-like value found. Replace it with a placeholder before committing." >&2
  exit 1
fi
