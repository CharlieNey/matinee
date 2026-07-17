"use client";

import Link from "next/link";
import { SquarePen } from "lucide-react";
import { useApp } from "@/lib/store";
import { Poster } from "./Poster";

/** "My Top 10" poster shelf — the diary's crown jewels, in the order the
 *  user set them. `onEdit` adds the card-corner pencil (DESIGN.md §9)
 *  opening the reorder sheet; omitted, the shelf is read-only. */
export function TopTenShelf({
  claimName,
  onEdit,
}: {
  /** Page-level dedupe for shared-element names (see DiscoverPage). */
  claimName?: (slug: string) => string | undefined;
  onEdit?: () => void;
}) {
  const { topTenShows } = useApp();

  return (
    <div className="relative flex items-center gap-4 overflow-hidden rounded-card bg-paper py-4 pl-5 pr-0">
      <div className="shrink-0 text-center leading-none">
        <span className="block text-[21px] font-bold tracking-tight">
          My Top
        </span>
        <span className="mt-1 block text-[46px] font-extrabold tracking-tight">
          10
        </span>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit your Top 10"
            className="mt-2.5 -mb-1 p-1 text-ink-soft transition-transform duration-150 active:scale-90"
          >
            <SquarePen className="size-5" strokeWidth={1.8} />
          </button>
        )}
      </div>
      {topTenShows.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {topTenShows.map((show) => (
            <Link
              key={show.slug}
              href={`/shows/${show.slug}`}
              className="shrink-0 transition-transform duration-150 active:scale-[0.96]"
              aria-label={`${show.title} tickets`}
            >
              <Poster
                show={show}
                className="w-[84px] rounded-thumb"
                name={claimName?.(show.slug)}
              />
            </Link>
          ))}
        </div>
      ) : (
        <p className="pr-5 text-body text-ink-faint">
          Your favorites, in order — tap the pencil to pick them.
        </p>
      )}
    </div>
  );
}
