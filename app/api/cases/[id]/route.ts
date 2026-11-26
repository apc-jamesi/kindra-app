import { NextResponse } from "next/server";
import { z } from "zod";
import { errorMessage, fail, parseBody } from "@/lib/http";
import { accessibleStudent } from "@/lib/session";
import { getStore } from "@/lib/store";
import { CASE_STATUSES } from "@/lib/types";

const Body = z.object({
  status: z.enum(CASE_STATUSES).optional(),
  nextReview: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

/** Update case status or next review date. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await parseBody(req, Body);
  if (error) return error;
  const store = getStore();
  const record = await store.getCase(id);
  if (!record) return fail("Case not found.", 404);
  const { user, student } = await accessibleStudent(record.studentId);
  if (!student) return fail("You can only update your own advisees' cases.", 403);
  try {
    const patch = {
      ...(data.status ? { status: data.status, statusNote: data.status === "Closed" ? "Closed" : record.statusNote } : {}),
      ...(data.nextReview !== undefined ? { nextReview: data.nextReview } : {}),
    };
    await store.updateCase(id, patch);
    await store.addAudit({
      actor: user.name, action: "case updated", entityType: "case", entityId: id, studentId: student.id,
      detail: Object.entries(patch).map(([k, v]) => `${k}: ${v ?? "none"}`).join(", "),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(errorMessage(err), 500);
  }
}
