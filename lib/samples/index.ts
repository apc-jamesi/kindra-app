/**
 * Sample inputs for demos (fictional). The three English transcripts and their hand-written drafts come
 * from the kindra-prototype project (transcripts.json, drafts.json). The Taglish note is the session-1
 * AIDLC case with two student mentions and a reported phone change.
 */
import type { Category, ModelDraft, Speaker } from "../types";
import draftsJson from "./drafts.json";
import transcriptsJson from "./transcripts.json";

export interface SampleInput {
  id: string;
  title: string;
  format: string;
  paragraphs: string[];
}

const TRANSCRIPTS = transcriptsJson as Record<string, string[]>;

export const TAGLISH_SAMPLE: SampleInput = {
  id: "taglish",
  title: "Taglish notes: Jana and Miguel",
  format: "Adviser notes after adviser–parent conference",
  paragraphs: [
    "Conference with Jana and her mother, Nov 20.",
    "Si Jana ay tatlong beses na-late this week at bumagsak sa Gen Math quiz.",
    "Sabi niya puyat siya kasi nag-aalaga ng kapatid.",
    "Nabanggit din na si Migs ang ka-group niya sa research at hindi sila nagkakasundo.",
    "Sabi ng nanay, bagong number niya ay 09171234567.",
    "Napagkasunduan: Jana will attend Gen Math consultation on Friday.",
    "Napagkasunduan din na guidance will check in with Jana next week.",
  ],
};

export const SAMPLE_INPUTS: SampleInput[] = [
  TAGLISH_SAMPLE,
  { id: "career", title: "Career guidance (adviser–student)", format: "Unlabeled transcript", paragraphs: TRANSCRIPTS.career },
  { id: "behavior", title: "Behavioral observation (adviser–parent)", format: "Unlabeled transcript", paragraphs: TRANSCRIPTS.behavior },
  { id: "general", title: "General consultation (adviser–student–parent)", format: "Unlabeled transcript", paragraphs: TRANSCRIPTS.general },
];

/* ---------- Pre-written drafts (stand-in for the AI in sample mode) ---------- */

interface ProtoSourced {
  text: string;
  src: number[];
  flag?: string;
  label?: string;
}
interface ProtoDraft {
  id: string;
  caseType: string;
  participants: string;
  speakerMap: Record<string, string>;
  sections: {
    presentingConcern: ProtoSourced;
    relevantInfo: ProtoSourced[];
    guidanceImpression: ProtoSourced;
    strengths: ProtoSourced;
    limitations: ProtoSourced;
    actionPlan: { owner: string; action: string; target: string; src: number[]; flag?: string }[];
    monitoring: ProtoSourced;
    status: string;
    recommendation: ProtoSourced;
  };
  escalation?: ProtoSourced;
  flags: { id: string; text: string }[];
}

const CONCERNS: Record<string, Category[]> = {
  career: ["career"],
  behavior: ["behavior", "attendance", "wellbeing", "family"],
  general: ["academic", "wellbeing"],
};

const s = (x: ProtoSourced) => ({ text: x.text, src: x.src });

function convert(d: ProtoDraft): ModelDraft {
  const sec = d.sections;
  return {
    caseType: d.caseType,
    participants: d.participants,
    speakers: Object.entries(d.speakerMap).map(([p, speaker]) => ({
      p: Number(p),
      speaker: (["Adviser", "Student", "Parent"].includes(speaker) ? speaker : "Other") as Speaker,
      inferred: true,
    })),
    concerns: CONCERNS[d.id] ?? [],
    presentingConcern: s(sec.presentingConcern),
    relevantInfo: sec.relevantInfo.map((r) => ({ label: r.label ?? "", text: r.text, src: r.src })),
    guidanceImpression: s(sec.guidanceImpression),
    strengths: s(sec.strengths),
    limitations: s(sec.limitations),
    actionPlan: sec.actionPlan.map((a) => ({ action: a.action, owner: a.owner, due: a.target, src: a.src })),
    monitoring: s(sec.monitoring),
    escalation: d.escalation ? s(d.escalation) : null,
    recommendation: s(sec.recommendation),
    statusNote: sec.status,
    checks: [
      ...d.flags.map((f) => f.text),
      ...(sec.recommendation.flag ? [sec.recommendation.flag] : []),
      ...sec.actionPlan.filter((a) => a.flag).map((a) => `Action item: ${a.flag}`),
    ],
    contactChangeReported: false,
    ignoredInstruction: false,
  };
}

export const PREWRITTEN: Record<string, ModelDraft> = Object.fromEntries(
  (draftsJson as ProtoDraft[]).map((d) => [d.id, convert(d)]),
);

/** Returns the sample id if the text is exactly one of the English sample transcripts. */
export function matchPrewritten(paragraphs: string[]): string | null {
  const norm = (a: string[]) => a.map((x) => x.trim()).filter(Boolean).join("\n");
  const text = norm(paragraphs);
  for (const id of Object.keys(PREWRITTEN)) {
    if (TRANSCRIPTS[id] && norm(TRANSCRIPTS[id]) === text) return id;
  }
  return null;
}
