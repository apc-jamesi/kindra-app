import "server-only";
import { randomUUID } from "crypto";
import { config } from "./config";
import { formatDateTime } from "./format";
import { alertRecipients, appUrl, sendEmail } from "./gmail";
import { USERS } from "./seed";
import type { Store } from "./store/types";
import type { AlertMessage, Student, UrgentAlert, UrgentConcern, User } from "./types";

/**
 * "Act faster": urgent alerts to the guidance counselor and the family.
 *
 * Rules (business logic lives here, on the server; routes and pages only call these functions):
 *  - Only the student's own adviser raises an alert. AI never raises one (crisis concerns stay human-triggered).
 *  - The counselor is alerted at once: in Kindra, by SMS and (when Gmail is on) by email.
 *  - The family is contacted at once only where the policy is "auto". For self-harm, depression, mental health and
 *    family concerns the counselor approves first, or decides not to contact the family (the family may be part of it).
 *  - SMS, call scripts and emails never contain the concern, the note or case details: only a callback request or
 *    section, a reference and (emails) a link to sign in to Kindra.
 *  - Crisis and urgent alerts not acknowledged within ESCALATE_MINUTES go to the guidance head.
 *  - Every SMS/call is SIMULATED in the prototype: recorded in the outbox, never sent. Emails are really sent (Gmail).
 */

export type AlertLevel = "crisis" | "urgent" | "high";

export interface ConcernRule {
  label: string;
  level: AlertLevel;
  guardianPolicy: "auto" | "counselor_approval";
  respondWithinMinutes: number;
  firstStep: string;
}

/** Concern list from the presenter's ballot (2026-11-25). Confirm with the guidance office protocol. */
export const CONCERN_RULES: Record<UrgentConcern, ConcernRule> = {
  self_harm: {
    label: "Self-harm or suicidal thoughts", level: "crisis", guardianPolicy: "counselor_approval", respondWithinMinutes: 60,
    firstStep: "Counselor sees the student in person now. Do not leave the student alone. Follow the school crisis protocol.",
  },
  depression: {
    label: "Signs of depression", level: "urgent", guardianPolicy: "counselor_approval", respondWithinMinutes: 240,
    firstStep: "Counselor check-in with the student today.",
  },
  mental_health: {
    label: "Other mental health concern", level: "urgent", guardianPolicy: "counselor_approval", respondWithinMinutes: 240,
    firstStep: "Counselor check-in with the student today.",
  },
  family: {
    label: "Family problems at home", level: "urgent", guardianPolicy: "counselor_approval", respondWithinMinutes: 240,
    firstStep: "Counselor talks with the student before any family contact.",
  },
  disengagement: {
    label: "Lost interest in studying", level: "high", guardianPolicy: "auto", respondWithinMinutes: 48 * 60,
    firstStep: "Adviser and counselor joint check-in within two school days.",
  },
};

export const escalateMinutes = () => Math.max(1, Number(process.env.ESCALATE_MINUTES) || 15);

const counselor = () => USERS.find((u) => u.role === "counselor")!;
const guidanceHead = () => USERS.find((u) => u.role === "guidance_head")!;
const firstName = (s: Student) => s.name.split(" ")[0];
const newId = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;

export const isStaff = (u: User) => u.role === "counselor" || u.role === "guidance_head";
export const isOpen = (a: UrgentAlert) => !a.resolvedAt;
export const needsAck = (a: UrgentAlert) => isOpen(a) && !a.acknowledgedAt;

function message(alert: UrgentAlert, student: Student, recipient: AlertMessage["recipient"], channel: AlertMessage["channel"], toName: string, toPhone: string, text: string, at: string): AlertMessage {
  return { id: newId("M"), alertId: alert.id, studentId: student.id, recipient, channel, toName, toPhone, text, delivery: "simulated", at };
}

