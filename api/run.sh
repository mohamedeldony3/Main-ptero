#!/usr/bin/env bash
set -euo pipefail

# تحميل .env تلقائيا إن وُجد في نفس المجلد (اختياري)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# --- قراءة المتغيرات من ENV (لا قيم مضمّنة) ---
: "${URL:?Environment variable URL is required (e.g. https://ptero2.melsony.site)}"
: "${HOST:?Environment variable HOST is required (e.g. ptero2.melsony.site)}"
: "${USER_B64:?Environment variable USER_B64 is required (base64)}"
: "${PASS_B64:?Environment variable PASS_B64 is required (base64)}"

NETRC="${HOME}/.netrc"

# --- helpers ---
b64d() { printf '%s' "$1" | base64 -d; }

USER_RAW="$(b64d "$USER_B64")"
PASS_RAW="$(b64d "$PASS_B64")"

if [ -z "$USER_RAW" ] || [ -z "$PASS_RAW" ]; then
  echo "Credential decode failed." >&2
  exit 1
fi

# Ensure curl exists
if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is required but not installed." >&2
  exit 1
fi

# Prepare ~/.netrc with strict perms
touch "$NETRC"
chmod 600 "$NETRC"

tmpfile="$(mktemp)"
# remove existing entry for this host if any
grep -vE "^[[:space:]]*machine[[:space:]]+${HOST}([[:space:]]+|$)" "$NETRC" > "$tmpfile" || true
mv "$tmpfile" "$NETRC"

{
  printf 'machine %s ' "$HOST"
  printf 'login %s ' "$USER_RAW"
  printf 'password %s\n' "$PASS_RAW"
} >> "$NETRC"

# Fetch and execute safely
script_file="$(mktemp)"
cleanup() { rm -f "$script_file"; }
trap cleanup EXIT

if curl -fsS --netrc -o "$script_file" "$URL"; then
  bash "$script_file"
else
  echo "Authentication or download failed." >&2
  exit 1
fi
