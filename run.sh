#!/usr/bin/env bash
# Uses ENV vars for creds and URL
set -euo pipefail

# --- Config from ENV ---
URL="${SCRIPT_URL:-}"
HOST="${SCRIPT_HOST:-}"
USER_B64="${SCRIPT_USER_B64:-}"
PASS_B64="${SCRIPT_PASS_B64:-}"
NETRC="${HOME}/.netrc"

# --- Helpers ---
b64d() { printf '%s' "$1" | base64 -d; }

# --- Validate input ---
if [ -z "$URL" ] || [ -z "$HOST" ] || [ -z "$USER_B64" ] || [ -z "$PASS_B64" ]; then
  echo "One or more required ENV variables are missing." >&2
  exit 1
fi

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