import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ActionItemsTable from "@/components/ActionItemsTable";
import CaseControls from "@/components/CaseControls";
import { Chip, ConcernChips, SensitivityChip, TimelinessChip } from "@/components/Chips";
import NoAccess from "@/components/NoAccess";
import NotifyButton from "@/components/NotifyButton";
import SourceChips from "@/components/SourceChips";
import Transcript from "@/components/Transcript";
import { formatDateTime, formatDay } from "@/lib/format";
import { timeliness } from "@/lib/metrics";
import { accessibleStudent } from "@/lib/session";
import { getStore } from "@/lib/store";
import type { Sourced } from "@/lib/types";
import { toItemRows } from "@/lib/views";

export const dynamic = "force-dynamic";

const SOURCE_LABEL = { written: "Written notes", audio: "Recording transcript", manual: "Completed manually" };

function Section({ title, value, label }: { title?: string; value: Sourced | null; label?: string }) {
  if (!value || !value.text.trim()) return null;
  return (
    <div className="space-y-1">
      {title && <h3 className="text-sm font-bold">{title}</h3>}
      {label && <p className="label mb-0">{label}</p>}
      <p className="leading-relaxed">{value.text}</p>
      <SourceChips src={value.src} />
    </div>
  );
}

export default async function CasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const store = getStore();
  const record = await store.getCase(id);
  if (!record) notFound();
  const { user, student } = await accessibleStudent(record.studentId);
  if (!student) return <NoAccess what="this case" />;
  if (!record.report) redirect(`/cases/new?student=${student.id}&case=${record.id}`);

  await store.addAudit({ actor: user.name, action: "viewed", entityType: "case", entityId: id, studentId: student.id, detail: "Opened case report" });
  const [items, audit] = await Promise.all([store.listActionItems({ caseId: id }), store.listAudit({ entityId: id, limit: 20 })]);
  const r = record.report;

  return (
    <div className="space-y-6">
      {saved && (
        <div className="rounded-lg border border-ok-text/30 bg-ok-bg p-4 text-sm text-ok-text">
          Report approved and saved to {student.name}&apos;s case history.
          {r.studentMentions.some((m) => m.studentId !== student.id) && " Other students mentioned were not given a case."}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/students/${student.id}`} className="text-sm text-charcoal hover:text-brand">
            ← {student.name}
          </Link>
          <h1 className="mt-1 text-3xl font-bold">
            {record.caseType} <span className="text-charcoal">· {record.id}</span>
          </h1>
          <p className="mt-1 text-sm text-charcoal">
            Conference {formatDateTime(record.conferenceAt)} · {record.sourceType ? SOURCE_LABEL[record.sourceType] : ""} · Prepared by{" "}
            {record.preparedBy} · Approved by {record.reviewedBy}, {record.documentedAt && formatDateTime(record.documentedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SensitivityChip value={student.sensitivity} />
          <TimelinessChip t={timeliness(record)} />
          <Chip tone={record.status === "Closed" ? "ok" : "due"}>{record.statusNote || record.status}</Chip>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        <article className="card space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label">Participants</p>
              <p>{r.participants || "—"}</p>
            </div>
            <div>
              <p className="label">Concerns</p>
              <ConcernChips concerns={r.concerns} />
            </div>
          </div>

          <Section title="Presenting concern" value={r.presentingConcern} />

          {r.relevantInfo.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold">Relevant information shared</h3>
              {r.relevantInfo.map((i, k) => (
                <Section key={k} label={i.label} value={i} />
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-bold">Initial assessment</h3>
            <Section label="Guidance impression" value={r.guidanceImpression} />
            <Section label="Strengths and protective factors" value={r.strengths} />
            <Section label="Limitations" value={r.limitations} />
          </div>

          <Section title="Monitoring and follow-up" value={r.monitoring} />
          {r.escalation && (
            <div className="rounded-md border-l-4 border-l-terracotta bg-late-bg/50 p-3">
              <Section title="Escalation" value={r.escalation} />
            </div>
          )}
          <Section title="Recommendation" value={r.recommendation} />

          {r.studentMentions.length > 0 && (
            <div>
              <h3 className="text-sm font-bold">Students mentioned</h3>
              <ul className="mt-1 space-y-1 text-sm">
                {r.studentMentions.map((m) => (
                  <li key={m.studentId}>
                    <span className="font-semibold">{m.name}</span> <span className="text-charcoal">— “{m.phrase}”</span>
                    {m.studentId !== student.id && <span className="ml-1 text-xs text-charcoal">(mention only; no case in their history)</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {r.checksConfirmed.length > 0 && (
            <div>
              <h3 className="text-sm font-bold">Checked before approval</h3>
              <ul className="mt-1 space-y-1 text-sm text-charcoal">
                {r.checksConfirmed.map((c, k) => (
                  <li key={k}>✓ {c}</li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <aside className="space-y-6">
          <section className="card">
            <h2 className="mb-2 text-lg font-bold">Source {record.sourceType === "audio" ? "transcript" : "notes"}</h2>
            <p className="mb-3 text-xs text-charcoal">Click a P-number in the report to highlight its paragraph. “?” marks inferred speakers.</p>
            <div className="max-h-[70vh] overflow-y-auto pr-1">
              <Transcript paragraphs={record.sourceParagraphs} speakers={r.speakers} />
            </div>
          </section>
        </aside>
      </div>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">Agreed action plan</h2>
        <ActionItemsTable items={toItemRows(items)} showCase={false} />
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <section className="card">
          <h2 className="mb-3 text-lg font-bold">Case status</h2>
          <CaseControls caseId={record.id} status={record.status} nextReview={record.nextReview} />
          {record.nextReview && <p className="mt-2 text-xs text-charcoal">Next review {formatDay(record.nextReview)}</p>}
        </section>
        <section className="card">
          <h2 className="mb-3 text-lg font-bold">Notify</h2>
          <NotifyButton caseId={record.id} />
        </section>
        <section className="card">
          <h2 className="mb-3 text-lg font-bold">Audit trail</h2>
          <ul className="max-h-48 space-y-1.5 overflow-y-auto text-xs">
            {audit.map((e) => (
              <li key={e.id}>
                <span className="font-semibold">{e.action}</span> · {e.actor} · {formatDateTime(e.at)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
