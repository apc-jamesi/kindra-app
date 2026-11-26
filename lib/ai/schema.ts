import { z } from "zod";
import { CATEGORIES, SPEAKERS } from "../types";

const Sourced = z.object({ text: z.string(), src: z.array(z.number().int()) });

/** Structured Outputs contract for the drafting model. Every field is required (nullable where optional). */
export const ModelDraftSchema = z.object({
  caseType: z.string(),
  participants: z.string(),
  speakers: z.array(z.object({ p: z.number().int(), speaker: z.enum(SPEAKERS), inferred: z.boolean() })),
  concerns: z.array(z.enum(CATEGORIES)),
  presentingConcern: Sourced,
  relevantInfo: z.array(z.object({ label: z.string(), text: z.string(), src: z.array(z.number().int()) })),
  guidanceImpression: Sourced,
  strengths: Sourced,
  limitations: Sourced,
  actionPlan: z.array(
    z.object({ action: z.string(), owner: z.string(), due: z.string(), src: z.array(z.number().int()) }),
  ),
  monitoring: Sourced,
  escalation: Sourced.nullable(),
  recommendation: Sourced,
  statusNote: z.string(),
  checks: z.array(z.string()),
  contactChangeReported: z.boolean(),
  ignoredInstruction: z.boolean(),
});
