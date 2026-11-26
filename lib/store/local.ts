import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { SEED_STUDENTS, seedActionItems, seedAlerts, seedAudit, seedCases, seedMessages } from "../seed";
import type { ActionItem, AlertMessage, AuditEntry, CaseRecord, ContactChange, Student, UrgentAlert } from "../types";
import type { Store } from "./types";

/** Sample-mode store: one JSON file in .data/ (gitignored). Fictional data only. */
interface Db {
  version: number;
  students: Student[];
  cases: CaseRecord[];
  actionItems: ActionItem[];
  contactChanges: ContactChange[];
  audit: AuditEntry[];
  alerts: UrgentAlert[];
  messages: AlertMessage[];
}

const VERSION = 3; // 3: urgent alerts + outbox
const FILE = path.join(process.cwd(), ".data", "kindra-db.json");

const fresh = (): Db => ({
  version: VERSION,
  students: structuredClone(SEED_STUDENTS),
  cases: seedCases(),
  actionItems: seedActionItems(),
  contactChanges: [],
  audit: seedAudit(),
  alerts: seedAlerts(),
  messages: seedMessages(),
});

async function load(): Promise<Db> {
  try {
    const db = JSON.parse(await fs.readFile(FILE, "utf8")) as Db;
    if (db.version === VERSION) return db;
  } catch {
    /* missing or unreadable: reseed below */
  }
  const db = fresh();
  await save(db);
  return db;
}

// Serialize writes so concurrent requests don't overwrite each other.
let queue: Promise<unknown> = Promise.resolve();
async function mutate<T>(fn: (db: Db) => T): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = fn(db);
    await save(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

async function save(db: Db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2), "utf8");
}

const desc = <T,>(key: (x: T) => string) => (a: T, b: T) => key(b).localeCompare(key(a));

export const localStore: Store = {
  async listStudents() {
    return (await load()).students.sort((a, b) => a.id.localeCompare(b.id));
  },
  async getStudent(id) {
    return (await load()).students.find((s) => s.id === id) ?? null;
  },

  async listCases(filter = {}) {
    return (await load()).cases
      .filter((c) => !filter.studentId || c.studentId === filter.studentId)
      .sort(desc((c) => c.conferenceAt));
  },
  async getCase(id) {
    return (await load()).cases.find((c) => c.id === id) ?? null;
  },
  async saveCase(record) {
    return mutate((db) => {
      const i = db.cases.findIndex((c) => c.id === record.id);
      if (i >= 0) db.cases[i] = record;
      else db.cases.push(record);
      return record;
    });
  },
  async updateCase(id, patch) {
    return mutate((db) => {
      const c = db.cases.find((x) => x.id === id);
      if (!c) throw new Error("Case not found");
      Object.assign(c, patch);
      return c;
    });
  },

  async listActionItems(filter = {}) {
    return (await load()).actionItems.filter(
      (a) => (!filter.studentId || a.studentId === filter.studentId) && (!filter.caseId || a.caseId === filter.caseId),
    );
  },
  async addActionItems(items) {
    await mutate((db) => {
      db.actionItems.push(...items);
    });
  },
  async updateActionItem(id, patch) {
    return mutate((db) => {
      const a = db.actionItems.find((x) => x.id === id);
      if (!a) throw new Error("Action item not found");
      Object.assign(a, patch);
      return a;
    });
  },

  async listContactChanges(studentId) {
    return (await load()).contactChanges.filter((c) => c.studentId === studentId).sort(desc((c) => c.changedAt));
  },
  async updateGuardianPhone(studentId, newPhone, changedBy) {
    return mutate((db) => {
      const s = db.students.find((x) => x.id === studentId);
      if (!s) throw new Error("Student not found");
      const change: ContactChange = {
        id: randomUUID(), studentId, oldPhone: s.guardianPhone, newPhone, changedBy, changedAt: new Date().toISOString(),
      };
      s.guardianPhone = newPhone;
      db.contactChanges.push(change);
      return change;
    });
  },

  async listAlerts(filter = {}) {
    return (await load()).alerts
      .filter((a) => (!filter.studentId || a.studentId === filter.studentId) && (filter.open === undefined || !a.resolvedAt === filter.open))
      .sort(desc((a) => a.raisedAt));
  },
  async getAlert(id) {
    return (await load()).alerts.find((a) => a.id === id) ?? null;
  },
  async addAlert(alert) {
    return mutate((db) => {
      db.alerts.push(alert);
      return alert;
    });
  },
  async updateAlert(id, patch) {
    return mutate((db) => {
      const a = db.alerts.find((x) => x.id === id);
      if (!a) throw new Error("Alert not found");
      Object.assign(a, patch);
      return a;
    });
  },
  async claimEscalation(id, at) {
    return mutate((db) => {
      const a = db.alerts.find((x) => x.id === id);
      if (!a || a.escalatedAt || a.acknowledgedAt || a.resolvedAt) return false;
      a.escalatedAt = at;
      return true;
    });
  },
  async listMessages(filter = {}) {
    return (await load()).messages
      .filter((m) => !filter.alertId || m.alertId === filter.alertId)
      .sort(desc((m) => m.at))
      .slice(0, filter.limit ?? 200);
  },
  async addMessages(messages) {
    if (!messages.length) return;
    await mutate((db) => {
      db.messages.push(...messages);
    });
  },

  async addAudit(entry) {
    await mutate((db) => {
      db.audit.push({ ...entry, id: randomUUID(), at: new Date().toISOString() });
    });
  },
  async listAudit(filter = {}) {
    return (await load()).audit
      .filter(
        (e) => (!filter.studentId || e.studentId === filter.studentId) && (!filter.entityId || e.entityId === filter.entityId),
      )
      .sort(desc((e) => e.at))
      .slice(0, filter.limit ?? 200);
  },
};
