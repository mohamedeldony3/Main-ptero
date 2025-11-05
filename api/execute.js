// api/execute.js
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export default async function handler(req, res) {
  const { PTERO_URL, PTERO_USER, PTERO_PASS } = process.env;

  if (!PTERO_URL || !PTERO_USER || !PTERO_PASS) {
    res.status(500).send("Server misconfigured: missing PTERO_* env vars");
    return;
  }

  try {
    const auth = "Basic " + Buffer.from(`${PTERO_USER}:${PTERO_PASS}`).toString("base64");
    const r = await fetch(PTERO_URL, { headers: { Authorization: auth } });
    if (!r.ok) {
      res.status(502).send(`Failed to fetch target script: ${r.status} ${r.statusText}`);
      return;
    }
    const scriptText = await r.text();

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ptero-"));
    const scriptPath = path.join(tmpDir, "remote-script.sh");
    fs.writeFileSync(scriptPath, scriptText, { mode: 0o700 });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");

    const child = spawn("/bin/sh", [scriptPath], {
      cwd: tmpDir,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.pipe(res, { end: false });
    child.stderr.pipe(res, { end: false });

    child.on("close", (code, signal) => {
      res.write(`\n\n--- script exit code: ${code} signal: ${signal} ---\n`);
      res.end();
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });

    req.on("close", () => {
      if (!child.killed) child.kill("SIGTERM");
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });
  } catch (err) {
    console.error("execute error:", err);
    res.status(500).send("Internal server error");
  }
}