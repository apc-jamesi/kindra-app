import Link from "next/link";
import { Chip } from "@/components/Chips";
import { formatDateTime } from "@/lib/format";
import { currentUser, myStudents } from "@/lib/session";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const TONE = { approved: "ok", viewed: "neutral", notification: "brand", "status changed": "due" } as const;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const { student: studentFilter } = await searchParams;
  const user = await currentUser();
  const students = await myStudents(user);
  const names = new Map(students.map((s) => [s.id, s.name]));
  const entries = (await getStore().listAudit({ studentId: studentFilter, limit: 300 })).filter((e) =>
    e.studentId ? names.has(e.studentId) : e.actor === user.name,
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-charcoal">Who viewed, approved, changed or sent what, and when.</p>
        <h1 className="text-3xl font-bold">
          Audit log{studentFilter && names.get(studentFilter) ? ` · ${names.get(studentFilter)}` : ""}
        </h1>
        {studentFilter && (
          <Link href="/audit" className="text-sm text-brand hover:underline">
            Show all my advisees
          </Link>
        )}
      </div>
      <section className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-left text-xs text-charcoal">
              <tr>
                {["When", "Who", "Action", "Record", "Student", "Detail"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-2 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-line/70 align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{formatDateTime(e.at)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{e.actor}</td>
                  <td className="px-4 py-2.5">
                    <Chip tone={TONE[e.action as keyof typeof TONE] ?? "neutral"}>{e.action}</Chip>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {e.entityType === "case" || e.entityType === "notification" ? (
                      <Link href={`/cases/${e.entityId}`} className="text-brand hover:underline">{e.entityId}</Link>
                    ) : (
                      <span className="text-charcoal">{e.entityType}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {e.studentId ? <Link href={`/students/${e.studentId}`} className="hover:underline">{names.get(e.studentId)}</Link> : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-charcoal">{e.detail}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-charcoal">No entries yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