function guardianMessages(alert: UrgentAlert, student: Student, at: string): AlertMessage[] {
  const rule = CONCERN_RULES[alert.concern];
  const when = rule.level === "high" ? "when you can" : "today";
  const text = `Good day, this is the APC SHS Guidance Office. Please call us ${when} about ${firstName(student)}. Ref ${alert.id}`;
  const channels: AlertMessage["channel"][] = rule.level === "high" ? ["sms"] : ["sms", "call"];
  return channels.map((ch) => message(alert, student, "guardian", ch, student.guardianName, student.guardianPhone, text, at));
}

const EMAIL_FOOTER =
  "For privacy, this email never includes the student's name, the concern or the adviser's note. Sign in to Kindra to see them.";

/** Emails one staff member about an alert. A Gmail problem is written to the audit log and never blocks the alert. */
async function emailStaff(store: Store, alert: UrgentAlert, staff: User, subject: string, lines: string[]): Promise<boolean> {
  if (!config.gmailConfigured) return false;
  const to = alertRecipients(staff.id);
  const base = { actor: "Kindra (automatic)", entityType: "alert" as const, entityId: alert.id, studentId: alert.studentId };
  try {
    const body = [...lines, "", `Open the alert in Kindra: ${appUrl()}/alerts#${alert.id}`, "", `Ref ${alert.id}`, "", EMAIL_FOOTER].join("\n");
    await sendEmail(to, subject, body);
    await store.addAudit({ ...base, action: "email sent", detail: `${staff.name} emailed through Gmail (${to.join(", ")})` });
    return true;
  } catch (err) {
    await store.addAudit({ ...base, action: "email failed", detail: `Email to ${staff.name} not sent: ${err instanceof Error ? err.message : String(err)}` });
    return false;
  }
}

export async function raiseAlert(
  store: Store,
  input: { user: User; student: Student; concern: UrgentConcern; note: string; caseId: string | null },
  now = new Date(),
) {
  const rule = CONCERN_RULES[input.concern];
  const at = now.toISOString();
  const alert: UrgentAlert = {
    id: newId("U"), studentId: input.student.id, caseId: input.caseId, concern: input.concern, note: input.note.trim(),
    raisedBy: input.user.name, raisedAt: at, respondBy: new Date(now.getTime() + rule.respondWithinMinutes * 60_000).toISOString(),
    acknowledgedAt: null, acknowledgedBy: null, escalatedAt: null,
    guardianContact: rule.guardianPolicy === "auto" ? "sent" : "pending",
    guardianDecisionBy: rule.guardianPolicy === "auto" ? "Automatic (policy)" : null,
    guardianDecisionAt: rule.guardianPolicy === "auto" ? at : null,
    resolvedAt: null, resolvedBy: null,
  };
  const c = counselor();
  const tag = rule.level === "high" ? "HIGH" : "URGENT";
  const messages = [
    message(alert, input.student, "counselor", "sms", c.name, c.phone ?? "", `Kindra ${tag}: a student in ${input.student.section} needs guidance follow-up. Please open Kindra now. Ref ${alert.id}`, at),
    ...(alert.guardianContact === "sent" ? guardianMessages(alert, input.student, at) : []),
  ];
  await store.addAlert(alert);
  await store.addMessages(messages);
  await store.addAudit({
    actor: input.user.name, action: "alert raised", entityType: "alert", entityId: alert.id, studentId: input.student.id,
    detail: `${rule.label} (${rule.level}). Counselor SMS simulated. Family contact: ${alert.guardianContact === "sent" ? "sent automatically (simulated)" : "waiting for counselor approval"}.`,
  });
  const emailed = await emailStaff(store, alert, c, `Kindra ${tag}: guidance follow-up needed (Ref ${alert.id})`, [
    `A student in ${input.student.section} needs guidance follow-up.`,
    `Please respond by ${formatDateTime(alert.respondBy)}.`,
  ]);
  return { alert, messages, emailed };
}

