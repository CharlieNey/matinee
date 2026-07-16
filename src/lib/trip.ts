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
