import { NextResponse } from "next/server";
import { z } from "zod";
import { errorMessage, fail, parseBody } from "@/lib/http";
import { accessibleStudent } from "@/lib/session";
import { getStore } from "@/lib/store";
import { ITEM_STATUSES } from "@/lib/types";

/** Track an action item's status (Open, In progress, Done, Blocked). Logged in the audit trail. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await parseBody(req, z.object({ status: z.enum(ITEM_STATUSES) }));
  if (error) return error;
  const store = getStore();
  const item = (await store.listActionItems()).find((a) => a.id === id);
  if (!item) return fail("Action item not found.", 404);
  const { user, student } = await accessibleStudent(item.studentId);
  if (!student) return fail("You can only update your own advisees' action items.", 403);
  if (item.status === data.status) return NextResponse.json({ ok: true });
  try {
    await store.updateActionItem(id, { status: data.status, updatedAt: new Date().toISOString(), updatedBy: user.name });
    await store.addAudit({
      actor: user.name, action: "status changed", entityType: "action_item", entityId: id, studentId: student.id,
      detail: `${item.status} → ${data.status} (case ${item.caseId})`,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(errorMessage(err), 500);
  }
}