export async function acknowledgeAlert(store: Store, alert: UrgentAlert, user: User, now = new Date()) {
  if (alert.acknowledgedAt) return alert;
  const updated = await store.updateAlert(alert.id, { acknowledgedAt: now.toISOString(), acknowledgedBy: user.name });
  await store.addAudit({ actor: user.name, action: "alert acknowledged", entityType: "alert", entityId: alert.id, studentId: alert.studentId, detail: "Counselor acknowledged the alert" });
  return updated;
}

export async function decideGuardianContact(store: Store, alert: UrgentAlert, student: Student, user: User, decision: "approve" | "withhold", reason: string, now = new Date()) {
  if (alert.guardianContact !== "pending") throw new Error("The family contact for this alert was already decided.");
  const at = now.toISOString();
  const updated = await store.updateAlert(alert.id, {
    guardianContact: decision === "approve" ? "sent" : "withheld", guardianDecisionBy: user.name, guardianDecisionAt: at,
    // Deciding on family contact means the counselor has seen the alert.
    acknowledgedAt: alert.acknowledgedAt ?? at, acknowledgedBy: alert.acknowledgedBy ?? user.name,
  });
  if (decision === "approve") await store.addMessages(guardianMessages(alert, student, at));
  await store.addAudit({
    actor: user.name, action: decision === "approve" ? "family contact approved" : "family contact withheld", entityType: "alert", entityId: alert.id, studentId: alert.studentId,
    detail: decision === "approve" ? "Guardian SMS and call script sent (simulated)" : `Family not contacted. Reason: ${reason || "not given"}`,
  });
  return updated;
}

export async function resolveAlert(store: Store, alert: UrgentAlert, user: User, now = new Date()) {
  if (alert.resolvedAt) return alert;
  const at = now.toISOString();
  const updated = await store.updateAlert(alert.id, {
    resolvedAt: at, resolvedBy: user.name, acknowledgedAt: alert.acknowledgedAt ?? at, acknowledgedBy: alert.acknowledgedBy ?? user.name,
  });
  await store.addAudit({ actor: user.name, action: "alert resolved", entityType: "alert", entityId: alert.id, studentId: alert.studentId, detail: "Alert closed" });
  return updated;
}

/**
 * Crisis and urgent alerts not acknowledged within ESCALATE_MINUTES go to the guidance head, once.
 * Runs whenever alert pages load or /api/alerts/escalate is called (no background job needed for the demo).
 */
export async function runEscalations(store: Store, now = new Date()) {
  const limit = escalateMinutes() * 60_000;
  const due = (await store.listAlerts({ open: true })).filter(
    (a) => !a.acknowledgedAt && !a.escalatedAt && CONCERN_RULES[a.concern].level !== "high" && now.getTime() - new Date(a.raisedAt).getTime() >= limit,
  );
  const head = guidanceHead();
  const escalated: string[] = [];
  for (const a of due) {
    const student = await store.getStudent(a.studentId);
    if (!student) continue;
    const at = now.toISOString();
    // Atomic claim: concurrent page loads must not escalate (and message the guidance head) twice.
    if (!(await store.claimEscalation(a.id, at))) continue;
    escalated.push(a.id);
    await store.addMessages([
      message(a, student, "guidance_head", "sms", head.name, head.phone ?? "", `Kindra ESCALATION: urgent alert ${a.id} (${student.section}) not acknowledged after ${escalateMinutes()} min. Please follow up now.`, at),
    ]);
    await store.addAudit({ actor: "Kindra (automatic)", action: "alert escalated", entityType: "alert", entityId: a.id, studentId: a.studentId, detail: `Not acknowledged within ${escalateMinutes()} min; guidance head notified (simulated SMS)` });
    await emailStaff(store, a, head, `Kindra ESCALATION: alert ${a.id} not acknowledged`, [
      `An urgent alert for a student in ${student.section} was not acknowledged within ${escalateMinutes()} ${escalateMinutes() === 1 ? "minute" : "minutes"}.`,
      "Please follow up now.",
    ]);
  }
  return escalated;
}
