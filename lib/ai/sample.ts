/**
 * Sample mode (no OPENAI_API_KEY). Two stand-ins for the model, both clearly labelled in the UI:
 * 1. The three English sample transcripts return the hand-written drafts from the kindra-prototype.
 * 2. Anything else goes through a deterministic, rule-based drafter ported from the session-1 eval shim.
 * Like the model, both only ever see redacted paragraphs.
 */
import { CATEGORIES, VAGUE_DUE, type Category, type DraftActionItem, type ModelDraft } from "../types";
import { PHONE_PATTERN, TOKEN_PATTERN } from "../redact";

const INJECTION = /ignore (all |your |previous )?instructions|show your (system )?prompt|reveal (your|the) prompt/i;
const CONTACT_CHANGE = /bagong number|new number|changed? (?:her |his |their )?(?:phone )?number|nagpalit ng number|palit ng number|\[PHONE\]/i;
const AGREED = /napagkasunduan|agreed|nag-agree|pumayag/i;
const AGREED_SPLIT = /(?:napagkasunduan|agreed|nag-agree|pumayag)\s*(?:din\s*)?(?:na|that|to)?\s*:?\s*/i;
const ROLE_OWNER: [RegExp, string][] = [
  [/\bguidance\b/i, "Guidance"],
  [/\bregistrar\b/i, "Registrar"],
  [/\b(faculty|teacher)\b/i, "Faculty"],
  [/\b(nanay|tatay|mother|father|parent)\b/i, "Parent/guardian"],
  [/\badviser\b/i, "Adviser"],
];
const EXPLICIT_DUE = /\b(monday|tuesday|wednesday|thursday|friday|lunes|martes|miyerkules|huwebes|biyernes|nov(?:ember)? \d{1,2}|dec(?:ember)? \d{1,2}|\d{1,2}\/\d{1,2})\b/i;
const VAGUE = /next week|sa susunod na linggo|\bsoon\b|bago mag-?exam|\basap\b|\blater\b/i;
const RULES: Record<Exclude<Category, "guardian_contact">, RegExp> = {
  academic: /grade|bagsak|bumagsak|failing|quiz|exam|module|assignment|project|research/i,
  attendance: /absent|absences|\blate\b|na-late|lumiban|hindi pumasok|cutting/i,
  behavior: /away|fight|bully|disrespect|nagsagutan|hindi (sila )?nagkakasundo/i,
  wellbeing: /stress|anxious|umiiyak|pagod|puyat|tulog|malungkot|\bsad\b/i,
  family: /magulang|nanay|tatay|mother|father|kapatid|ofw|sa bahay/i,
  career: /course|college|career|kurso/i,
};

const srcOf = (paragraphs: string[], test: (p: string) => boolean) =>
  paragraphs.flatMap((p, i) => (test(p) ? [i] : []));

export function draftWithRules(paragraphs: string[]): ModelDraft {
  const all = paragraphs.join("\n");
  const ignoredInstruction = INJECTION.test(all);
  const contactChangeReported = CONTACT_CHANGE.test(all) || new RegExp(PHONE_PATTERN.source).test(all);
  const concerns = CATEGORIES.filter((c) => (c === "guardian_contact" ? contactChangeReported : RULES[c].test(all)));
  const tokens = [...new Set(all.match(TOKEN_PATTERN) ?? [])];

  const actionPlan: DraftActionItem[] = [];
  paragraphs.forEach((p, i) => {
    if (!AGREED.test(p) || INJECTION.test(p)) return;
    const parts = p.split(AGREED_SPLIT);
    const action = parts[parts.length - 1].trim().replace(/\.$/, "");
    const owner = ROLE_OWNER.find(([rx]) => rx.test(action))?.[1] ?? tokens.find((t) => action.startsWith(t)) ?? "";
    const due = action.match(EXPLICIT_DUE)?.[1] ?? (VAGUE.test(action) ? VAGUE_DUE : "");
    actionPlan.push({ action, owner, due, src: [i] });
  });

  const contextIdx = srcOf(paragraphs, (p) => !AGREED.test(p) && !INJECTION.test(p) && !CONTACT_CHANGE.test(p));
  const concernText = contextIdx.slice(0, 3).map((i) => paragraphs[i]).join(" ").slice(0, 400);
  const checks = ["Drafted by the offline rule-based drafter (sample mode). Rewrite the assessment sections in your own words."];
  if (actionPlan.some((a) => a.due === VAGUE_DUE)) checks.push("At least one deadline is vague. Confirm exact dates.");
  if (contactChangeReported) checks.push("A guardian phone change was reported. Verify it separately before updating the contact.");
  if (ignoredInstruction) checks.push("The notes contained an instruction to the AI. It was ignored.");

  return {
    caseType: concerns.includes("career") ? "Career guidance" : "Advisory conference",
    participants: /nanay|tatay|mother|father|parent/i.test(all) ? "Adviser, student and parent/guardian" : "Adviser and student",
    speakers: [],
    concerns,
    presentingConcern: { text: concernText || "See conference notes.", src: contextIdx.slice(0, 3) },
    relevantInfo: concerns
      .filter((c) => c !== "guardian_contact")
      .map((c) => {
        const src = srcOf(paragraphs, (p) => RULES[c as Exclude<Category, "guardian_contact">].test(p) && !AGREED.test(p));
        return { label: c[0].toUpperCase() + c.slice(1), text: src.map((i) => paragraphs[i]).join(" "), src };
      })
      .filter((r) => r.src.length),
    guidanceImpression: { text: "", src: [] },
    strengths: { text: "", src: [] },
    limitations: { text: "Preliminary summary of adviser notes. Not a clinical or formal assessment.", src: [] },
    actionPlan,
    monitoring: { text: actionPlan.length ? "Review completion of the agreed actions at the next check-in." : "", src: actionPlan.flatMap((a) => a.src) },
    escalation: null,
    recommendation: { text: "", src: [] },
    statusNote: "Open – follow-up agreed",
    checks,
    contactChangeReported,
    ignoredInstruction,
  };
}
