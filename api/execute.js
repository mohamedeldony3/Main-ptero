// api/execute.js
import { spawn } from "child_process";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import os from "os";

export default async function handler(req, res) {
  // Basic auth + URL must be in Vercel environment variables (never in repo)
  const { PTERO_URL, PTERO_USER, PTERO_PASS } = process.env;

  if (!PTERO_URL || !PTERO_USER || !PTERO_PASS) {
    res.status(500).send("Server misconfigured: missing PTERO_* env vars");
    return;
  }

  try {
    // Fetch the protected script from PTERO_URL using Basic Auth
    const auth = "Basic " + Buffer.from(`${PTERO_USER}:${PTERO_PASS}`).toString("base64");
    const r = await fetch(PTERO_URL, { headers: { Authorization: auth } , timeout: 15000});
    if (!r.ok) {
      res.status(502).send(`Failed to fetch target script: ${r.status} ${r.statusText}`);
      return;
    }
    const scriptText = await r.text();

    // Create temp dir and script file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ptero-"));
    const scriptPath = path.join(tmpDir, "remote-script.sh");
    fs.writeFileSync(scriptPath, scriptText, { mode: 0o700 });

    // Stream headers (plain text so client prints nicely)
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");

    // Spawn bash to run the script
    const child = spawn("bash", [scriptPath], {
      cwd: tmpDir,
      env: { ...process.env }, // keep env for any needs (but secrets are server-only)
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Pipe child's stdout/stderr to response as they arrive
    child.stdout.pipe(res, { end: false });
    child.stderr.pipe(res, { end: false });

    // On exit, end response and cleanup
    child.on("close", (code, signal) => {
      res.write(`\n\n--- script exit code: ${code} signal: ${signal} ---\n`);
      res.end();
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
    });

    // Safety: kill child if request aborted (client disconnected)
    req.on("close", () => {
      if (!child.killed) child.kill("SIGTERM");
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
    });

  } catch (err) {
    console.error("execute error:", err);
    res.status(500).send("Internal server error");
  }
}