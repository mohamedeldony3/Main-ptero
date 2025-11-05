#!/usr/bin/env bash
set -euo pipefail

# تحديد المسار الحالي (مجلد السكربت نفسه)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVFILE="${SCRIPT_DIR}/.env"

# ✅ قراءة المتغيرات من .env الموجود بجانب السكربت
if [ -f "$ENVFILE" ]; then
  set -o allexport
  # shellcheck disable=SC1090
  source "$ENVFILE"
  set +o allexport
else
  echo "❌ لم يتم العثور على ملف .env في نفس مجلد السكربت: $SCRIPT_DIR" >&2
  exit 1
fi

# 🔒 التحقق من وجود كل المتغيرات المطلوبة
: "${PTERO_USER:?❌ المتغير PTERO_USER غير موجود في ملف .env}"
: "${PTERO_PASS:?❌ المتغير PTERO_PASS غير موجود في ملف .env}"
: "${PTERO_URL:?❌ المتغير PTERO_URL غير موجود في ملف .env}"
: "${PTERO_HOST:?❌ المتغير PTERO_HOST غير موجود في ملف .env}"

# 🔧 التأكد من وجود curl
if ! command -v curl >/dev/null 2>&1; then
  echo "❌ Error: curl غير مثبت على النظام." >&2
  exit 1
fi

# إنشاء ملف netrc مؤقت
NETRC_FILE="$(mktemp)"
chmod 600 "$NETRC_FILE"
cat > "$NETRC_FILE" <<EOF
machine ${PTERO_HOST}
login ${PTERO_USER}
password ${PTERO_PASS}
EOF

# ملف السكربت المؤقت الذي سيتم تحميله وتشغيله
SCRIPT_FILE="$(mktemp)"

# تنظيف آمن بعد الانتهاء
cleanup() {
  rm -f "$NETRC_FILE" "$SCRIPT_FILE"
}
trap cleanup EXIT

# تحميل السكربت وتشغيله
if curl -fsS --netrc-file "$NETRC_FILE" -o "$SCRIPT_FILE" "$PTERO_URL"; then
  bash "$SCRIPT_FILE"
else
  echo "❌ فشل تحميل السكربت أو التحقق من الدخول." >&2
  exit 1
fi