import "server-only";
import { CONCERN_RULES, isOpen, isStaff, needsAck, runEscalations } from "./alerts";
import { isOverdue } from "./metrics";
import { myStudents } from "./session";
import { getStore } from "./store";
import type { Student, UrgentAlert, User } from "./types";

/** Alerts the user may see: staff see every alert; advisers see alerts for their own advisees. Escalates first. */
export async function visibleAlerts(user: User) {
  const store = getStore();
  await runEscalations(store);
  const students = await myStudents(user);
  const byId = new Map(students.map((s) => [s.id, s]));
  const alerts = (await store.listAlerts()).filter((a) => byId.has(a.studentId));
  return { alerts, students: byId };
}

/** Badge counts for the header. */
export async function navCounts(user: User) {
  const [{ alerts, students }, items] = await Promise.all([visibleAlerts(user), getStore().listActionItems()]);
  return {
    alerts: alerts.filter((a) => (isStaff(user) ? needsAck(a) || a.guardianContact === "pending" : isOpen(a))).length,
    overdue: items.filter((i) => students.has(i.studentId) && isOverdue(i)).length,
  };
}

export type AlertRow = UrgentAlert & {
  studentName: string;
  section: string;
  level: string;
  concernLabel: string;
  firstStep: string;
  overdueResponse: boolean;
};

export function toAlertRow(a: UrgentAlert, s: Student, now = new Date()): AlertRow {
  const rule = CONCERN_RULES[a.concern];
  return {
    ...a, studentName: s.name, section: s.section, level: rule.level, concernLabel: rule.label, firstStep: rule.firstStep,
    overdueResponse: isOpen(a) && new Date(a.respondBy) < now,
  };
}
