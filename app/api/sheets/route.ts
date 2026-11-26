import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { errorMessage, fail } from "@/lib/http";
import { canAccess, signedInUser } from "@/lib/session";
import { syncSection } from "@/lib/sheets";
import { getStore } from "@/lib/store";

/**
 * "Update Google Sheet": rewrites the action-item sheet for every section the signed-in user can see
 * (an adviser's own section; every section for guidance staff). Creates a section's sheet the first time.
 */
export async function POST() {
  const user = await signedInUser();
  if (!user) return fail("Sign in required.", 401);
  if (!config.sheetsConfigured) return fail("Google Sheets is not configured.", 400);

  const store = getStore();
  const sections = [...new Set((await store.listStudents()).filter((s) => canAccess(user, s)).map((s) => s.section))].sort();
  const sheets: { section: string; url: string; items: number }[] = [];
  const errors: { section: string; error: string }[] = [];
  for (const section of sections) {
    try {
      const { url, items } = await syncSection(store, section);
      sheets.push({ section, url, items });
      await store.addAudit({ actor: user.name, action: "Google Sheet updated", entityType: "sheet", entityId: section, studentId: null, detail: `${items} item(s) · ${url}` });
    } catch (err) {
      errors.push({ section, error: errorMessage(err) });
      await store
        .addAudit({ actor: user.name, action: "Google Sheet update failed", entityType: "sheet", entityId: section, studentId: null, detail: errorMessage(err) })
        .catch(() => {});
    }
  }
  return NextResponse.json({ sheets, errors }, { status: sheets.length === 0 && errors.length ? 502 : 200 });
}
