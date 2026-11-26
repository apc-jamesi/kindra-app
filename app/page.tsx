import Link from "next/link";
import { Kpi } from "@/components/Chips";
import StudentIndex, { type IndexRow } from "@/components/StudentIndex";
import { isStaff, needsAck } from "@/lib/alerts";
import { visibleAlerts } from "@/lib/alertViews";
import { formatDateTime } from "@/lib/format";
import { onTimeRate, summarize, timeliness } from "@/lib/metrics";
import { currentUser, myStudents } from "@/lib/session";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  const store = getStore();
  const [students, allCases, allItems, { alerts }] = await Promise.all([myStudents(user), store.listCases(), store.listActionItems(), visibleAlerts(user)]);
  const openAlerts = alerts.filter((a) => !a.resolvedAt);
  const waiting = openAlerts.filter((a) => needsAck(a) || a.guardianContact === "pending");
  const ids = new Set(students.map((s) => s.id));
  const cases = allCases.filter((c) => ids.has(c.studentId));
  const items = allItems.filter((i) => ids.has(i.studentId));

  const rows: IndexRow[] = students.map((s) => {
    const m = summarize(cases.filter((c) => c.studentId === s.id), items.filter((i) => i.studentId === s.id));
    return {
      id: s.id, name: s.name, grade: s.grade, section: s.section, sensitivity: s.sensitivity,
      openCases: m.openCases, openItems: m.openItems, overdue: m.overdue,
      latestConference: m.latestConference, latestConferenceLabel: m.latestConference ? formatDateTime(m.latestConference) : "",
      docStatus: m.docStatus,
    };
  });

  const all = summarize(cases, items);
  const rate = onTimeRate(cases);
  const pending = cases.filter((c) => timeliness(c).key === "pending");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-charcoal">{user.label}</p>
          <h1 className="text-3xl font-bold">
            Good day, {user.name}. <span className="font-serif font-normal italic text-brand">Let&apos;s follow through.</span>
          </h1>
        </div>
        <Link href="/cases/new" className="btn-primary">
          + New report
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Documented within 24 h"
          value={rate === null ? "—" : `${Math.round(rate * 100)}%`}
          alert={rate !== null && rate < 0.95}
          hint="Pilot target: 95%"
        />
        <Kpi label="Reports pending" value={pending.length} alert={pending.length > 0} hint="Conferences without an approved report" />
        <Kpi label="Overdue action items" value={all.overdue} alert={all.overdue > 0} />
        <Kpi label="Items with no owner" value={all.unassigned} alert={all.unassigned > 0} hint="Every item needs a named owner" />
      </div>

      {openAlerts.length > 0 && (
        <section className="card flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-terracotta bg-late-bg/50">
          <div>
            <h2 className="text-lg font-bold">
              {openAlerts.length} open urgent alert{openAlerts.length === 1 ? "" : "s"}
            </h2>
            <p className="text-sm text-charcoal">
              {isStaff(user)
                ? `${waiting.length} need${waiting.length === 1 ? "s" : ""} your acknowledgement or a family-contact decision.`
                : "The guidance counselor is handling these. Follow their status on the Alerts page."}
            </p>
          </div>
          <Link href="/alerts" className="btn-primary">Open alerts</Link>
        </section>
      )}

      {pending.length > 0 && (
        <section className="card border-l-4 border-l-terracotta">
          <h2 className="text-lg font-bold">Reports waiting to be documented</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {pending.map((c) => {
              const s = students.find((x) => x.id === c.studentId)!;
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>{s.name}</strong> · {c.caseType} · conference {formatDateTime(c.conferenceAt)} ·{" "}
                    <span className="text-late-text">{timeliness(c).label}</span>
                  </span>
                  <Link href={`/cases/new?student=${s.id}&case=${c.id}`} className="btn-ghost py-1">
                    Write report
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <StudentIndex rows={rows} />
      <p className="text-xs text-charcoal">
        You see only your own advisees (assignment-based access). Documentation status compares the conference time with the time the report was approved (target: within
        24 hours).
      </p>
    </div>
  );
}
