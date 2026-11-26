import ActionItemsTable from "@/components/ActionItemsTable";
import SheetSyncPanel from "@/components/SheetSyncPanel";
import { config } from "@/lib/config";
import { nowManila } from "@/lib/format";
import { trackerLinks } from "@/lib/sheets";
import { isOverdue } from "@/lib/metrics";
import { currentUser, myStudents } from "@/lib/session";
import { getStore } from "@/lib/store";
import type { ActionItem } from "@/lib/types";
import { toItemRows } from "@/lib/views";

export const dynamic = "force-dynamic";

const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Due and overdue action items for the signed-in user's students, in Manila time. */
export default async function RemindersPage() {
  const user = await currentUser();
  const students = await myStudents(user);
  const names = new Map(students.map((s) => [s.id, s.name]));
  const items = (await getStore().listActionItems()).filter((i) => names.has(i.studentId) && i.status !== "Done");
  const today = nowManila().date;
  const week = addDays(today, 7);
  const links = await trackerLinks([...new Set(students.map((s) => s.section))].sort());

  const groups: { title: string; hint: string; items: ActionItem[]; tone: string }[] = [
    { title: "Overdue", hint: "Past the due date and not done", items: items.filter((i) => isOverdue(i)), tone: "border-l-terracotta" },
    { title: "Due today", hint: today, items: items.filter((i) => i.dueDate === today && !isOverdue(i)), tone: "border-l-gold" },
    { title: "Due in the next 7 days", hint: `until ${week}`, items: items.filter((i) => i.dueDate && i.dueDate > today && i.dueDate <= week), tone: "border-l-brand" },
    { title: "No due date", hint: "Needs a date from the adviser", items: items.filter((i) => !i.dueDate), tone: "border-l-line" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-charcoal">{user.label}</p>
        <h1 className="text-3xl font-bold">
          Reminders <span className="font-serif font-normal italic text-brand">Nothing slips.</span>
        </h1>
        <p className="mt-1 text-sm text-charcoal">Open action items for your students, by due date. Change a status here and it updates everywhere.</p>
      </div>
      {config.sheetsConfigured && <SheetSyncPanel links={links.map(({ section, url }) => ({ section, url }))} />}
      {groups.map((g) => (
        <section key={g.title} className={`card border-l-4 ${g.tone}`}>
          <h2 className="mb-3 text-lg font-bold">
            {g.title} <span className="text-sm font-normal text-charcoal">· {g.items.length} · {g.hint}</span>
          </h2>
          <ActionItemsTable items={toItemRows(g.items).map((r, i) => ({ ...r, studentId: g.items[i].studentId, studentName: names.get(g.items[i].studentId) }))} />
        </section>
      ))}
    </div>
  );
}
