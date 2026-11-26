import { NextResponse } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { draftWithOpenAI } from "@/lib/ai/openai";
import { draftWithRules } from "@/lib/ai/sample";
import { errorMessage, fail, parseBody } from "@/lib/http";
import { containsIdentifiers, redact, restore, toParagraphs } from "@/lib/redact";
import { matchPrewritten, PREWRITTEN } from "@/lib/samples";
import { currentUser } from "@/lib/session";
import { getStore } from "@/lib/store";
import type { DraftResponse, ModelDraft, Sourced } from "@/lib/types";

const Body = z.object({ text: z.string().trim().min(1, "Enter notes or a transcript first.").max(40000) });

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, Body);
  if (error) return error;

  const paragraphs = toParagraphs(data.text);
  const store = getStore();
  const students = await store.listStudents();
  const { paragraphs: redacted, mentions } = redact(paragraphs, students);

  // Guardrail: never call the model if anything identifying survived redaction.
  if (redacted.some((p) => containsIdentifiers(p, students))) {
    return fail("Redaction check failed; nothing was sent to the AI.", 500);
  }

  let model: ModelDraft;
  let mode: DraftResponse["mode"];
  try {
    const prewritten = config.aiMode === "sample" ? matchPrewritten(paragraphs) : null;
    if (prewritten) {
      model = structuredClone(PREWRITTEN[prewritten]);
      mode = "sample-prewritten";
    } else if (config.aiMode === "openai") {
      model = await draftWithOpenAI(redacted, mentions);
      mode = "openai";
    } else {
      model = draftWithRules(redacted);
      mode = "sample";
    }
  } catch (err) {
    return fail(`Drafting failed: ${errorMessage(err)}`, 502);
  }

  const user = await currentUser();
  await store.addAudit({
    actor: user.name, action: "draft generated", entityType: "draft", entityId: "-", studentId: null,
    detail: `${mode} draft from ${paragraphs.length} paragraphs; ${mentions.length} placeholder(s); content not logged`,
  });

  // Restore names for the adviser and mask phones in every text field.
  const r = (t: string) => restore(t, mentions);
  const rs = (s: Sourced): Sourced => ({ text: r(s.text), src: s.src.filter((i) => i >= 0 && i < paragraphs.length) });
  const body: DraftResponse = {
    mode,
    paragraphs: paragraphs.map((p) => restore(p, [])),
    modelInput: redacted,
    draft: {
      ...model,
      caseType: r(model.caseType),
      participants: r(model.participants),
      speakers: model.speakers.filter((s) => s.p >= 0 && s.p < paragraphs.length),
      presentingConcern: rs(model.presentingConcern),
      relevantInfo: model.relevantInfo.map((i) => ({ label: r(i.label), ...rs(i) })),
      guidanceImpression: rs(model.guidanceImpression),
      strengths: rs(model.strengths),
      limitations: rs(model.limitations),
      actionPlan: model.actionPlan.map((a) => ({ action: r(a.action), owner: r(a.owner), due: r(a.due), src: a.src })),
      monitoring: rs(model.monitoring),
      escalation: model.escalation ? rs(model.escalation) : null,
      recommendation: rs(model.recommendation),
      statusNote: r(model.statusNote),
      checks: model.checks.map(r),
      mentions,
    },
  };
  return NextResponse.json(body);
}
