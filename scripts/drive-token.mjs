// One-time helper: signs in to Google in your browser and saves GOOGLE_OAUTH_REFRESH_TOKEN into .env.
//   npm run google:token   (same as npm run drive:token)
// Asks for Drive (save approved reports as Google Docs) and Gmail send (email urgent alerts to staff).
// Needs GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env (OAuth client of type "Desktop app").
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { exec } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OAuth2Client } from "google-auth-library";

const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env");
const envText = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const read = (k) => process.env[k] || envText.match(new RegExp(`^\\s*${k}\\s*=\\s*(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");

const clientId = read("GOOGLE_OAUTH_CLIENT_ID");
const clientSecret = read("GOOGLE_OAUTH_CLIENT_SECRET");
if (!clientId || !clientSecret) {
  console.error("Add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to .env first.");
  process.exit(1);
}

const server = createServer();
server.listen(0, "127.0.0.1", () => {
  const redirectUri = `http://127.0.0.1:${server.address().port}`;
  const client = new OAuth2Client(clientId, clientSecret, redirectUri);
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/gmail.send"],
  });

  server.on("request", async (req, res) => {
    const code = new URL(req.url, redirectUri).searchParams.get("code");
    if (!code) return res.end("Waiting for Google sign-in...");
    try {
      const { tokens } = await client.getToken(code);
      if (!tokens.refresh_token) throw new Error("Google did not return a refresh token. Remove Kindra's access at myaccount.google.com/permissions and try again.");
      const line = `GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`;
      // [ \t] not \s: \s also matches the line break before the key, which would join it to the previous line.
      const existing = /^[ \t]*GOOGLE_OAUTH_REFRESH_TOKEN[ \t]*=[^\r\n]*/m;
      const updated = existing.test(envText)
        ? envText.replace(existing, line)
        : `${envText.replace(/\s*$/, "")}\n${line}\n`;
      writeFileSync(envPath, updated);
      res.end("Done. Kindra can now save reports to Google Drive and email urgent alerts through Gmail. You can close this tab.");
      console.log("Saved GOOGLE_OAUTH_REFRESH_TOKEN to .env. Restart `npm run dev` to use it.");
    } catch (err) {
      res.end(`Failed: ${err.message}`);
      console.error(err.message);
      process.exitCode = 1;
    }
    server.close();
  });

  console.log("Opening Google sign-in in your browser. If it doesn't open, visit:\n" + url);
  exec(`start "" "${url}"`);
});
