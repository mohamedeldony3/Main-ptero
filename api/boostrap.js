// api/bootstrap.js
export default function handler(req, res) {
  const script = `#!/usr/bin/env bash
# bootstrap: يطلب تنفيذ على backend ويعرض المخرجات فقط.
set -euo pipefail

echo "Requesting remote execution... (this runs on the server; secrets are not exposed)"
# اطلب التنفيذ؛ نحن نعرض مباشرة المخرجات للمستخدم
curl -fsS https://\${HOSTNAME:-ptero.melsony.site}/api/execute || {
  echo "Failed to contact the execution server."
  exit 1
}
`;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(script);
}