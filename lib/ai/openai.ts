import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { config } from "../config";
import type { DraftMention, ModelDraft } from "../types";
import { SYSTEM_PROMPT } from "./prompt";
import { ModelDraftSchema } from "./schema";

let client: OpenAI | null = null;
const openai = () => (client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

/**
 * Draft with Structured Outputs from redacted, numbered paragraphs. The roster check (lookup_mention in the
 * eval kit) is computed by the app and passed in, so the model learns only whether each placeholder is
 * resolved or ambiguous, never who it is.
 */
export async function draftWithOpenAI(paragraphs: string[], mentions: DraftMention[]): Promise<ModelDraft> {
  const mentionCheck = mentions.map((m) => ({
    token: m.token,
    status: m.candidates.length === 1 ? "resolved" : "ambiguous",
    candidate_count: m.candidates.length,
  }));
  const numbered = paragraphs.map((p, i) => `[P${i}] ${p}`).join("\n");
  const response = await openai().responses.parse({
    model: config.draftModel,
    instructions: SYSTEM_PROMPT,
    input: [
      {
        role: "user",
        content: `Mention check results: ${JSON.stringify(mentionCheck)}\n\n<notes>\n${numbered}\n</notes>`,
      },
    ],
    text: { format: zodTextFormat(ModelDraftSchema, "advisory_case_report") },
  });
  if (!response.output_parsed) throw new Error("The drafting model returned no structured draft.");
  return response.output_parsed;
}

/** Transcribe in memory. The audio is never written to disk or the database. */
export async function transcribeWithOpenAI(file: File): Promise<string> {
  const result = await openai().audio.transcriptions.create({
    file,
    model: config.transcribeModel,
    prompt:
      "A Taglish (Tagalog and English) senior high school advisory conference between an adviser, a student and a parent.",
  });
  return result.text;
}
