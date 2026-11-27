"use client";

import Link from "next/link";
import { Plus, Swords } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Poster } from "@/components/Poster";
import { useApp } from "@/lib/store";
import { Show } from "@/lib/shows";

/** The sheets the Collection tab opens; the page owns them. */
export type CollectionSheet = "rank" | "attended" | "interested";

/** A titled poster wall — the header opens the search-and-add editor, the wall
 *  shows the most recent members four-across (posters link straight to the
 *  show). Keeps the Collection dense instead of teasing one cover over empty
 *  space. */
function Gallery({
  label,
  shows,
  onOpen,
  emptyText,
}: {
  label: string;
  shows: Show[];
  onOpen: () => void;
  emptyText: string;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <p className="eyebrow">
          {label}
          {shows.length > 0 ? ` · ${shows.length}` : ""}
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-1.5 text-caption font-semibold text-ink-soft transition-colors duration-150 active:text-ink"
        >
          <Plus className="size-4" strokeWidth={2} />
          Add
        </button>
      </div>
      {shows.length > 0 ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {shows.slice(0, 8).map((show) => (
            <Link
              key={show.slug}
              href={`/shows/${show.slug}`}
              aria-label={`${show.title} tickets`}
              className="transition-transform duration-150 active:scale-[0.96]"
            >
              <Poster
                show={show}
                className="w-full rounded-thumb"
                sizes="(min-width: 1024px) 170px, 25vw"
              />
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-body text-ink-faint">{emptyText}</p>
      )}
    </section>
  );
}

/** Taste, from real state, filling the screen (DESIGN.md §151): the personal
 *  ranking as the hero — attended shows in your order, built by the matchup
 *  flow — then two dense walls, Seen (attended) and Interested (the bookmark
 *  set). No empty room reserved for other lists; these three are the tab. */
export function CollectionTab({
  openSheet,
}: {
  openSheet: (sheet: CollectionSheet) => void;
}) {
  const { savedShows, attended, rankedShows } = useApp();

  return (
    <div className="flex flex-col gap-8 pb-6 pt-5">
      {/* 1 — Ranking: the taste statement, ordered #1…#N. */}
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow">Your ranking</p>
          <button
            type="button"
            onClick={() => openSheet("rank")}
            className="flex items-center gap-1.5 text-caption font-semibold text-ink-soft transition-colors duration-150 active:text-ink"
          >
            <Swords className="size-4" strokeWidth={2} />
            Rank
          </button>
        </div>
        {rankedShows.length > 0 ? (
          <ol className="mt-3 flex flex-col gap-2">
            {rankedShows.map((show, i) => (
              <li key={show.slug}>
                <Link
                  href={`/shows/${show.slug}`}
                  className="flex items-center gap-3.5 rounded-card bg-paper p-3 transition-transform duration-150 active:scale-[0.99]"
                >
                  <span className="w-6 shrink-0 text-center text-body font-bold tabular-nums">
                    {i + 1}
                  </span>
                  <Poster show={show} className="w-12 shrink-0 rounded-thumb" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold">
                      {show.title}
                    </p>
                    <p className="mt-0.5 truncate text-caption text-ink-soft">
                      {show.tier} · {show.genre}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            text="Rank the shows you've seen — a few quick “which did you like more?” matchups build the list."
            actionLabel="Start ranking"
            onAction={() => openSheet("rank")}
          />
        )}
      </section>

      {/* 2 — Attended: everywhere you've been. */}
      <Gallery
        label="Attended"
        shows={attended}
        onOpen={() => openSheet("attended")}
        emptyText="Shows you log will collect here."
      />

      {/* 3 — Interested: what's next. */}
      <Gallery
        label="Interested"
        shows={savedShows}
        onOpen={() => openSheet("interested")}
        emptyText="Shows you mark Interested will collect here."
      />
    </div>
  );
}
