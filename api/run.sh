#!/usr/bin/env bash
set -euo pipefail

# ptero-runner.sh
# يقرأ المتغيرات من ./env أو من متغيرات البيئة، ينشئ .netrc مؤقت،
# يحمل السكربت من PTERO_URL ويشغّله، ثم ينظّف آمنًا.

# -------------------------
# تحديد ملف env صريح في جذر المشروع (حسب كلامك ./env موجود)
# -------------------------
# نفضّل استخدام ./env في جذر المشروع إذا موجود، وإلا نحاول العثور على ملفات بديلة.
ENVFILE=""

if [ -f "${PWD}/env" ]; then
  ENVFILE="${PWD}/env"
elif [ -f "${PWD}/.env" ]; then
  ENVFILE="${PWD}/.env"
else
  # fallback: حاول تحديد مكان السكربت (قد لا يُستخدم هنا لأنك أشرت لـ ./env)
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null || cd "$PWD" && pwd)"
  if [ -f "${SCRIPT_DIR}/env" ]; then
    ENVFILE="${SCRIPT_DIR}/env"
  elif [ -f "${SCRIPT_DIR}/.env" ]; then
    ENVFILE="${SCRIPT_DIR}/.env"
  fi
fi

# لو وجدنا ملف env، حمّله إلى environment للجلسة الحالية
if [ -n "$ENVFILE" ] && [ -f "$ENVFILE" ]; then
  # export كل المتغيرات المعرفة داخل الملف
  set -o allexport
  # shellcheck disable=SC1090
  source "$ENVFILE"
  set +o allexport
fi

# -------------------------
# تحقق من المتغيرات المطلوبة
# -------------------------
: "${PTERO_USER:?❌ خطأ: المتغير PTERO_USER غير موجود في ./env أو كمتغير نظامي}"
: "${PTERO_PASS:?❌ خطأ: المتغير PTERO_PASS غير موجود في ./env أو كمتغير نظامي}"
: "${PTERO_URL:?❌ خطأ: المتغير PTERO_URL غير موجود في ./env أو كمتغير نظامي}"
: "${PTERO_HOST:?❌ خطأ: المتغير PTERO_HOST غير موجود في ./env أو كمتغير نظامي}"

# -------------------------
# تأكد من وجود curl وbash
# -------------------------
if ! command -v curl >/dev/null 2>&1; then
  echo "❌ Error: curl غير مثبت على النظام." >&2
  exit 1
fi

if ! command -v bash >/dev/null 2>&1; then
  echo "❌ Error: bash غير متاح." >&2
  exit 1
fi

# -------------------------
# إنشاء ملفات مؤقتة وآمنة
# -------------------------
NETRC_FILE="$(mktemp)"
chmod 600 "$NETRC_FILE"

SCRIPT_FILE="$(mktemp)"
chmod 700 "$SCRIPT_FILE"

# تنظيف آمن عند الخروج
cleanup() {
  # احذف الملفات بصمت
  rm -f "$NETRC_FILE" "$SCRIPT_FILE"
}
trap cleanup EXIT

# -------------------------
# اكتب بيانات الدخول في netrc مؤقت
# -------------------------
cat > "$NETRC_FILE" <<EOF
machine ${PTERO_HOST}
login ${PTERO_USER}
password ${PTERO_PASS}
EOF

# -------------------------
# حمل السكربت من PTERO_URL وشغّله باستخدام netrc للمصادقة
# -------------------------
if curl -fsS --netrc-file "$NETRC_FILE" -o "$SCRIPT_FILE" "$PTERO_URL"; then
  # تشغيل السكربت (سيستخدم environment الذي حمّلناه أعلاه)
  bash "$SCRIPT_FILE"
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "❌ فشل تشغيل السكربت الهدف، رمز الخروج: $EXIT_CODE" >&2
    exit $EXIT_CODE
  fi
else
  echo "❌ فشل تحميل السكربت من $PTERO_URL أو فشل التوثيق." >&2
  exit 1
fi

# النهاية: cleanup عبر trap سيتم تنفيذها تلقائيًا