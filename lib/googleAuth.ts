import "server-only";
import { OAuth2Client } from "google-auth-library";

/**
 * Access token for the Google account that ran `npm run google:token` (GOOGLE_OAUTH_CLIENT_ID,
 * GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN). Used by Gmail alerts and the Sheets tracker.
 */
export const googleOAuthConfigured = () =>
  Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REFRESH_TOKEN);

export async function googleOAuthToken(): Promise<string> {
  const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID, process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Google did not return an access token.");
  return token;
}
