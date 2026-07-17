"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Sheet } from "@/components/Sheet";
import { Program, programPlatformLabel } from "@/lib/programs";

/**
 * Platform folk knowledge, deduped across a list of programs (Phase 8).
 * Tips live per-program in the dataset but repeat per platform — this
 * renders each once. Surfaces as a small bulb button (sits next to the rush
 * search field) that opens a sheet; reacts to whatever list it's given
 * (e.g. the rush feed's filtered matches).
 */
export function PlatformTips({
  programs,
  labeled = false,
}: {
  programs: readonly Program[];
  /** Standalone placement (show page): spell the label out — a lone bulb
   *  next to the search field explains itself, one floating mid-page doesn't. */
  labeled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const byTip = new Map<string, string>();
  for (const program of programs) {
    for (const tip of program.tips ?? []) {
      if (!byTip.has(tip)) byTip.set(tip, programPlatformLabel(program.platform));
    }
  }
  const tips = [...byTip.entries()];
  if (tips.length === 0) return null;

  return (
    <>
      <button
        type="button"
        aria-label={`Good to know — ${tips.length} platform tip${tips.length === 1 ? "" : "s"}`}
        onClick={() => setOpen(true)}
        className={
          labeled
            ? "mt-3 flex h-11 shrink-0 items-center gap-2 rounded-full bg-paper px-4 text-caption font-semibold text-ink transition-transform duration-150 active:scale-[0.97]"
            : "flex size-12 shrink-0 items-center justify-center rounded-full bg-paper text-gold-ink transition-transform duration-150 active:scale-[0.94]"
        }
      >
        <Lightbulb
          className="size-5 text-gold-ink"
          strokeWidth={1.9}
          aria-hidden
        />
        {labeled && (
          <>
            Good to know
            <span className="font-medium text-ink-soft">{tips.length}</span>
          </>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Good to know">
        <ul className="mt-4 flex flex-col gap-2.5 pb-2">
          {tips.map(([tip, platform]) => (
            <li
              key={tip}
              className="rounded-card bg-paper p-4 text-body leading-snug text-ink-soft"
            >
              <b className="font-semibold text-ink">{platform}</b> — {tip}
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
