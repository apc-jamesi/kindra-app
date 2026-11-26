"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Chip } from "./Chips";
import type { AlertRow } from "@/lib/alertViews";

const LEVEL_TONE = { crisis: "late", urgent: "late", high: "due" } as const;
const FAMILY_LABEL = {
  pending: "Family contact waiting for counselor approval",
  sent: "Family contacted (simulated SMS)",
  withheld: "Family not contacted (counselor decision)",
} as const;

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(iso));

function ago(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 1440) return `${Math.floor(min / 60)} h ago`;
  return `${Math.floor(min / 1440)} d ago`;
}

/** One urgent alert. Staff (counselor / guidance head) get the action buttons; advisers see the status. */
export default function AlertCard({ alert: a, canAct }: { alert: AlertRow; canAct: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withholding, setWithholding] = useState(false);
  const [reason, setReason] = useState("");

  async function act(action: string, extra: Record<string, string> = {}) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/alerts/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError(data.error ?? "Something went wrong.");
    setWithholding(false);
    router.refresh();
  }

  const closed = Boolean(a.resolvedAt);
  return (
    <article className={`card space-y-3 border-l-4 ${closed ? "border-l-line opacity-80" : a.level === "high" ? "border-l-gold" : "border-l-terracotta"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2">
            <Chip tone={LEVEL_TONE[a.level as keyof typeof LEVEL_TONE] ?? "due"}>{a.level.toUpperCase()}</Chip>
            <strong className="font-display text-lg">{a.concernLabel}</strong>
            <span className="text-xs text-charcoal">{a.id}</span>
          </p>
          <p className="mt-1 text-sm">
            <Link href={`/students/${a.studentId}`} className="font-semibold text-brand hover:underline">{a.studentName}</Link>
            {" · "}{a.section} · raised by {a.raisedBy} {ago(a.raisedAt)}
            {a.caseId && <> · case <Link href={`/cases/${a.caseId}`} className="text-brand hover:underline">{a.caseId}</Link></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {closed ? <Chip tone="ok">Resolved</Chip> : a.acknowledgedAt ? <Chip tone="ok">Acknowledged</Chip> : <Chip tone="late">Not acknowledged</Chip>}
          {a.escalatedAt && <Chip tone="restricted">Escalated to guidance head</Chip>}
          {a.overdueResponse && <Chip tone="late">Response overdue</Chip>}
        </div>
      </div>

      {a.note && <p className="rounded-md bg-canvas p-3 text-sm">{a.note}</p>}

      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div><dt className="inline text-charcoal">First step: </dt><dd className="inline">{a.firstStep}</dd></div>
        <div><dt className="inline text-charcoal">Respond by: </dt><dd className="inline">{fmt(a.respondBy)}</dd></div>
        <div><dt className="inline text-charcoal">Family: </dt><dd className="inline">{FAMILY_LABEL[a.guardianContact]}{a.guardianDecisionBy ? ` · ${a.guardianDecisionBy}` : ""}</dd></div>
        {a.acknowledgedAt && <div><dt className="inline text-charcoal">Acknowledged: </dt><dd className="inline">{a.acknowledgedBy}, {fmt(a.acknowledgedAt)}</dd></div>}
      </dl>

      {canAct && !closed && (
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          {!a.acknowledgedAt && <button className="btn-primary" disabled={busy} onClick={() => act("acknowledge")}>Acknowledge</button>}
          {a.guardianContact === "pending" && !withholding && (
            <>
              <button className="btn-gold" disabled={busy} onClick={() => act("approve_family_contact")}>Approve family contact</button>
              <button className="btn-ghost" disabled={busy} onClick={() => setWithholding(true)}>Don&apos;t contact family</button>
            </>
          )}
          {a.acknowledgedAt && a.guardianContact !== "pending" && (
            <button className="btn-ghost" disabled={busy} onClick={() => act("resolve")}>Mark resolved</button>
          )}
        </div>
      )}
      {withholding && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-md border border-gold bg-warn-bg p-3"
          onSubmit={(e) => {
            e.preventDefault();
            act("withhold_family_contact", { reason });
          }}
        >
          <label className="min-w-64 flex-1">
            <span className="label">Reason (logged)</span>
            <select className="field" value={reason} onChange={(e) => setReason(e.target.value)} required>
              <option value="">Choose a reason</option>
              <option>Family may be part of the concern</option>
              <option>Student asked first; counselor will follow up</option>
              <option>Family already informed</option>
              <option>Other (discussed with guidance head)</option>
            </select>
          </label>
          <button className="btn-primary" disabled={busy || !reason}>Confirm</button>
          <button type="button" className="btn-ghost" onClick={() => setWithholding(false)}>Cancel</button>
        </form>
      )}
      {error && <p className="text-sm text-late-text">{error}</p>}
    </article>
  );
}
