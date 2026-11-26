import type { SpeakerLabel } from "@/lib/types";

const SPEAKER_STYLE: Record<string, string> = {
  Adviser: "bg-gold-light text-ink",
  Student: "bg-brand/10 text-brand",
  Parent: "bg-terracotta/20 text-ink",
  Other: "bg-canvas text-charcoal",
};

/** Numbered transcript with inferred speaker labels. Used on the review screen and the saved report. */
export default function Transcript({
  paragraphs,
  speakers,
  active,
}: {
  paragraphs: string[];
  speakers: SpeakerLabel[];
  active?: number | null;
}) {
  const bySpeaker = new Map(speakers.map((s) => [s.p, s]));
  if (!paragraphs.length) return <p className="text-sm text-charcoal">No source text was saved with this report.</p>;
  return (
    <ol className="space-y-0.5 text-sm leading-relaxed">
      {paragraphs.map((text, i) => {
        const s = bySpeaker.get(i);
        return (
          <li
            key={i}
            id={`p${i}`}
            className={`para flex gap-2 rounded px-1.5 py-1 transition-colors ${active === i ? "bg-gold-light" : ""}`}
          >
            <span className="w-7 shrink-0 pt-0.5 text-[11px] text-charcoal">P{i}</span>
            {s && (
              <span
                className={`h-fit shrink-0 whitespace-nowrap rounded px-1.5 text-[11px] font-semibold ${SPEAKER_STYLE[s.speaker]}`}
                title={s.inferred ? "Inferred from turn order or context" : undefined}
              >
                {s.speaker}
                {s.inferred && <span className="text-terracotta"> ?</span>}
              </span>
            )}
            <span>{text}</span>
          </li>
        );
      })}
    </ol>
  );
}
