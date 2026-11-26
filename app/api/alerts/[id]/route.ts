import { NextResponse } from "next/server";
import { z } from "zod";
import { acknowledgeAlert, decideGuardianContact, isStaff, resolveAlert } from "@/lib/alerts";
import { errorMessage, fail, parseBody } from "@/lib/http";
import { accessibleStudent } from "@/lib/session";
import { getStore } from "@/lib/store";

const Body = z.object({
  action: z.enum(["acknowledge", "approve_family_contact", "withhold_family_contact", "resolve"]),
  reason: z.string().trim().max(200).default(""),
});

/** Counselor / guidance head actions on an alert. Advisers can raise alerts but not act on them here. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await parseBody(req, Body);
  if (error) return error;
  const store = getStore();
  const alert = await store.getAlert(id);
  if (!alert) return fail("Alert not found.", 404);
  const { user, student } = await accessibleStudent(alert.studentId);
  if (!student) return fail("You cannot open this student's record.", 403);
  if (!isStaff(user)) return fail("Only the guidance counselor or guidance head can do this.", 403);
  if (data.action === "withhold_family_contact" && !data.reason) return fail("Give a short reason for not contacting the family.", 400);
  try {
    const updated =
      data.action === "acknowledge" ? await acknowledgeAlert(store, alert, user)
      : data.action === "resolve" ? await resolveAlert(store, alert, user)
      : await decideGuardianContact(store, alert, student, user, data.action === "approve_family_contact" ? "approve" : "withhold", data.reason ?? "");
    return NextResponse.json({ alert: updated });
  } catch (err) {
    return fail(errorMessage(err), 409);
  }
}
