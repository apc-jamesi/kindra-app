# ADR 0003: Urgent alerts are human-triggered; SMS is simulated

- Status: Accepted for the prototype (2026-11-25); needs guidance office and DPO sign-off before real use
- Context: The presenter's ballot ranked "Act faster" (urgent alerts plus reminders) first and listed the urgent concerns, with phone call and text as the fastest parent channels. Source notes, conflicts 1 and 2: the PDF keeps case details out of notifications, and crisis concerns must follow the school protocol rather than AI detection.
- Decision:
  - Only the adviser raises an alert, from the student's record. AI never raises or sends one.
  - The counselor is alerted at once. For self-harm, depression, mental health and family concerns, the family is contacted only after the counselor approves. The counselor may decline, with a logged reason.
  - Messages carry only a callback request, the student's first name (family only) and a reference.
  - Unacknowledged crisis and urgent alerts escalate to the guidance head after `ESCALATE_MINUTES`, once. The once-only rule is enforced with an atomic claim in every store.
  - Every SMS and call is written to an outbox and never sent, until a provider, sender name, consent wording and cost are agreed.
- Consequences: The demo shows the full flow with no paid service and no risk of messaging real numbers. Going live needs an SMS provider adapter where `raiseAlert` and `decideGuardianContact` write messages, plus a scheduler that calls `POST /api/alerts/escalate` every minute.
