/**
 * Fictional seed data. Students, advisers and phone numbers are made up.
 * Case history and action items follow the kindra-prototype student-record mockup.
 */
import { PREWRITTEN, SAMPLE_INPUTS } from "./samples";
import type { ActionItem, AlertMessage, AuditEntry, CaseRecord, CaseReport, ModelDraft, Student, UrgentAlert, User } from "./types";

export const USERS: User[] = [
  { id: "adviser-a", name: "Ms. Ana Reyes", label: "Adviser A · 11-STEM A", role: "adviser" },
  { id: "adviser-b", name: "Mr. Carlo Tan", label: "Adviser B · 12-ABM", role: "adviser" },
  { id: "adviser-c", name: "Ms. Bea Lopez", label: "Adviser C · 12-HUMSS", role: "adviser" },
  { id: "counselor", name: "Ms. Liza Cruz, RGC", label: "Guidance counselor", role: "counselor", phone: "09170000101" },
  { id: "guidance-head", name: "Dr. Teresa Gomez", label: "Guidance head", role: "guidance_head", phone: "09170000102" },
];

export const SEED_STUDENTS: Student[] = [
  { id: "S-001", name: "Jana Dela Cruz", grade: "Grade 11", section: "11-STEM A", adviserId: "adviser-a", sensitivity: "Standard", aliases: ["Jana"], guardianName: "Maria Dela Cruz (mother)", guardianPhone: "09170000001" },
  { id: "S-002", name: "Miguel Santos", grade: "Grade 11", section: "11-STEM A", adviserId: "adviser-a", sensitivity: "Standard", aliases: ["Miguel", "Migs"], guardianName: "Roberto Santos (father)", guardianPhone: "09170000002" },
  { id: "S-003", name: "Mikaela Santos", grade: "Grade 11", section: "11-STEM A", adviserId: "adviser-a", sensitivity: "Standard", aliases: ["Mikaela", "Mika"], guardianName: "Liza Santos (mother)", guardianPhone: "09170000003" },
  { id: "S-004", name: "Andrea Villanueva", grade: "Grade 11", section: "11-STEM A", adviserId: "adviser-a", sensitivity: "Standard", aliases: ["Andrea", "Andi"], guardianName: "Teresa Villanueva (mother)", guardianPhone: "09170000004" },
  { id: "S-005", name: "Carlos Bautista", grade: "Grade 12", section: "12-ABM", adviserId: "adviser-b", sensitivity: "Restricted", aliases: ["Carlos", "Caloy"], guardianName: "Elena Bautista (mother)", guardianPhone: "09170000005" },
  { id: "S-006", name: "Sofia Ramos", grade: "Grade 12", section: "12-ABM", adviserId: "adviser-b", sensitivity: "Standard", aliases: ["Sofia", "Sofi"], guardianName: "Daniel Ramos (father)", guardianPhone: "09170000006" },
  { id: "S-007", name: "Joshua Garcia", grade: "Grade 12", section: "12-HUMSS", adviserId: "adviser-c", sensitivity: "Restricted", aliases: ["Joshua", "Josh"], guardianName: "Rowena Garcia (aunt)", guardianPhone: "09170000007" },
  { id: "S-008", name: "Paula Mendoza", grade: "Grade 12", section: "12-HUMSS", adviserId: "adviser-c", sensitivity: "Standard", aliases: ["Paula", "Pau"], guardianName: "Ramon Mendoza (father)", guardianPhone: "09170000008" },
];

function reportFrom(draft: ModelDraft): CaseReport {
  return {
    participants: draft.participants,
    concerns: draft.concerns,
    presentingConcern: draft.presentingConcern,
    relevantInfo: draft.relevantInfo,
    guidanceImpression: draft.guidanceImpression,
    strengths: draft.strengths,
    limitations: draft.limitations,
    monitoring: draft.monitoring,
    escalation: draft.escalation,
    recommendation: draft.recommendation,
    studentMentions: [],
    speakers: draft.speakers,
    checksConfirmed: draft.checks,
  };
}

