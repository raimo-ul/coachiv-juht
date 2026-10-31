import type { Content } from "@/lib/content";
import { Track } from "@/components/site";

export type Result = {
  name: string;
  display: string;   // the score, already formatted with an Estonian comma
  score: number;
  explain: string;
  landed: string;
};

/**
 * One of the six results.
 *
 * `compact` drops the explanation and is what the home page preview uses, where
 * the point is to show the shape of a report rather than to be readable.
 */
export function ResultRow({
  r, compact = false, track,
}: {
  r: Result;
  compact?: boolean;
  track: Content["report"]["track"];
}) {
  return (
    <div className="border-t-2 border-rule py-6 first:border-t-0">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-3xl md:text-4xl">{r.name}</h3>
        <span className="display text-4xl tabular-nums md:text-5xl">{r.display}</span>
      </div>
      <div className="mt-3">
        <Track value={r.score} />
        <div className="mt-1 flex justify-between text-[0.68rem] text-muted-foreground">
          <span>{track.low}</span>
          <span>{track.high}</span>
        </div>
      </div>
      {!compact && <p className="mt-4 text-sm text-muted-foreground">{r.explain}</p>}
      <p className="mt-2 font-medium">{r.landed}</p>
    </div>
  );
}
