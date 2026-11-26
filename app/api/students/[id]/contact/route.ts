import { NextResponse } from "next/server";
import { z } from "zod";
import { errorMessage, fail, parseBody } from "@/lib/http";
import { accessibleStudent } from "@/lib/session";
import { getStore } from "@/lib/store";

const Body = z.object({
  newPhone: z
    .string()
    .transform((s) => s.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(09|\+639)\d{9}$/, "Enter a PH mobile number such as 09171234567.")),
  verified: z.literal(true, { errorMap: () => ({ message: "Confirm that you verified the new number." }) }),
});

/** Separate, verified guardian phone update with an audit row (who and when). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await parseBody(req, Body);
  if (error) return error;
  const { user, student, exists } = await accessibleStudent(id);
  if (!exists) return fail("Student not found.", 404);
  if (!student) return fail("You can only update your own advisees' contacts.", 403);
  if (student.guardianPhone === data.newPhone) return fail("That is already the guardian's current number.", 400);
  try {
    const store = getStore();
    const change = await store.updateGuardianPhone(id, data.newPhone, user.name);
    await store.addAudit({
      actor: user.name, action: "contact verified and updated", entityType: "contact", entityId: change.id, studentId: id,
      detail: "Guardian phone updated after adviser verification",
    });
    return NextResponse.json({ changedAt: change.changedAt });
  } catch (err) {
    return fail(`Could not update the contact: ${errorMessage(err)}`, 500);
  }
}
