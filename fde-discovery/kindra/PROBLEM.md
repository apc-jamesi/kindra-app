# Kindra: problem statement

Client: APC SHS homeroom advisers (primary stakeholders and decision-makers for the next build)
Intake date: 2026-11-25

## Problem in five bullets

- **Who:** APC SHS homeroom advisers who document advisory conferences, track follow-ups, and relay next steps for many advisees.
- **Today:** Case notes are kept manually in personal notes, Excel files and Word documents.
- **Pain:** The documentation and follow-up work happens almost every day, pushes advisers into overtime, and limits how many students they can attend to. Relaying what needs to be done to parents and the guidance counselor is often delayed by lack of time. The problem is capacity, not forgetting past cases.
- **Why now:** A working prototype (Kindra) already exists, and advisers are being asked to decide what the next phase should build. *(Assumption: no external deadline was given.)*
- **Good outcome:** Advisers produce a reviewed case report quickly, the right people (parent/guardian, guidance counselor) learn about urgent concerns as early as possible, and every agreed action has an owner, a clear next step and a reminder.

## Users

| User | Role in Kindra | Status |
|---|---|---|
| Homeroom adviser | Writes, reviews and approves case reports; owns follow-ups | Confirmed (primary) |
| Guidance counselor | Should be notified quickly about urgent concerns | Confirmed (interview) — no in-app role yet |
| Parent/guardian | Should be notified quickly about urgent concerns | Confirmed (interview) — parent *accounts* not requested |
| Student | Subject of the record; does not use the app | Observed |

## Inputs

- Written conference notes or a case report (English or Taglish)
- An uploaded conference recording (current); a live recording during the conference (next phase)
- Student roster — currently seeded fictional data; next phase adds an Excel template upload

## Outputs

- A reviewed case report: summary, categorized concerns, action items, student mentions with source phrases
- Case history per student, action-item status, audit log (current)
- Next phase: reminders, urgent notifications to parent/guardian and guidance counselor, a response checklist, AI advice on the situation, Excel export, anonymized export for papers and presentations

## Constraints

- Fictional/dummy data only for now; no direct connection to school systems.
- Philippine Data Privacy Act applies to student, guardian and case data. Compliance is not claimed; the README lists open items for the DPO.
- Real names stay visible inside the app. Names must be anonymized in anything used outside it (papers, pitch decks, reports).
- The decision on what to build next belongs to the advisers.
- Time savings cannot be measured yet. No savings figure will be claimed until advisers have used the app.

## In scope for this pitch

- What Kindra does today, shown as a live demo
- The proposed next-phase features, ranked by the advisers
- The privacy safeguards, existing and planned

## Out of scope (for now)

- Parent/guardian accounts or a parent portal
- Live connection to the school information system
- Production deployment (owned by IT)
- Any claim of measured time savings

## Next-phase candidates (to be ranked by advisers)

1. Live recording during the conference
2. Automated reminders for due and overdue action items
3. Student records by Excel: template upload to add students, plus Excel export (dummy data)
4. Microsoft account sign-in (Entra ID app registration exists)
5. Anonymized export / presentation mode for papers, pitches and reports
6. Keep notes and transcripts for as long as allowed (retention rule pending DPO)
7. Urgent notifications to the parent/guardian and guidance counselor
8. A response checklist / guide on what to do for each type of concern
9. AI advice on what may be happening, as a suggestion the adviser reviews

## Acceptance criteria for the pitch

- The live demo completes the review-and-save workflow on fictional data: draft from notes, confirm one student among two mentioned, save, update an action item, do the verified guardian phone update, show the audit entry.
- Every current feature shown in the deck is something the demo actually does; sample-mode and not-yet-connected parts are labelled as such.
- No real student, guardian or adviser names appear in the deck or handouts.
- Advisers leave with a recorded ranking of the next-phase features.
- No time or cost savings are stated as fact.

## Assumptions

- The pitch audience is a group of homeroom advisers at APC SHS.
- The demo uses the existing fictional seed data (Jana, Miguel and others).
- Whether the demo uses live OpenAI or sample mode is not yet decided (see PROTOTYPE_PLAN.md).
