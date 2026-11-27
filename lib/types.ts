export const CATEGORIES = [
  "academic",
  "attendance",
  "behavior",
  "wellbeing",
  "family",
  "career",
  "guardian_contact",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  career: "Career",
  academic: "Academic",
  attendance: "Attendance",
  behavior: "Behavior",
  wellbeing: "Wellbeing",
  family: "Family",
  guardian_contact: "Guardian contact",
};

export const ITEM_STATUSES = ["Open", "In progress", "Done", "Blocked"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const CASE_STATUSES = ["Open", "Closed"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const SPEAKERS = ["Adviser", "Student", "Parent", "Other"] as const;
export type Speaker = (typeof SPEAKERS)[number];

export type Sensitivity = "Standard" | "Restricted";
export type SourceType = "written" | "audio" | "manual";

export const VAGUE_DUE = "needs adviser confirmation";

export type Role = "adviser" | "counselor" | "guidance_head";

export interface User {
  id: string;
  name: string;
  label: string;
  role: Role;
  /** Demo SMS number for staff alerts (fictional). */
  phone?: string;
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  section: string;
  adviserId: string;
  sensitivity: Sensitivity;
  aliases: string[];
  guardianName: string;
  guardianPhone: string;
}

/** A piece of report text plus the transcript paragraph indices that support it. */
export interface Sourced {
  text: string;
  src: number[];
}

export interface InfoItem extends Sourced {
  label: string;
}

export interface Mention {
  studentId: string;
  name: string;
  phrase: string;
}

export interface SpeakerLabel {
  p: number;
  speaker: Speaker;
  inferred: boolean;
}

/** The formal case report (structure from the kindra-prototype formal case reports). */
export interface CaseReport {
  participants: string;
  concerns: Category[];
  presentingConcern: Sourced;
  relevantInfo: InfoItem[];
  guidanceImpression: Sourced;
  strengths: Sourced;
  limitations: Sourced;
  monitoring: Sourced;
  escalation: Sourced | null;
  recommendation: Sourced;
  studentMentions: Mention[];
  speakers: SpeakerLabel[];
  checksConfirmed: string[];
}

/** A conference case. `report` and `documentedAt` stay null until the adviser approves a report. */
export interface CaseRecord {
  id: string;
  studentId: string;
  caseType: string;
  conferenceAt: string;
  documentedAt: string | null;
  status: CaseStatus;
  statusNote: string;
  nextReview: string | null;
  sourceType: SourceType | null;
  preparedBy: string | null;
  reviewedBy: string | null;
  report: CaseReport | null;
  /** Transcript or notes text, kept so citations stay traceable. Audio is never stored. */
  sourceParagraphs: string[];
}

export interface ActionItem {
  id: string;
  caseId: string;
  studentId: string;
  action: string;
  owner: string;
  dueDate: string | null;
  dueText: string;
  status: ItemStatus;
  src: number[];
  updatedAt: string;
  updatedBy: string;
}

export interface ContactChange {
  id: string;
  studentId: string;
  oldPhone: string;
  newPhone: string;
  changedBy: string;
  changedAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  entityType: "student" | "case" | "action_item" | "contact" | "notification" | "draft" | "alert" | "sheet";
  entityId: string;
  studentId: string | null;
  detail: string;
}

/* ---------- Drafting ---------- */

export interface DraftActionItem {
  action: string;
  owner: string;
  due: string;
  src: number[];
}

/** What the model returns. Only ever placeholders, never real names. */
export interface ModelDraft {
  caseType: string;
  participants: string;
  speakers: SpeakerLabel[];
  concerns: Category[];
  presentingConcern: Sourced;
  relevantInfo: InfoItem[];
  guidanceImpression: Sourced;
  strengths: Sourced;
  limitations: Sourced;
  actionPlan: DraftActionItem[];
  monitoring: Sourced;
  escalation: Sourced | null;
  recommendation: Sourced;
  statusNote: string;
  checks: string[];
  contactChangeReported: boolean;
  ignoredInstruction: boolean;
}

export interface DraftMention {
  token: string;
  alias: string;
  phrase: string;
  paragraph: number;
  candidates: { studentId: string; name: string }[];
}

export interface Draft extends ModelDraft {
  mentions: DraftMention[];
}

export interface DraftResponse {
  draft: Draft;
  paragraphs: string[];
  modelInput: string[];
  mode: "openai" | "sample" | "sample-prewritten";
}

/* ---------- Urgent alerts ("Act faster") ---------- */

export const URGENT_CONCERNS = ["self_harm", "depression", "mental_health", "family", "disengagement"] as const;
export type UrgentConcern = (typeof URGENT_CONCERNS)[number];

/**
 * pending  = waiting for the counselor to approve contacting the family
 * sent     = guardian contacted (simulated SMS/call)
 * withheld = counselor decided not to contact the family
 */
export type GuardianContactStatus = "pending" | "sent" | "withheld";

export interface UrgentAlert {
  id: string;
  studentId: string;
  caseId: string | null;
  concern: UrgentConcern;
  /** Short adviser note shown only inside Kindra. Never sent by SMS. */
  note: string;
  raisedBy: string;
  raisedAt: string;
  respondBy: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  escalatedAt: string | null;
  guardianContact: GuardianContactStatus;
  guardianDecisionBy: string | null;
  guardianDecisionAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export type MessageRecipient = "counselor" | "guardian" | "guidance_head";
export type MessageChannel = "sms" | "call";

/** An outgoing SMS or call script. In the prototype these are simulated: recorded, never sent. */
export interface AlertMessage {
  id: string;
  alertId: string;
  studentId: string;
  recipient: MessageRecipient;
  channel: MessageChannel;
  toName: string;
  toPhone: string;
  text: string;
  delivery: "simulated";
  at: string;
}
