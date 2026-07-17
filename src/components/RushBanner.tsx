"use client";

import Link from "next/link";
import { ArrowRight, TicketCheck } from "lucide-react";
import { allPrograms, getProgramStatus } from "@/lib/programs";
import { useNow } from "@/lib/useNow";

export function RushBanner() {
  const now = useNow();
  // Count shows, not programs — the feed's "Open now" header counts show
  // cards, and this banner must land on a number that matches it.
  const openCount = now
    ? new Set(
        allPrograms()
          .filter((program) => {
            const state = getProgramStatus(now, program).state;
            return state === "open" || state === "closes-soon";
          })
          .map((program) => program.showSlug),
      ).size
    : null;

  return (
    <Link
      href="/rush"
      className="mt-6 flex items-center gap-3 rounded-card bg-blush p-5 transition-transform duration-150 active:scale-[0.985]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-paper text-ink">
        <TicketCheck className="size-5" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-title">Rush &amp; Lottery</span>
        <span className="mt-0.5 block text-body text-ink-soft">
          {openCount === null ? (
            "Checking live deadlines…"
          ) : (
            <>
              <strong className="font-semibold text-ink">{openCount}</strong> shows
              open now
            </>
          )}
        </span>
      </span>
      <ArrowRight className="size-5 shrink-0 text-ink-soft" strokeWidth={1.9} />
    </Link>
  );
}
