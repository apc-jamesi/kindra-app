"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Chip } from "./Chips";
import { ITEM_STATUSES, type ItemStatus } from "@/lib/types";

export interface ItemRow {
  id: string;
  caseId: string;
  action: string;
  owner: string;
  dueLabel: string;
  status: ItemStatus;
  overdueDays: number | null;
  updatedLabel: string;
  /** Shown on cross-student lists such as Reminders. */
  studentId?: string;
  studentName?: string;
}

export default function ActionItemsTable({ items, showCase = true }: { items: ItemRow[]; showCase?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(id: string, status: ItemStatus) {
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/action-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) setError(data.error ?? "Could not update the status.");
    router.refresh();
  }

  if (!items.length) return <p className="text-sm text-charcoal">No action items.</p>;

  return (
    <div className="overflow-x-auto">
      {error && <p className="mb-2 text-sm text-late-text">{error}</p>}
      <table className="w-full text-sm">
        <thead className="bg-canvas text-left text-xs text-charcoal">
          <tr>
            <th className="px-3 py-2 font-semibold">Action</th>
            {showCase && <th className="px-3 py-2 font-semibold">Case</th>}
            <th className="px-3 py-2 font-semibold">Owner</th>
            <th className="px-3 py-2 font-semibold">Due</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Flag</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t border-line/70 align-top">
              <td className="px-3 py-2.5">
                {it.studentName && (
                  <Link href={`/students/${it.studentId}`} className="block text-xs font-semibold text-brand hover:underline">
                    {it.studentName}
                  </Link>
                )}
                {it.action}
                <span className="block text-xs text-charcoal">Updated {it.updatedLabel}</span>
              </td>
              {showCase && (
                <td className="px-3 py-2.5">
                  <Link href={`/cases/${it.caseId}`} className="text-brand underline-offset-2 hover:underline">
                    {it.caseId}
                  </Link>
                </td>
              )}
              <td className="px-3 py-2.5">{it.owner || <Chip tone="late">Unassigned</Chip>}</td>
              <td className="whitespace-nowrap px-3 py-2.5">{it.dueLabel}</td>
              <td className="px-3 py-2.5">
                <select
                  className="field w-auto py-1"
                  value={it.status}
                  disabled={busy === it.id}
                  aria-label={`Status of: ${it.action}`}
                  onChange={(e) => setStatus(it.id, e.target.value as ItemStatus)}
                >
                  {ITEM_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2.5">
                {!it.owner ? (
                  <Chip tone="late">No owner</Chip>
                ) : it.overdueDays ? (
                  <Chip tone="late">Overdue {it.overdueDays} d</Chip>
                ) : it.status === "Done" ? (
                  <Chip tone="ok">Complete</Chip>
                ) : it.status === "Blocked" ? (
                  <Chip tone="late">Blocked</Chip>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
