"use client";

import { useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical, Plus, Search, X } from "lucide-react";
import { getShow, Show } from "@/lib/shows";
import { useApp } from "@/lib/store";
import { Poster } from "./Poster";
import { Sheet } from "./Sheet";

/** A single show is slotted into the existing ranking with a binary search, so
 *  placing it costs only ~log₂N "which did you like more?" answers. `current`
 *  is the show being placed; `lo`/`hi` bracket where it lands; each answer
 *  halves the gap until `lo === hi`, then it's spliced in. `ranked` is snapshot
 *  at the start so the indices stay valid for the whole placement. */
type Placement = {
  ranked: string[];
  current: string;
  lo: number;
  hi: number;
};

/** One head-to-head card — the whole thing taps to pick this show. */
function DuelCard({ show, onPick }: { show: Show; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex flex-col gap-2.5 rounded-card bg-paper p-2.5 text-left transition-transform duration-150 active:scale-[0.97]"
    >
      <Poster show={show} className="w-full rounded-thumb" />
      <div className="min-w-0 px-1 pb-0.5">
        <p className="truncate text-body font-semibold">{show.title}</p>
        <p className="mt-0.5 truncate text-caption text-ink-soft">
          {show.tier} · {show.genre}
        </p>
      </div>
    </button>
  );
}

/** A show you've seen but haven't ranked — tap to place it. */
function AddRow({ show, onAdd }: { show: Show; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Add ${show.title} to your ranking`}
      className="flex items-center gap-3 rounded-card bg-paper p-3 text-left transition-transform duration-150 active:scale-[0.99]"
    >
      <Poster show={show} className="w-11 shrink-0 rounded-thumb" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold">{show.title}</p>
        <p className="mt-0.5 truncate text-caption text-ink-soft">
          {show.tier} · {show.genre}
        </p>
      </div>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-espresso text-white">
        <Plus className="size-4" strokeWidth={2.4} />
      </span>
    </button>
  );
}

/** One ranked row in the drag-to-tune list — the grip alone starts the drag
 *  (the Sheet's grab-handle rule), so reordering never fights inner scroll.
 *  The X drops it back into the "add a show" pool. */
function RankRow({
  show,
  rank,
  onRemove,
}: {
  show: Show;
  rank: number;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={show.slug}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-3 rounded-card bg-paper p-3"
    >
      <button
        type="button"
        aria-label={`Reorder ${show.title}`}
        onPointerDown={(e) => controls.start(e)}
        className="-m-1 cursor-grab touch-none p-1 text-ink-faint active:cursor-grabbing"
      >
        <GripVertical className="size-5" strokeWidth={1.8} />
      </button>
      <span className="w-6 shrink-0 text-center text-body font-bold tabular-nums">
        {rank}
      </span>
      <Poster show={show} className="w-11 shrink-0 rounded-thumb" />
      <p className="min-w-0 flex-1 truncate text-body font-semibold">
        {show.title}
      </p>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${show.title} from your ranking`}
        className="-m-2 p-2 text-ink-soft transition-transform duration-150 active:scale-90"
      >
        <X className="size-5" strokeWidth={2} />
      </button>
    </Reorder.Item>
  );
}

/** The ranking editor: search a show you've seen to add it, answer a few
 *  "which did you like more?" matchups to slot it in, drag to fine-tune.
 *  Writes straight to the store — no save step, no bulk re-rank. */
