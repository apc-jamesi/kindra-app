import Link from "next/link";
import { notFound } from "next/navigation";
import ActionItemsTable from "@/components/ActionItemsTable";
import AlertCard from "@/components/AlertCard";
import RaiseAlertForm from "@/components/RaiseAlertForm";
import { CONCERN_RULES, escalateMinutes, isStaff, runEscalations } from "@/lib/alerts";
import { toAlertRow } from "@/lib/alertViews";
import { Chip, ConcernChips, Kpi, SensitivityChip, TimelinessChip } from "@/components/Chips";
import ContactUpdateForm from "@/components/ContactUpdateForm";
import NoAccess from "@/components/NoAccess";
import { config } from "@/lib/config";
import { formatDateTime, formatDay } from "@/lib/format";
import { summarize, timeliness } from "@/lib/metrics";
import { accessibleStudent } from "@/lib/session";
import { getStore } from "@/lib/store";
import { USERS } from "@/lib/seed";
import { URGENT_CONCERNS } from "@/lib/types";
import { toItemRows } from "@/lib/views";

export const dynamic = "force-dynamic";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, student, exists } = await accessibleStudent(id);
  if (!exists) notFound();
  if (!student) return <NoAccess what="this student's record" />;

  const store = getStore();
  await runEscalations(store);
  const [cases, items, changes, alerts] = await Promise.all([
    store.listCases({ studentId: id }),
    store.listActionItems({ studentId: id }),
    store.listContactChanges(id),
    store.listAlerts({ studentId: id }),
  ]);
  const concernOptions = URGENT_CONCERNS.map((c) => ({
    value: c, label: CONCERN_RULES[c].label, level: CONCERN_RULES[c].level,
    familyPolicy: CONCERN_RULES[c].guardianPolicy, firstStep: CONCERN_RULES[c].firstStep,
  }));
  // Every record view is logged (who viewed what, and when).
  await store.addAudit({ actor: user.name, action: "viewed", entityType: "student", entityId: id, studentId: id, detail: "Opened student record" });

  const m = summarize(cases, items);
  const adviser = USERS.find((u) => u.id === student.adviserId);

  // Monitoring timeline: conference, documentation, review per case, plus approvals.
  type Ev = { at: string; label: string; status: string; tone: "ok" | "late" | "due" };
  const events: Ev[] = [];
  const today = new Date();
  for (const c of cases) {
    const t = timeliness(c);
    events.push({ at: c.conferenceAt, label: `${c.caseType} conference (${c.id})`, status: "Held", tone: "ok" });
    events.push(
      c.documentedAt
        ? { at: c.documentedAt, label: `Case report approved (${c.id}) by ${c.reviewedBy}`, status: t.key === "ok" ? "On time" : "Late", tone: t.key === "ok" ? "ok" : "late" }
        : { at: c.conferenceAt, label: `Case report pending (${c.id})`, status: "Overdue", tone: "late" },
    );
    if (c.nextReview) {
      const past = new Date(`${c.nextReview}T23:59:59+08:00`) < today;
      events.push({
        at: `${c.nextReview}T09:00:00+08:00`,
        label: `Monitoring review (${c.id})`,
        status: c.status === "Closed" ? "Closed" : past ? "Due, not recorded" : "Scheduled",
        tone: past && c.status !== "Closed" ? "late" : "due",
      });
    }
  }
  events.sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-charcoal hover:text-brand">
        ← My advisees
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{student.name}</h1>
          <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-charcoal">
            <span>ID {student.id}</span>
            <span>{student.grade} · {student.section}</span>
            <span>Adviser: {adviser?.name}</span>
            {student.aliases.length > 0 && <span>Also called {student.aliases.join(", ")}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SensitivityChip value={student.sensitivity} />
          <Link href={`/cases/new?student=${student.id}`} className="btn-primary">
            + New report
          </Link>
        </div>
      </div>

      {student.sensitivity === "Restricted" && (
        <p className="rounded-md border border-restricted-text/20 bg-restricted-bg p-3 text-sm text-restricted-text">
          Restricted record. Access is limited to the assigned adviser and authorized staff, and every view is logged.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Open cases" value={m.openCases} />
        <Kpi label="Open action items" value={m.openItems} />
        <Kpi label="Overdue action items" value={m.overdue} alert={m.overdue > 0} />
        <Kpi label="Next review" value={m.nextReview ? formatDay(m.nextReview) : "None"} />
      </div>

      <section className="card p-0">
        <h2 className="border-b border-line p-4 text-lg font-bold">Cases</h2>
        {cases.length === 0 ? (
          <p className="p-4 text-sm text-charcoal">
            No cases yet. Being mentioned in another student&apos;s report does not add a case here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-left text-xs text-charcoal">
                <tr>
                  {["Case", "Type", "Conference", "Documented", "Timeliness", "Status", "Next review"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-2 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id} className="border-t border-line/70 align-top">
                    <td className="px-4 py-3">
                      {c.documentedAt ? (
                        <Link href={`/cases/${c.id}`} className="font-semibold text-brand hover:underline">{c.id}</Link>
                      ) : (
                        <span className="font-semibold">{c.id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.caseType}
                      {c.report && <span className="mt-1 block"><ConcernChips concerns={c.report.concerns} /></span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDateTime(c.conferenceAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {c.documentedAt ? formatDateTime(c.documentedAt) : (
                        <Link href={`/cases/new?student=${student.id}&case=${c.id}`} className="btn-ghost py-1">Write report</Link>
                      )}
                    </td>
                    <td className="px-4 py-3"><TimelinessChip t={timeliness(c)} /></td>
                    <td className="px-4 py-3"><Chip tone={c.status === "Closed" ? "ok" : "due"}>{c.statusNote || c.status}</Chip></td>
                    <td className="whitespace-nowrap px-4 py-3">{c.nextReview ? formatDay(c.nextReview) : <span className="text-charcoal">None</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-3 text-lg font-bold">Action items</h2>
            <ActionItemsTable items={toItemRows(items)} />
          </section>
          {alerts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold">Urgent alerts</h2>
              {alerts.map((a) => <AlertCard key={a.id} alert={toAlertRow(a, student)} canAct={isStaff(user)} />)}
            </section>
          )}
          <section className="card">
            <h2 className="mb-3 text-lg font-bold">Monitoring timeline</h2>
            {events.length === 0 ? (
              <p className="text-sm text-charcoal">No monitoring events yet.</p>
            ) : (
              <ol className="divide-y divide-line/70">
                {events.map((e, i) => (
                  <li key={i} className="grid grid-cols-[130px_1fr_auto] items-start gap-3 py-2 text-sm">
                    <span className="font-semibold">{formatDay(e.at.slice(0, 10))}</span>
                    <span>{e.label}</span>
                    <Chip tone={e.tone}>{e.status}</Chip>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card space-y-3 border-t-4 border-t-terracotta">
            <h2 className="text-lg font-bold">Urgent concern?</h2>
            <p className="text-xs text-charcoal">
              Alerts the guidance counselor now. For sensitive concerns the counselor decides whether the family is contacted.
            </p>
            <RaiseAlertForm
              studentId={student.id}
              concerns={concernOptions}
              cases={cases.filter((c) => c.status !== "Closed").map((c) => ({ id: c.id, label: `${c.id} · ${c.caseType}` }))}
              escalateMinutes={escalateMinutes()}
              emailOn={config.gmailConfigured}
            />
          </section>
          <section className="card space-y-3">
            <h2 className="text-lg font-bold">Guardian contact</h2>
            <div>
              <p className="text-sm text-charcoal">{student.guardianName}</p>
              <p className="font-display text-lg font-semibold tabular-nums">{student.guardianPhone}</p>
            </div>
            <p className="text-xs text-charcoal">
              A phone change mentioned in a report is only logged as a concern. Update it here after you verify it.
            </p>
            <ContactUpdateForm studentId={student.id} />
          </section>
          <section className="card">
            <h2 className="text-sm font-bold">Contact change log</h2>
            {changes.length === 0 ? (
              <p className="mt-2 text-sm text-charcoal">No changes recorded.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {changes.map((c) => (
                  <li key={c.id} className="rounded-md bg-canvas p-2">
                    <p className="tabular-nums">{c.oldPhone} → {c.newPhone}</p>
                    <p className="text-xs text-charcoal">by {c.changedBy} · {formatDateTime(c.changedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <Link href={`/audit?student=${student.id}`} className="block text-sm text-brand hover:underline">
            View this student&apos;s audit trail →
          </Link>
        </aside>
      </div>
    </div>
  );
}
