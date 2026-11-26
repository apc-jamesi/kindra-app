import { CATEGORY_LABELS, type Category, type ItemStatus, type Sensitivity } from "@/lib/types";

type Tone = "ok" | "late" | "due" | "neutral" | "restricted" | "brand";

const TONES: Record<Tone, string> = {
  ok: "border-ok-text/25 bg-ok-bg text-ok-text",
  late: "border-late-text/25 bg-late-bg text-late-text",
  due: "border-gold/50 bg-warn-bg text-warn-text",
  neutral: "border-line bg-canvas text-charcoal",
  restricted: "border-restricted-text/25 bg-restricted-bg text-restricted-text",
  brand: "border-brand/20 bg-brand/10 text-brand",
};

export function Chip({ tone = "neutral", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span className={`chip ${TONES[tone]}`} title={title}>
      {children}
    </span>
  );
}

export const SensitivityChip = ({ value }: { value: Sensitivity }) => (
  <Chip tone={value === "Restricted" ? "restricted" : "neutral"} title={value === "Restricted" ? "Extra restriction: every access is logged" : undefined}>
    {value === "Restricted" ? "🔒 Restricted" : "Standard"}
  </Chip>
);

export const ItemStatusChip = ({ status }: { status: ItemStatus }) => (
  <Chip tone={status === "Done" ? "ok" : status === "Blocked" ? "late" : "due"}>{status}</Chip>
);

export const TimelinessChip = ({ t }: { t: { key: string; label: string } }) => (
  <Chip tone={t.key === "ok" ? "ok" : "late"}>{t.label}</Chip>
);

export function ConcernChips({ concerns }: { concerns: Category[] }) {
  if (!concerns.length) return <span className="text-sm text-charcoal">None categorized</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {concerns.map((c) => (
        <Chip key={c} tone={c === "guardian_contact" ? "due" : "brand"}>
          {CATEGORY_LABELS[c]}
        </Chip>
      ))}
    </span>
  );
}

export function Kpi({ label, value, alert, hint }: { label: string; value: React.ReactNode; alert?: boolean; hint?: string }) {
  return (
    <div className={`card border-t-4 py-4 ${alert ? "border-t-terracotta" : "border-t-gold"}`}>
      <p className={`font-display text-2xl font-bold tabular-nums ${alert ? "text-late-text" : ""}`}>{value}</p>
      <p className="text-sm text-charcoal">{label}</p>
      {hint && <p className="mt-1 text-xs text-charcoal/80">{hint}</p>}
    </div>
  );
}
