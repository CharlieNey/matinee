"use client";

import { Reorder, useDragControls } from "motion/react";
import { GripVertical, Plus, X } from "lucide-react";
import { Show } from "@/lib/shows";
import { useApp } from "@/lib/store";
import { Poster } from "./Poster";
import { Sheet } from "./Sheet";

/** One pick — whole row is a Reorder.Item, but the drag starts from the
 *  grip only (the Sheet's own grab-handle rule), so reordering never
 *  fights the sheet's inner scroll. */
function PickRow({
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
        aria-label={`Remove ${show.title} from your Top 10`}
        className="-m-2 p-2 text-ink-soft transition-transform duration-150 active:scale-90"
      >
        <X className="size-5" strokeWidth={2} />
      </button>
    </Reorder.Item>
  );
}

/** The Top 10 editor: drag to rank, X to drop, add from the shows you've
 *  attended or marked interested. Edits write straight to the store — no
 *  save step, the shelf behind the sheet updates live. */
export function TopTenSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { topTenShows, setTopTen, attended, savedShows } = useApp();
  const picks = topTenShows.map((s) => s.slug);

  const candidates: Show[] = [];
  const seen = new Set(picks);
  for (const show of [...attended, ...savedShows]) {
    if (!seen.has(show.slug)) {
      seen.add(show.slug);
      candidates.push(show);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="My Top 10">
      <p className="mt-1 text-body text-ink-soft">
        Your favorites, in order — drag to rearrange.
      </p>

      {topTenShows.length > 0 ? (
        <Reorder.Group
          axis="y"
          values={picks}
          onReorder={setTopTen}
          className="mt-5 flex flex-col gap-2.5"
        >
          {topTenShows.map((show, i) => (
            <PickRow
              key={show.slug}
              show={show}
              rank={i + 1}
              onRemove={() =>
                setTopTen(picks.filter((slug) => slug !== show.slug))
              }
            />
          ))}
        </Reorder.Group>
      ) : (
        <p className="mt-5 text-body text-ink-faint">
          Nothing here yet — add favorites from the list below.
        </p>
      )}

      {picks.length < 10 && candidates.length > 0 && (
        <>
          <p className="eyebrow mb-2.5 mt-7">From your shows</p>
          <div className="flex flex-col gap-2.5 pb-2">
            {candidates.map((show) => (
              <div
                key={show.slug}
                className="flex items-center gap-3 rounded-card bg-paper p-3"
              >
                <Poster show={show} className="w-11 shrink-0 rounded-thumb" />
                <p className="min-w-0 flex-1 truncate text-body font-semibold">
                  {show.title}
                </p>
                <button
                  type="button"
                  onClick={() => setTopTen([...picks, show.slug])}
                  aria-label={`Add ${show.title} to your Top 10`}
                  className="-m-2 p-2 text-ink-soft transition-transform duration-150 active:scale-90"
                >
                  <Plus className="size-5" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
