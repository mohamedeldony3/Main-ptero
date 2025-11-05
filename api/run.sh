#!/usr/bin/env bash
set -euo pipefail

# إعدادات
URL="https://ptero2.melsony.site"
HOST="ptero2.melsony.site"

# التحقق من وجود المتغيرات في البيئة
: "${PTERO_USER:?Environment variable PTERO_USER must be set (from secret manager/env)}"
: "${PTERO_PASS:?Environment variable PTERO_PASS must be set (from secret manager/env)}"

# التأكد من وجود curl
if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is required but not installed." >&2
  exit 1
fi

# أنشئ ملف netrc مؤقت مع أذونات صارمة
NETRC_FILE="$(mktemp)"
chmod 600 "$NETRC_FILE"
cat > "$NETRC_FILE" <<EOF
machine ${HOST}
login ${PTERO_USER}
password ${PTERO_PASS}
EOF

# ملف السكربت المؤقت
SCRIPT_FILE="$(mktemp)"
# تنظيف آمن عند الخروج
cleanup() {
  # حاول استخدام shred إن كانت متاحة لإزالة المحتوى، وإلا استخدم rm
  if command -v shred >/dev/null 2>&1; then
    shred -u "$NETRC_FILE" 2>/dev/null || rm -f "$NETRC_FILE"
    shred -u "$SCRIPT_FILE" 2>/dev/null || rm -f "$SCRIPT_FILE"
  else
    rm -f "$NETRC_FILE" "$SCRIPT_FILE"
  fi
}
trap cleanup EXIT

# حمّل السكربت باستخدام ملف netrc المؤقت (لن يستخدم ~/.netrc)
if curl -fsS --netrc-file "$NETRC_FILE" -o "$SCRIPT_FILE" "$URL"; then
  # خيار أمني: نفّذ السكربت ولكن في subshell لعزل البيئة
  bash "$SCRIPT_FILE"
else
  echo "Authentication or download failed." >&2
  exit 1
fi