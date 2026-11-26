# Kindra: demo and next-phase plan

## Smallest useful demonstration

The prototype already exists. The pitch demonstration is the current Kindra app running locally on fictional data, following the README demo script, trimmed to three minutes. No new app code is needed for the pitch.

### Feature status

| Feature | Status |
|---|---|
| Draft from notes, citations, student mentions, confirm student, approve | Built. Simulated in sample mode (hand-written drafts or rule-based drafter); connected only with an OpenAI key |
| Transcription of uploaded audio | Built; connected only with an OpenAI key |
| Action items, dashboard, audit log, verified guardian phone update | Built; local JSON store by default, Supabase with keys |
| Adviser-scoped access | Built, but sign-in is a demo switcher |
| Telegram generic notification | Built; connected only with bot token and chat ID |
| Urgent alerts to counselor/family, escalation (theme B) | Built 2026-11-25. SMS simulated (Outbox); family contact needs counselor approval for sensitive concerns |
| Reminders for due/overdue action items (theme B) | Built 2026-11-25 as an in-app Reminders page with header badge; no SMS/email reminders yet |
| Local PostgreSQL store | Built 2026-11-25 (`DATABASE_URL`, `npm run db:setup`) |
| Other next-phase features (themes A, C, D, E) | Planned. Not built |

### Sample inputs and expected outputs

| Input | Expected output |
|---|---|
| "Taglish notes: Jana and Miguel" sample transcript | Draft with both mentions and source phrases, a guardian contact concern, a vague deadline, items to check |
| Confirm Jana, assign owners, approve | Jana's history gains one case; Miguel's stays empty |
| Verified guardian phone update on Jana's record | Phone changes only after the separate update; audit entry shows who and when |
| Switch to Adviser B | Jana's record is blocked |

## Three-minute demo sequence

1. **(0:00–0:20)** Dashboard as Ms. Ana Reyes (Adviser A): only 11-STEM A, overdue items, items with no owner.
2. **(0:20–1:20)** New report → Sample transcripts → "Taglish notes: Jana and Miguel" → Generate draft. Point out both mentions with their source phrases, the guardian contact concern and the vague deadline. Open "What the AI saw" to show names replaced by placeholders.
3. **(1:20–2:00)** Confirm Jana, assign owners, tick the checks, Approve. Open Miguel's record: still empty.
4. **(2:00–2:40)** On Jana's record: change an action item's status, then do the verified guardian phone update. Open the Audit log and show both entries.
5. **(2:40–3:00)** Switch to Mr. Carlo Tan (Adviser B): Jana's record is blocked. Close with "this is what exists today; now let's decide what comes next."

**Fallback:** If live AI or the network fails, stay in sample mode. The sample transcripts do not need the internet.

## Acceptance checks before the pitch

- [ ] `npm.cmd install` and `npm.cmd run dev` start cleanly on the demo laptop
- [ ] Demo steps 1–5 complete in under three minutes, twice in a row
- [ ] Demo data reset beforehand (delete `.data/` to reseed) so the rehearsal does not leave cases behind
- [ ] Decide sample mode vs. live OpenAI, and label it on screen and in the talk track accordingly
- [ ] No real names in screenshots, slides or handouts
- [ ] Ranking method ready (form or paper ballot listing the five themes)

None of these have been run during intake.

## Files to create

- The five-slide deck (next stage: "Make the deck")
- A one-page ranking ballot for the five themes
- No app files for the pitch

## Next phase: technical notes (for after the ranking)

- **Architecture:** keep the existing Next.js App Router app with route handlers and the local-JSON/Supabase store interface. This deviates from the FDE standard's React/Vite + NestJS baseline; record that in an ADR when the next phase starts. Business rules and access checks stay server-side.
- **Microsoft sign-in:** Auth.js with the Microsoft Entra ID provider. Redirect URI: `http://localhost:3000/api/auth/callback/microsoft-entra-id` (Web platform, single tenant). Tenant ID, client ID and client secret go in `.env.local`; never commit them. Map signed-in advisers to the existing adviser-scoped access in `lib/session.ts`. Verify current Auth.js and Entra documentation before implementing.
- **Reminders:** need a scheduler (local cron for the demo; a hosted scheduler later). Decide recipients first.
- **Urgent notifications:** needs decisions on content, channel and trigger before design (see SOURCE_NOTES conflict 1).
- **Response checklist:** content sourced from the guidance office protocol.
- **AI advice:** a structured-output suggestion shown on the review screen, clearly labelled, redacted like drafting, never auto-sent.
- **Excel import/export:** a fixed template with validation; dummy data only; reject rows that do not match the template.
- **Anonymized export:** reuse `lib/redact.ts` placeholders to produce a shareable copy of a case or report.
- **Live recording:** browser capture, transcribed then discarded; address redaction of audio before transcription.
- **Retention:** propose a period to the DPO; implement deletion once a rule is set.

## Next step

Make the five-slide deck from DECK_OUTLINE.md, then rehearse the demo.
