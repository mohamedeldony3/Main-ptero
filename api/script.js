// api/script.js
export default function handler(req, res) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  // سكربت الباش كله جوا backticks ``
  const script = `#!/usr/bin/env bash
set -euo pipefail
# wrapper script (no secrets)
path="\${PATH_ARG:-\${1:-/}}"

# URL-encode path using python3 (pass via stdin)
if command -v python3 >/dev/null 2>&1; then
  encoded=\$(printf '%s' "\$path" | python3 -c "import sys,urllib.parse as u; s=sys.stdin.read().strip() or '/'; print(u.quote(s))")
else
  encoded=\$(printf '%s' "\$path" | sed -e 's/ /%20/g')
fi

curl -fsS "https://main-ptero-2c6l2z6ge-mohamedeldony3s-projects.vercel.app/api/exec?path=\${encoded}"
`;

  // رجّع النص للمستخدم
  res.send(script);
}