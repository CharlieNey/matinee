"use client";

import Link from "next/link";
import {
  allPrograms,
  getProgramStatus,
  isProgramTrusted,
} from "@/lib/programs";
import { useNow } from "@/lib/useNow";

export function RushBanner() {
  const now = useNow();
  // Count shows, not programs — the feed's "Open now" header counts show
  // cards, and this banner must land on a number that matches it.
  const openCount = now
    ? new Set(
        allPrograms()
          .filter((program) => {
            // Same rule as the feed: an unverified row never counts as open.
            if (!isProgramTrusted(program, now)) return false;
            const state = getProgramStatus(now, program).state;
            return state === "open" || state === "closes-soon";
          })
          .map((program) => program.showSlug),
      ).size
    : null;

  // The one live fact on Discover, set like a program's headline number.
  return (
    <Link
      href="/rush"
      className="mt-6 block border-y border-line py-4 transition-opacity duration-150 active:opacity-70"
    >
      {openCount === null ? (
        <span className="block text-body text-ink-soft">
          Checking what&apos;s open…
        </span>
      ) : (
        <span className="flex items-baseline gap-2.5">
          <span className="font-display text-[40px] leading-none text-ink">
            {openCount}
          </span>
          <span className="min-w-0 text-balance text-body text-ink">
            {openCount === 1 ? "show has" : "shows have"} a rush or lottery
            open now
          </span>
        </span>
      )}
      <span className="mt-2 block text-caption font-semibold text-ink underline underline-offset-4">
        See the board
      </span>
    </Link>
  );
}
