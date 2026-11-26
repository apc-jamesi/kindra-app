import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { config } from "@/lib/config";
import { saveHtmlAsGoogleDoc } from "@/lib/drive";
import { errorMessage, fail, parseBody } from "@/lib/http";
import { maskPhones } from "@/lib/redact";
import { reportFileName, reportHtml } from "@/lib/reportDoc";
import { accessibleStudent } from "@/lib/session";
import { syncSectionInBackground } from "@/lib/sheets";
import { getStore } from "@/lib/store";
import { CATEGORIES, ITEM_STATUSES, SPEAKERS, type ActionItem, type CaseRecord, type Sourced } from "@/lib/types";

const Src = z.array(z.number().int().min(0)).max(50);
const SourcedSchema = z.object({ text: z.string().max(4000), src: Src });

const Body = z.object({
  studentId: z.string().min(1, "Confirm which student this report is for."),
  pendingCaseId: z.string().optional(),
  caseType: z.string().trim().min(1, "Enter the case type.").max(200),
  conferenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the conference date."),
  conferenceTime: z.string().regex(/^\d{2}:\d{2}$/, "Enter the conference time."),
  sourceType: z.enum(["written", "audio", "manual"]),
  preparedBy: z.string().trim().min(1, "Enter who prepared the report.").max(120),
  reviewedBy: z.string().trim().min(1, "Enter the approving adviser.").max(120),
  participants: z.string().max(300),
  concerns: z.array(z.enum(CATEGORIES)),
  presentingConcern: z.object({ text: z.string().trim().min(1, "Add the presenting concern.").max(4000), src: Src }),
  relevantInfo: z.array(z.object({ label: z.string().max(120), text: z.string().max(4000), src: Src })).max(20),
  guidanceImpression: SourcedSchema,
  strengths: SourcedSchema,
  limitations: SourcedSchema,
  monitoring: SourcedSchema,
  escalation: SourcedSchema.nullable(),
  recommendation: SourcedSchema,
  statusNote: z.string().max(200),
  nextReview: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  speakers: z.array(z.object({ p: z.number().int(), speaker: z.enum(SPEAKERS), inferred: z.boolean() })).max(400),
  studentMentions: z.array(z.object({ studentId: z.string(), name: z.string(), phrase: z.string().max(200) })).max(10),
  checks: z.array(z.string()).max(30),
  checksConfirmed: z.array(z.string()).max(30),
  sourceParagraphs: z.array(z.string().max(4000)).max(400),
  actionItems: z
    .array(
      z.object({
        action: z.string().trim().min(1, "Every action item needs a description.").max(500),
        owner: z.string().trim().min(1, "Every action item needs a named owner.").max(100),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
        dueText: z.string().max(100),
        status: z.enum(ITEM_STATUSES),
        src: Src,
      }),
    )
    .max(30),
});

/** Approves a reviewed report into exactly one adviser-confirmed student's case history. */
export async function POST(req: Request) {
  const { data, error } = await parseBody(req, Body);
  if (error) return error;

  const { user, student, exists } = await accessibleStudent(data.studentId);
  if (!exists) return fail("That student is not on the roster.", 400);
  if (!student) return fail("You can only save reports for your own advisees.", 403);
  const unconfirmed = data.checks.filter((c) => !data.checksConfirmed.includes(c));
  if (unconfirmed.length) return fail("Confirm every item to check before approving.", 400);

  const store = getStore();
  let id = `C-${randomUUID().slice(0, 6).toUpperCase()}`;
  let conferenceAt = new Date(`${data.conferenceDate}T${data.conferenceTime}:00+08:00`).toISOString();
  if (data.pendingCaseId) {
    const pending = await store.getCase(data.pendingCaseId);
    if (!pending || pending.studentId !== student.id || pending.documentedAt) {
      return fail("That pending case does not belong to this student or is already documented.", 400);
    }
    id = pending.id;
    // Keep the originally logged conference time so the 24-hour metric can't be reset by editing the date.
    conferenceAt = pending.conferenceAt;
  }
  if (new Date(conferenceAt).getTime() > Date.now() + 5 * 60_000) {
    return fail("The conference date and time can't be in the future.", 400);
  }

  const m = (s: Sourced): Sourced => ({ text: maskPhones(s.text.trim()), src: s.src });
  const now = new Date().toISOString();
  const record: CaseRecord = {
    id,
    studentId: student.id,
    caseType: data.caseType,
    conferenceAt,
    documentedAt: now,
    status: "Open",
    statusNote: data.statusNote || "Open",
    nextReview: data.nextReview,
    sourceType: data.sourceType,
    preparedBy: data.preparedBy,
    reviewedBy: data.reviewedBy,
    sourceParagraphs: data.sourceParagraphs.map(maskPhones),
    report: {
      participants: data.participants,
      concerns: data.concerns,
      presentingConcern: m(data.presentingConcern),
      relevantInfo: data.relevantInfo.filter((i) => i.text.trim()).map((i) => ({ label: i.label, ...m(i) })),
      guidanceImpression: m(data.guidanceImpression),
      strengths: m(data.strengths),
      limitations: m(data.limitations),
      monitoring: m(data.monitoring),
      escalation: data.escalation && data.escalation.text.trim() ? m(data.escalation) : null,
      recommendation: m(data.recommendation),
      studentMentions: data.studentMentions,
      speakers: data.speakers,
      checksConfirmed: data.checksConfirmed,
    },
  };

  const items: ActionItem[] = data.actionItems.map((a, i) => ({
    id: `${id}-A${i + 1}`,
    caseId: id,
    studentId: student.id,
    action: maskPhones(a.action),
    owner: a.owner,
    dueDate: a.dueDate,
    dueText: a.dueText,
    status: a.status,
    src: a.src,
    updatedAt: now,
    updatedBy: user.name,
  }));

  try {
    await store.saveCase(record);
    await store.addActionItems(items);
    await store.addAudit({
      actor: user.name, action: "approved", entityType: "case", entityId: id, studentId: student.id,
      detail: `Case report approved (prepared by ${data.preparedBy}); ${data.actionItems.length} action item(s); ${data.studentMentions.length} mention(s)`,
    });
  } catch (err) {
    return fail(`Could not save the report: ${errorMessage(err)}`, 500);
  }
  syncSectionInBackground(store, student.section);

  // The report is already approved in Kindra; a Google Drive problem is logged but never undoes the approval.
  let driveUrl: string | null = null;
  if (config.driveConfigured) {
    try {
      driveUrl = (await saveHtmlAsGoogleDoc(reportFileName(record, student), reportHtml(record, student, items))).url;
      await store.addAudit({
        actor: user.name, action: "saved to Google Drive", entityType: "case", entityId: id, studentId: student.id, detail: driveUrl,
      });
    } catch (err) {
      await store
        .addAudit({
          actor: user.name, action: "Google Drive save failed", entityType: "case", entityId: id, studentId: student.id,
          detail: errorMessage(err),
        })
        .catch(() => {});
    }
  }
  return NextResponse.json({ id, studentId: student.id, driveUrl });
}
