import "server-only";

export const config = {
  aiMode: process.env.OPENAI_API_KEY ? ("openai" as const) : ("sample" as const),
  // DATABASE_URL (local PostgreSQL) wins over Supabase; with neither, data stays in .data/kindra-db.json.
  dataMode: process.env.DATABASE_URL
    ? ("postgres" as const)
    : process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? ("supabase" as const)
      : ("local" as const),
  telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  // Approved case reports are copied to Google Drive as Google Docs (see lib/drive.ts).
  driveConfigured: Boolean(
    process.env.GOOGLE_DRIVE_FOLDER_ID &&
      (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE ||
        (process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REFRESH_TOKEN)),
  ),
  // Urgent alerts and escalations are emailed to staff through Gmail (see lib/gmail.ts). Needs the OAuth Google account.
  gmailConfigured: Boolean(
    process.env.GMAIL_ALERTS?.trim().toLowerCase() === "on" &&
      process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  ),
  // Action items are copied one-way to a Google Sheet per section (see lib/sheets.ts). Needs the OAuth Google account.
  sheetsConfigured: Boolean(
    process.env.SHEETS_TRACKER?.trim().toLowerCase() === "on" &&
      process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  ),
  draftModel: process.env.OPENAI_DRAFT_MODEL || "gpt-5.4-mini",
  transcribeModel: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe",
};
