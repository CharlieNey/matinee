import { describe, expect, it } from "vitest";
import { Program, programKey, Weekday } from "./programs";
import { todaysWindows } from "./today";

/** Hand-built rows, independent of the live catalog. Checked Nov 20. */
const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
function make(
  showSlug: string,
  kind: Program["kind"],
  opensAt: string,
  closesAt: string,
  whileSuppliesLast = false,
): Program {
  return {
    showSlug,
    kind,
    platform: kind === "digital-lottery" ? "broadway-direct" : "box-office",
    price: 45,
    maxTickets: 2,
    entryUrl: "https://example.com/enter",
    schedule: {
      timezone: "America/New_York",
      summary: "test",
      windows: [{ days: EVERY_DAY, opensAt, closesAt, whileSuppliesLast }],
    },
    lastVerified: "2026-11-20",
    source: "https://example.com/policy",
  };
}
const RUSH = make("hadestown", "rush", "10:00", "20:00", true);
const DAY_LOTTERY = make("wicked", "digital-lottery", "09:00", "15:00");
const OVERNIGHT_LOTTERY = make("rocky-horror-show", "digital-lottery", "17:00", "09:00");
const STANDING_ROOM = make("chicago", "sro", "10:00", "20:00", true);

/** New York wall-clock time on a standard-time day (both test days are EST). */
const et = (time: string, day = "2026-11-20") => new Date(`${day}T${time}:00-05:00`);
const minutes = (date: Date, n: number) => new Date(date.getTime() + n * 60_000);

const keys = (windows: { program: Parameters<typeof programKey>[0] }[]) =>
  windows.map((w) => programKey(w.program));

describe("today's windows", () => {
  it("lists what's open now by closing time, and what opens later by opening time", () => {
    // 8:30 AM: the 9-3 lottery and the 10 AM rush open later; the overnight
    // 5 PM–9 AM lottery is open and closes first.
    const list = todaysWindows(et("08:30"), [RUSH, DAY_LOTTERY, OVERNIGHT_LOTTERY]);
    expect(keys(list.open)).toEqual([programKey(OVERNIGHT_LOTTERY)]);
    expect(keys(list.later)).toEqual([programKey(DAY_LOTTERY), programKey(RUSH)]);

    // 2 PM: the lottery closes at 3, before the rush's box office at 8.
    const afternoon = todaysWindows(et("14:00"), [RUSH, DAY_LOTTERY]);
    expect(keys(afternoon.open)).toEqual([programKey(DAY_LOTTERY), programKey(RUSH)]);
  });

  it("drops windows that already closed today, and standing room", () => {
    const list = todaysWindows(et("15:30"), [DAY_LOTTERY, STANDING_ROOM]);
    // The 9-3 lottery closed at 3; tomorrow's isn't today.
    expect(list.open).toEqual([]);
    expect(list.later).toEqual([]);
    expect(list.unverified).toEqual([]);
  });

  it("never gives an unverified or stale row a time: it goes in its own list", () => {
    const doubtful = { ...DAY_LOTTERY, unverified: "The price is in doubt." };
    const list = todaysWindows(et("10:00"), [doubtful, RUSH]);
    expect(keys(list.open)).toEqual([programKey(RUSH)]);
    expect(list.unverified).toEqual([doubtful]);

    // Checked Nov 20: stale from noon on Dec 4.
    const stale = todaysWindows(minutes(et("12:00", "2026-12-04"), 1), [RUSH]);
    expect(stale.open).toEqual([]);
    expect(stale.unverified).toEqual([RUSH]);
  });
});
