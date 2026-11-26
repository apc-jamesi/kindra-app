import "server-only";
import { OAuth2Client } from "google-auth-library";
import { config } from "./config";
import { emailsForUserId } from "./userDirectory";

/**
 * Emails staff about urgent alerts through Gmail, sent from the Google account that ran `npm run google:token`.
 * Turned on by GMAIL_ALERTS=on plus GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_OAUTH_REFRESH_TOKEN.
 * The refresh token must include the gmail.send permission (run `npm run google:token` again after turning this on).
 *
 * Recipients: GMAIL_ALERT_TO_<COUNSELOR|GUIDANCE_HEAD> if set (use test inboxes for demos), otherwise the
 * addresses listed for that Kindra user in KINDRA_USER_EMAILS.
 *
 * Like SMS, an email carries only the section, a reference and a link: never the student's name, the concern or the note.
 */

const OVERRIDE_VAR: Record<string, string> = { counselor: "GMAIL_ALERT_TO_COUNSELOR", "guidance-head": "GMAIL_ALERT_TO_GUIDANCE_HEAD" };

export function alertRecipients(userId: string): string[] {
  const override = process.env[OVERRIDE_VAR[userId] ?? ""]?.trim();
  const list = override ? override.split(",").map((s) => s.trim()).filter(Boolean) : emailsForUserId(userId);
  return list.filter((e) => /^[^\s@<>",]+@[^\s@<>",]+$/.test(e));
}

export const appUrl = () => (process.env.KINDRA_APP_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/+$/, "");

async function accessToken(): Promise<string> {
  const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID, process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Google did not return an access token.");
  return token;
}

const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
const encodeHeader = (s: string) => `=?UTF-8?B?${Buffer.from(oneLine(s), "utf8").toString("base64")}?=`;

/** Sends a plain-text email. Returns Gmail's message id. */
export async function sendEmail(to: string[], subject: string, body: string): Promise<string> {
  if (!config.gmailConfigured) throw new Error("Gmail is not configured.");
  if (to.length === 0) throw new Error("No email address for this recipient.");
  const mime = [
    `To: ${to.map(oneLine).join(", ")}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body, "utf8").toString("base64").replace(/.{76}/g, "$&\r\n"),
  ].join("\r\n");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: Buffer.from(mime, "utf8").toString("base64url") }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg: string = json?.error?.message ?? `Gmail returned ${res.status}`;
    throw new Error(/insufficient|scope/i.test(msg) ? `${msg} Run \`npm run google:token\` again to grant Gmail access.` : msg);
  }
  return json.id as string;
}
