"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Show } from "@/lib/shows";
import { Poster } from "./Poster";

export function ShowPicker({
  shows,
  selected,
  onSelect,
}: {
  shows: Show[];
  selected: Show | null;
  onSelect: (show: Show) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return shows;
    return shows.filter((show) =>
      [show.title, show.venue, show.genre, show.tier].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [query, shows]);

  return (
    <div>
      <div className="flex h-12 items-center gap-2.5 rounded-full bg-paper px-4 focus-within:ring-2 focus-within:ring-espresso/15">
        <Search className="size-5 shrink-0 text-ink-soft" strokeWidth={1.9} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search shows"
          placeholder="Search shows or venues"
          className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-faint"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear show search"
            className="-mr-2 grid size-9 shrink-0 place-items-center text-ink-soft"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-x-2.5 gap-y-4">
          {filtered.map((show) => {
            const active = selected?.slug === show.slug;
            return (
              <button
                key={show.slug}
                type="button"
                onClick={() => onSelect(show)}
                aria-pressed={active}
                aria-label={show.title}
                className={`min-w-0 text-left transition-[transform,opacity] duration-150 active:scale-[0.96] ${
                  active ? "opacity-100" : "opacity-90"
                }`}
              >
                <span
                  className={`block overflow-hidden rounded-thumb ${
                    active
                      ? "ring-[2.5px] ring-vermilion ring-offset-2 ring-offset-cream"
                      : ""
                  }`}
                >
                  <Poster show={show} className="w-full" />
                </span>
                <span className="mt-1.5 block truncate text-caption font-medium text-ink">
                  {show.title}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="py-10 text-center text-body text-ink-faint">
          No shows match “{query.trim()}”.
        </p>
      )}
    </div>
  );
}
