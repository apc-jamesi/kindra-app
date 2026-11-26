import Link from "next/link";
import AlertCard from "@/components/AlertCard";
import { escalateMinutes, isStaff } from "@/lib/alerts";
import { toAlertRow, visibleAlerts } from "@/lib/alertViews";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const user = await currentUser();
  const { alerts, students } = await visibleAlerts(user);
  const rows = alerts.map((a) => toAlertRow(a, students.get(a.studentId)!));
  const open = rows
    .filter((a) => !a.resolvedAt)
    .sort((a, b) => Number(Boolean(a.acknowledgedAt)) - Number(Boolean(b.acknowledgedAt)) || b.raisedAt.localeCompare(a.raisedAt));
  const closed = rows.filter((a) => a.resolvedAt);
  const staff = isStaff(user);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-charcoal">{staff ? "Every urgent alert in the SHS" : "Urgent alerts for your advisees"}</p>
          <h1 className="text-3xl font-bold">
            Urgent alerts <span className="font-serif font-normal italic text-brand">Act faster.</span>
          </h1>
        </div>
        <Link href="/outbox" className="btn-ghost">Outbox (simulated SMS)</Link>
      </div>
      <p className="text-sm text-charcoal">
        {staff
          ? `Acknowledge new alerts within ${escalateMinutes()} minutes, or they go to the guidance head. You decide whether the family is contacted for sensitive concerns.`
          : "Raise an alert from a student's record. The guidance counselor acts on it; you can follow its status here."}
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Open ({open.length})</h2>
        {open.length === 0 ? <p className="card text-sm text-charcoal">No open alerts.</p> : open.map((a) => <AlertCard key={a.id} alert={a} canAct={staff} />)}
      </section>
      {closed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Resolved ({closed.length})</h2>
          {closed.map((a) => <AlertCard key={a.id} alert={a} canAct={false} />)}
        </section>
      )}
    </div>
  );
}
