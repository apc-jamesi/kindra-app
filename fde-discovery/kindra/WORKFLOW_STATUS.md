# Kindra: workflow status

| Field | Value |
|---|---|
| Current stage | Next-phase build: "Act faster" (urgent alerts + reminders) on local PostgreSQL, built 2026-11-25 at the user's request before the pitch |
| Pitch status | Deck drafted (5 slides): https://claude.ai/artifact/CvT2cmt4zpK7sg3RbFPeJK. Not yet delivered |
| Demo | Existing app with live OpenAI (`OPENAI_API_KEY` set in `.env`; with a key set, sample transcripts also go to OpenAI). Not rehearsed |
| Client feedback | None from advisers yet. Presenter's own ballot: B, C, A, E, D (see SOURCE_NOTES.md). Adviser ranking to be collected at the pitch |
| Repository target | Not set (GitHub org preference: `apcdevs-repo`; repository not confirmed) |
| Checked commit | None. The project folder is not a git repository |
| Validation evidence | 2026-11-25, in a Linux cloud copy with Node 22 and PostgreSQL 16: `tsc --noEmit` passed, `eslint` passed, `next build` passed. API checks covered raise, deny for another adviser (403), deny for an adviser acknowledging (403), withhold without a reason (400), approve, approve twice (409), and escalation once under 6 concurrent calls. Browser flow checked for adviser, counselor and guidance head, with no console errors. Existing report save, case update, item status and contact change were rechecked on PostgreSQL, and local-file mode was rechecked. Not yet run on the user's Windows laptop. The OpenAI key was not tested |
| Engineering standard used | Project-root `FDE_TECH_STACK.md` (copy of the v1 package snapshot) |

## Done

- FDE Intake v1 skill installed at `.claude/skills/fde-intake/` (installer checksums verified).
- `FDE_TECH_STACK.md` copied to the project root.
- Five-slide deck built from DECK_OUTLINE.md.

## Open before the pitch

- Rehearse the demo on the venue network. Fallback for an OpenAI failure: remove `OPENAI_API_KEY` from the environment and restart the dev server, which returns to sample mode.
- Print the ranking ballot: https://claude.ai/artifact/JBUXLaoSrsEvY78fwkxZ3L (it currently holds the presenter's answers; clear them or duplicate the doc before printing blank copies).

## Next-phase build (2026-11-25)

- Ranking used: the presenter's ballot (B Act faster first). Advisers' own ranking is still to be collected.
- Added: local PostgreSQL store (`DATABASE_URL`, `npm run db:setup`), urgent alerts with counselor approval for family contact, escalation to the guidance head, a simulated SMS outbox, and a Reminders page. See DEMO_GUIDE.md and docs/adr/0001–0003.
- Simulated: SMS and calls. Demo: sign-in switcher.

## Next action

On the demo laptop: install PostgreSQL, add `DATABASE_URL`, run `npm.cmd run db:setup` and `npm.cmd run dev`, then rehearse DEMO_GUIDE.md twice. Ask the guidance office to confirm the urgent-concern list and the family-contact rule.
