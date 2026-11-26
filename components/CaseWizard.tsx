"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import SourceChips from "./SourceChips";
import Transcript from "./Transcript";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  ITEM_STATUSES,
  VAGUE_DUE,
  type Category,
  type Draft,
  type DraftResponse,
  type InfoItem,
  type ItemStatus,
  type SourceType,
  type Sourced,
} from "@/lib/types";

interface Props {
  students: { id: string; name: string; section: string }[];
  preselectedStudentId: string;
  pending: { id: string; caseType: string; conferenceAt: string } | null;
  samples: { id: string; title: string; format: string; text: string }[];
  aiMode: "openai" | "sample";
  userName: string;
  today: string;
  nowTime: string;
}

interface EditItem {
  action: string;
  owner: string;
  dueDate: string;
  dueText: string;
  status: ItemStatus;
  src: number[];
}

const empty: Sourced = { text: "", src: [] };
const EMPTY_DRAFT: Draft = {
  caseType: "", participants: "", speakers: [], concerns: [], presentingConcern: empty, relevantInfo: [],
  guidanceImpression: empty, strengths: empty, limitations: empty, actionPlan: [], monitoring: empty,
  escalation: null, recommendation: empty, statusNote: "Open", checks: [], contactChangeReported: false,
  ignoredInstruction: false, mentions: [],
};
const VERIFY_ITEM: EditItem = {
  action: "Verify the guardian's new phone number through the contact already on record, then update it on the student profile",
  owner: "Adviser", dueDate: "", dueText: "", status: "Open", src: [],
};
const MODE_LABEL = {
  openai: "Drafted by OpenAI from redacted text",
  sample: "Drafted by the offline rule-based drafter (sample mode, not AI)",
  "sample-prewritten": "Sample mode: pre-written draft for this sample transcript (not generated live)",
};
const STEPS = ["Notes or transcript", "Redact names", "Draft report", "Adviser review", "Approved"];

