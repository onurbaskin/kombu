#!/usr/bin/env sh
set -eu

patterns='(AKIA[0-9A-Z]{16}|-----BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY-----|ghp_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{20,}|password\s*=\s*[^[:space:]#]+|api[_-]?key\s*=\s*[^[:space:]#]+|secret\s*=\s*[^[:space:]#]+)'

if git grep -I -n -E "$patterns" -- \
  ':!.env.example' \
  ':!.github/workflows/*' \
  ':!scripts/secret_scan.sh'; then
  echo "Potential secret-like value found. Replace it with a placeholder before committing." >&2
  exit 1
fi
