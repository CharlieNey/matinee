import { describe, expect, it } from "vitest";
import { localDay, performanceDateError } from "./performanceDate";

describe("performance date validation", () => {
  const today = "2026-11-12";

  it("rejects a future performance, including tomorrow", () => {
    expect(performanceDateError("2026-12-01", today)).toMatch(/future/);
    expect(performanceDateError("2026-11-13", today)).toMatch(/future/);
  });

  it("accepts today and past performances", () => {
    expect(performanceDateError(today, today)).toBeNull();
    expect(performanceDateError("2026-11-11", today)).toBeNull();
    expect(performanceDateError("2024-02-29", today)).toBeNull();
  });

  it("requires an actual calendar date", () => {
    expect(performanceDateError("", today)).toMatch(/Choose/);
    for (const value of ["2026-02-29", "2026-11-31", "2026-13-01", "11/12/2026", "2026-1-2"]) {
      expect(performanceDateError(value, today)).toMatch(/valid/);
    }
  });

  it("uses the local calendar without converting the editor date to UTC", () => {
    const lateEvening = new Date(2026, 10, 12, 23, 59);
    expect(localDay(lateEvening)).toBe(today);
    expect(performanceDateError(today, localDay(lateEvening))).toBeNull();
  });
});
