import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SEED_STUDENTS, seedActionItems, seedAlerts, seedAudit, seedCases, seedMessages } from "../seed";
import type { ActionItem, AlertMessage, AuditEntry, CaseRecord, ContactChange, Student, UrgentAlert } from "../types";
import type { Store } from "./types";

/* Server-only client. The service role key never reaches the browser. Schema: supabase/schema.sql */
let client: SupabaseClient | null = null;
const db = () =>
  (client ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  }));

type Res<T> = { data: T | null; error: { message: string } | null };
function check<T>(res: Res<T>): T | null {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}
const rows = <T,>(res: Res<T[]>): T[] => check(res) ?? [];
function one<T>(res: Res<T>): T {
  const row = check(res);
  if (!row) throw new Error("Supabase: expected a row but none was returned");
  return row;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const toStudent = (r: any): Student => ({
  id: r.id, name: r.name, grade: r.grade, section: r.section, adviserId: r.adviser_id, sensitivity: r.sensitivity,
  aliases: r.aliases ?? [], guardianName: r.guardian_name, guardianPhone: r.guardian_phone,
});
const fromStudent = (s: Student) => ({
  id: s.id, name: s.name, grade: s.grade, section: s.section, adviser_id: s.adviserId, sensitivity: s.sensitivity,
  aliases: s.aliases, guardian_name: s.guardianName, guardian_phone: s.guardianPhone,
});
const toCase = (r: any): CaseRecord => ({
  id: r.id, studentId: r.student_id, caseType: r.case_type, conferenceAt: r.conference_at, documentedAt: r.documented_at,
  status: r.status, statusNote: r.status_note, nextReview: r.next_review, sourceType: r.source_type,
  preparedBy: r.prepared_by, reviewedBy: r.reviewed_by, report: r.report, sourceParagraphs: r.source_paragraphs ?? [],
});
const fromCase = (c: CaseRecord) => ({
  id: c.id, student_id: c.studentId, case_type: c.caseType, conference_at: c.conferenceAt, documented_at: c.documentedAt,
  status: c.status, status_note: c.statusNote, next_review: c.nextReview, source_type: c.sourceType,
  prepared_by: c.preparedBy, reviewed_by: c.reviewedBy, report: c.report, source_paragraphs: c.sourceParagraphs,
});
const toItem = (r: any): ActionItem => ({
  id: r.id, caseId: r.case_id, studentId: r.student_id, action: r.action, owner: r.owner, dueDate: r.due_date,
  dueText: r.due_text, status: r.status, src: r.src ?? [], updatedAt: r.updated_at, updatedBy: r.updated_by,
});
const fromItem = (a: ActionItem) => ({
  id: a.id, case_id: a.caseId, student_id: a.studentId, action: a.action, owner: a.owner, due_date: a.dueDate,
  due_text: a.dueText, status: a.status, src: a.src, updated_at: a.updatedAt, updated_by: a.updatedBy,
});
const toChange = (r: any): ContactChange => ({
  id: r.id, studentId: r.student_id, oldPhone: r.old_phone, newPhone: r.new_phone, changedBy: r.changed_by, changedAt: r.changed_at,
});
const toAudit = (r: any): AuditEntry => ({
  id: r.id, at: r.at, actor: r.actor, action: r.action, entityType: r.entity_type, entityId: r.entity_id,
  studentId: r.student_id, detail: r.detail,
});
const toAlert = (r: any): UrgentAlert => ({
  id: r.id, studentId: r.student_id, caseId: r.case_id, concern: r.concern, note: r.note, raisedBy: r.raised_by,
  raisedAt: r.raised_at, respondBy: r.respond_by, acknowledgedAt: r.acknowledged_at, acknowledgedBy: r.acknowledged_by,
  escalatedAt: r.escalated_at, guardianContact: r.guardian_contact, guardianDecisionBy: r.guardian_decision_by,
  guardianDecisionAt: r.guardian_decision_at, resolvedAt: r.resolved_at, resolvedBy: r.resolved_by,
});
const ALERT_KEYS: Record<string, string> = {
  id: "id", studentId: "student_id", caseId: "case_id", concern: "concern", note: "note", raisedBy: "raised_by",
  raisedAt: "raised_at", respondBy: "respond_by", acknowledgedAt: "acknowledged_at", acknowledgedBy: "acknowledged_by",
  escalatedAt: "escalated_at", guardianContact: "guardian_contact", guardianDecisionBy: "guardian_decision_by",
  guardianDecisionAt: "guardian_decision_at", resolvedAt: "resolved_at", resolvedBy: "resolved_by",
};
const fromAlert = (a: Partial<UrgentAlert>) =>
  Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined).map(([k, v]) => [ALERT_KEYS[k], v]));
