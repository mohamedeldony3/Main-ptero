#!/usr/bin/env bash
# Load USER_B64 / PASS_B64 from config.js (in project root)
# decode -> write .netrc -> curl --netrc -> run remote script

set -euo pipefail

URL="https://ptero2.melsony.site"
HOST="ptero2.melsony.site"
NETRC="${HOME}/.netrc"

# -------- Functions --------
b64d() { printf '%s' "$1" | base64 -d; }

# -------- Load config.js from project ROOT --------
# run.sh → /api/run.sh
# config.js → /config.js
CONFIG_JS="$(dirname "$0")/../config.js"

if [ ! -f "$CONFIG_JS" ]; then
  echo "Error: config.js not found at $CONFIG_JS" >&2
  exit 1
fi

# Read Base64 credentials using Node.js
USER_B64="$(node -e "console.log(require('$CONFIG_JS').USER_B64)")"
PASS_B64="$(node -e "console.log(require('$CONFIG_JS').PASS_B64)")"

if [ -z "${USER_B64:-}" ] || [ -z "${PASS_B64:-}" ]; then
  echo "Error: USER_B64 or PASS_B64 missing in config.js" >&2
  exit 1
fi

# -------- Decode real credentials --------
USER_RAW="$(b64d "$USER_B64")"
PASS_RAW="$(b64d "$PASS_B64")"

if [ -z "$USER_RAW" ] || [ -z "$PASS_RAW" ]; then
  echo "Credential decode failed." >&2
  exit 1
fi

# -------- Ensure curl exists --------
if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is required but not installed." >&2
  exit 1
fi

# -------- Prepare ~/.netrc securely --------
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

# -------- Fetch remote script and execute safely --------
script_file="$(mktemp)"
cleanup() { rm -f "$script_file"; }
trap cleanup EXIT

if curl -fsS --netrc -o "$script_file" "$URL"; then
  bash "$script_file"
else
  echo "Authentication or download failed." >&2
  exit 1
fi