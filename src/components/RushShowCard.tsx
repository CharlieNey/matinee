import Link from "next/link";
import { Poster } from "@/components/Poster";
import { ProgramEntry, ProgramRows } from "@/components/ProgramRows";
import { Show } from "@/lib/shows";

/**
 * One show on the board, set like a listing in a printed program, with a
 * small poster beside the title (the alternative to the text-only listing):
 * the art helps the eye find a show, without going back to a card.
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
    <div className="border-b border-line pt-4 pb-1">
      <Link
        href={`/shows/${show.slug}`}
        className="flex items-center gap-3 transition-opacity duration-150 active:opacity-60"
      >
        <Poster
          show={show}
          className="size-10 shrink-0 rounded-[3px]"
          name={`poster-${show.slug}`}
        />
        <span className="min-w-0 flex-1 truncate font-display text-[22px] leading-tight">
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
