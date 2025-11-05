export default function handler(req, res) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  const domain = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://main-ptero.vercel.app";

  // نكتب السكربت هنا كـ string عادي من غير تعشيش ${} جوّه نفس النص
  const scriptLines = [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    '# wrapper script (no secrets)',
    'path="${1:-/}"',
    '',
    '# URL-encode path',
    'if command -v python3 >/dev/null 2>&1; then',
    "  encoded=$(python3 - <<'PY'",
    "import sys, urllib.parse as u",
    "arg = sys.argv[1] if len(sys.argv)>1 else '/'",
    "print(u.quote(arg))",
    "PY",
    '  "$path")',
    "else",
    '  encoded="$path"',
    "fi",
    "",
    `curl -fsS "${domain}/api/exec?path=$encoded"`,
    ""
  ];

  const script = scriptLines.join("\n");
  res.send(script);
}