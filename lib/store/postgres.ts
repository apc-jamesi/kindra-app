import "server-only";
import { Pool, types, type PoolClient } from "pg";
import { SEED_STUDENTS, seedActionItems, seedAlerts, seedAudit, seedCases, seedMessages } from "../seed";
import type { ActionItem, AlertMessage, AuditEntry, CaseRecord, ContactChange, Student, UrgentAlert } from "../types";
import type { Store } from "./types";

/*
 * Local PostgreSQL store (DATABASE_URL). Schema: db/schema.sql, applied with `npm run db:setup`.
 * Same shape as the Supabase store, so moving to Supabase later only changes the connection.
 * Server-only: the connection string never reaches the browser.
 */

// Keep dates as strings, like the JSON and Supabase stores: DATE -> "YYYY-MM-DD", TIMESTAMPTZ -> ISO 8601.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1184, (v) => new Date(v).toISOString());

const g = globalThis as unknown as { __kindraPool?: Pool };
const pool = () => (g.__kindraPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }));

async function q<T = Record<string, unknown>>(text: string, params: unknown[] = [], client?: PoolClient): Promise<T[]> {
  try {
    return (await (client ?? pool()).query(text, params)).rows as T[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/relation .* does not exist/.test(msg)) throw new Error("PostgreSQL: tables are missing. Run `npm run db:setup` first.");
    throw new Error(`PostgreSQL: ${msg}`);
  }
}
async function one<T>(text: string, params: unknown[] = []): Promise<T> {
  const [row] = await q<T>(text, params);
  if (!row) throw new Error("PostgreSQL: expected a row but none was returned");
  return row;
}
const json = (v: unknown) => JSON.stringify(v);

