import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function parseBody<T>(req: Request, schema: ZodType<T>) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (parsed.success) return { data: parsed.data, error: null };
  const issue = parsed.error.issues[0];
  return { data: null, error: fail(issue?.message ?? "Invalid input", 400) };
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Unknown error");
