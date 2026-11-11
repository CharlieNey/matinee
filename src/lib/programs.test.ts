import { describe, expect, it } from "vitest";
import {
  allPrograms,
  formatMinutes,
  getProgramStatus,
  isProgramStale,
} from "./programs";
import { duePushEvents } from "./pushEvents";

describe("program schedule engine", () => {
  it("opens the Wednesday TodayTix rush at 9 AM New York time", () => {
    const program = allPrograms().find(
      (item) =>
        item.showSlug === "and-juliet" && item.platform === "todaytix",
    );
    expect(program).toBeDefined();

    const status = getProgramStatus(
      new Date("2026-07-22T13:10:00.000Z"),
      program!,
    );
    expect(status.state).toBe("open");
    expect(status.nextOpenAt?.toISOString()).toBe("2026-07-22T13:00:00.000Z");
  });

  it("marks verification dates stale after fourteen days", () => {
    // Relative to the row's own date, so routine data refreshes don't break it.
    const program = allPrograms()[0];
    const verifiedAt = new Date(`${program.lastVerified}T12:00:00-04:00`);
    const daysLater = (days: number) =>
      new Date(verifiedAt.getTime() + days * 24 * 60 * 60 * 1000);
    expect(isProgramStale(program, daysLater(7))).toBe(false);
    expect(isProgramStale(program, daysLater(19))).toBe(true);
  });

  it("generates stable, unique push-event keys", () => {
    const events = duePushEvents(new Date("2026-07-22T13:10:00.000Z"));
    expect(events.length).toBeGreaterThan(0);
    expect(new Set(events.map((event) => event.eventKey)).size).toBe(
      events.length,
    );
  });
});

describe("formatMinutes", () => {
  it("renders claim windows and countdowns in hours once past 59 minutes", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(60)).toBe("1 hr");
    expect(formatMinutes(90)).toBe("1 hr 30 min");
    expect(formatMinutes(300)).toBe("5 hr");
  });
});