const paragraphsOf = (id: string) => SAMPLE_INPUTS.find((s) => s.id === id)?.paragraphs ?? [];

export function seedCases(): CaseRecord[] {
  return [
    {
      id: "C-101", studentId: "S-004", caseType: PREWRITTEN.career.caseType,
      conferenceAt: "2026-11-03T09:00:00+08:00", documentedAt: "2026-11-03T18:00:00+08:00",
      status: "Open", statusNote: PREWRITTEN.career.statusNote, nextReview: "2026-12-01",
      sourceType: "audio", preparedBy: "Ms. Ana Reyes", reviewedBy: "Ms. Ana Reyes",
      report: reportFrom(PREWRITTEN.career), sourceParagraphs: paragraphsOf("career"),
    },
    {
      id: "C-102", studentId: "S-005", caseType: PREWRITTEN.behavior.caseType,
      conferenceAt: "2026-11-05T14:00:00+08:00", documentedAt: "2026-11-08T10:00:00+08:00",
      status: "Open", statusNote: PREWRITTEN.behavior.statusNote, nextReview: "2026-11-19",
      sourceType: "audio", preparedBy: "Mr. Carlo Tan", reviewedBy: "Mr. Carlo Tan",
      report: reportFrom(PREWRITTEN.behavior), sourceParagraphs: paragraphsOf("behavior"),
    },
    {
      id: "C-103", studentId: "S-006", caseType: PREWRITTEN.general.caseType,
      conferenceAt: "2026-11-12T10:00:00+08:00", documentedAt: "2026-11-12T16:00:00+08:00",
      status: "Open", statusNote: PREWRITTEN.general.statusNote, nextReview: "2026-11-26",
      sourceType: "audio", preparedBy: "Mr. Carlo Tan", reviewedBy: "Mr. Carlo Tan",
      report: reportFrom(PREWRITTEN.general), sourceParagraphs: paragraphsOf("general"),
    },
    {
      id: "C-104", studentId: "S-007", caseType: "Attendance concern",
      conferenceAt: "2026-11-18T08:30:00+08:00", documentedAt: null,
      status: "Open", statusNote: "Open – case report not yet documented", nextReview: "2026-11-27",
      sourceType: null, preparedBy: null, reviewedBy: null, report: null, sourceParagraphs: [],
    },
  ];
}

export function seedActionItems(): ActionItem[] {
  const at = "2026-11-12T16:00:00+08:00";
  const item = (id: string, caseId: string, studentId: string, action: string, owner: string, dueDate: string, status: ActionItem["status"], updatedBy: string): ActionItem => ({
    id, caseId, studentId, action, owner, dueDate, dueText: "", status, src: [], updatedAt: at, updatedBy,
  });
  return [
    item("A-1011", "C-101", "S-004", "Prepare a comparison of the three programs: subjects, career paths, and college requirements", "Student", "2026-11-20", "Open", "Ms. Ana Reyes"),
    item("A-1012", "C-101", "S-004", "Ask a relative who works in accounting about her daily work", "Student", "2026-11-27", "In progress", "Ms. Ana Reyes"),
    item("A-1013", "C-101", "S-004", "Schedule a follow-up consultation after the research period", "Adviser and student", "2026-11-30", "Open", "Ms. Ana Reyes"),
    item("A-1021", "C-102", "S-005", "Private, supportive check-in with the student", "Adviser", "2026-11-12", "Open", "Mr. Carlo Tan"),
    item("A-1022", "C-102", "S-005", "Monitor attendance and punctuality for two weeks", "Adviser", "2026-11-19", "Done", "Mr. Carlo Tan"),
    item("A-1023", "C-102", "S-005", "Calm, open-ended conversation at home", "Parent/guardian", "2026-11-14", "Open", "Mr. Carlo Tan"),
    item("A-1031", "C-103", "S-006", "Keep one weekly task list", "Student", "2026-11-13", "Done", "Mr. Carlo Tan"),
    item("A-1032", "C-103", "S-006", "Split large assignments into steps", "Student", "2026-11-16", "In progress", "Mr. Carlo Tan"),
    item("A-1033", "C-103", "S-006", "Weekly adviser check-in", "Adviser", "2026-11-20", "Open", "Mr. Carlo Tan"),
    item("A-1041", "C-104", "S-007", "Call parent to confirm absence reasons", "Adviser", "2026-11-19", "Open", "Ms. Bea Lopez"),
    item("A-1042", "C-104", "S-007", "Send attendance log to registrar", "", "2026-11-21", "Open", "Ms. Bea Lopez"),
  ];
}

