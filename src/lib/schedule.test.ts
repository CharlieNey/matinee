import { describe, expect, it } from "vitest";
import {
  etDayKey,
  getProgramStatus,
  isProgramStale,
  Program,
  ScheduleWindow,
} from "./programs";

/**
 * The schedule engine against hand-built programs, so these cases don't move
 * when the curated data does. Instants are UTC; comments give New York time.
 * 2026-11-01 is the Sunday clocks fall back (EDT -04:00 -> EST -05:00).
 */
function fixture(
  windows: ScheduleWindow[],
  lastVerified = "2026-11-11",
): Program {
  return {
    showSlug: "fixture",
    kind: "digital-lottery",
    platform: "telecharge",
    price: 10,
    maxTickets: 2,
    entryUrl: "https://example.com/",
    schedule: { timezone: "America/New_York", summary: "test", windows },
    lastVerified,
    source: "https://example.com/policy",
  };
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6] as const;
const MINUTE = 60 * 1000;

describe("getProgramStatus", () => {
  const nineToEight = fixture([
    { days: EVERY_DAY, opensAt: "09:00", closesAt: "20:00" },
  ]);

  it("opens at 9 AM local time on both sides of the DST change", () => {
    // Sat Oct 31, 9:30 AM EDT
    const saturday = getProgramStatus(
      new Date("2026-10-31T13:30:00Z"),
      nineToEight,
    );
    expect(saturday.state).toBe("open");
    expect(saturday.nextOpenAt?.toISOString()).toBe("2026-10-31T13:00:00.000Z");

    // Sun Nov 1, 9:30 AM EST: the same wall-clock time is an hour later in UTC
    const sunday = getProgramStatus(
      new Date("2026-11-01T14:30:00Z"),
      nineToEight,
    );
    expect(sunday.state).toBe("open");
    expect(sunday.nextOpenAt?.toISOString()).toBe("2026-11-01T14:00:00.000Z");
    expect(sunday.nextCloseAt?.toISOString()).toBe("2026-11-02T01:00:00.000Z");
  });

  it("counts down to a window that opens later today", () => {
    // Sun Nov 1, 8:30 AM EST
    const status = getProgramStatus(
      new Date("2026-11-01T13:30:00Z"),
      nineToEight,
    );
    expect(status.state).toBe("opens-later-today");
    expect(status.countdownMs).toBe(30 * MINUTE);
  });

  it("reports closed-today after the window, with tomorrow's opening", () => {
    // Fri Nov 20, 9:00 PM EST
    const status = getProgramStatus(
      new Date("2026-11-21T02:00:00Z"),
      nineToEight,
    );
    expect(status.state).toBe("closed-today");
    expect(status.nextOpenAt?.toISOString()).toBe("2026-11-21T14:00:00.000Z");
  });

  it("flags the final hour as closes-soon", () => {
    // Fri Nov 20, 7:15 PM EST
    const status = getProgramStatus(
      new Date("2026-11-21T00:15:00Z"),
      nineToEight,
    );
    expect(status.state).toBe("closes-soon");
    expect(status.countdownMs).toBe(45 * MINUTE);
  });

  it("never counts down a while-supplies-last window", () => {
    const rush = fixture([
      {
        days: EVERY_DAY,
        opensAt: "10:00",
        closesAt: "20:00",
        whileSuppliesLast: true,
      },
    ]);
    // Fri Nov 20, 7:30 PM EST: inside the final hour, still no countdown
    const status = getProgramStatus(new Date("2026-11-21T00:30:00Z"), rush);
    expect(status.state).toBe("open");
    expect(status.countdownMs).toBeNull();
    expect(status.whileSuppliesLast).toBe(true);
  });

  it("carries an overnight window past midnight", () => {
    // Opens 5 PM, closes 9 AM the next morning (Rocky Horror's shape).
    const overnight = fixture([
      { days: [1, 2, 3, 4, 5, 6], opensAt: "17:00", closesAt: "09:00" },
    ]);
    // Tue Nov 17, 8:30 AM EST: Monday's window is still open
    const status = getProgramStatus(
      new Date("2026-11-17T13:30:00Z"),
      overnight,
    );
    expect(status.state).toBe("closes-soon");
    expect(status.nextOpenAt?.toISOString()).toBe("2026-11-16T22:00:00.000Z");
    expect(status.countdownMs).toBe(30 * MINUTE);
  });

  it("spans a week with closesDayOffset (Friday 10 AM to Thursday noon)", () => {
    const weekly = fixture([
      { days: [5], opensAt: "10:00", closesAt: "12:00", closesDayOffset: 6 },
    ]);
    // Tue Nov 17, 10 AM EST: open since last Friday
    const tuesday = getProgramStatus(new Date("2026-11-17T15:00:00Z"), weekly);
    expect(tuesday.state).toBe("open");
    expect(tuesday.nextOpenAt?.toISOString()).toBe("2026-11-13T15:00:00.000Z");
    expect(tuesday.nextCloseAt?.toISOString()).toBe("2026-11-19T17:00:00.000Z");

    // Thu Nov 19, 1 PM EST: closed at noon, reopens Friday 10 AM
    const thursday = getProgramStatus(
      new Date("2026-11-19T18:00:00Z"),
      weekly,
    );
    expect(thursday.state).toBe("closed-today");
    expect(thursday.nextOpenAt?.toISOString()).toBe("2026-11-20T15:00:00.000Z");
  });

  it("points a day without a window at the next one", () => {
    const mondays = fixture([{ days: [1], opensAt: "09:00", closesAt: "15:00" }]);
    // Wed Nov 18, noon EST
    const status = getProgramStatus(new Date("2026-11-18T17:00:00Z"), mondays);
    expect(status.state).toBe("next-open-day");
    expect(status.nextOpenAt?.toISOString()).toBe("2026-11-23T14:00:00.000Z");
    expect(status.countdownMs).toBe(5 * 24 * 60 * MINUTE - 3 * 60 * MINUTE);
  });
});

describe("isProgramStale", () => {
  it("turns stale 14 days after noon New York time on lastVerified", () => {
    const row = fixture([], "2026-11-11");
    // Noon EST on Nov 25 is 17:00 UTC (a fixed -04:00 offset would say 16:00).
    expect(isProgramStale(row, new Date("2026-11-25T16:59:00Z"))).toBe(false);
    expect(isProgramStale(row, new Date("2026-11-25T17:01:00Z"))).toBe(true);
  });
});

describe("etDayKey", () => {
  it("files late-evening instants under the New York date", () => {
    // 10 PM EST on Nov 20 is already Nov 21 in UTC
    expect(etDayKey(new Date("2026-11-21T03:00:00Z"))).toBe("2026-11-20");
    expect(etDayKey(new Date("2026-11-21T05:00:00Z"))).toBe("2026-11-21");
  });
});
