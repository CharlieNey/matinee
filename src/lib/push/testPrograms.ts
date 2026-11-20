import { etWallClock, Program, Weekday } from "../programs";

/** Hand-built programs for push tests, independent of the live catalog. */

const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

function make(
  showSlug: string,
  kind: Program["kind"],
  platform: Program["platform"],
  price: number,
  opensAt: string,
  closesAt: string,
  extra: Partial<Program> & { whileSuppliesLast?: boolean } = {},
): Program {
  const { whileSuppliesLast = false, ...rest } = extra;
  return {
    showSlug,
    kind,
    platform,
    price,
    maxTickets: 2,
    entryUrl: "https://example.com/enter",
    schedule: {
      timezone: "America/New_York",
      summary: "test",
      windows: [{ days: EVERY_DAY, opensAt, closesAt, whileSuppliesLast }],
    },
    lastVerified: "2026-11-20",
    ...rest,
  };
}

/** 10 AM box-office rush, first come, first served. */
export const RUSH = make("hadestown", "rush", "box-office", 45, "10:00", "20:00", {
  whileSuppliesLast: true,
});
/** Telecharge-style lottery: opens at midnight, closes 3 PM, 5 hours to claim. */
export const MIDNIGHT_LOTTERY = make(
  "oh-mary",
  "digital-lottery",
  "telecharge",
  49,
  "00:00",
  "15:00",
  {
    claimWindow: {
      minutes: 300,
      channel: "email",
      notifiedAround: "shortly after the 10 AM and 3 PM drawings",
    },
  },
);
/** Lucky Seat-style: midnight to 9:30 AM, so the 8 AM alert is the only one. */
export const SHORT_MORNING_LOTTERY = make(
  "the-book-of-mormon",
  "digital-lottery",
  "lucky-seat",
  42,
  "00:00",
  "09:30",
);
/** Broadway Direct-style daytime lottery with a 60-minute claim. */
export const DAY_LOTTERY = make(
  "wicked",
  "digital-lottery",
  "broadway-direct",
  59,
  "09:00",
  "15:00",
  {
    claimWindow: {
      minutes: 60,
      channel: "email",
      notifiedAround: "shortly after the window closes",
    },
  },
);
/** Rocky Horror-style: 5 PM to 9 AM the next morning. */
export const OVERNIGHT_LOTTERY = make(
  "rocky-horror-show",
  "digital-lottery",
  "todaytix",
  30,
  "17:00",
  "09:00",
);
/** Same show, same minute: one notification. */
export const GATSBY_RUSH = make("the-great-gatsby", "rush", "box-office", 49, "10:00", "20:00", {
  whileSuppliesLast: true,
});
export const GATSBY_STUDENT = make(
  "the-great-gatsby",
  "student-rush",
  "box-office",
  39,
  "10:00",
  "20:00",
  { whileSuppliesLast: true },
);
export const STANDING_ROOM = make("chicago", "sro", "box-office", 39, "10:00", "20:00", {
  whileSuppliesLast: true,
});

/** An instant at New York wall-clock `time` on `day` (YYYY-MM-DD). */
export function et(time: string, day = "2026-11-20"): Date {
  return etWallClock(new Date(`${day}T17:00:00Z`), time);
}

export const minutes = (date: Date, n: number) =>
  new Date(date.getTime() + n * 60 * 1000);
