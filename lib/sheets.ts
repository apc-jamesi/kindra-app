import "server-only";
import { after } from "next/server";
import { config } from "./config";
import { formatDateTime } from "./format";
import { googleOAuthToken } from "./googleAuth";
import { daysOverdue, isOverdue } from "./metrics";
import type { Store } from "./store/types";
import type { ActionItem, Student } from "./types";

/**
 * Action-item tracker in Google Sheets: one spreadsheet per section, e.g. "Kindra action items – 11-STEM A",
 * so each adviser can be given only their own section's file (sharing is done by hand in Google Drive).
 *
 * One-way: Kindra → Sheet. Every update rewrites the sheet from Kindra, so Kindra stays the source of truth and
 * every status change stays in the audit log. Edits made in the sheet are overwritten.
 * Restricted records are never copied. Text is written RAW, so nothing in an action item can run as a formula.
 *
 * Turned on by SHEETS_TRACKER=on plus the Google OAuth account (GOOGLE_OAUTH_*); its `drive` permission covers Sheets.
 * The Google Cloud project needs the Google Sheets API and Google Drive API enabled. New spreadsheets go into
 * GOOGLE_DRIVE_FOLDER_ID if set, otherwise My Drive. Spreadsheets are found again by a hidden Drive property, so
 * renaming or moving one is fine.
 */

const ITEMS_TAB = "Action items";
const ABOUT_TAB = "About";
const APP_KEY = "kindraTracker";
const HEADER = ["Student", "Action", "Owner", "Due date", "Due note", "Status", "Days overdue", "Case", "Last updated", "Updated by"];
const WIDTHS = [170, 380, 170, 100, 170, 100, 100, 90, 170, 170];

export interface Tracker {
  section: string;
  id: string;
  url: string;
}

const trackers = new Map<string, Tracker>();
const queues = new Map<string, Promise<unknown>>();

class GoogleError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function google<T = Record<string, unknown>>(token: string, url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new GoogleError(json?.error?.message ?? `Google returned ${res.status}`, res.status);
  return json as T;
}

const DRIVE = "https://www.googleapis.com/drive/v3/files";
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const sheetUrl = (id: string) => `https://docs.google.com/spreadsheets/d/${id}/edit`;
const quoteQuery = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

