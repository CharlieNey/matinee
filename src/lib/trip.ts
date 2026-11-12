import {
  allPrograms,
  etDayKey,
  Program,
  programOccurrencesNear,
} from "./programs";
import { getShow, Show } from "./shows";

/**
 * Trip mode (Phase 9): deterministic calendar math over the curated dataset —
 * for each day of a visit, every entry window that opens that NYC day. No
 * LLM; this is also the tool the Tonight Concierge stretch goal calls later.
 */

export type TripSlot = {
  program: Program;
  show: Show;
  opensAt: Date;
  closesAt: Date;
  whileSuppliesLast: boolean;
};

export type TripDay = {
  /** Anchor instant within the trip day (same wall-clock as `now`). */
  date: Date;
  dayKey: string;
  slots: TripSlot[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildTripPlan(
  now: Date,
  startOffsetDays: number,
  nights: number,
): TripDay[] {
  const days: TripDay[] = [];

  for (let i = 0; i < nights; i += 1) {
    const anchor = new Date(now.getTime() + (startOffsetDays + i) * DAY_MS);
    const dayKey = etDayKey(anchor);
    const slots: TripSlot[] = [];

    for (const program of allPrograms()) {
      const show = getShow(program.showSlug);
      if (!show) continue;
      for (const occurrence of programOccurrencesNear(anchor, program)) {
        if (etDayKey(occurrence.opensAt) === dayKey) {
          slots.push({ program, show, ...occurrence });
        }
      }
    }

    slots.sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime());
    days.push({ date: anchor, dayKey, slots });
  }

  return days;
}

/** Rank only actionable windows, before deduplicating shows. */
export function recommendedSlots(
  plan: TripDay[],
  now: Date,
  isSaved: (slug: string) => boolean,
): { day: TripDay; slot: TripSlot }[] {
  const candidates = plan.flatMap((day, dayIndex) =>
    day.slots
      .filter((slot) => slot.closesAt.getTime() > now.getTime())
      .map((slot) => ({ day, dayIndex, slot })),
  );

  candidates.sort((a, b) => {
    const interested =
      Number(isSaved(b.slot.show.slug)) - Number(isSaved(a.slot.show.slug));
    if (interested !== 0) return interested;
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    const advance = Number(b.slot.program.kind === "digital-lottery") -
      Number(a.slot.program.kind === "digital-lottery");
    if (advance !== 0) return advance;
    if (a.slot.program.price !== b.slot.program.price) {
      return a.slot.program.price - b.slot.program.price;
    }
    return a.slot.opensAt.getTime() - b.slot.opensAt.getTime();
  });

  const seenShows = new Set<string>();
  const picks: { day: TripDay; slot: TripSlot }[] = [];
  for (const candidate of candidates) {
    if (seenShows.has(candidate.slot.show.slug)) continue;
    seenShows.add(candidate.slot.show.slug);
    picks.push(candidate);
    if (picks.length === 5) break;
  }
  return picks;
}


/** Grouping for the day view: when does this window open, NYC time? */
export function daypartOf(opensAt: Date): "morning" | "afternoon" | "evening" {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hourCycle: "h23",
      hour: "2-digit",
    }).format(opensAt),
  );
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
