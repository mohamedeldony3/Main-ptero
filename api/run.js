// api/run.js
export default async function handler(req, res) {
  const { PTERO_URL, PTERO_USER, PTERO_PASS, TOKEN } = process.env;

  // حماية: لازم المستخدم يمرّر توكن صحيح علشان ينفّذ
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${TOKEN}`) {
    res.status(403).send("Forbidden: invalid token");
    return;
  }

  if (!PTERO_URL || !PTERO_USER || !PTERO_PASS) {
    res.status(500).send("Server misconfigured: missing env vars");
    return;
  }

  try {
    const creds = Buffer.from(`${PTERO_USER}:${PTERO_PASS}`).toString("base64");
    const response = await fetch(PTERO_URL, {
      headers: { Authorization: `Basic ${creds}` },
    });

    if (!response.ok) {
      res.status(502).send("Failed to fetch target script");
      return;
    }

    const script = await response.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send(script);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
}