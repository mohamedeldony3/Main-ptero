// api/run.js
import fetch from 'node-fetch'; // Vercel يدعم fetch لكن نستخدم node-fetch للوضوح
export default async function handler(req, res) {
  try {
    const { URL, HOST, USER_B64, PASS_B64 } = process.env;
    if (!URL || !HOST || !USER_B64 || !PASS_B64) {
      return res.status(400).json({ error: 'Missing required env vars' });
    }

    const decode = (s) => Buffer.from(s, 'base64').toString('utf8');
    const user = decode(USER_B64);
    const pass = decode(PASS_B64);

    // مثال: جلب المحتوى من URL مع Basic Auth header
    const auth = Buffer.from(`${user}:${pass}`).toString('base64');
    const response = await fetch(URL, {
      headers: { Authorization: `Basic ${auth}` },
      // يمكن إضافة timeout logic هنا حسب الحاجة
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: 'Fetch failed', status: response.status, body: text });
    }

    const body = await response.text();

    // لا ننفّذ الـ body كـ bash — فقط نعرضه أو نعيده
    return res.status(200).send(body);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}