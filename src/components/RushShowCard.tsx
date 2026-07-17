import Link from "next/link";
import { Poster } from "@/components/Poster";
import { ProgramEntry, ProgramRows } from "@/components/ProgramRows";
import { Show } from "@/lib/shows";

/**
 * One show, all its ways in — the rush feed's unit. The header deep-links to
 * the show page (poster morph included); each program is a compact row that
 * expands in place for schedule, fees, and the entry link.
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
    <div className="rounded-card bg-paper px-4 pt-4 pb-1">
      <Link
        href={`/shows/${show.slug}`}
        className="flex items-center gap-3.5 pb-3.5 transition-opacity duration-150 active:opacity-70"
      >
        <Poster
          show={show}
          className="size-16 rounded-thumb"
          name={`poster-${show.slug}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-heading">{show.title}</span>
          <span className="mt-0.5 block truncate text-caption text-ink-soft">
            {show.tier} · {show.genre}
          </span>
        </span>
      </Link>
      <ProgramRows show={show} entries={entries} now={now} />
    </div>
  );
}
