"use client";

import { useState } from "react";

type Link = { section: string; url: string };

/** "Update Google Sheet" on the Reminders page, with links to each section's sheet. */
export default function SheetSyncPanel({ links: initial }: { links: Link[] }) {
  const [links, setLinks] = useState(initial);
  const [state, setState] = useState<"idle" | "updating" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function update() {
    setState("updating");
    const res = await fetch("/api/sheets", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    const updated: (Link & { items: number })[] = data.sheets ?? [];
    const errors: { section: string; error: string }[] = data.errors ?? [];
    if (updated.length) setLinks(updated.map(({ section, url }) => ({ section, url })));
    if (res.ok && errors.length === 0) {
      setState("done");
      setMessage(`Updated ${updated.map((s) => `${s.section} (${s.items} item${s.items === 1 ? "" : "s"})`).join(", ")}.`);
    } else {
      setState("error");
      setMessage(errors.map((e) => `${e.section}: ${e.error}`).join(" ") || data.error || "The sheet could not be updated.");
    }
  }

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={update} disabled={state === "updating"}>
          {state === "updating" ? "Updating…" : "Update Google Sheet"}
        </button>
        {links.map((l) => (
          <a key={l.section} href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand underline">
            Open sheet: {l.section} ↗
          </a>
        ))}
        {links.length === 0 && state !== "done" && <span className="text-sm text-charcoal">No sheet yet. Click Update to create it.</span>}
      </div>
      <p className="text-xs text-charcoal">
        One sheet per section, updated automatically when a status changes or a report is approved. Read only: change statuses
        here in Kindra so they are logged. Restricted records are never copied.
      </p>
      {state === "done" && <p className="text-sm text-brand">{message}</p>}
      {state === "error" && <p className="text-sm text-late-text">{message}</p>}
    </section>
  );
}
