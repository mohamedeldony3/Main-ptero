#!/usr/bin/env bash
set -euo pipefail
# wrapper script (no secrets) — robust version
# Usage: bash <(curl -sS https://main-ptero.vercel.app) /api/info
# Or: PATH_ARG=/api/info bash <(curl -sS https://main-ptero.vercel.app)

# prefer env override for safety
path="${PATH_ARG:-${1:-/}}"

# URL-encode path using python3 (safer: pass via stdin)
if command -v python3 >/dev/null 2>&1; then
  encoded=$(printf '%s' "$path" | python3 -c "import sys,urllib.parse as u; s=sys.stdin.read().strip() or '/'; print(u.quote(s))")
else
  # minimal fallback: escape spaces only
  encoded=$(printf '%s' "$path" | sed -e 's/ /%20/g')
fi

curl -fsS "https://main-ptero-2c6l2z6ge-mohamedeldony3s-projects.vercel.app/api/exec?path=${encoded}"