import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { saveHtmlAsGoogleDoc } from "@/lib/drive";
import { errorMessage, fail } from "@/lib/http";
import { reportFileName, reportHtml } from "@/lib/reportDoc";
import { accessibleStudent } from "@/lib/session";
import { getStore } from "@/lib/store";

/**
 * "Save to Google Drive": saves an approved case as a Google Doc (the formal case report with its action plan, as it
 * stands now) in GOOGLE_DRIVE_FOLDER_ID. Approval already does this once; this makes a fresh copy on demand, e.g. for
 * cases approved before Drive was set up or after the action plan changed. Each save is a new Doc.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const record = await store.getCase(id);
  if (!record || !record.report) return fail("Only an approved case report can be saved to Google Drive.", 404);
  const { user, student } = await accessibleStudent(record.studentId);
  if (!student) return fail("You can only save your own advisees' case reports.", 403);
  if (!config.driveConfigured) return fail("Google Drive is not configured. Set GOOGLE_DRIVE_FOLDER_ID in .env.", 503);

  const items = await store.listActionItems({ caseId: id });
  try {
    const { url } = await saveHtmlAsGoogleDoc(reportFileName(record, student), reportHtml(record, student, items));
    await store.addAudit({ actor: user.name, action: "saved to Google Drive", entityType: "case", entityId: id, studentId: student.id, detail: url });
    return NextResponse.json({ url });
  } catch (err) {
    await store
      .addAudit({ actor: user.name, action: "Google Drive save failed", entityType: "case", entityId: id, studentId: student.id, detail: errorMessage(err) })
      .catch(() => {});
    return fail(`Could not save to Google Drive: ${errorMessage(err)}`, 502);
  }
}
