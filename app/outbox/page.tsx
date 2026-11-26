import Link from "next/link";
import { Chip } from "@/components/Chips";
import { visibleAlerts } from "@/lib/alertViews";
import { formatDateTime } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const WHO = { counselor: "Counselor", guardian: "Guardian", guidance_head: "Guidance head" } as const;

export default async function OutboxPage() {
  const user = await currentUser();
  const { alerts } = await visibleAlerts(user);
  const ids = new Set(alerts.map((a) => a.id));
  const messages = (await getStore().listMessages({ limit: 300 })).filter((m) => ids.has(m.alertId));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/alerts" className="text-sm text-charcoal hover:text-brand">← Urgent alerts</Link>
        <h1 className="text-3xl font-bold">Outbox</h1>
        <p className="text-sm text-charcoal">
          Every SMS and call script Kindra produced. <strong>Simulated:</strong> nothing is sent until an SMS provider is
          connected. Messages carry only a callback request and a reference, never the concern or case details.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {messages.map((m) => (
          <article key={m.id} className="card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{m.toName}</p>
                <p className="text-xs tabular-nums text-charcoal">{m.toPhone} · {formatDateTime(m.at)}</p>
              </div>
              <span className="flex gap-1">
                <Chip tone={m.recipient === "guardian" ? "due" : m.recipient === "guidance_head" ? "restricted" : "brand"}>{WHO[m.recipient]}</Chip>
                <Chip>{m.channel === "call" ? "Call script" : "SMS"}</Chip>
              </span>
            </div>
            <p className={`rounded-2xl px-3 py-2 text-sm ${m.channel === "call" ? "bg-ok-bg" : "bg-canvas"}`}>{m.text}</p>
          </article>
        ))}
        {messages.length === 0 && <p className="card text-sm text-charcoal">Nothing sent yet.</p>}
      </div>
    </div>
  );
}
