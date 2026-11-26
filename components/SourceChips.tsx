/** Citation chips: each links to the transcript paragraph (#p12), which highlights via CSS :target. */
export default function SourceChips({ src, onSelect }: { src: number[]; onSelect?: (p: number) => void }) {
  if (!src.length) return <span className="text-xs italic text-charcoal">No transcript source</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {src.map((p) =>
        onSelect ? (
          <button
            key={p}
            type="button"
            onClick={() => onSelect(p)}
            className="rounded border border-line bg-canvas px-1.5 text-[11px] font-semibold text-charcoal hover:border-gold hover:text-ink"
          >
            P{p}
          </button>
        ) : (
          <a
            key={p}
            href={`#p${p}`}
            className="rounded border border-line bg-canvas px-1.5 text-[11px] font-semibold text-charcoal hover:border-gold hover:text-ink"
          >
            P{p}
          </a>
        ),
      )}
    </span>
  );
}