async function findTracker(token: string, section: string): Promise<Tracker | null> {
  const q =
    `appProperties has { key='${APP_KEY}' and value='${quoteQuery(section)}' } and trashed = false ` +
    `and mimeType = 'application/vnd.google-apps.spreadsheet'`;
  const params = new URLSearchParams({ q, fields: "files(id)", supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
  const { files } = await google<{ files: { id: string }[] }>(token, `${DRIVE}?${params}`);
  return files?.[0] ? { section, id: files[0].id, url: sheetUrl(files[0].id) } : null;
}

async function createTracker(token: string, section: string): Promise<Tracker> {
  const created = await google<{ spreadsheetId: string; sheets: { properties: { sheetId: number; title: string } }[] }>(
    token, SHEETS, "POST", {
      properties: { title: `Kindra action items – ${section}`, locale: "en_US", timeZone: "Asia/Manila" },
      sheets: [
        { properties: { title: ITEMS_TAB, gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: ABOUT_TAB } },
      ],
    },
  );
  const id = created.spreadsheetId;
  const itemsSheetId = created.sheets.find((s) => s.properties.title === ITEMS_TAB)!.properties.sheetId;

  // Tag it so it is found again even if renamed, and move it into the Kindra folder when one is configured.
  const folder = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  const params = new URLSearchParams({ supportsAllDrives: "true" });
  if (folder) {
    const { parents = [] } = await google<{ parents?: string[] }>(token, `${DRIVE}/${id}?fields=parents&supportsAllDrives=true`);
    params.set("addParents", folder);
    if (parents.length) params.set("removeParents", parents.join(","));
  }
  await google(token, `${DRIVE}/${id}?${params}`, "PATCH", { appProperties: { [APP_KEY]: section } });

  const all = { sheetId: itemsSheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: HEADER.length };
  const rgb = (hex: string) => ({ red: parseInt(hex.slice(1, 3), 16) / 255, green: parseInt(hex.slice(3, 5), 16) / 255, blue: parseInt(hex.slice(5, 7), 16) / 255 });
  await google(token, `${SHEETS}/${id}:batchUpdate`, "POST", {
    requests: [
      {
        repeatCell: {
          range: { sheetId: itemsSheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: rgb("#FFFFFF") }, backgroundColor: rgb("#1F3A93") } },
          fields: "userEnteredFormat(textFormat,backgroundColor)",
        },
      },
      {
        repeatCell: {
          range: { ...all, startColumnIndex: 1, endColumnIndex: 2 },
          cell: { userEnteredFormat: { wrapStrategy: "WRAP", verticalAlignment: "TOP" } },
          fields: "userEnteredFormat(wrapStrategy,verticalAlignment)",
        },
      },
      ...WIDTHS.map((pixelSize, i) => ({
        updateDimensionProperties: {
          range: { sheetId: itemsSheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
          properties: { pixelSize },
          fields: "pixelSize",
        },
      })),
      // Overdue rows (Days overdue > 0) in red; Done rows greyed out.
      { addConditionalFormatRule: { index: 0, rule: { ranges: [all], booleanRule: { condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: "=$G2>0" }] }, format: { backgroundColor: rgb("#F8D7D0") } } } } },
      { addConditionalFormatRule: { index: 1, rule: { ranges: [all], booleanRule: { condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: '=$F2="Done"' }] }, format: { textFormat: { foregroundColor: rgb("#8A8A8A") } } } } } },
    ],
  });
  return { section, id, url: sheetUrl(id) };
}

const PROTECTION = "Kindra: read only";

/**
 * Both tabs get a warning-only protected range: anyone editing a cell is warned first, because the next update from
 * Kindra overwrites the edit. Kindra's own writes are not affected. Also applied to sheets made before this existed.
 */
async function ensureProtected(token: string, id: string) {
  const { sheets } = await google<{ sheets: { properties: { sheetId: number }; protectedRanges?: { description?: string }[] }[] }>(
    token, `${SHEETS}/${id}?fields=sheets(properties(sheetId),protectedRanges(description))`,
  );
  const requests = sheets
    .filter((s) => !(s.protectedRanges ?? []).some((p) => p.description === PROTECTION))
    .map((s) => ({ addProtectedRange: { protectedRange: { range: { sheetId: s.properties.sheetId }, description: PROTECTION, warningOnly: true } } }));
  if (requests.length) await google(token, `${SHEETS}/${id}:batchUpdate`, "POST", { requests });
}

const protectedIds = new Set<string>();

async function trackerFor(token: string, section: string): Promise<Tracker> {
  const known = trackers.get(section) ?? (await findTracker(token, section)) ?? (await createTracker(token, section));
  if (!protectedIds.has(known.id)) {
    await ensureProtected(token, known.id);
    protectedIds.add(known.id);
  }
  trackers.set(section, known);
  return known;
}

/** Rows for one section: non-Restricted students only; overdue first, then open items by due date, Done last. */
function sectionRows(section: string, students: Student[], items: ActionItem[], now: Date) {
  const names = new Map(students.filter((s) => s.section === section && s.sensitivity !== "Restricted").map((s) => [s.id, s.name]));
  const mine = items.filter((i) => names.has(i.studentId));
  const overdue = (i: ActionItem) => (isOverdue(i, now) ? daysOverdue(i, now) : 0);
  mine.sort(
    (a, b) =>
      Number(a.status === "Done") - Number(b.status === "Done") ||
      overdue(b) - overdue(a) ||
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
      a.id.localeCompare(b.id),
  );
  const rows = mine.map((i) => [
    names.get(i.studentId)!, i.action, i.owner.trim() || "No owner yet", i.dueDate ?? "", i.dueText ?? "", i.status,
    overdue(i) || "", i.caseId, formatDateTime(i.updatedAt), i.updatedBy,
  ]);
  return {
    rows,
    open: mine.filter((i) => i.status !== "Done").length,
    overdue: mine.filter((i) => overdue(i) > 0).length,
  };
}

