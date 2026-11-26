import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { transcribeWithOpenAI } from "@/lib/ai/openai";

const MAX_BYTES = 25 * 1024 * 1024;

/** Transcribes an uploaded recording in memory and returns editable text. The audio is not stored. */
export async function POST(req: Request) {
  if (config.aiMode !== "openai") {
    return NextResponse.json(
      { error: "Transcription needs OPENAI_API_KEY in .env.local. Type or paste the transcript instead." },
      { status: 503 },
    );
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose an audio file to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "The recording is larger than 25 MB." }, { status: 413 });
  }
  try {
    return NextResponse.json({ text: await transcribeWithOpenAI(file) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Transcription failed: ${message}` }, { status: 502 });
  }
}
