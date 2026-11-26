# Kindra: source notes

## Evidence inventory

| Source | Location | Used for |
|---|---|---|
| Project plan PDF | `docs/Business Requirements Student Advisory and Case Management Plan.pdf` (4 pages) | Original MVP workflow, stack, deferred items, acceptance checks |
| App README | `README.md` | Current feature set, demo script, privacy notes, open DPO items, brand notes |
| App source layout | `app/`, `components/`, `lib/`, `supabase/schema.sql` | Confirms the README's described modules exist (file names only; code not reviewed in depth, app not run during intake) |
| Engineering standard | Packaged fallback `fde-intake/references/FDE_TECH_STACK.md` (FDE Kit Enterprise Serverless Technology Standard). No project-local `FDE_TECH_STACK.md` exists yet. | Technical planning baseline |
| Intake interview | This session, 2026-11-25, five questions | Client, goal, pain, ask, next-phase scope |

The user supplied the materials path as `Downloads\kindra-app\docs`; that path does not exist, so `Documents\kindra-app\docs` was used.

## Confirmed requirements (from the user or the PDF)

- Client and decision-makers for the next build are the homeroom advisers. *(interview Q1)*
- The deliverable is a pitch on what the current system has and what the next phase adds. *(interview Q1)*
- Next phase includes: live recording during the conference; automated reminders for due/overdue action items; Excel template upload for student records and Excel export, with dummy data only; Microsoft account sign-in. *(interview Q2)*
- Inside the app, real names stay visible. Names must be anonymized in papers, pitches and reports used as evidence. *(interview Q2)*
- Notes and transcripts should be kept as long as possible; transcripts are long. *(interview Q2)*
- Today advisers work from personal notes, Excel and Word; the pain is overtime and not being able to attend to every student; forgetting past cases is not the problem. *(interview Q3)*
- The pitch must include a live demo, an adviser ranking of the next-phase features, and privacy safeguards. Time comparison cannot be calculated yet. *(interview Q4)*
- Parents and the guidance counselor need to be notified of urgent concerns as soon as possible; advisers want a checklist/guide on what to do and AI advice on what is happening. *(interview Q5)*
- The PDF's MVP workflow, its six acceptance checks, and the Jana/Miguel demo requirement. *(PDF pp. 1, 4)*

## Presenter's ballot answers (2026-11-25)

Entered by the user on the ranking ballot (https://claude.ai/artifact/JBUXLaoSrsEvY78fwkxZ3L). These are the presenting team's answers, not yet the advisers' ranking.

- Ranking: 1 B Act faster · 2 C Know what to do · 3 A Capture faster · 4 E Secure and lasting · 5 D Records in and out.
- Urgent concerns needing an immediate parent or counselor alert: depression, suicidal thoughts, loss of interest in studying, mental health issues, family problems.
- Fastest parent channel: phone calls and text messages.
- Implication: suicidal thoughts are a crisis category. Alerts for it must follow the guidance office's crisis protocol and be adviser-triggered or adviser-confirmed, not left to AI detection alone (see conflict 2).

## Observed behaviour (in the app per README; adviser acceptance not established)

- Draft from notes or a corrected transcript, including Taglish; citations link each section to a source paragraph.
- Student mentions with source phrases; adviser confirms the one student who receives the report.
- Action items with owners and status tracking; approval requires owners on every item and all checks ticked.
- Verified guardian phone update, kept separate from saving the report.
- Adviser-scoped access via a demo user switcher (not real sign-in); three advisers, eight students seeded.
- Audit log of views, drafts, approvals, status changes, contact updates and notifications, without case content.
- Dashboard: 24-hour on-time rate, pending reports, overdue items, items with no owner.
- Redaction of roster names, nicknames, surnames, IDs and phone numbers before every AI call.
- Generic Telegram notification to one test chat.
- Sample mode by default: drafts come from hand-written samples or an offline rule-based drafter; transcription and Telegram show "not configured" without keys. Live OpenAI, Supabase and Telegram require keys.
- APC Campaign Brand Book 2026 palette and fonts (Montserrat stands in for licensed Gotham).

## Proposals (awaiting decision)

- Keep the existing AI-side redaction in addition to the new anonymized export, because it is invisible to advisers and strengthens the privacy story.
- Sign-in via Auth.js with the Microsoft Entra ID provider. Redirect URI given to the user: `http://localhost:3000/api/auth/callback/microsoft-entra-id` (platform: Web; single tenant). A production URI is added once IT provides the domain.
- Group the nine next-phase features into five themes for the deck and ranking.
- Keep the existing Next.js single-app architecture rather than splitting into React/Vite plus NestJS per the standard. A rewrite is not justified for this scope; record it as an ADR when the next phase starts.

## Conflicts and risks

1. **Parent and counselor notifications vs. the PDF's privacy rule.** The PDF keeps student names, case details and guardian contacts out of Telegram and sends only a generic message. It also defers parent accounts. Urgent notifications to parents and counselors need a decision on content (generic alert vs. details), channel (SMS, email, Telegram, in-app), and who triggers them (adviser click vs. automatic).
2. **AI advice on student welfare.** Advice must stay a suggestion that the adviser reviews, not a decision. It needs a clear boundary for crisis situations (escalate to the guidance counselor per school protocol rather than relying on AI) and should go through the same redaction.
3. **Response checklist content.** The checklist should come from the school's guidance office protocol, not be invented. No such protocol is in the materials yet.
4. **Retention "as long as possible" vs. the Data Privacy Act.** The DPA's proportionality principle generally limits keeping personal data longer than needed. Present a retention period as a proposal for the DPO; do not promise indefinite storage.
5. **Live recording and redaction.** Audio is already transcribed before redaction (README open item). Live recording increases the volume of unredacted audio sent to the AI. The PDF also says recordings stay out of persistent storage.
6. **Names not on the roster still reach the AI** (README open item).
7. **Brand dark color.** The brand book lists `#62b69`, which is not a valid hex code; the app uses `#262d6b`. Confirm with the brand team before the deck.
8. **Architecture deviation** from the FDE standard (Next.js monolith vs. React/Vite + NestJS), noted above.

## Open questions

- Will the demo run on live OpenAI or in sample mode? Is the network at the pitch venue reliable?
- When and where is the pitch, how long is the slot, and how many advisers attend?
- How will advisers submit their ranking (on paper, a form, a show of hands)?
- Who should reminders go to: only the action-item owner, or also the adviser and counselor?
- What counts as "urgent" for parent and counselor notification, and does the school already have an escalation protocol?
- Which notification channel do parents actually use?