async function writeSection(store: Store, section: string): Promise<Tracker & { items: number }> {
  const token = await googleOAuthToken();
  const [students, items] = await Promise.all([store.listStudents(), store.listActionItems()]);
  const now = new Date();
  const { rows, open, overdue } = sectionRows(section, students, items, now);
  const about = [
    ["Kindra action items", section],
    ["Last updated", formatDateTime(now.toISOString())],
    ["Items", rows.length],
    ["Open", open],
    ["Overdue", overdue],
    ["", ""],
    ["Read only", "Generated by Kindra. Changes made here are overwritten on the next update. Change statuses in Kindra so they are logged."],
    ["Not included", "Restricted records are never copied to this sheet."],
  ];

  const write = async (t: Tracker) => {
    await google(token, `${SHEETS}/${t.id}/values:batchClear`, "POST", { ranges: [`'${ITEMS_TAB}'!A1:J`, `'${ABOUT_TAB}'!A1:B`] });
    await google(token, `${SHEETS}/${t.id}/values:batchUpdate`, "POST", {
      valueInputOption: "RAW",
      data: [
        { range: `'${ITEMS_TAB}'!A1`, values: [HEADER, ...rows] },
        { range: `'${ABOUT_TAB}'!A1`, values: about },
      ],
    });
  };

  let tracker = await trackerFor(token, section);
  try {
    await write(tracker);
  } catch (err) {
    // The cached spreadsheet was deleted: find or create it again, once.
    if (!(err instanceof GoogleError && err.status === 404)) throw err;
    trackers.delete(section);
    tracker = await trackerFor(token, section);
    await write(tracker);
  }
  return { ...tracker, items: rows.length };
}

/** Rewrites one section's sheet. Updates for the same section run one at a time, in order. */
export function syncSection(store: Store, section: string): Promise<Tracker & { items: number }> {
  if (!config.sheetsConfigured) return Promise.reject(new Error("Google Sheets is not configured."));
  const next = (queues.get(section) ?? Promise.resolve()).catch(() => {}).then(() => writeSection(store, section));
  queues.set(section, next);
  return next;
}

/**
 * Updates the sheet after the response is sent, so the status change never waits for Google. `after()` keeps a
 * serverless function (e.g. on Vercel) alive until the update finishes. A Google problem is written to the audit log
 * and never blocks the change. Call only from a route handler or server action.
 */
export function syncSectionInBackground(store: Store, section: string) {
  if (!config.sheetsConfigured) return;
  after(() =>
    syncSection(store, section)
      .then(() => undefined)
      .catch((err) =>
        store
          .addAudit({
            actor: "Kindra (automatic)", action: "Google Sheet update failed", entityType: "sheet", entityId: section, studentId: null,
            detail: err instanceof Error ? err.message : String(err),
          })
          .catch(() => {}),
      ),
  );
}

/** Links to existing section sheets (never creates one). Errors are ignored so a page never fails on Google. */
export async function trackerLinks(sections: string[]): Promise<Tracker[]> {
  if (!config.sheetsConfigured) return [];
  const missing = sections.filter((s) => !trackers.has(s));
  if (missing.length) {
    try {
      const token = await googleOAuthToken();
      for (const section of missing) {
        const found = await findTracker(token, section);
        if (found) trackers.set(section, found);
      }
    } catch {
      /* shown as "not created yet" */
    }
  }
  return sections.flatMap((s) => (trackers.has(s) ? [trackers.get(s)!] : []));
}
