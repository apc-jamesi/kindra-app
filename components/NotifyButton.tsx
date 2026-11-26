"use client";

import { useState } from "react";

export default function NotifyButton({ caseId }: { caseId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function send() {
    setState("sending");
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setState("sent");
    else {
      setError(data.error ?? "Delivery failed. The report is still saved.");
      setState("error");
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" className="btn-gold" onClick={send} disabled={state === "sending" || state === "sent"}>
        {state === "sending" ? "Sending…" : state === "sent" ? "Telegram notification sent ✓" : "Send Telegram notification"}
      </button>
      <p className="text-xs text-charcoal">
        Sends only: “A new advisory report was saved. Open the advisory app to review it.” No names or case details.
      </p>
      {state === "error" && <p className="text-sm text-late-text">{error}</p>}
    </div>
  );
}
