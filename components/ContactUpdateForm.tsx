"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ContactUpdateForm({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        Update after verification
      </button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/students/${studentId}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPhone: phone, verified }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Update failed.");
      return;
    }
    setOpen(false);
    setPhone("");
    setVerified(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border border-gold bg-warn-bg p-4">
      <div>
        <label className="label" htmlFor="newPhone">
          Verified new number
        </label>
        <input
          id="newPhone"
          className="field"
          inputMode="tel"
          placeholder="09XXXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1 accent-brand"
          checked={verified}
          onChange={(e) => setVerified(e.target.checked)}
        />
        I verified this number with the guardian through the contact already on record.
      </label>
      {error && <p className="text-sm text-late-text">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy || !verified || !phone}>
          {busy ? "Saving…" : "Save verified update"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
