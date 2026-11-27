import Link from "next/link";
import { ProgramEntry, ProgramRows } from "@/components/ProgramRows";
import { Show } from "@/lib/shows";

/**
 * One show on the board, set like a listing in a printed program: the title
 * in the display serif, its ways in beneath, a rule under the entry. No card
 * and no thumbnail; the show page carries the art.
 */
export function RushShowCard({
  show,
  entries,
  now,
}: {
  show: Show;
  entries: readonly ProgramEntry[];
  now: Date | null;
}) {
  return (
    <div className="border-b border-ink/25 pt-4 pb-1">
      <Link
        href={`/shows/${show.slug}`}
        className="flex items-baseline justify-between gap-3 transition-opacity duration-150 active:opacity-60"
      >
        <span className="min-w-0 text-balance font-display text-[22px] font-bold leading-tight">
          {show.title}
        </span>
        {show.tier !== "Broadway" && (
          <span className="shrink-0 text-caption text-ink-soft">{show.tier}</span>
        )}
      </Link>
      <div className="mt-1">
        <ProgramRows show={show} entries={entries} now={now} flushTop />
      </div>
    </div>
  );
}