export function RankSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { attended, rankedShows, setRanking } = useApp();
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [query, setQuery] = useState("");

  // Closing discards any half-run placement and clears the search.
  const handleClose = () => {
    setPlacement(null);
    setQuery("");
    onClose();
  };

  const rankedSlugs = rankedShows.map((s) => s.slug);
  const rankedSet = new Set(rankedSlugs);
  // The pool you can add from: shows you've seen but haven't ranked yet.
  const unranked = attended.filter((s) => !rankedSet.has(s.slug));

  // `unranked` is a handful of shows, so filtering inline each render is cheap.
  const q = query.trim().toLowerCase();
  const filtered = q
    ? unranked.filter((show) =>
        [show.title, show.venue, show.genre, show.tier].some((v) =>
          v.toLowerCase().includes(q),
        ),
      )
    : unranked;

  const startPlacement = (show: Show) => {
    setQuery("");
    // First pick lands at #1 with nothing to compare against.
    if (rankedSlugs.length === 0) {
      setRanking([show.slug]);
      return;
    }
    setPlacement({
      ranked: rankedSlugs,
      current: show.slug,
      lo: 0,
      hi: rankedSlugs.length,
    });
  };

  const answer = (preferCurrent: boolean) => {
    if (!placement) return;
    const mid = (placement.lo + placement.hi) >> 1;
    const lo = preferCurrent ? placement.lo : mid + 1;
    const hi = preferCurrent ? mid : placement.hi;
    if (lo < hi) {
      setPlacement({ ...placement, lo, hi });
      return;
    }
    // Bracket collapsed → splice current in at `lo` and we're done.
    setRanking([
      ...placement.ranked.slice(0, lo),
      placement.current,
      ...placement.ranked.slice(lo),
    ]);
    setPlacement(null);
  };

  const removeFromRanking = (slug: string) => {
    setRanking(rankedSlugs.filter((s) => s !== slug));
  };

  // ---- Matchup view -------------------------------------------------------
  if (open && placement) {
    const current = getShow(placement.current);
    const mid = (placement.lo + placement.hi) >> 1;
    const opponent = getShow(placement.ranked[mid]);
    // Progress = how far the bracket has narrowed from its full width.
    const span = placement.ranked.length;
    const progress = span > 0 ? 1 - (placement.hi - placement.lo) / span : 1;
    if (current && opponent) {
      return (
        <Sheet open={open} onClose={handleClose} title="Which did you like more?">
          <p className="mt-1 text-body text-ink-soft">
            Placing <span className="font-semibold text-ink">{current.title}</span>
          </p>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-inset">
            <div
              className="h-full rounded-full bg-espresso transition-[width] duration-300 ease-out"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>

          <div className="relative mt-5 grid grid-cols-2 gap-3">
            <DuelCard show={current} onPick={() => answer(true)} />
            <DuelCard show={opponent} onPick={() => answer(false)} />
            <span className="pointer-events-none absolute left-1/2 top-[calc(50%-24px)] grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-espresso text-caption font-semibold text-white shadow-float">
              vs
            </span>
          </div>

          <button
            type="button"
            onClick={() => setPlacement(null)}
            className="mx-auto mt-6 block text-caption font-medium text-ink-soft transition-colors duration-150 hover:text-ink"
          >
            Cancel — don&apos;t add it
          </button>
        </Sheet>
      );
    }
  }

  // ---- List / add view ----------------------------------------------------
  return (
    <Sheet open={open} onClose={handleClose} title="Your ranking">
      <p className="mt-1 text-body text-ink-soft">
        Search a show you&apos;ve seen to add it — a few quick &ldquo;which did
        you like more?&rdquo; matchups slot it into place.
      </p>

      {unranked.length > 0 && (
        <section className="mt-5">
          <div className="flex h-12 items-center gap-2.5 rounded-full bg-paper px-4 focus-within:ring-2 focus-within:ring-espresso/15">
            <Search
              className="size-5 shrink-0 text-ink-soft"
              strokeWidth={1.9}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search shows you've seen"
              placeholder="Search shows you've seen"
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

          {filtered.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2">
              {filtered.map((show) => (
                <AddRow
                  key={show.slug}
                  show={show}
                  onAdd={() => startPlacement(show)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-body text-ink-faint">
              No shows you&apos;ve seen match &ldquo;{query.trim()}&rdquo;.
            </p>
          )}
        </section>
      )}

      {rankedShows.length > 0 ? (
        <>
          <p className="eyebrow mb-2.5 mt-7">In order</p>
          <Reorder.Group
            axis="y"
            values={rankedSlugs}
            onReorder={setRanking}
            className="flex flex-col gap-2.5 pb-2"
          >
            {rankedShows.map((show, i) => (
              <RankRow
                key={show.slug}
                show={show}
                rank={i + 1}
                onRemove={() => removeFromRanking(show.slug)}
              />
            ))}
          </Reorder.Group>
        </>
      ) : (
        <p className="mt-6 text-body text-ink-faint">
          {unranked.length > 0
            ? "Nothing ranked yet — add a show above to start your list."
            : "Log a show you've seen and you can rank it here."}
        </p>
      )}
    </Sheet>
  );
}
