"use client";

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
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {shows.map((show) => {
        const active = selected?.slug === show.slug;
        return (
          <button
            key={show.slug}
            type="button"
            onClick={() => onSelect(show)}
            aria-pressed={active}
            className={`relative overflow-hidden rounded-thumb transition-all duration-150 active:scale-[0.96] ${
              active
                ? "ring-[2.5px] ring-vermilion ring-offset-2 ring-offset-cream"
                : "opacity-90"
            }`}
            title={show.title}
          >
            <Poster show={show} className="w-full" />
          </button>
        );
      })}
    </div>
  );
}
