"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { Show } from "@/lib/shows";
import { Poster } from "./Poster";
import { Sheet } from "./Sheet";

/** Search-and-add editor for a Collection list (Attended / Interested). With an
 *  empty query it shows the current members as a poster wall, each with a
 *  remove X; typing switches to add-rows drawn from `candidates` (the catalog
 *  minus what's already in the list). Writes straight through onAdd/onRemove —
 *  no save step. */
export function CollectionEditorSheet({
  open,
  onClose,
  title,
  members,
  candidates,
  onAdd,
  onRemove,
  searchPlaceholder,
  emptyText,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  members: Show[];
  candidates: Show[];
  onAdd: (show: Show) => void;
  onRemove: (show: Show) => void;
  searchPlaceholder: string;
  emptyText: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = q
    ? candidates.filter((s) =>
        [s.title, s.venue, s.genre, s.tier].some((v) =>
          v.toLowerCase().includes(q),
        ),
      )
    : [];

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  return (
    <Sheet open={open} onClose={handleClose} title={title}>
      <p className="mt-1 text-body text-ink-soft">
        {members.length} show{members.length === 1 ? "" : "s"} — search to add
        more.
      </p>

      <div className="mt-4 flex h-12 items-center gap-2.5 rounded-full bg-paper px-4 focus-within:ring-2 focus-within:ring-espresso/15">
        <Search className="size-5 shrink-0 text-ink-soft" strokeWidth={1.9} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-faint"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="-mr-2 grid size-9 shrink-0 place-items-center text-ink-soft"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {q ? (
        results.length > 0 ? (
          <div className="mt-4 flex flex-col gap-2">
            {results.map((show) => (
              <button
                key={show.slug}
                type="button"
                onClick={() => {
                  onAdd(show);
                  setQuery("");
                }}
                aria-label={`Add ${show.title}`}
                className="flex items-center gap-3 rounded-card bg-paper p-3 text-left transition-transform duration-150 active:scale-[0.99]"
              >
                <Poster show={show} className="w-11 shrink-0 rounded-thumb" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-semibold">
                    {show.title}
                  </p>
                  <p className="mt-0.5 truncate text-caption text-ink-soft">
                    {show.tier} · {show.genre}
                  </p>
                </div>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-espresso text-white">
                  <Plus className="size-4" strokeWidth={2.4} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-body text-ink-faint">
            No shows match &ldquo;{query.trim()}&rdquo;.
          </p>
        )
      ) : members.length > 0 ? (
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {members.map((show) => (
            <div key={show.slug} className="relative">
              <Link
                href={`/shows/${show.slug}`}
                onClick={handleClose}
                aria-label={`${show.title} tickets`}
                className="block transition-transform duration-150 active:scale-[0.96]"
              >
                <Poster show={show} className="w-full rounded-thumb" />
              </Link>
              <button
                type="button"
                onClick={() => onRemove(show)}
                aria-label={`Remove ${show.title}`}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-espresso/90 text-white shadow-float transition-transform duration-150 active:scale-90"
              >
                <X className="size-3.5" strokeWidth={2.4} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-body text-ink-faint">{emptyText}</p>
      )}
    </Sheet>
  );
}
