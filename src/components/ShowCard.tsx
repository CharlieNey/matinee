import Link from "next/link";
import {
  cheapestProgram,
  programKindShortLabel,
  programsForShow,
} from "@/lib/programs";
import { closingLabel, Show } from "@/lib/shows";
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
  priority = false,
}: {
  show: Show;
  /** Shared-element morph name — callers dedupe per page (see Discover). */
  posterName?: string;
  /** On today’s TKTS board (live TDF data). */
  onTktsToday?: boolean;
  /** Eager-load the poster: set for cards in the first visible row (LCP). */
  priority?: boolean;
}) {
  const closed = closingLabel(show);
  const program = cheapestProgram(show.slug);
  const otherWays = programsForShow(show.slug).length - 1;

  return (
    <Link
      href={`/shows/${show.slug}`}
      className="group block transition-opacity duration-150 active:opacity-70"
    >
      {/* The poster and its caption, printed on the page: no card, no shadow. */}
      <div className="overflow-hidden rounded-[4px]">
        <Poster
          show={show}
          className="w-full web:transition-transform web:duration-200 web:ease-out web:group-hover:scale-[1.03]"
          name={posterName}
          sizes="(min-width: 1024px) 272px, (min-width: 768px) 33vw, 50vw"
          priority={priority}
        />
      </div>
      <div className="pt-2.5">
        <h3 className="truncate font-display text-[20px] font-bold leading-tight">
          {show.title}
        </h3>
        <p className="mt-1 flex items-baseline gap-1.5">
          {closed ? (
            <span className="truncate text-caption text-ink-soft">
              Closed {closed}
            </span>
          ) : program ? (
            <>
              <span className="truncate text-caption text-ink-soft">
                {programKindShortLabel(program.kind)}
              </span>
              <span className="text-[19px] font-bold leading-none tracking-tight">
                {program.price > 0 ? `$${program.price}` : "Free"}
              </span>
            </>
          ) : show.faceValue > 0 ? (
            <>
              <span className="text-caption text-ink-soft">face value</span>
              <span className="text-[19px] font-bold leading-none tracking-tight">
                ${show.faceValue}
              </span>
            </>
          ) : (
            <span className="text-[19px] font-bold leading-none tracking-tight">
              Free
            </span>
          )}
          {/* "+1", not "+1 more": the longer form cut "Lottery" to "Lott…". */}
          <span className="ml-auto shrink-0 text-caption text-ink-soft">
            {onTktsToday ? (
              "On TKTS today"
            ) : otherWays > 0 ? (
              <>
                +{otherWays}
                <span className="sr-only">
                  {" "}
                  more way{otherWays === 1 ? "" : "s"} to save
                </span>
              </>
            ) : (
              ""
            )}
          </span>
        </p>
      </div>
    </Link>
  );
}