export function seedAudit(): AuditEntry[] {
  const e = (id: string, at: string, actor: string, action: string, entityType: AuditEntry["entityType"], entityId: string, studentId: string, detail: string): AuditEntry => ({ id, at, actor, action, entityType, entityId, studentId, detail });
  return [
    e("L-1", "2026-11-03T18:00:00+08:00", "Ms. Ana Reyes", "approved", "case", "C-101", "S-004", "Case report approved (seed data)"),
    e("L-2", "2026-11-08T10:00:00+08:00", "Mr. Carlo Tan", "approved", "case", "C-102", "S-005", "Case report approved (seed data)"),
    e("L-3", "2026-11-12T16:00:00+08:00", "Mr. Carlo Tan", "approved", "case", "C-103", "S-006", "Case report approved (seed data)"),
  ];
}

/**
 * Demo urgent alerts, timed relative to when the data is seeded:
 *  - U-0001: urgent, raised 40 minutes ago, not acknowledged, family contact waiting for approval (shows escalation)
 *  - U-0002: high, acknowledged two days ago, guardian contacted automatically
 */
export function seedAlerts(now = new Date()): UrgentAlert[] {
  const ago = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();
  return [
    {
      id: "U-0001", studentId: "S-003", caseId: null, concern: "depression",
      note: "Withdrawn in class for two weeks; wrote a worrying line in a journal activity.",
      raisedBy: "Ms. Ana Reyes", raisedAt: ago(40), respondBy: ago(40 - 240),
      acknowledgedAt: null, acknowledgedBy: null, escalatedAt: null,
      guardianContact: "pending", guardianDecisionBy: null, guardianDecisionAt: null, resolvedAt: null, resolvedBy: null,
    },
    {
      id: "U-0002", studentId: "S-006", caseId: "C-103", concern: "disengagement",
      note: "Missed most submissions this week; says studying feels pointless.",
      raisedBy: "Mr. Carlo Tan", raisedAt: ago(2 * 1440), respondBy: ago(-1440),
      acknowledgedAt: ago(2 * 1440 - 25), acknowledgedBy: "Ms. Liza Cruz, RGC", escalatedAt: null,
      guardianContact: "sent", guardianDecisionBy: "Automatic (policy)", guardianDecisionAt: ago(2 * 1440),
      resolvedAt: null, resolvedBy: null,
    },
  ];
}

export function seedMessages(now = new Date()): AlertMessage[] {
  const ago = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();
  return [
    { id: "M-0001", alertId: "U-0001", studentId: "S-003", recipient: "counselor", channel: "sms", toName: "Ms. Liza Cruz, RGC", toPhone: "09170000101", text: "Kindra URGENT: a student in 11-STEM A needs guidance follow-up. Please open Kindra now. Ref U-0001", delivery: "simulated", at: ago(40) },
    { id: "M-0002", alertId: "U-0002", studentId: "S-006", recipient: "counselor", channel: "sms", toName: "Ms. Liza Cruz, RGC", toPhone: "09170000101", text: "Kindra HIGH: a student in 12-ABM needs guidance follow-up. Please open Kindra. Ref U-0002", delivery: "simulated", at: ago(2 * 1440) },
    { id: "M-0003", alertId: "U-0002", studentId: "S-006", recipient: "guardian", channel: "sms", toName: "Daniel Ramos (father)", toPhone: "09170000006", text: "Good day, this is the APC SHS Guidance Office. Please call us when you can about Sofia. Ref U-0002", delivery: "simulated", at: ago(2 * 1440) },
  ];
}
