# Kindra: APC SHS Advisory and Intervention prototype

Advisers turn conference notes or a corrected transcript, including Taglish, into a cited, formal case
report. The adviser reviews and approves it, then tracks every action item to completion. Urgent
concerns go straight to the guidance counselor (**Act faster**), and due and overdue action items show
up as reminders. Fictional sample data only.

This app merges three sources:
- the session-1 plan: redaction, student mentions, verified guardian contact and Telegram
- the `kindra-prototype` mockups: formal case report, citations, items to check, action-item status, student index and record, audit log
- the 2026 APC Campaign Brand Book

## Run it

```powershell
npm.cmd install
npm.cmd run dev        # http://localhost:3000
```

Use `npm.cmd` in Windows PowerShell, or allow scripts once with
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

With no `.env.local` the app runs in **sample mode**:
- Data lives in `.data/kindra-db.json`, seeded with 3 advisers, 8 students and the prototype's cases. Delete the folder to reset.
- The three English sample transcripts return the prototype's hand-written drafts. Other text goes through an offline rule-based drafter. Neither is a live AI, and the review screen says which one produced the draft.
- Transcription and Telegram show a clear "not configured" message.

### Run it on local PostgreSQL

1. Install PostgreSQL 14 or later (Windows installer from postgresql.org) and note the `postgres` password.
2. Add this line to `.env.local` (or `.env`), with your password:
   `DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/kindra`
3. Create the database and tables:
   ```powershell
   npm.cmd install
   npm.cmd run db:setup
   npm.cmd run dev
   ```
4. The header shows **Data: PostgreSQL**. Demo data loads the first time a page opens.

To reset the demo data, run `npm.cmd run db:reset`, then restart `npm.cmd run dev`.

Copy `.env.example` to `.env.local` and add keys to switch each part to the real service:

| Service | Variables | Notes |
| --- | --- | --- |
| PostgreSQL (local) | `DATABASE_URL` | Run `npm run db:setup` once. Takes priority over Supabase. |
| OpenAI | `OPENAI_API_KEY` | Drafting via Responses API + Structured Outputs (`lib/ai/schema.ts`), transcription via Audio Transcriptions. |
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Run `supabase/schema.sql` once. The app seeds demo data into an empty project. |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Generic message only. |
| Urgent alerts | `ESCALATE_MINUTES` (default 15) | Minutes before an unacknowledged alert goes to the guidance head. SMS is always simulated for now. |

## Demo script

1. **Ms. Ana Reyes (Adviser A)** sees only 11-STEM A on the dashboard, along with the 24-hour on-time rate, pending reports, overdue items and items with no owner.
2. Go to **New report → Sample transcripts → Taglish notes: Jana and Miguel → Generate draft**.
   - The draft shows Jana and Miguel as mentions with their source phrases, a guardian contact concern, a vague deadline, and items to check.
   - Open **What the AI saw** to show the placeholders.
   - Confirm **Jana**, assign owners, tick the checks, and click **Approve**. Jana's history gains the case and Miguel's stays empty.
3. On Jana's record, change an action item's status, then do the **verified guardian phone update**. Both appear in the **Audit log**.
4. Choose a **career guidance** sample transcript. Click a P-number on any section to highlight its source paragraph. Speaker roles are marked `?` because they're inferred.
5. Switch to **Mr. Carlo Tan (Adviser B)**. Jana's record is now blocked. Carlos Bautista is a **Restricted** record with overdue items.
6. Switch to **Ms. Bea Lopez (Adviser C)**. Joshua Garcia has a **pending report**. Write it, and it's flagged **Late** against the 24-hour target, because the original conference time is kept.

### Act faster: urgent alerts and reminders (about 2 minutes)

7. As **Ms. Ana Reyes**, open **Jana Dela Cruz → Raise urgent alert**. Pick **Family problems at home**; the box lists what will happen. Add a short note and click **Send alert**.
8. Switch to **Ms. Liza Cruz, RGC (Guidance counselor)**. The dashboard shows the open alerts. Under **Alerts**:
   - Mikaela Santos's depression alert is already **Escalated to guidance head**, because it went unacknowledged for 40 minutes.
   - On Jana's alert, choose **Don't contact family** and pick the reason *Family may be part of the concern*.
   - On Mikaela's alert, click **Approve family contact**.
