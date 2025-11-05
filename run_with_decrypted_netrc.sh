#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# ---- تعديل القيم حسب حاجتك ----
ENCRYPTED_CREDS="./creds.netrc.gpg"   # مسار الملف المشفَّر داخل المشروع
URL="https://ptero2.melsony.site"     # الرابط اللي هتستخدم curl عليه
# ---------------------------------

# تأكد من المتطلبات الأساسية
command -v curl >/dev/null 2>&1 || { echo "curl مطلوب. إنهاء."; exit 1; }
command -v gpg >/dev/null 2>&1 || {
  echo "gpg غير موجود. حاول تثبيته أو استخدم بديل (انظر ملاحظات)." >&2
  exit 1
}

# تحقق من متغير البيئة
: "${GPG_PASSPHRASE:?Environment variable GPG_PASSPHRASE is required but not set}"

# إعداد ملفات مؤقّتة آمنة
umask 077
tmp_netrc="$(mktemp)"
script_file="$(mktemp)"

cleanup() {
  # محاولة المسح الآمن ثم الحذف
  if [ -f "$tmp_netrc" ]; then
    command -v shred >/dev/null 2>&1 && shred -u "$tmp_netrc" 2>/dev/null || rm -f "$tmp_netrc"
  fi
  if [ -f "$script_file" ]; then
    rm -f "$script_file"
  fi
}
trap cleanup EXIT

# فك التشفير إلى tmp_netrc بطريقة لا تترك الباسوورد في الـ argv
# نمرر passphrase عبر stdin مع passphrase-fd 0
if ! printf '%s' "$GPG_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 --output "$tmp_netrc" --decrypt "$ENCRYPTED_CREDS"; then
  echo "فشل فك التشفير — تأكد أن GPG_PASSPHRASE صحيح وملف creds موجود." >&2
  exit 1
fi

chmod 600 "$tmp_netrc"

# الآن استخدم curl مع الملف المؤقت (لا نغيّر ~/.netrc)
if curl -fsS --netrc-file "$tmp_netrc" -o "$script_file" "$URL"; then
  # مثال: تنفيذ السكربت الذي تم تنزيله
  bash "$script_file"
else
  echo "فشل في جلب الملف عبر curl (مصادقة/تنزيل)." >&2
  exit 1
fi

# cleanup سيتم استدعاؤه عن الخروج عبر trap
