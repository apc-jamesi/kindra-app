# Kindra demo guide

## Prerequisites

- Windows with Node.js 20+ and PostgreSQL 14+ running locally
- `.env.local` (or `.env`) containing `DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/kindra`
- Optional: `ESCALATE_MINUTES=1` to show a live escalation; `OPENAI_API_KEY` for live drafting

## Install and run

```powershell
npm.cmd install
npm.cmd run db:setup
npm.cmd run dev
```

Open http://localhost:3000. The header should show **Data: PostgreSQL** and **SMS: simulated**.

## Test identities (demo switcher, top right)

| User | Role | Sees |
| --- | --- | --- |
| Ms. Ana Reyes | Adviser A | 11-STEM A |
| Mr. Carlo Tan | Adviser B | 12-ABM |
| Ms. Bea Lopez | Adviser C | 12-HUMSS |
| Ms. Liza Cruz, RGC | Guidance counselor | Every student; acts on alerts |
| Dr. Teresa Gomez | Guidance head | Every student; receives escalations |

## Three-minute demo (Act faster)

1. **(0:00–0:40)** As Ms. Ana Reyes, open Jana Dela Cruz and click **Raise urgent alert**. Pick *Family problems at home*, read out what will happen, add a note, then **Send alert**.
2. **(0:40–1:40)** Switch to Ms. Liza Cruz. The dashboard shows open alerts. Open **Alerts**:
   - Point out that Mikaela's alert was **escalated** because nobody acknowledged it.
   - On Jana's alert, click **Don't contact family** and choose the reason *Family may be part of the concern*.
   - On Mikaela's alert, click **Approve family contact**.
3. **(1:40–2:10)** Open **Outbox**. The messages have no concern and no note, only a callback request and a reference.
4. **(2:10–2:40)** Switch to Mr. Carlo Tan and open **Reminders**: overdue items first. Mark one *Done*.
5. **(2:40–3:00)** Switch to Dr. Teresa Gomez and open **Audit log**: every alert, escalation and decision, with who and when.

The original report demo (Jana and Miguel draft) is still in README.md.

## Reset and stop

- Reset the demo data: stop the server (Ctrl+C), run `npm.cmd run db:reset`, then `npm.cmd run dev`.
- Stop: Ctrl+C in the terminal running `npm.cmd run dev`.

## Integration status

| Part | Status |
| --- | --- |
| PostgreSQL (local) | Connected through `DATABASE_URL`; checked on PostgreSQL 16 |
| Urgent alerts, escalation, reminders | Built; business rules on the server |
| SMS / calls | **Simulated**: written to the Outbox, never sent |
| Sign-in | Demo switcher, not real authentication (Microsoft sign-in planned) |
| OpenAI drafting | As before: live with a key, sample mode without |
| Supabase | Schema updated; store updated but not tested against a live project |

## Known limitations

- The concern list and family-contact rules come from the presenter's ballot and need the guidance office's sign-off.
- Escalation runs when an alert page loads or `POST /api/alerts/escalate` is called. With nobody using the app, a scheduler must call that route.
- The JSON-file store moved to data version 3, so existing `.data/kindra-db.json` sample data is reseeded once.
