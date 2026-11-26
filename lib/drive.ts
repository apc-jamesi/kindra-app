import "server-only";
import { readFileSync } from "fs";
import { GoogleAuth, OAuth2Client } from "google-auth-library";

/**
 * Saves files to one Google Drive folder (GOOGLE_DRIVE_FOLDER_ID). Two ways to authenticate, checked in order:
 *  1. Service account: GOOGLE_SERVICE_ACCOUNT_KEY_FILE = path to its JSON key. The folder must be in a
 *     Shared Drive (service accounts have no storage of their own) with the service account added as Content manager.
 *  2. A Google account: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_OAUTH_REFRESH_TOKEN
 *     (get the token with `npm run drive:token`). Works with an ordinary My Drive folder.
 */
const SCOPES = ["https://www.googleapis.com/auth/drive"];

export function driveMode(): "service-account" | "oauth" | null {
  if (!process.env.GOOGLE_DRIVE_FOLDER_ID) return null;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) return "service-account";
  const { GOOGLE_OAUTH_CLIENT_ID: id, GOOGLE_OAUTH_CLIENT_SECRET: secret, GOOGLE_OAUTH_REFRESH_TOKEN: token } = process.env;
  return id && secret && token ? "oauth" : null;
}

async function accessToken(): Promise<string> {
  const mode = driveMode();
  let token: string | null | undefined;
  if (mode === "service-account") {
    const credentials = JSON.parse(readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE!, "utf8"));
    token = (await new GoogleAuth({ credentials, scopes: SCOPES }).getAccessToken()) as string | null;
  } else if (mode === "oauth") {
    const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID, process.env.GOOGLE_OAUTH_CLIENT_SECRET);
    client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
    token = (await client.getAccessToken()).token;
  } else {
    throw new Error("Google Drive is not configured.");
  }
  if (!token) throw new Error("Google did not return an access token.");
  return token;
}

/** Uploads HTML and lets Drive convert it to a Google Doc in the configured folder. Returns the doc's link. */
export async function saveHtmlAsGoogleDoc(name: string, html: string): Promise<{ id: string; url: string }> {
  const boundary = `kindra${Date.now().toString(36)}`;
  const metadata = { name, mimeType: "application/vnd.google-apps.document", parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}\r\n--${boundary}--`;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
      signal: AbortSignal.timeout(20_000),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? `Google Drive returned ${res.status}`);
  return { id: json.id, url: json.webViewLink ?? `https://docs.google.com/document/d/${json.id}/edit` };
}
