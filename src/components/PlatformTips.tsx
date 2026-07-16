"use client";

import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import { Program, programPlatformLabel } from "@/lib/programs";

/**
 * Platform folk knowledge, deduped across a list of programs (Phase 8).
 * Tips live per-program in the dataset but repeat per platform — this block
 * renders each once, so twenty Telecharge cards don't say the same thing
 * twenty times. Collapsed by default; reacts to whatever list it's given
 * (e.g. the rush feed's filtered matches).
 */
export function PlatformTips({ programs }: { programs: readonly Program[] }) {
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
    <div className="mt-3 rounded-card bg-paper">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center gap-2.5 px-4 text-body font-semibold transition-colors duration-150"
      >
        <Lightbulb className="size-5 text-gold" strokeWidth={1.9} aria-hidden />
        Good to know
        <span className="font-normal text-ink-soft">· {tips.length}</span>
        <ChevronDown
          className={`ml-auto size-5 text-ink-soft transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open && (
        <ul className="flex flex-col gap-2.5 border-t border-line px-4 pb-4 pt-3">
          {tips.map(([tip, platform]) => (
            <li key={tip} className="text-caption leading-snug text-ink-soft">
              <b className="font-semibold text-ink">{platform}</b> — {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
