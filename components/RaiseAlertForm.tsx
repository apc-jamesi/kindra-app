"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface ConcernOption {
  value: string;
  label: string;
  level: string;
  familyPolicy: "auto" | "counselor_approval";
  firstStep: string;
}

/** Adviser raises an urgent alert for this student. Shows exactly what will happen before sending. */
export default function RaiseAlertForm({
  studentId,
  concerns,
  cases,
  escalateMinutes,
  emailOn = false,
}: {
  studentId: string;
  concerns: ConcernOption[];
  cases: { id: string; label: string }[];
  escalateMinutes: number;
  /** Gmail alerts are configured: the counselor (and, on escalation, the guidance head) is also emailed. */
  emailOn?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [concern, setConcern] = useState(concerns[0]?.value ?? "");
  const [note, setNote] = useState("");
  const [caseId, setCaseId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const c = concerns.find((x) => x.value === concern);

  if (!open) {
    return (
      <div className="space-y-2">
        {done && <p className="rounded-md bg-ok-bg p-2 text-sm text-ok-text">{done}</p>}
        <button type="button" className="btn-primary w-full bg-late-text hover:bg-terracotta" onClick={() => { setOpen(true); setDone(null); }}>
          Raise urgent alert
        </button>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, concern, note, caseId: caseId || null }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not raise the alert.");
      return;
    }
    setOpen(false);
    setNote("");
    setDone(
      `Alert ${data.alert.id} sent to the guidance counselor.` +
        (emailOn ? (data.emailed ? " Email sent." : " The email could not be sent; see the audit log.") : ""),
    );
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border border-terracotta/50 bg-late-bg/60 p-4">
      <label className="block">
        <span className="label">Concern</span>
        <select className="field" value={concern} onChange={(e) => setConcern(e.target.value)}>
          {concerns.map((o) => (
            <option key={o.value} value={o.value}>{o.label} ({o.level})</option>
          ))}
        </select>
      </label>
      {c && (
        <ul className="list-disc space-y-1 pl-5 text-xs text-ink">
          <li>The guidance counselor gets an alert in Kindra, an SMS{emailOn ? " and an email" : ""}.</li>
          <li>
            {c.familyPolicy === "auto"
              ? "The family gets a callback request by SMS right away."
              : "The family is contacted only after the counselor approves."}
          </li>
          <li>First step: {c.firstStep}</li>
          {c.level !== "high" && <li>Not acknowledged in {escalateMinutes} min → the guidance head is alerted.</li>}
          <li>SMS, calls{emailOn ? " and emails" : ""} never include the concern or your note.</li>
        </ul>
      )}
      <label className="block">
        <span className="label">What did you notice? (Kindra only)</span>
        <textarea className="field" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facts only: what you saw or heard, and when." />
      </label>
      {cases.length > 0 && (
        <label className="block">
          <span className="label">Related case (optional)</span>
          <select className="field" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            <option value="">None</option>
            {cases.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
      )}
      {error && <p className="text-sm text-late-text">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy || !concern}>{busy ? "Sending…" : "Send alert"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      <p className="text-xs text-charcoal">If a student is in immediate danger, stay with them and follow the school crisis protocol first.</p>
    </form>
  );
}
