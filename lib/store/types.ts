import type { ActionItem, AlertMessage, AuditEntry, CaseRecord, ContactChange, Student, UrgentAlert } from "../types";

export type NewAudit = Omit<AuditEntry, "id" | "at">;

export interface Store {
  listStudents(): Promise<Student[]>;
  getStudent(id: string): Promise<Student | null>;

  listCases(filter?: { studentId?: string }): Promise<CaseRecord[]>;
  getCase(id: string): Promise<CaseRecord | null>;
  /** Inserts a new case, or replaces a pending one with the same id. */
  saveCase(record: CaseRecord): Promise<CaseRecord>;
  updateCase(id: string, patch: Partial<Pick<CaseRecord, "status" | "nextReview" | "statusNote">>): Promise<CaseRecord>;

  listActionItems(filter?: { studentId?: string; caseId?: string }): Promise<ActionItem[]>;
  addActionItems(items: ActionItem[]): Promise<void>;
  updateActionItem(id: string, patch: Pick<ActionItem, "status" | "updatedAt" | "updatedBy">): Promise<ActionItem>;

  listContactChanges(studentId: string): Promise<ContactChange[]>;
  /** Updates the guardian phone and writes a contact_changes row. Only after adviser verification. */
  updateGuardianPhone(studentId: string, newPhone: string, changedBy: string): Promise<ContactChange>;

  listAlerts(filter?: { studentId?: string; open?: boolean }): Promise<UrgentAlert[]>;
  getAlert(id: string): Promise<UrgentAlert | null>;
  addAlert(alert: UrgentAlert): Promise<UrgentAlert>;
  updateAlert(
    id: string,
    patch: Partial<Omit<UrgentAlert, "id" | "studentId" | "caseId" | "concern" | "note" | "raisedBy" | "raisedAt" | "respondBy">>,
  ): Promise<UrgentAlert>;
  /** Atomically marks an unacknowledged alert as escalated. Returns false if it was already escalated or acknowledged. */
  claimEscalation(id: string, at: string): Promise<boolean>;
  listMessages(filter?: { alertId?: string; limit?: number }): Promise<AlertMessage[]>;
  addMessages(messages: AlertMessage[]): Promise<void>;

  addAudit(entry: NewAudit): Promise<void>;
  listAudit(filter?: { studentId?: string; entityId?: string; limit?: number }): Promise<AuditEntry[]>;
}
