import { NextResponse } from "next/server";
import { z } from "zod";
import { raiseAlert } from "@/lib/alerts";
import { errorMessage, fail, parseBody } from "@/lib/http";
import { accessibleStudent } from "@/lib/session";
import { getStore } from "@/lib/store";
import { URGENT_CONCERNS } from "@/lib/types";

const Body = z.object({
  studentId: z.string().min(1),
  concern: z.enum(URGENT_CONCERNS),
  note: z.string().trim().max(500, "Keep the note under 500 characters.").default(""),
  caseId: z.string().min(1).nullable().default(null),
});

/** Raise an urgent alert for one of your own advisees. Alerts the counselor; family contact follows the concern's policy. */
export async function POST(req: Request) {
  const { data, error } = await parseBody(req, Body);
  if (error) return error;
  const { user, student, exists } = await accessibleStudent(data.studentId);
  if (!exists) return fail("Student not found.", 404);
  if (!student) return fail("You can only raise alerts for your own advisees.", 403);
  const store = getStore();
  if (data.caseId) {
    const c = await store.getCase(data.caseId);
    if (!c || c.studentId !== student.id) return fail("That case does not belong to this student.", 400);
  }
  try {
    const { alert, messages, emailed } = await raiseAlert(store, { user, student, concern: data.concern, note: data.note ?? "", caseId: data.caseId ?? null });
    return NextResponse.json({ alert, messages: messages.length, emailed }, { status: 201 });
  } catch (err) {
    return fail(errorMessage(err), 500);
  }
}
