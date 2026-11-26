"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CaseStatus } from "@/lib/types";

export default function CaseControls({ caseId, status, nextReview }: { caseId: string; status: CaseStatus; nextReview: string | null }) {
  const router = useRouter();
  const [review, setReview] = useState(nextReview ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: object) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError(data.error ?? "Update failed.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="review">Next review</label>
        <div className="flex gap-2">
          <input id="review" type="date" className="field" value={review} onChange={(e) => setReview(e.target.value)} />
          <button type="button" className="btn-ghost" disabled={busy || review === (nextReview ?? "")} onClick={() => patch({ nextReview: review || null })}>
            Save
          </button>
        </div>
      </div>
      <button
        type="button"
        className="btn-ghost w-full"
        disabled={busy}
        onClick={() => patch({ status: status === "Open" ? "Closed" : "Open" })}
      >
        {status === "Open" ? "Close case" : "Reopen case"}
      </button>
      {error && <p className="text-sm text-late-text">{error}</p>}
    </div>
  );
}
