#!/usr/bin/env node
// run.js — modes: exec (default), --print (curl-like), --curl-bin (use system curl)
// Node 18+ (global fetch). Tested for Node v25.

import fs from "fs";
import os from "os";
import path from "path";
import { execSync, spawn } from "child_process";
import { pipeline } from "stream";
import { promisify } from "util";
const pipe = promisify(pipeline);

(async () => {
  try {
    const urlStr = process.env.URL;
    const HOST = process.env.HOST;
    const USER = process.env.USER;
    const PASS = process.env.PASS;

    if (!urlStr || !HOST || !USER || !PASS) {
      console.error("Missing env variables. Required: URL, HOST, USER, PASS");
      process.exit(1);
    }

    // Decide mode
    const argPrint = process.argv.includes("--print");
    const argCurlBin = process.argv.includes("--curl-bin");
    const envMode = (process.env.MODE || "").toLowerCase();

    const printOnly = argPrint || envMode === "curl" || process.env.PRINT_ONLY === "1";
    const useCurlBin = argCurlBin || envMode === "curl-bin";

    // Prepare ~/.netrc (used by curl or for info)
    const NETRC = path.join(os.homedir(), ".netrc");
    try {
      if (!fs.existsSync(NETRC)) fs.writeFileSync(NETRC, "");
      fs.chmodSync(NETRC, 0o600);
      const lines = fs.readFileSync(NETRC, "utf8").split(/\r?\n/);
      const filtered = lines.filter((ln) => !ln.trim().startsWith(`machine ${HOST}`));
      const entry = `machine ${HOST} login ${USER} password ${PASS}`;
      const newContent = filtered.concat(["", entry]).join("\n").trim() + "\n";
      fs.writeFileSync(NETRC, newContent, { mode: 0o600 });
    } catch (err) {
      console.error("Error preparing ~/.netrc:", err);
      process.exit(1);
    }

    // If user asked to use system curl binary
    if (useCurlBin) {
      // spawn curl --netrc-file <file> -sS <url>
      const args = ["--netrc-file", NETRC, "-sS", urlStr];
      const c = spawn("curl", args, { stdio: ["ignore", "pipe", "inherit"] });

      // pipe curl stdout to process.stdout
      await pipe(c.stdout, process.stdout);
      const code = await new Promise((res) => c.on("close", res));
      process.exit(code ?? 0);
    }

    // Otherwise use fetch
    const urlObj = new URL(urlStr);
    const auth = "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64");

    const res = await fetch(urlObj.href, {
      method: "GET",
      headers: {
        Authorization: auth,
      },
    });

    if (!res.ok) {
      console.error(`Download failed: ${res.status} ${res.statusText}`);
      process.exit(1);
    }

    if (printOnly) {
      // stream response body to stdout (curl-like)
      if (!res.body) {
        console.error("No response body to stream.");
        process.exit(1);
      }
      await pipe(res.body, process.stdout);
      // keep exit code 0
      process.exit(0);
    }

    // Default: download to tmp file and execute
    const tmpFile = path.join(os.tmpdir(), `dl-${Date.now()}.sh`);
    const dest = fs.createWriteStream(tmpFile, { mode: 0o700 });
    if (!res.body) {
      console.error("No response body to stream.");
      process.exit(1);
    }
    await pipe(res.body, dest);

    try {
      console.log("Running downloaded script:", tmpFile);
      execSync(`bash "${tmpFile}"`, { stdio: "inherit" });
    } catch (err) {
      console.error("Execution failed:", err?.message ?? err);
      process.exit(1);
    } finally {
      try { fs.unlinkSync(tmpFile); } catch (e) { /* ignore */ }
    }
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
})();