// api/bootstrap.js
export default function handler(req, res) {
  // استخدم النطاق العام الثابت
  const script = `#!/usr/bin/env bash
set -euo pipefail

echo "Requesting remote execution... (runs on server; secrets not exposed)"

# اتصل بالخادم الفعلي بدل localhost
curl -fsS https://ptero.melsony.site/api/execute || {
  echo "Failed to contact the execution server."
  exit 1
}
`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(script);
}