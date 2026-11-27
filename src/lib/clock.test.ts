import { describe, expect, it } from "vitest";
import { nyClock, nyTime, shortWait } from "./clock";

// Tuesday Dec 1, 2026 in New York (UTC-5).
const et = (t: string, day = "2026-12-01") => new Date(`${day}T${t}:00-05:00`);
const NOW = et("10:30");

describe("times the way a New Yorker says them", () => {
  it("drops :00, and says noon and midnight", () => {
    expect(nyTime(et("15:00"))).toBe("3 PM");
    expect(nyTime(et("10:30"))).toBe("10:30 AM");
    expect(nyTime(et("12:00"))).toBe("noon");
    expect(nyTime(et("00:00"))).toBe("midnight");
    expect(nyTime(et("00:01"))).toBe("12:01 AM");
  });

  it("names tomorrow, then the weekday", () => {
    expect(nyClock(et("14:00"), NOW)).toBe("2 PM");
    expect(nyClock(et("09:00", "2026-12-02"), NOW)).toBe("tomorrow 9 AM");
    expect(nyClock(et("12:00", "2026-12-03"), NOW)).toBe("Thu noon");
  });

  it("holds New York time across the DST change", () => {
    // Sunday Mar 14, 2027: 10 AM is 14:00 UTC after the spring change.
    expect(nyTime(new Date("2027-03-14T14:00:00Z"))).toBe("10 AM");
  });

  it("counts down only in minutes and hours", () => {
    expect(shortWait(30_000)).toBe("1 min");
    expect(shortWait(42 * 60_000)).toBe("42 min");
    expect(shortWait(70 * 60_000)).toBe("1 hr 10 min");
    expect(shortWait(120 * 60_000)).toBe("2 hr");
  });
});
