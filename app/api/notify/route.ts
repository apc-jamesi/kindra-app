import { NextResponse } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { fail, parseBody } from "@/lib/http";
import { accessibleStudent } from "@/lib/session";
import { getStore } from "@/lib/store";

/** Generic text only: no student names, case details, transcripts or contact info ever go to Telegram. */
const MESSAGE = "A new advisory report was saved. Open the advisory app to review it.";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, z.object({ caseId: z.string().min(1) }));
  if (error) return error;
  const store = getStore();

  // Only notify for a report that was actually saved, by its own adviser.
  const record = await store.getCase(data.caseId);
  if (!record || !record.documentedAt) return fail("Report not found, so no notification was sent.", 404);
  const { user, student } = await accessibleStudent(record.studentId);
  if (!student) return fail("You can only notify for your own advisees' reports.", 403);
  if (!config.telegramConfigured) {
    return fail("Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local.", 503);
  }

  const log = (detail: string) =>
    store.addAudit({ actor: user.name, action: "notification", entityType: "notification", entityId: record.id, studentId: student.id, detail });
  try {
    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: MESSAGE }),
      signal: AbortSignal.timeout(10000),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!res.ok || !body.ok) {
      await log(`Telegram delivery failed: ${body.description ?? res.statusText}`);
      return fail(`Telegram delivery failed: ${body.description ?? res.statusText}. The report is still saved.`, 502);
    }
    await log("Generic Telegram notification sent");
    return NextResponse.json({ sent: true });
  } catch {
    await log("Telegram unreachable");
    return fail("Could not reach Telegram. The report is still saved in the case history.", 502);
  }
}
