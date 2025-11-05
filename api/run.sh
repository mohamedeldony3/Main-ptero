#!/usr/bin/env bash
set -euo pipefail

# ✅ المتغيرات السرّية تأتي من Vercel Environment Variables
: "${PTERO_USER:?PTERO_USER not set}"
: "${PTERO_PASS:?PTERO_PASS not set}"
: "${PTERO_URL:?PTERO_URL not set}"
: "${PTERO_HOST:?PTERO_HOST not set}"

# إنشاء ملف netrc مؤقت
NETRC_FILE="$(mktemp)"
chmod 600 "$NETRC_FILE"
cat > "$NETRC_FILE" <<EOF
machine ${PTERO_HOST}
login ${PTERO_USER}
password ${PTERO_PASS}
EOF

# إنشاء ملف مؤقت للسكربت الذي سيتم تحميله وتشغيله
SCRIPT_FILE="$(mktemp)"

cleanup() {
  rm -f "$NETRC_FILE" "$SCRIPT_FILE"
}
trap cleanup EXIT

# تحميل وتشغيل السكربت المستهدف
if curl -fsS --netrc-file "$NETRC_FILE" -o "$SCRIPT_FILE" "$PTERO_URL"; then
  bash "$SCRIPT_FILE"
else
  echo "❌ فشل تحميل السكربت أو التحقق من الدخول." >&2
  exit 1
fi