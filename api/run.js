import { execSync } from "child_process";

export default async function handler(req, res) {
  try {
    const { URL, HOST, USER_B64, PASS_B64 } = process.env;
    if (!URL || !HOST || !USER_B64 || !PASS_B64) {
      res.status(500).send("Missing required env vars");
      return;
    }

    const user = Buffer.from(USER_B64, "base64").toString("utf8");
    const pass = Buffer.from(PASS_B64, "base64").toString("utf8");

    const netrc = `/tmp/.netrc`;
    execSync(`printf "machine ${HOST}\\nlogin ${user}\\npassword ${pass}\\n" > ${netrc} && chmod 600 ${netrc}`);

    const script = execSync(`curl -fsS --netrc-file ${netrc} ${URL}`, { encoding: "utf8" });
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send(script);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal error");
  }
}