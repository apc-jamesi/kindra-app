import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runEscalations } from "@/lib/alerts";
import { signedInUser } from "@/lib/session";
import { getStore } from "@/lib/store";

function hasCronSecret(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return Boolean(secret) && given.length === secret!.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret!));
}

/**
 * Escalates crisis/urgent alerts not acknowledged within ESCALATE_MINUTES. The alert pages also run this on load.
 * For unattended use, call it every minute from a scheduler with the header `Authorization: Bearer <CRON_SECRET>`.
 */
export async function POST(req: Request) {
  if (!hasCronSecret(req) && !(await signedInUser())) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  return NextResponse.json({ escalated: await runEscalations(getStore()) });
}