/* eslint-disable @typescript-eslint/no-explicit-any */
const toStudent = (r: any): Student => ({
  id: r.id, name: r.name, grade: r.grade, section: r.section, adviserId: r.adviser_id, sensitivity: r.sensitivity,
  aliases: r.aliases ?? [], guardianName: r.guardian_name, guardianPhone: r.guardian_phone,
});
const toCase = (r: any): CaseRecord => ({
  id: r.id, studentId: r.student_id, caseType: r.case_type, conferenceAt: r.conference_at, documentedAt: r.documented_at,
  status: r.status, statusNote: r.status_note, nextReview: r.next_review, sourceType: r.source_type,
  preparedBy: r.prepared_by, reviewedBy: r.reviewed_by, report: r.report, sourceParagraphs: r.source_paragraphs ?? [],
});
const toItem = (r: any): ActionItem => ({
  id: r.id, caseId: r.case_id, studentId: r.student_id, action: r.action, owner: r.owner, dueDate: r.due_date,
  dueText: r.due_text, status: r.status, src: r.src ?? [], updatedAt: r.updated_at, updatedBy: r.updated_by,
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
const toMessage = (r: any): AlertMessage => ({
  id: r.id, alertId: r.alert_id, studentId: r.student_id, recipient: r.recipient, channel: r.channel,
  toName: r.to_name, toPhone: r.to_phone, text: r.text, delivery: r.delivery, at: r.at,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

const CASE_COLS = "id, student_id, case_type, conference_at, documented_at, status, status_note, next_review, source_type, prepared_by, reviewed_by, report, source_paragraphs";
const caseParams = (c: CaseRecord) => [
  c.id, c.studentId, c.caseType, c.conferenceAt, c.documentedAt, c.status, c.statusNote, c.nextReview, c.sourceType,
  c.preparedBy, c.reviewedBy, c.report === null ? null : json(c.report), json(c.sourceParagraphs),
];
const ITEM_COLS = "id, case_id, student_id, action, owner, due_date, due_text, status, src, updated_at, updated_by";
const itemParams = (a: ActionItem) => [a.id, a.caseId, a.studentId, a.action, a.owner, a.dueDate, a.dueText, a.status, json(a.src), a.updatedAt, a.updatedBy];
const ALERT_COLS = "id, student_id, case_id, concern, note, raised_by, raised_at, respond_by, acknowledged_at, acknowledged_by, escalated_at, guardian_contact, guardian_decision_by, guardian_decision_at, resolved_at, resolved_by";
const alertParams = (a: UrgentAlert) => [
  a.id, a.studentId, a.caseId, a.concern, a.note, a.raisedBy, a.raisedAt, a.respondBy, a.acknowledgedAt, a.acknowledgedBy,
  a.escalatedAt, a.guardianContact, a.guardianDecisionBy, a.guardianDecisionAt, a.resolvedAt, a.resolvedBy,
];
const MSG_COLS = "id, alert_id, student_id, recipient, channel, to_name, to_phone, text, delivery, at";
const msgParams = (m: AlertMessage) => [m.id, m.alertId, m.studentId, m.recipient, m.channel, m.toName, m.toPhone, m.text, m.delivery, m.at];
const placeholders = (n: number) => Array.from({ length: n }, (_, i) => `$${i + 1}`).join(", ");

/** Seeds the fictional demo data the first time the app talks to an empty database. */
let seeded: Promise<void> | null = null;
function ensureSeeded() {
  return (seeded ??= (async () => {
    const existing = await q("select 1 from students limit 1");
    if (existing.length) return;
    const client = await pool().connect();
    try {
      await client.query("begin");
      for (const s of SEED_STUDENTS) {
        await q(
          "insert into students (id, name, grade, section, adviser_id, sensitivity, aliases, guardian_name, guardian_phone) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict do nothing",
          [s.id, s.name, s.grade, s.section, s.adviserId, s.sensitivity, s.aliases, s.guardianName, s.guardianPhone], client,
        );
      }
      for (const c of seedCases()) await q(`insert into cases (${CASE_COLS}) values (${placeholders(13)})`, caseParams(c), client);
      for (const a of seedActionItems()) await q(`insert into action_items (${ITEM_COLS}) values (${placeholders(11)})`, itemParams(a), client);
      for (const e of seedAudit()) {
        await q("insert into audit_log (at, actor, action, entity_type, entity_id, student_id, detail) values ($1,$2,$3,$4,$5,$6,$7)",
          [e.at, e.actor, e.action, e.entityType, e.entityId, e.studentId, e.detail], client);
      }
      for (const a of seedAlerts()) await q(`insert into urgent_alerts (${ALERT_COLS}) values (${placeholders(16)})`, alertParams(a), client);
      for (const m of seedMessages()) await q(`insert into alert_messages (${MSG_COLS}) values (${placeholders(10)})`, msgParams(m), client);
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  })().catch((err) => {
    seeded = null;
    throw err;
  }));
}

export const postgresStore: Store = {
  async listStudents() {
    await ensureSeeded();
    return (await q("select * from students order by id")).map(toStudent);
  },
  async getStudent(id) {
    await ensureSeeded();
    const [r] = await q("select * from students where id = $1", [id]);
    return r ? toStudent(r) : null;
  },

  async listCases(filter = {}) {
    await ensureSeeded();
    return (await q("select * from cases where ($1::text is null or student_id = $1) order by conference_at desc", [filter.studentId ?? null])).map(toCase);
  },
  async getCase(id) {
    const [r] = await q("select * from cases where id = $1", [id]);
    return r ? toCase(r) : null;
  },
  async saveCase(record) {
    const sets = CASE_COLS.split(", ").slice(1).map((c) => `${c} = excluded.${c}`).join(", ");
    return toCase(await one(`insert into cases (${CASE_COLS}) values (${placeholders(13)}) on conflict (id) do update set ${sets} returning *`, caseParams(record)));
  },
  async updateCase(id, patch) {
    const r = await one(
      `update cases set
         status = coalesce($2, status),
         next_review = case when $3::boolean then $4::date else next_review end,
         status_note = coalesce($5, status_note)
       where id = $1 returning *`,
      [id, patch.status ?? null, patch.nextReview !== undefined, patch.nextReview ?? null, patch.statusNote ?? null],
    );
    return toCase(r);
  },

  async listActionItems(filter = {}) {
    await ensureSeeded();
    return (
      await q(
        "select * from action_items where ($1::text is null or student_id = $1) and ($2::text is null or case_id = $2) order by due_date asc nulls last, id",
        [filter.studentId ?? null, filter.caseId ?? null],
      )
    ).map(toItem);
  },
  async addActionItems(items) {
    for (const a of items) await q(`insert into action_items (${ITEM_COLS}) values (${placeholders(11)})`, itemParams(a));
  },
  async updateActionItem(id, patch) {
    return toItem(await one("update action_items set status = $2, updated_at = $3, updated_by = $4 where id = $1 returning *", [id, patch.status, patch.updatedAt, patch.updatedBy]));
  },

  async listContactChanges(studentId) {
    return (await q("select * from contact_changes where student_id = $1 order by changed_at desc", [studentId])).map(toChange);
  },
  async updateGuardianPhone(studentId, newPhone, changedBy) {
    const student = await this.getStudent(studentId);
    if (!student) throw new Error("Student not found");
    await q("update students set guardian_phone = $2 where id = $1", [studentId, newPhone]);
    return toChange(
      await one("insert into contact_changes (student_id, old_phone, new_phone, changed_by) values ($1,$2,$3,$4) returning *", [studentId, student.guardianPhone, newPhone, changedBy]),
    );
  },

  async listAlerts(filter = {}) {
    await ensureSeeded();
    return (
      await q(
        "select * from urgent_alerts where ($1::text is null or student_id = $1) and ($2::boolean is null or (resolved_at is null) = $2) order by raised_at desc",
        [filter.studentId ?? null, filter.open ?? null],
      )
    ).map(toAlert);
  },
  async getAlert(id) {
    const [r] = await q("select * from urgent_alerts where id = $1", [id]);
    return r ? toAlert(r) : null;
  },
  async addAlert(alert) {
    return toAlert(await one(`insert into urgent_alerts (${ALERT_COLS}) values (${placeholders(16)}) returning *`, alertParams(alert)));
  },
  async updateAlert(id, patch) {
    const current = await this.getAlert(id);
    if (!current) throw new Error("Alert not found");
    const next = { ...current, ...patch };
    const sets = ALERT_COLS.split(", ").slice(1).map((c, i) => `${c} = $${i + 2}`).join(", ");
    return toAlert(await one(`update urgent_alerts set ${sets} where id = $1 returning *`, alertParams(next)));
  },
  async claimEscalation(id, at) {
    const rows = await q(
      "update urgent_alerts set escalated_at = $2 where id = $1 and escalated_at is null and acknowledged_at is null and resolved_at is null returning id",
      [id, at],
    );
    return rows.length === 1;
  },
  async listMessages(filter = {}) {
    return (
      await q("select * from alert_messages where ($1::text is null or alert_id = $1) order by at desc limit $2", [filter.alertId ?? null, filter.limit ?? 200])
    ).map(toMessage);
  },
  async addMessages(messages) {
    for (const m of messages) await q(`insert into alert_messages (${MSG_COLS}) values (${placeholders(10)})`, msgParams(m));
  },

  async addAudit(e) {
    await q("insert into audit_log (actor, action, entity_type, entity_id, student_id, detail) values ($1,$2,$3,$4,$5,$6)", [
      e.actor, e.action, e.entityType, e.entityId, e.studentId, e.detail,
    ]);
  },
  async listAudit(filter = {}) {
    return (
      await q(
        "select * from audit_log where ($1::text is null or student_id = $1) and ($2::text is null or entity_id = $2) order by at desc limit $3",
        [filter.studentId ?? null, filter.entityId ?? null, filter.limit ?? 200],
      )
    ).map(toAudit);
  },
};
