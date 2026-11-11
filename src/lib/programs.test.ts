import { describe, expect, it } from "vitest";
import {
  allPrograms,
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
    const program = allPrograms()[0];
    expect(isProgramStale(program, new Date("2026-07-20T12:00:00Z"))).toBe(
      false,
    );
    expect(isProgramStale(program, new Date("2026-08-01T12:00:00Z"))).toBe(
      true,
    );
  });

  it("generates stable, unique push-event keys", () => {
    const events = duePushEvents(new Date("2026-07-22T13:10:00.000Z"));
    expect(events.length).toBeGreaterThan(0);
    expect(new Set(events.map((event) => event.eventKey)).size).toBe(
      events.length,
    );
  });
});