9. Open **Outbox (simulated SMS)**. The guardian SMS and call script ask for a callback and give a reference. They carry no concern and no note.
10. Switch to **Mr. Carlo Tan** and open **Reminders**: overdue, due today and the next 7 days. Change a status there.
11. Open the **Audit log** as the guidance head: every alert, escalation and family-contact decision is there.

## Urgent alerts: rules

| Concern | Level | Family contact | Escalates if not acknowledged |
| --- | --- | --- | --- |
| Self-harm or suicidal thoughts | Crisis | After counselor approval | Yes |
| Signs of depression | Urgent | After counselor approval | Yes |
| Other mental health concern | Urgent | After counselor approval | Yes |
| Family problems at home | Urgent | After counselor approval | Yes |
| Lost interest in studying | High | Automatic SMS | No |

- Only a person raises an alert: the adviser, from the student's record. AI never raises or sends one.
- The counselor is alerted in Kindra and by SMS. Family messages are SMS plus a call script for crisis/urgent, SMS only for high.
- Messages carry only a callback request, the student's first name (family only) and a reference such as `U-1A2B3C4D`.
- The counselor can decline family contact, with a logged reason (for example, the family may be part of the concern).
- Escalation runs whenever an alert page loads, and on `POST /api/alerts/escalate` (call it every minute from a scheduler when nobody has the app open).
- Concerns come from the presenter's ballot. **Confirm them against the guidance office's protocol before real use.**

## Privacy and access

- `lib/redact.ts` replaces roster names, nicknames, surnames, student IDs/LRNs and phone numbers with placeholders before every AI call. The route refuses to call the AI if anything identifying survives.
- Advisers can open, save and update only their own advisees' records. This is enforced in every route.
- The guidance counselor and guidance head (demo users) can open every record, because they serve the whole SHS. Only they can acknowledge alerts or decide on family contact.
- Views, drafts, approvals, status changes, contact updates and notifications are logged, without case content.
- Approval requires a confirmed student, conference date and time, prepared/reviewed by, every check ticked, ambiguous names resolved, and a named owner on every action item.

**Open items for the DPO:**
- Names not on the roster still reach the AI.
- Audio is transcribed before redaction.
- The text of notes and transcripts is stored with each case so citations stay traceable, which needs a retention rule.
- Sign-in is a demo switcher, not real authentication.
- SMS and calls are simulated (Outbox). Choosing a provider needs a decision on cost, sender name and consent.
- The urgent-concern list and the "counselor approves family contact" rule need the guidance office's sign-off.

## Brand

The palette comes from the APC Campaign Brand Book 2026:
- Real World blue `#35428c`
- Humanity Gold `#deac4b`
- Future Takes Shape `#f4f5f7`
- Accents: charcoal, terracotta and light gray

The book lists the dark/text color as `#62b69`, which isn't a valid hex code. The app uses navy `#262d6b` to match the swatch. Confirm the real value with the brand team.

Gotham is licensed, so **Montserrat** stands in for headlines. **Raleway** is the body font, and Georgia italic is used for accents, as the book specifies. The seal (`public/apc-seal.png`) is shown at icon size in the header, and with the slogan in the footer.

## Layout

```
app/                      pages: dashboard, students/[id], cases/new, cases/[id], audit
app/api/                  draft, transcribe, cases, cases/[id], action-items/[id], students/[id]/contact, notify, session, alerts, alerts/[id], alerts/escalate
components/CaseWizard     notes → redact → draft → review (citations, checks, action plan) → approve
lib/redact.ts             placeholders in, names back out
lib/ai/                   prompt, Zod schema, OpenAI calls, rule-based sample drafter
lib/samples/              prototype transcripts + hand-written drafts, Taglish sample
app/alerts, app/outbox    urgent alerts (counselor actions) and the simulated SMS outbox
app/reminders             overdue / due today / next 7 days action items
lib/alerts.ts             alert rules: concern levels, family-contact policy, escalation
lib/store/                local JSON, PostgreSQL and Supabase stores (same interface)
db/schema.sql, db/setup.mjs  PostgreSQL schema and `npm run db:setup` / `db:reset`
lib/session.ts            Entra sign-in → Kindra user (KINDRA_USER_EMAILS) and assignment-based access
lib/drive.ts              copies approved case reports to Google Drive as Google Docs
supabase/schema.sql       same tables for Supabase (incl. urgent_alerts, alert_messages)
```
