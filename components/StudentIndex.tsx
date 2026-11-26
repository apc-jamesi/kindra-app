"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Chip, SensitivityChip } from "./Chips";
import type { Sensitivity } from "@/lib/types";

export interface IndexRow {
  id: string;
  name: string;
  grade: string;
  section: string;
  sensitivity: Sensitivity;
  openCases: number;
  openItems: number;
  overdue: number;
  latestConference: string | null;
  latestConferenceLabel: string;
  docStatus: "Within 24 h" | "Late or pending" | "No cases";
}

type SortKey = "id" | "name" | "grade" | "openCases" | "openItems" | "overdue" | "latestConference" | "docStatus" | "sensitivity";

const COLUMNS: { key: SortKey; label: string; num?: boolean }[] = [
  { key: "id", label: "Student ID" },
  { key: "name", label: "Name" },
  { key: "grade", label: "Grade" },
  { key: "openCases", label: "Open cases", num: true },
  { key: "openItems", label: "Open items", num: true },
  { key: "overdue", label: "Overdue", num: true },
  { key: "latestConference", label: "Latest conference" },
  { key: "docStatus", label: "Documentation" },
  { key: "sensitivity", label: "Sensitivity" },
];

export default function StudentIndex({ rows }: { rows: IndexRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "id", dir: 1 });

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows
      .filter((r) => !query || `${r.id} ${r.name} ${r.section}`.toLowerCase().includes(query))
      .filter((r) =>
        filter === "open" ? r.openCases > 0 : filter === "doc" ? r.docStatus === "Late or pending" : filter === "overdue" ? r.overdue > 0 : true,
      )
      .sort((a, b) => {
        const av = a[sort.key] ?? "";
        const bv = b[sort.key] ?? "";
        return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
      });
  }, [rows, q, filter, sort]);

  return (
    <section className="card p-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <h2 className="mr-auto text-lg font-bold">My advisees</h2>
        <input
          type="search"
          className="field w-64"
          placeholder="Search ID, name or section"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search students"
        />
        <select className="field w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter students">
          <option value="all">All advisees</option>
          <option value="open">Has open cases</option>
          <option value="doc">Documentation late or pending</option>
          <option value="overdue">Has overdue action items</option>
        </select>
        <span className="text-sm text-charcoal">
          {shown.length} of {rows.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-left text-xs text-charcoal">
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} className={`whitespace-nowrap px-4 py-2 font-semibold ${c.num ? "text-right" : ""}`}>
                  <button
                    type="button"
                    className="hover:text-ink"
                    onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (-s.dir as 1 | -1) : 1 }))}
                  >
                    {c.label}
                    {sort.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.id}
                tabIndex={0}
                className="cursor-pointer border-t border-line/70 hover:bg-gold-light/20 focus:bg-gold-light/20 focus:outline-none"
                onClick={() => router.push(`/students/${r.id}`)}
                onKeyDown={(e) => e.key === "Enter" && router.push(`/students/${r.id}`)}
              >
                <td className="px-4 py-3 tabular-nums">{r.id}</td>
                <td className="px-4 py-3 font-semibold">{r.name}</td>
                <td className="px-4 py-3">{r.grade} · {r.section}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.openCases}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.openItems}</td>
                <td className="px-4 py-3 text-right">{r.overdue ? <Chip tone="late">{r.overdue}</Chip> : "0"}</td>
                <td className="px-4 py-3">{r.latestConferenceLabel || <span className="text-charcoal">None</span>}</td>
                <td className="px-4 py-3">
                  {r.docStatus === "No cases" ? (
                    <span className="text-charcoal">No cases</span>
                  ) : (
                    <Chip tone={r.docStatus === "Within 24 h" ? "ok" : "late"}>{r.docStatus}</Chip>
                  )}
                </td>
                <td className="px-4 py-3">
                  <SensitivityChip value={r.sensitivity} />
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-6 text-center text-charcoal">
                  No students match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
