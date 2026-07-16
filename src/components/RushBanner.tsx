"use client";

import Link from "next/link";
import { ArrowRight, TicketCheck } from "lucide-react";
import { allPrograms, getProgramStatus } from "@/lib/programs";
import { useNow } from "@/lib/useNow";

export function RushBanner() {
  const now = useNow();
  const openCount = now
    ? allPrograms().filter((program) => {
        const state = getProgramStatus(now, program).state;
        return state === "open" || state === "closes-soon";
      }).length
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
              <strong className="font-semibold text-ink">{openCount}</strong> open now
            </>
          )}
        </span>
      </span>
      <ArrowRight className="size-5 shrink-0 text-ink-soft" strokeWidth={1.9} />
    </Link>
  );
}
