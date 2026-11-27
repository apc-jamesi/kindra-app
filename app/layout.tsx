import type { Metadata } from "next";
import "@fontsource-variable/montserrat";
import "@fontsource-variable/raleway";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/auth";
import { navCounts } from "@/lib/alertViews";
import { config } from "@/lib/config";
import { signedInUser } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kindra · APC SHS Advisory",
  description: "APC Senior High School Advisory and Intervention Management System (prototype)",
  icons: { icon: "/apc-seal.png" },
};

function ModeBadge({ on, onLabel, offLabel }: { on: boolean; onLabel: string; offLabel: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${on ? "bg-white/15 text-white" : "bg-gold-light text-ink"}`}>
      {on ? onLabel : offLabel}
    </span>
  );
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Null on the sign-in page; middleware keeps every other page behind sign-in.
  const user = await signedInUser();
  const counts = user ? await navCounts(user) : { alerts: 0, overdue: 0 };
  const nav: [string, string, number][] = [
    ["/", "Students", 0],
    ["/alerts", "Alerts", counts.alerts],
    ["/reminders", "Reminders", counts.overdue],
    ["/cases/new", "New report", 0],
    ["/audit", "Audit log", 0],
  ];
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="bg-brand text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-3" aria-label="Kindra home">
              {/* Simplified icon size (32–64 px) for digital use, transparent background, clear space kept. */}
              <Image src="/apc-seal.png" alt="Asia Pacific College seal" width={44} height={44} priority className="my-1" />
              <span className="leading-tight">
                <span className="block font-display text-xl font-bold tracking-tight">Kindra</span>
                <span className="block text-xs text-white/75">APC SHS Advisory &amp; Intervention</span>
              </span>
            </Link>
            {user && <nav className="flex gap-1 text-sm font-medium">
              {nav.map(([href, label, count]) => (
                <Link key={href} href={href} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-white/10 hover:text-gold-light">
                  {label}
                  {count > 0 && (
                    <span className="rounded-full bg-terracotta px-1.5 text-xs font-bold text-white" aria-label={`${count} need attention`}>
                      {count}
                    </span>
                  )}
                </Link>
              ))}
            </nav>}
            {user && <div className="ml-auto flex flex-wrap items-center gap-2">
              <ModeBadge on={config.aiMode === "openai"} onLabel="AI: OpenAI" offLabel="AI: sample mode" />
              <ModeBadge
                on={config.dataMode !== "local"}
                onLabel={config.dataMode === "postgres" ? "Data: PostgreSQL" : "Data: Supabase"}
                offLabel="Data: local file"
              />
              <span className="rounded-full bg-gold-light px-2.5 py-0.5 text-xs font-medium text-ink">SMS: simulated</span>
              <ModeBadge on={config.driveConfigured} onLabel="Drive: on" offLabel="Drive: off" />
              <ModeBadge on={config.gmailConfigured} onLabel="Gmail: on" offLabel="Gmail: off" />
              <ModeBadge on={config.sheetsConfigured} onLabel="Sheets: on" offLabel="Sheets: off" />
              <span className="text-right text-xs leading-tight text-white/85" title={user.email}>
                <span className="block font-semibold text-white">{user.name}</span>
                {user.label}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/signin" });
                }}
              >
                <button type="submit" className="rounded-md border border-white/30 px-2.5 py-1 text-xs hover:bg-white/10">
                  Sign out
                </button>
              </form>
            </div>}
          </div>
          <div className="h-1 bg-gold" aria-hidden />
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>

        <footer className="mt-8 bg-ink text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-6">
            <Image src="/apc-seal.png" alt="" width={48} height={48} />
            <p className="font-display text-sm leading-snug">
              <span className="font-normal">Real Projects, Real Learning.</span>
              <br />
              <span className="font-bold">
                Real Connections, Real <em className="font-serif text-gold">Futures.</em>
              </span>
            </p>
            <p className="ml-auto max-w-md text-xs text-white/70">
              Prototype with fictional sample data only. Student names, IDs and phone numbers are removed before any text
              reaches the AI. Sign-in with APC Microsoft accounts; access follows each person&apos;s Kindra role.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
