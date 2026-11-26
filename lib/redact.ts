/**
 * Server-side redaction. Student names, nicknames, surnames, student IDs/LRNs and phone numbers are
 * replaced with placeholders before any text reaches the AI, and restored only for the adviser.
 * Port of ../pipeline/redact.py from the session-1 eval kit.
 */
import type { DraftMention, Student } from "./types";

export const ID_PATTERN = /\bS-\d{3}\b|\b\d{12}\b/g;
export const PHONE_PATTERN = /(?:\+?63|0)9\d{2}[ -]?\d{3}[ -]?\d{4}\b/g;
export const TOKEN_PATTERN = /\[STUDENT_\d+\]/g;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface AliasEntry {
  alias: string;
  studentIds: string[];
}

/** Full names, listed aliases and surnames. A surname shared by several students is ambiguous. */
function buildAliases(students: Student[]): AliasEntry[] {
  const map = new Map<string, Set<string>>();
  const add = (alias: string, id: string) => {
    const key = alias.trim().toLowerCase();
    if (key.length < 2) return;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(id);
  };
  for (const s of students) {
    add(s.name, s.id);
    s.aliases.forEach((a) => add(a, s.id));
    const parts = s.name.trim().split(/\s+/);
    if (parts.length > 1) add(parts[parts.length - 1], s.id);
  }
  return [...map.entries()]
    .map(([alias, ids]) => ({ alias, studentIds: [...ids] }))
    .sort((a, b) => b.alias.length - a.alias.length);
}

const aliasRegex = (entries: AliasEntry[]) =>
  new RegExp(`\\b(${entries.map((e) => escapeRegex(e.alias)).join("|")})\\b`, "gi");

function phraseAround(text: string, start: number, end: number) {
  const before = text.slice(0, start).match(/(?:\S+\s+){0,2}$/)?.[0] ?? "";
  const after = text.slice(end).match(/^(?:\s*\S+){0,2}/)?.[0] ?? "";
  return (before + text.slice(start, end) + after)
    .split(/\s+/)
    .join(" ")
    .replace(/^[\s.,:;(]+|[\s.,:;(]+$/g, "")
    .replace(ID_PATTERN, "[ID]")
    .replace(PHONE_PATTERN, "[phone withheld]");
}

export interface RedactionResult {
  paragraphs: string[];
  mentions: DraftMention[];
}

/** Redact each paragraph, sharing one placeholder per student across the whole input. */
export function redact(paragraphs: string[], students: Student[]): RedactionResult {
  const entries = buildAliases(students);
  const byAlias = new Map(entries.map((e) => [e.alias, e]));
  const byId = new Map(students.map((s) => [s.id, s]));
  const keyToToken = new Map<string, string>();
  const mentions: DraftMention[] = [];
  const pattern = aliasRegex(entries);

  const safe = paragraphs.map((text, p) =>
    text
      .replace(pattern, (match: string, _g: string, offset: number) => {
        const entry = byAlias.get(match.toLowerCase())!;
        const key = entry.studentIds.length === 1 ? entry.studentIds[0] : `ambiguous:${entry.alias}`;
        let token = keyToToken.get(key);
        if (!token) {
          token = `[STUDENT_${keyToToken.size + 1}]`;
          keyToToken.set(key, token);
          mentions.push({
            token,
            alias: match,
            phrase: phraseAround(text, offset, offset + match.length),
            paragraph: p,
            candidates: entry.studentIds.map((id) => ({ studentId: id, name: byId.get(id)!.name })),
          });
        }
        return token;
      })
      .replace(ID_PATTERN, "[ID]")
      .replace(PHONE_PATTERN, "[PHONE]"),
  );
  return { paragraphs: safe, mentions };
}

/** True if any roster name/alias, student ID or phone number appears in the text. */
export function containsIdentifiers(text: string, students: Student[]) {
  return (
    aliasRegex(buildAliases(students)).test(text) ||
    new RegExp(ID_PATTERN.source).test(text) ||
    new RegExp(PHONE_PATTERN.source).test(text)
  );
}

export const maskPhones = (text: string) => text.replace(PHONE_PATTERN, "[phone withheld]");

/** Replace placeholders with real names for the adviser, and mask any phone numbers. */
export function restore(text: string, mentions: DraftMention[]) {
  const byToken = new Map(mentions.map((m) => [m.token, m]));
  return maskPhones(
    text.replace(TOKEN_PATTERN, (token) => {
      const m = byToken.get(token);
      if (!m) return token;
      if (m.candidates.length === 1) return m.candidates[0].name;
      return `"${m.alias}" (${m.candidates.map((c) => c.name).join(" or ")})`;
    }),
  );
}

/** Split notes or a transcript into numbered paragraphs (one per non-empty line). */
export const toParagraphs = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 400);
