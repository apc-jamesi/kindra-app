import type { ActionItem, CaseRecord } from "./types";

const HOUR = 3_600_000;

export type Timeliness =
  | { key: "ok"; hours: number; label: string }
  | { key: "late"; hours: number; label: string }
  | { key: "pending"; hours: number; label: string };

/** Compares conference time with documentation time against the 24-hour target. */
export function timeliness(c: CaseRecord, now = new Date()): Timeliness {
  const conf = new Date(c.conferenceAt).getTime();
  if (!c.documentedAt) {
    const days = Math.max(0, Math.floor((now.getTime() - conf) / (24 * HOUR)));
    return { key: "pending", hours: (now.getTime() - conf) / HOUR, label: `Not documented (${days} day${days === 1 ? "" : "s"})` };
  }
  const hours = Math.max(0, Math.round((new Date(c.documentedAt).getTime() - conf) / HOUR));
  if (hours <= 24) return { key: "ok", hours, label: `Within 24 h (${hours} h)` };
  const days = Math.round(hours / 24);
  return { key: "late", hours, label: `Late (${days} day${days === 1 ? "" : "s"})` };
}

export function isOverdue(item: ActionItem, now = new Date()) {
  return Boolean(item.dueDate) && item.status !== "Done" && new Date(`${item.dueDate}T23:59:59+08:00`) < now;
}

export function daysOverdue(item: ActionItem, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - new Date(`${item.dueDate}T23:59:59+08:00`).getTime()) / (24 * HOUR)) + 1);
}

export interface StudentSummary {
  openCases: number;
  openItems: number;
  overdue: number;
  unassigned: number;
  latestConference: string | null;
  docStatus: "Within 24 h" | "Late or pending" | "No cases";
  nextReview: string | null;
}

export function summarize(cases: CaseRecord[], items: ActionItem[], now = new Date()): StudentSummary {
  const open = cases.filter((c) => c.status !== "Closed");
  const docLate = open.some((c) => timeliness(c, now).key !== "ok");
  return {
    openCases: open.length,
    openItems: items.filter((i) => i.status !== "Done").length,
    overdue: items.filter((i) => isOverdue(i, now)).length,
    unassigned: items.filter((i) => !i.owner.trim() && i.status !== "Done").length,
    latestConference: cases.map((c) => c.conferenceAt).sort().pop() ?? null,
    docStatus: cases.length === 0 ? "No cases" : docLate ? "Late or pending" : "Within 24 h",
    nextReview: open.map((c) => c.nextReview).filter((d): d is string => Boolean(d)).sort()[0] ?? null,
  };
}

/** Share of documented cases documented within 24 hours (the pilot target is 95%). */
export function onTimeRate(cases: CaseRecord[], now = new Date()) {
  const documented = cases.filter((c) => c.documentedAt);
  if (!documented.length) return null;
  return documented.filter((c) => timeliness(c, now).key === "ok").length / documented.length;
}
