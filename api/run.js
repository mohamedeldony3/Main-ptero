// api/run.js
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";

const safeSlice = (str, n = 200) => {
  if (!str) return "";
  return str.length <= n ? str : str.slice(0, n) + "…(truncated)";
};

export default async function handler(req, res) {
  // Only allow POST (optional) — change if you want GET
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }

  // Read env vars (must be set in Vercel)
  const {
    PTERO_URL: url,
    PTERO_HOST: host,
    PTERO_USER: user,
    PTERO_PASS: pass
  } = process.env;

  if (!url || !host || !user || !pass) {
    return res.status(500).json({
      error: "Missing environment variables. Set PTERO_URL, PTERO_HOST, PTERO_USER, PTERO_PASS in Vercel."
    });
  }

  // Create temp file paths
  const rnd = crypto.randomBytes(12).toString("hex");
  const netrcPath = path.join(os.tmpdir(), `netrc-${rnd}`);
  const scriptPath = path.join(os.tmpdir(), `script-${rnd}.sh`);

  const cleanup = async () => {
    try { await fs.unlink(netrcPath); } catch (_) {}
    try { await fs.unlink(scriptPath); } catch (_) {}
  };

  try {
    // Write .netrc content with strict permissions
    const netrc = `machine ${host}
login ${user}
password ${pass}
`;
    await fs.writeFile(netrcPath, netrc, { mode: 0o600 });

    // Run curl --netrc-file to fetch the remote script
    const curlArgs = ["-fsS", "--netrc-file", netrcPath, "-o", scriptPath, url];

    const curl = spawn("curl", curlArgs);

    let curlErr = "";
    for await (const chunk of curl.stderr) curlErr += chunk.toString();
    await new Promise((resolve, reject) => {
      curl.on("close", (code) => code === 0 ? resolve() : reject(new Error(`curl exit ${code}: ${safeSlice(curlErr, 800)}`)));
      curl.on("error", reject);
    });

    // Ensure script is readable/executable
    await fs.chmod(scriptPath, 0o700);

    // Execute the downloaded script with bash in a child process
    const bash = spawn("bash", [scriptPath], { env: process.env });

    let stdout = "", stderr = "";
    for await (const chunk of bash.stdout) stdout += chunk.toString();
    for await (const chunk of bash.stderr) stderr += chunk.toString();

    const exitCode = await new Promise((resolve) => {
      bash.on("close", (code) => resolve(code));
      bash.on("error", () => resolve(1));
    });

    // Clean up temp files (ensure we remove secret-bearing file)
    await cleanup();

    // Return sanitized output (do NOT return secrets)
    return res.status(200).json({
      ok: exitCode === 0,
      exitCode,
      stdout: safeSlice(stdout, 2000),
      stderr: safeSlice(stderr, 2000)
    });
  } catch (err) {
    await cleanup();
    // Don't leak secrets or full stack
    return res.status(500).json({
      error: "Execution failed",
      detail: String(err).length > 1000 ? String(err).slice(0, 1000) + "…(truncated)" : String(err)
    });
  }
}