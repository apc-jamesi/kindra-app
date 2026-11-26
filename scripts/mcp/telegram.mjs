// Telegram Bot MCP server for Kindra's alert bot (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID in .env).
// Talks to the Bot API directly; the token never leaves this process except to api.telegram.org.
import { loadProjectEnv, serve, text } from "./lib.mjs";

loadProjectEnv();
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  process.stderr.write("[kindra-telegram] TELEGRAM_BOT_TOKEN is not set in .env / .env.local\n");
  process.exit(1);
}

async function call(method, body = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description ?? res.status}`);
  return data.result;
}

serve({
  name: "kindra-telegram",
  version: "1.0.0",
  tools: [
    {
      name: "get_bot_info",
      description: "Check the bot token and return the bot's identity (getMe), plus the configured default chat id.",
      inputSchema: { type: "object", properties: {} },
      handler: async () => text({ bot: await call("getMe"), defaultChatId: process.env.TELEGRAM_CHAT_ID || null }),
    },
    {
      name: "send_message",
      description: "Send a text message from the Kindra bot. Defaults to TELEGRAM_CHAT_ID from .env.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Message text (max 4096 chars)" },
          chat_id: { type: "string", description: "Target chat id (default: TELEGRAM_CHAT_ID)" },
          parse_mode: { type: "string", enum: ["HTML", "MarkdownV2"], description: "Optional formatting mode" },
        },
        required: ["text"],
      },
      handler: async ({ text: msg, chat_id, parse_mode }) => {
        const target = chat_id || process.env.TELEGRAM_CHAT_ID;
        if (!target) throw new Error("No chat_id given and TELEGRAM_CHAT_ID is not set");
        const sent = await call("sendMessage", { chat_id: target, text: msg, ...(parse_mode && { parse_mode }) });
        return text({ message_id: sent.message_id, chat: sent.chat, date: sent.date });
      },
    },
    {
      name: "get_updates",
      description:
        "Read recent messages sent to the bot (getUpdates). Useful for finding a chat id. Does not mark them as read.",
      inputSchema: {
        type: "object",
        properties: { limit: { type: "number", description: "Max updates (1-100, default 20)" } },
      },
      handler: async ({ limit = 20 }) =>
        text(await call("getUpdates", { limit: Math.min(Math.max(1, limit), 100), timeout: 0 })),
    },
  ],
});