function manilaParts(iso: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export default function CaseWizard(props: Props) {
  const { students, preselectedStudentId, pending, samples, aiMode, userName, today, nowTime } = props;
  const router = useRouter();
  const transcriptRef = useRef<HTMLDivElement>(null);
  const preselected = students.find((s) => s.id === preselectedStudentId);

  // Step 1
  const [tab, setTab] = useState<"written" | "audio" | "sample">("written");
  const [notes, setNotes] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "transcribing" | "drafting" | "saving">(null);
  const [error, setError] = useState<string | null>(null);

  // Step 2
  const [step, setStep] = useState<"input" | "review">("input");
  const [sourceType, setSourceType] = useState<SourceType>("written");
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [modelInput, setModelInput] = useState<string[] | null>(null);
  const [mode, setMode] = useState<DraftResponse["mode"] | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [items, setItems] = useState<EditItem[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [active, setActive] = useState<number | null>(null);
  const [studentId, setStudentId] = useState(preselectedStudentId);
  const pendingWhen = pending ? manilaParts(pending.conferenceAt) : null;
  const [confDate, setConfDate] = useState(pendingWhen?.date ?? today);
  const [confTime, setConfTime] = useState(pendingWhen?.time ?? nowTime);
  const [preparedBy, setPreparedBy] = useState(userName);
  const [reviewedBy, setReviewedBy] = useState(userName);
  const [nextReview, setNextReview] = useState("");

  const inputText = tab === "audio" ? transcript ?? "" : notes;

  async function transcribe() {
    if (!audio) return;
    setBusy("transcribing");
    setError(null);
    const body = new FormData();
    body.append("audio", audio);
    const res = await fetch("/api/transcribe", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Transcription failed.");
      setTranscript((t) => t ?? "");
      return;
    }
    setTranscript(data.text);
  }

  function loadReview(r: DraftResponse | null, source: SourceType, paras: string[]) {
    const d = r?.draft ?? EMPTY_DRAFT;
    setDraft({ ...d, caseType: d.caseType || pending?.caseType || "" });
    setItems(
      d.actionPlan.map((a) => ({ action: a.action, owner: a.owner, dueDate: "", dueText: a.due, status: "Open", src: a.src })),
    );
    setParagraphs(r?.paragraphs ?? paras);
    setModelInput(r?.modelInput ?? null);
    setMode(r?.mode ?? null);
    setSourceType(source);
    setChecked({});
    setResolved({});
    setActive(null);
    setError(null);
    setStep("review");
    window.scrollTo({ top: 0 });
  }

  async function generate() {
    setBusy("drafting");
    setError(null);
    const res = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: inputText }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Drafting failed.");
      return;
    }
    loadReview(data as DraftResponse, tab === "audio" ? "audio" : tab === "sample" ? "audio" : "written", []);
  }

  const manual = () =>
    loadReview(null, "manual", inputText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));

  function selectSource(p: number) {
    setActive(p);
    transcriptRef.current?.querySelector(`#p${p}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setItem = (i: number, patch: Partial<EditItem>) =>
    setItems((xs) => xs.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  // Mentions resolve to exactly one student (directly or by the adviser's choice).
  const unresolved = draft.mentions.filter((m) => m.candidates.length > 1 && !resolved[m.token]);
  const mentions = draft.mentions
    .flatMap((m) => {
      const id = m.candidates.length === 1 ? m.candidates[0].studentId : resolved[m.token];
      const c = m.candidates.find((x) => x.studentId === id);
      return c ? [{ studentId: c.studentId, name: c.name, phrase: m.phrase }] : [];
    })
    .filter((m, i, all) => all.findIndex((x) => x.studentId === m.studentId) === i);

  const missing: string[] = [];
  if (!studentId) missing.push("confirm the student");
  if (!confDate || !confTime) missing.push("conference date and time");
  if (!preparedBy.trim()) missing.push("prepared by");
  if (!reviewedBy.trim()) missing.push("reviewed by");
  if (!draft.caseType.trim()) missing.push("case type");
  if (!draft.presentingConcern.text.trim()) missing.push("presenting concern");
  const uncheckedCount = draft.checks.filter((c) => !checked[c]).length;
  if (uncheckedCount) missing.push(`${uncheckedCount} item(s) to check`);
  if (unresolved.length) missing.push("resolve ambiguous names");
  const noOwner = items.filter((i) => i.action.trim() && !i.owner.trim()).length;
  if (noOwner) missing.push(`owner for ${noOwner} action item(s)`);

  async function approve() {
    setBusy("saving");
    setError(null);
    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        pendingCaseId: pending?.id,
        caseType: draft.caseType,
        conferenceDate: confDate,
        conferenceTime: confTime,
        sourceType,
        preparedBy,
        reviewedBy,
        participants: draft.participants,
        concerns: draft.concerns,
        presentingConcern: draft.presentingConcern,
        relevantInfo: draft.relevantInfo,
        guidanceImpression: draft.guidanceImpression,
        strengths: draft.strengths,
        limitations: draft.limitations,
        monitoring: draft.monitoring,
        escalation: draft.escalation,
        recommendation: draft.recommendation,
        statusNote: draft.statusNote,
        nextReview: nextReview || null,
        speakers: draft.speakers,
        studentMentions: mentions,
        checks: draft.checks,
        checksConfirmed: draft.checks.filter((c) => checked[c]),
        sourceParagraphs: paragraphs,
        actionItems: items
          .filter((i) => i.action.trim())
          .map((i) => ({ action: i.action, owner: i.owner, dueDate: i.dueDate || null, dueText: i.dueDate ? "" : i.dueText, status: i.status, src: i.src })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(null);
      setError(data.error ?? "Approval failed.");
      return;
    }
    router.push(`/cases/${data.id}?saved=1`);
  }

  const stage = step === "input" ? (busy === "drafting" ? 2 : 0) : 3;
  const Stepper = (
    <ol className="flex flex-wrap gap-2 text-xs">
      {STEPS.map((s, i) => (
        <li
          key={s}
          className={`rounded-full px-3 py-1 font-medium ${
            i < stage ? "bg-gold-light text-ink" : i === stage ? "bg-gold text-ink" : "bg-white text-charcoal ring-1 ring-line"
          }`}
        >
          {i + 1}. {s}
        </li>
      ))}
    </ol>
  );

  /* ---------------- Step 1: input ---------------- */
  if (step === "input") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-3">
          <p className="text-sm text-charcoal">
            {pending ? `Completing pending case ${pending.id} · ` : "New case report · "}
            {preselected ? preselected.name : "student confirmed at approval"}
          </p>
          <h1 className="text-3xl font-bold">
            Start with the conference <span className="font-serif font-normal italic text-brand">notes.</span>
          </h1>
          {Stepper}
        </div>

        <div className="card space-y-4">
          <div role="tablist" className="flex gap-1 rounded-md bg-canvas p-1 text-sm">
            {(
              [
                ["written", "Written notes"],
                ["audio", "Upload recording"],
                ["sample", "Sample transcripts"],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                className={`flex-1 rounded px-3 py-2 font-semibold ${tab === t ? "bg-white text-ink shadow-sm" : "text-charcoal"}`}
                onClick={() => {
                  setTab(t);
                  setError(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "written" && (
            <div>
              <label className="label" htmlFor="notes">Notes or written case report (Taglish is fine; one paragraph per line)</label>
              <textarea id="notes" className="field min-h-64 font-mono" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={"Conference with … \nNapagkasunduan: …"} />
            </div>
          )}

          {tab === "sample" && (
            <div className="space-y-2">
              <p className="text-sm text-charcoal">Fictional samples for demos. They load into the notes box, where you can edit them.</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {samples.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full rounded-md border border-line bg-white p-3 text-left hover:border-brand"
                      onClick={() => {
                        setNotes(s.text);
                        setTab("written");
                      }}
                    >
                      <span className="block font-semibold">{s.title}</span>
                      <span className="text-xs text-charcoal">{s.format}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "audio" && (
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="audio">Recording (WAV, MP3, M4A · max 25 MB · never stored)</label>
                <div className="flex flex-wrap items-center gap-3">
                  <input id="audio" type="file" accept="audio/*,.wav,.mp3,.m4a,.webm" className="text-sm" onChange={(e) => { setAudio(e.target.files?.[0] ?? null); setTranscript(null); }} />
                  <button type="button" className="btn-ghost" disabled={!audio || busy !== null} onClick={transcribe}>
                    {busy === "transcribing" ? "Transcribing…" : "Transcribe"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-charcoal">Confirm the recording-consent process before recording any real conference.</p>
                {aiMode === "sample" && (
                  <p className="mt-1 text-xs text-warn-text">Sample mode: transcription needs an OpenAI key. You can type or paste the transcript below.</p>
                )}
              </div>
              {(transcript !== null || aiMode === "sample") && (
                <div>
                  <label className="label" htmlFor="transcript">Transcript: correct names and details before drafting</label>
                  <textarea id="transcript" className="field min-h-64 font-mono" value={transcript ?? ""} onChange={(e) => setTranscript(e.target.value)} />
                </div>
              )}
            </div>
          )}

          <p className="rounded-md bg-canvas p-3 text-xs text-charcoal">
            🔒 Before drafting, Kindra replaces student names, nicknames, ID numbers and phone numbers with placeholders such as
            [STUDENT_1]. The AI never sees who the students are.
          </p>

          {error && (
            <div className="rounded-md border border-late-text/30 bg-late-bg p-3 text-sm text-late-text">
              <p>{error}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn-ghost" onClick={generate} disabled={!inputText.trim()}>Retry</button>
                <button type="button" className="btn-ghost" onClick={manual}>Complete the report manually</button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={manual}>Write manually</button>
            <button type="button" className="btn-primary" disabled={!inputText.trim() || busy !== null || tab === "sample"} onClick={generate}>
              {busy === "drafting" ? "Drafting…" : "Generate draft →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- Step 2: review ---------------- */
  const sourcedField = (label: string, key: "presentingConcern" | "guidanceImpression" | "strengths" | "limitations" | "monitoring" | "recommendation", rows = 3) => (
    <div>
      <label className="label">{label}</label>
      <textarea className="field" rows={rows} value={draft[key].text} onChange={(e) => set(key, { ...draft[key], text: e.target.value })} />
      <div className="mt-1"><SourceChips src={draft[key].src} onSelect={selectSource} /></div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">
            Review, then <span className="font-serif font-normal italic text-brand">approve.</span>
          </h1>
          {Stepper}
        </div>
        <button type="button" className="btn-ghost" onClick={() => setStep("input")}>← Back to notes</button>
      </div>

      {mode && <p className="text-xs text-charcoal">AI-generated draft: {MODE_LABEL[mode]}. Nothing is final until you approve.</p>}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)]">
        {/* Source */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          <section className="card">
            <h2 className="mb-1 text-lg font-bold">Source {sourceType === "audio" ? "transcript" : "notes"}</h2>
            <p className="mb-3 text-xs text-charcoal">Click a P-number in the draft to highlight its paragraph. “?” marks inferred speaker roles.</p>
            <div ref={transcriptRef} className="max-h-[60vh] overflow-y-auto pr-1">
              <Transcript paragraphs={paragraphs} speakers={draft.speakers} active={active} />
            </div>
          </section>
          {modelInput && (
            <details className="card text-sm">
              <summary className="cursor-pointer font-semibold">What the AI saw (redacted)</summary>
              <ol className="mt-3 max-h-64 space-y-1 overflow-y-auto font-mono text-xs leading-relaxed text-charcoal">
                {modelInput.map((p, i) => (
                  <li key={i}>[P{i}] {p}</li>
                ))}
              </ol>
            </details>
          )}
        </aside>

        {/* Draft form */}
        <section className="space-y-5">
          {draft.ignoredInstruction && (
            <div className="rounded-md border border-gold bg-warn-bg p-3 text-sm text-warn-text">
              The notes contained an instruction to the AI. It was ignored. Check the draft carefully.
            </div>
          )}
          {draft.contactChangeReported && (
            <div className="space-y-2 rounded-md border border-gold bg-warn-bg p-3 text-sm text-warn-text">
              <p>
                <strong>Guardian contact concern.</strong> A phone-number change was reported. The current contact stays unchanged
                until you verify it and update it on the student&apos;s profile.
              </p>
              {!items.some((i) => i.action === VERIFY_ITEM.action) && (
                <button type="button" className="btn-ghost" onClick={() => setItems((xs) => [...xs, VERIFY_ITEM])}>
                  + Add verification action item
                </button>
              )}
            </div>
          )}

          {/* Case information */}
          <div className="card space-y-4">
            <h2 className="text-lg font-bold">Case information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="student">Save to whose case history? *</label>
                <select id="student" className="field" value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={Boolean(pending)}>
                  <option value="">Choose one student…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} · {s.section}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-charcoal">Only this student&apos;s history receives the report. Other students mentioned are recorded as mentions only.</p>
              </div>
              <div>
                <label className="label" htmlFor="cdate">Conference date *</label>
                <input id="cdate" type="date" className="field" value={confDate} max={today} disabled={Boolean(pending)} onChange={(e) => setConfDate(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="ctime">Conference time *</label>
                <input id="ctime" type="time" className="field" value={confTime} disabled={Boolean(pending)} onChange={(e) => setConfTime(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="prep">Prepared by *</label>
                <input id="prep" className="field" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="rev">Reviewed by (approving adviser) *</label>
                <input id="rev" className="field" value={reviewedBy} onChange={(e) => setReviewedBy(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="ctype">Case type *</label>
                <input id="ctype" className="field" value={draft.caseType} onChange={(e) => set("caseType", e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="parts">Participants</label>
                <input id="parts" className="field" value={draft.participants} onChange={(e) => set("participants", e.target.value)} />
              </div>
            </div>
            <fieldset>
              <legend className="label">Concerns</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const on = draft.concerns.includes(c);
                  return (
                    <label key={c} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${on ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => set("concerns", on ? draft.concerns.filter((x) => x !== c) : [...draft.concerns, c as Category])} />
                      {CATEGORY_LABELS[c]}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          {/* Items to check */}
          {draft.checks.length > 0 && (
            <div className="card space-y-2 border-l-4 border-l-terracotta">
              <h2 className="text-lg font-bold">Items to check before approval</h2>
              {draft.checks.map((c) => (
                <label key={c} className="flex items-start gap-2 rounded-md bg-late-bg/40 p-2 text-sm">
                  <input type="checkbox" className="mt-1 accent-brand" checked={Boolean(checked[c])} onChange={(e) => setChecked((x) => ({ ...x, [c]: e.target.checked }))} />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          )}

          {/* Mentions */}
          <div className="card space-y-2">
            <h2 className="text-lg font-bold">Students mentioned</h2>
            {draft.mentions.length === 0 ? (
              <p className="text-sm text-charcoal">No roster students mentioned.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {draft.mentions.map((m) => (
                  <li key={m.token} className="rounded-md bg-canvas p-2">
                    {m.candidates.length === 1 ? (
                      <span className="font-semibold">{m.candidates[0].name}</span>
                    ) : (
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-warn-text">“{m.alias}” matches more than one student:</span>
                        <select className="field w-auto py-1" value={resolved[m.token] ?? ""} onChange={(e) => setResolved((r) => ({ ...r, [m.token]: e.target.value }))}>
                          <option value="">Choose…</option>
                          {m.candidates.map((c) => (
                            <option key={c.studentId} value={c.studentId}>{c.name}</option>
                          ))}
                        </select>
                      </span>
                    )}
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-charcoal">
                      Source: “{m.phrase}” <SourceChips src={[m.paragraph]} onSelect={selectSource} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Report sections */}
          <div className="card space-y-4">
            <h2 className="text-lg font-bold">Draft case report</h2>
            {sourcedField("Presenting concern *", "presentingConcern", 4)}
            <div className="space-y-3">
              <p className="label">Relevant information shared</p>
              {draft.relevantInfo.map((r, i) => (
                <div key={i} className="space-y-1 rounded-md border border-line p-3">
                  <div className="flex gap-2">
                    <input className="field" value={r.label} placeholder="Label" onChange={(e) => set("relevantInfo", draft.relevantInfo.map((x, k): InfoItem => (k === i ? { ...x, label: e.target.value } : x)))} />
                    <button type="button" className="btn-ghost" onClick={() => set("relevantInfo", draft.relevantInfo.filter((_, k) => k !== i))}>Remove</button>
                  </div>
                  <textarea className="field" rows={2} value={r.text} onChange={(e) => set("relevantInfo", draft.relevantInfo.map((x, k): InfoItem => (k === i ? { ...x, text: e.target.value } : x)))} />
                  <SourceChips src={r.src} onSelect={selectSource} />
                </div>
              ))}
              <button type="button" className="btn-ghost" onClick={() => set("relevantInfo", [...draft.relevantInfo, { label: "", text: "", src: [] }])}>+ Add information</button>
            </div>
            {sourcedField("Guidance impression (preliminary)", "guidanceImpression")}
            {sourcedField("Strengths and protective factors", "strengths", 2)}
            {sourcedField("Limitations", "limitations", 2)}
          </div>

          {/* Action plan */}
          <div className="card space-y-3">
            <h2 className="text-lg font-bold">Agreed action plan</h2>
            {items.length === 0 && <p className="text-sm text-charcoal">No agreed actions found. Add one only if it was agreed.</p>}
            {items.map((it, i) => (
              <div key={i} className="space-y-2 rounded-md border border-line p-3">
                <textarea className="field" rows={2} value={it.action} aria-label="Action" placeholder="Action" onChange={(e) => setItem(i, { action: e.target.value })} />
                <div className="grid gap-2 sm:grid-cols-4">
                  <div>
                    <label className="label">Owner *</label>
                    <input className={`field ${!it.owner.trim() ? "border-terracotta bg-late-bg/40" : ""}`} value={it.owner} placeholder="Not stated: assign" onChange={(e) => setItem(i, { owner: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Due date</label>
                    <input type="date" className="field" value={it.dueDate} onChange={(e) => setItem(i, { dueDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Target (from notes)</label>
                    <input className={`field ${it.dueText === VAGUE_DUE && !it.dueDate ? "border-gold bg-warn-bg" : ""}`} value={it.dueText} placeholder="Not stated" onChange={(e) => setItem(i, { dueText: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select className="field" value={it.status} onChange={(e) => setItem(i, { status: e.target.value as ItemStatus })}>
                      {ITEM_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <SourceChips src={it.src} onSelect={selectSource} />
                  <button type="button" className="text-xs font-semibold text-late-text hover:underline" onClick={() => setItems((xs) => xs.filter((_, k) => k !== i))}>Remove</button>
                </div>
                {it.dueText === VAGUE_DUE && !it.dueDate && <p className="text-xs text-warn-text">The deadline was vague. Set an exact due date.</p>}
              </div>
            ))}
            <button type="button" className="btn-ghost" onClick={() => setItems((xs) => [...xs, { action: "", owner: "", dueDate: "", dueText: "", status: "Open", src: [] }])}>+ Add action item</button>
          </div>

          {/* Monitoring and status */}
          <div className="card space-y-4">
            <h2 className="text-lg font-bold">Monitoring and recommendation</h2>
            {sourcedField("Review indicators and schedule", "monitoring")}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="accent-brand" checked={draft.escalation !== null} onChange={(e) => set("escalation", e.target.checked ? draft.escalation ?? { text: "", src: [] } : null)} />
                Escalation or safeguarding follow-up discussed
              </label>
              {draft.escalation && (
                <div className="mt-2">
                  <textarea className="field" rows={3} value={draft.escalation.text} onChange={(e) => set("escalation", { ...draft.escalation!, text: e.target.value })} />
                  <SourceChips src={draft.escalation.src} onSelect={selectSource} />
                </div>
              )}
            </div>
            {sourcedField("Recommendation", "recommendation", 2)}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="snote">Case status</label>
                <input id="snote" className="field" value={draft.statusNote} onChange={(e) => set("statusNote", e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="nrev">Next review</label>
                <input id="nrev" type="date" className="field" value={nextReview} min={today} onChange={(e) => setNextReview(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Approve */}
          <div className="card space-y-3 border-2 border-brand">
            <h2 className="text-lg font-bold">Approve the case report</h2>
            <p className="text-sm text-charcoal">
              Approving saves the report to {students.find((s) => s.id === studentId)?.name ?? "the confirmed student"}&apos;s case history and
              starts tracking its action items. This is logged in the audit trail.
            </p>
            {missing.length > 0 && <p className="text-sm text-warn-text">Needed: {missing.join(", ")}.</p>}
            {error && <p className="text-sm text-late-text">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Link href={studentId ? `/students/${studentId}` : "/"} className="btn-ghost">Cancel</Link>
              <button type="button" className="btn-primary" disabled={missing.length > 0 || busy !== null} onClick={approve}>
                {busy === "saving" ? "Approving…" : "Approve case report"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
