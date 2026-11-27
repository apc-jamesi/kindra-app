"use client";

import { useState } from "react";

/** Saves the approved case report (with its current action plan) to the Kindra Google Drive folder as a Google Doc. */
export default function SaveToDriveButton({ caseId }: { caseId: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setState("saving");
    const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/drive`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      setUrl(data.url);
      setState("saved");
    } else {
      setError(data.error ?? "The report could not be saved to Google Drive.");
      setState("error");
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" className="btn-primary" onClick={save} disabled={state === "saving"}>
        {state === "saving" ? "Saving…" : state === "saved" ? "Save another copy" : "Save to Google Drive"}
      </button>
      {state === "saved" && (
        <p className="text-sm">
          <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">
            Open the Google Doc ↗
          </a>
        </p>
      )}
      <p className="text-xs text-charcoal">
        Saves this case report and its current action plan as a Google Doc in the Kindra Drive folder. Includes the
        student&apos;s name, so share the folder only with staff who may see it.
      </p>
      {state === "error" && <p className="text-sm text-late-text">{error}</p>}
    </div>
  );
}
