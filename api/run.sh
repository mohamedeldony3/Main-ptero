#!/usr/bin/env bash
set -euo pipefail

# ✅ قراءة المتغيرات من بيئة Vercel
: "${PTERO_USER:?PTERO_USER not set in Vercel env}"
: "${PTERO_PASS:?PTERO_PASS not set in Vercel env}"
: "${PTERO_URL:?PTERO_URL not set in Vercel env}"
: "${PTERO_HOST:?PTERO_HOST not set in Vercel env}"

# 🔒 إنشاء ملف netrc مؤقت في بيئة السيرفر
NETRC_FILE="$(mktemp)"
chmod 600 "$NETRC_FILE"
cat > "$NETRC_FILE" <<EOF
machine ${PTERO_HOST}
login ${PTERO_USER}
password ${PTERO_PASS}
EOF

# 🔧 تحميل السكربت وتشغيله داخل السيرفر نفسه
if curl -fsS --netrc-file "$NETRC_FILE" -o /tmp/script.sh "$PTERO_URL"; then
  bash /tmp/script.sh
else
  echo "❌ فشل تحميل السكربت أو التحقق من الدخول." >&2
  exit 1
fi

# تنظيف
rm -f "$NETRC_FILE" /tmp/script.sh