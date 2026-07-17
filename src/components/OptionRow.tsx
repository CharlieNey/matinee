"use client";

import { Check } from "lucide-react";

/** Filter-sheet option: full-width pill, selected = espresso, count when
 *  idle (faceted — computed with the *other* filters applied). Shared by
 *  Discover and Rush filter sheets. */
export function OptionRow({
  label,
  count,
  selected,
  onSelect,
}: {
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex h-13 w-full items-center justify-between rounded-full px-5 text-body font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.98] ${
        selected ? "bg-espresso text-white" : "bg-paper text-ink"
      }`}
    >
      {label}
      {selected ? (
        <Check className="size-5" strokeWidth={2.4} />
      ) : (
        <span
          className={`text-caption font-medium ${
            count === 0 ? "text-ink-faint" : "text-ink-soft"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
