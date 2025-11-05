#!/usr/bin/env node
import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import https from "https";

// --- تحميل القيم من متغيرات البيئة ---
const SCRIPT_URL = process.env.URL;
const HOST = process.env.HOST;
const USER_RAW = process.env.USER;
const PASS_RAW = process.env.PASS;

if (!SCRIPT_URL || !HOST || !USER_RAW || !PASS_RAW) {
  console.error("❌ Environment variables missing (URL, HOST, USER, PASS)");
  process.exit(1);
}

const NETRC = path.join(os.homedir(), ".netrc");

// --- إعداد netrc ---
try {
  if (!fs.existsSync(NETRC)) fs.writeFileSync(NETRC, "");
  fs.chmodSync(NETRC, 0o600);

  const existing = fs
    .readFileSync(NETRC, "utf8")
    .split("\n")
    .filter((line) => !line.includes(`machine ${HOST}`))
    .join("\n");

  const entry = `machine ${HOST} login ${USER_RAW} password ${PASS_RAW}\n`;
  fs.writeFileSync(NETRC, existing + "\n" + entry);
} catch (err) {
  console.error("Error preparing .netrc:", err);
  process.exit(1);
}

// --- تحميل وتشغيل السكربت من الـ URL ---
const tmpFile = fs.mkdtempSync(path.join(os.tmpdir(), "dl-")) + ".sh";

const urlObj = new URL(SCRIPT_URL);

const options = {
  method: "GET",
  hostname: urlObj.hostname,
  path: urlObj.pathname,
  headers: {
    Authorization:
      "Basic " + Buffer.from(`${USER_RAW}:${PASS_RAW}`).toString("base64"),
  },
};

const file = fs.createWriteStream(tmpFile);
const req = https.request(options, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Authentication or download failed: ${res.statusCode}`);
    fs.unlinkSync(tmpFile);
    process.exit(1);
  }

  res.pipe(file);
  file.on("finish", () => {
    file.close();
    try {
      execSync(`bash "${tmpFile}"`, { stdio: "inherit" });
    } catch (err) {
      console.error("Execution failed:", err.message);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});

req.on("error", (err) => {
  console.error("Download error:", err.message);
  process.exit(1);
});

req.end();