const toMessage = (r: any): AlertMessage => ({
  id: r.id, alertId: r.alert_id, studentId: r.student_id, recipient: r.recipient, channel: r.channel,
  toName: r.to_name, toPhone: r.to_phone, text: r.text, delivery: r.delivery, at: r.at,
});
const fromMessage = (m: AlertMessage) => ({
  id: m.id, alert_id: m.alertId, student_id: m.studentId, recipient: m.recipient, channel: m.channel,
  to_name: m.toName, to_phone: m.toPhone, text: m.text, delivery: m.delivery, at: m.at,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Seeds the fictional demo data the first time the app talks to an empty project. */
let seeded: Promise<void> | null = null;
function ensureSeeded() {
  return (seeded ??= (async () => {
    const existing = rows(await db().from("students").select("id").limit(1));
    if (existing.length) return;
    check(await db().from("students").insert(SEED_STUDENTS.map(fromStudent)));
    check(await db().from("cases").insert(seedCases().map(fromCase)));
    check(await db().from("action_items").insert(seedActionItems().map(fromItem)));
    check(
      await db().from("audit_log").insert(
        seedAudit().map((e) => ({ at: e.at, actor: e.actor, action: e.action, entity_type: e.entityType, entity_id: e.entityId, student_id: e.studentId, detail: e.detail })),
      ),
    );
    check(await db().from("urgent_alerts").insert(seedAlerts().map(fromAlert)));
    check(await db().from("alert_messages").insert(seedMessages().map(fromMessage)));
  })().catch((err) => {
    seeded = null;
    throw err;
  }));
}

export const supabaseStore: Store = {
  async listStudents() {
    await ensureSeeded();
    return rows(await db().from("students").select("*").order("id")).map(toStudent);
  },
  async getStudent(id) {
    await ensureSeeded();
    const r = check(await db().from("students").select("*").eq("id", id).maybeSingle());
    return r ? toStudent(r) : null;
  },

  async listCases(filter = {}) {
    await ensureSeeded();
    let q = db().from("cases").select("*").order("conference_at", { ascending: false });
    if (filter.studentId) q = q.eq("student_id", filter.studentId);
    return rows(await q).map(toCase);
  },
  async getCase(id) {
    const r = check(await db().from("cases").select("*").eq("id", id).maybeSingle());
    return r ? toCase(r) : null;
  },
  async saveCase(record) {
    return toCase(one(await db().from("cases").upsert(fromCase(record)).select("*").single()));
  },
  async updateCase(id, patch) {
    const update: Record<string, unknown> = {};
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.nextReview !== undefined) update.next_review = patch.nextReview;
    if (patch.statusNote !== undefined) update.status_note = patch.statusNote;
    return toCase(one(await db().from("cases").update(update).eq("id", id).select("*").single()));
  },

  async listActionItems(filter = {}) {
    await ensureSeeded();
    let q = db().from("action_items").select("*").order("due_date", { ascending: true, nullsFirst: false });
    if (filter.studentId) q = q.eq("student_id", filter.studentId);
    if (filter.caseId) q = q.eq("case_id", filter.caseId);
    return rows(await q).map(toItem);
  },
  async addActionItems(items) {
    if (items.length) check(await db().from("action_items").insert(items.map(fromItem)));
  },
  async updateActionItem(id, patch) {
    return toItem(
      one(
        await db()
          .from("action_items")
          .update({ status: patch.status, updated_at: patch.updatedAt, updated_by: patch.updatedBy })
          .eq("id", id)
          .select("*")
          .single(),
      ),
    );
  },

  async listContactChanges(studentId) {
    return rows(
      await db().from("contact_changes").select("*").eq("student_id", studentId).order("changed_at", { ascending: false }),
    ).map(toChange);
  },
  async updateGuardianPhone(studentId, newPhone, changedBy) {
    const student = await this.getStudent(studentId);
    if (!student) throw new Error("Student not found");
    check(await db().from("students").update({ guardian_phone: newPhone }).eq("id", studentId));
    return toChange(
      one(
        await db()
          .from("contact_changes")
          .insert({ student_id: studentId, old_phone: student.guardianPhone, new_phone: newPhone, changed_by: changedBy })
          .select("*")
          .single(),
      ),
    );
  },

  async listAlerts(filter = {}) {
    await ensureSeeded();
    let q = db().from("urgent_alerts").select("*").order("raised_at", { ascending: false });
    if (filter.studentId) q = q.eq("student_id", filter.studentId);
    if (filter.open === true) q = q.is("resolved_at", null);
    if (filter.open === false) q = q.not("resolved_at", "is", null);
    return rows(await q).map(toAlert);
  },
  async getAlert(id) {
    const r = check(await db().from("urgent_alerts").select("*").eq("id", id).maybeSingle());
    return r ? toAlert(r) : null;
  },
  async addAlert(alert) {
    return toAlert(one(await db().from("urgent_alerts").insert(fromAlert(alert)).select("*").single()));
  },
  async updateAlert(id, patch) {
    return toAlert(one(await db().from("urgent_alerts").update(fromAlert(patch)).eq("id", id).select("*").single()));
  },
  async claimEscalation(id, at) {
    const claimed = rows(
      await db().from("urgent_alerts").update({ escalated_at: at }).eq("id", id)
        .is("escalated_at", null).is("acknowledged_at", null).is("resolved_at", null).select("id"),
    );
    return claimed.length === 1;
  },
  async listMessages(filter = {}) {
    let q = db().from("alert_messages").select("*").order("at", { ascending: false }).limit(filter.limit ?? 200);
    if (filter.alertId) q = q.eq("alert_id", filter.alertId);
    return rows(await q).map(toMessage);
  },
  async addMessages(messages) {
    if (messages.length) check(await db().from("alert_messages").insert(messages.map(fromMessage)));
  },

  async addAudit(e) {
    check(
      await db().from("audit_log").insert({
        actor: e.actor, action: e.action, entity_type: e.entityType, entity_id: e.entityId, student_id: e.studentId, detail: e.detail,
      }),
    );
  },
  async listAudit(filter = {}) {
    let q = db().from("audit_log").select("*").order("at", { ascending: false }).limit(filter.limit ?? 200);
    if (filter.studentId) q = q.eq("student_id", filter.studentId);
    if (filter.entityId) q = q.eq("entity_id", filter.entityId);
    return rows(await q).map(toAudit);
  },
};
