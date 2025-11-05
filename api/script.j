// api/script.js — returns a shell wrapper (text/plain)
export default function handler(req, res) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  const script = `#!/usr/bin/env bash
set -euo pipefail
# wrapper script — no secrets here
PATH_ARG="${1:-/}"
# fetch from server-side endpoint (server has the secrets)
curl -fsS "https://\${HOST:-$(hostname)}$(/api/exec?path=$(python3 -c "import sys, urllib.parse as u; print(u.quote(sys.argv[1]))" "$PATH_ARG"))"
`;
  // Simpler: use same origin (will be rewritten so path / maps to this)
  // Return a minimal wrapper that calls /api/exec
  const simple = `#!/usr/bin/env bash
set -euo pipefail
path="\${1:-/}"
curl -fsS "https://${process.env.VERCEL_URL || 'ptero.jishnu.fun'}/api/exec?path=\$(python3 - <<'PY'
import sys, urllib.parse as u
arg = sys.argv[1] if len(sys.argv)>1 else '/'
print(u.quote(arg))
PY
"\${path}")"
`;
  // send the simple version:
  res.send(simple);
}
