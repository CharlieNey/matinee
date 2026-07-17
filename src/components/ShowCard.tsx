import Link from "next/link";
import { cheapestProgram, programKindLabel, programsForShow } from "@/lib/programs";
import { Show } from "@/lib/shows";
import { Poster } from "./Poster";

/**
 * Catalog card (Phase 14): one show and the cheapest verified way in.
 * The answer line is schedule-agnostic by design — it says a $40 door
 * exists; whether it's open right now is /rush's job.
 */
export function ShowCard({
  show,
  posterName,
  onTktsToday = false,
}: {
  show: Show;
  /** Shared-element morph name — callers dedupe per page (see Discover). */
  posterName?: string;
  /** On today's TKTS board (live, real-time — never demo time). */
  onTktsToday?: boolean;
}) {
  const program = cheapestProgram(show.slug);
  const otherWays = programsForShow(show.slug).length - 1;

  return (
    <Link
      href={`/shows/${show.slug}`}
      className="group block overflow-hidden rounded-card bg-paper shadow-float transition-transform duration-150 active:scale-[0.98]"
    >
      <div className="overflow-hidden">
        <Poster
          show={show}
          className="w-full web:transition-transform web:duration-200 web:ease-out web:group-hover:scale-[1.03]"
          name={posterName}
        />
      </div>
      <div className="p-4">
        <h3 className="truncate text-heading">{show.title}</h3>
        <p className="mt-0.5 truncate text-caption text-ink-soft">
          {show.tier} · {show.genre}
        </p>
        <p className="mt-2.5 flex items-baseline gap-1.5">
          {program ? (
            <>
              <span className="truncate text-caption text-ink-soft">
                {programKindLabel(program.kind)}
              </span>
              <span className="text-[24px] font-bold leading-none tracking-tight">
                {program.price > 0 ? `$${program.price}` : "Free"}
              </span>
            </>
          ) : show.faceValue > 0 ? (
            <>
              <span className="text-caption text-ink-soft">face value</span>
              <span className="text-[24px] font-bold leading-none tracking-tight">
                ${show.faceValue}
              </span>
            </>
          ) : (
            <span className="text-[24px] font-bold leading-none tracking-tight">
              Free
            </span>
          )}
          <span className="ml-auto shrink-0 text-caption text-ink-soft">
            {onTktsToday
              ? "On TKTS today"
              : otherWays > 0
                ? `+${otherWays} more way${otherWays > 1 ? "s" : ""}`
                : ""}
          </span>
        </p>
      </div>
    </Link>
  );
}
