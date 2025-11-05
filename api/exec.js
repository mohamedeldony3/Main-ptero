// api/exec.js (Vercel serverless function)
import { Buffer } from "buffer";

export default async function handler(req, res) {
  const REMOTE_URL = process.env.REMOTE_URL; // ضع هذا في Vercel env
  const USER_B64 = process.env.USER_B64 || "";
  const PASS_B64 = process.env.PASS_B64 || "";

  if (!REMOTE_URL) return res.status(500).send("Server misconfigured");

  const path = req.query.path || "/"; // client يمرّر path إذا احتاج
  let upstreamUrl;
  try { upstreamUrl = new URL(path, REMOTE_URL).toString(); }
  catch(e){ return res.status(400).send("Bad path"); }

  const headers = {};
  if (USER_B64 && PASS_B64) {
    try {
      const user = Buffer.from(USER_B64, "base64").toString("utf8");
      const pass = Buffer.from(PASS_B64, "base64").toString("utf8");
      headers["authorization"] = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
    } catch(e){}
  }

  try {
    const upstreamResp = await fetch(upstreamUrl, { headers });
    const arr = await upstreamResp.arrayBuffer();
    // لا تنشر رؤوس تكشف الـ upstream
    res.status(upstreamResp.status);
    upstreamResp.headers.forEach((v,k) => {
      const lk = k.toLowerCase();
      if (!["transfer-encoding","connection","server","content-encoding"].includes(lk) && !lk.startsWith("x-upstream")) {
        res.setHeader(k, v);
      }
    });
    res.send(Buffer.from(arr));
  } catch (err) {
    console.error("upstream error", err);
    res.status(502).send("Upstream fetch failed");
  }
}
