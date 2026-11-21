import { describe, expect, it } from "vitest";
import { buildTripPlan, recommendedSlots, tripWindowLabel } from "./trip";

describe("Trip recommendations", () => {
  it("skips closed lotteries at 4 PM ET and recommends a later window", () => {
    const now = new Date("2026-11-12T16:00:00-05:00");
    const plan = buildTripPlan(now, 0, 3);
    const interested = (slug: string) => slug === "little-shop-of-horrors";
    const todayLottery = plan[0].slots.find(
      (slot) => interested(slot.show.slug) && slot.program.kind === "digital-lottery",
    );
    expect(todayLottery?.closesAt.toISOString()).toBe("2026-11-12T20:00:00.000Z");

    const picks = recommendedSlots(plan, now, interested);
    expect(picks).toHaveLength(5);
    expect(picks.every(({ slot }) => slot.closesAt.getTime() > now.getTime())).toBe(true);
    expect(new Set(picks.map(({ slot }) => slot.show.slug)).size).toBe(picks.length);
    expect(picks[0].slot.show.slug).toBe("little-shop-of-horrors");
    expect(picks[0].day.dayKey).toBe("2026-11-13");
    expect(picks[0].slot.program.kind).toBe("digital-lottery");
    // Closed windows remain available to the day view.
    expect(plan[0].slots).toContain(todayLottery);
  });

  it("excludes a lottery exactly at its closing time", () => {
    const now = new Date("2026-11-12T15:00:00-05:00");
    const plan = buildTripPlan(now, 0, 1);
    const lottery = plan[0].slots.find(
      (slot) => slot.show.slug === "little-shop-of-horrors" && slot.program.kind === "digital-lottery",
    )!;
    const onlyLottery = [{ ...plan[0], slots: [lottery] }];
    expect(recommendedSlots(onlyLottery, new Date(now.getTime() - 1), () => false)).toHaveLength(1);
    expect(recommendedSlots(onlyLottery, now, () => false)).toEqual([]);
  });

  it("names the closing day of a window that spans days", () => {
    // Friday 2026-11-20, 8 AM ET: Hamilton's lottery opens at 10 AM and runs
    // to Thursday noon. It used to read "10 AM–12 PM".
    const now = new Date("2026-11-20T08:00:00-05:00");
    const plan = buildTripPlan(now, 0, 1);
    const hamilton = plan[0].slots.find(
      (slot) => slot.show.slug === "hamilton" && slot.program.kind === "digital-lottery",
    )!;
    expect(tripWindowLabel(hamilton)).toBe("10 AM–Thu 12 PM");

    const overnight = {
      ...hamilton,
      opensAt: new Date("2026-11-20T17:00:00-05:00"),
      closesAt: new Date("2026-11-21T09:00:00-05:00"),
    };
    expect(tripWindowLabel(overnight)).toBe("5 PM–Sat 9 AM");

    const sameDay = {
      ...hamilton,
      opensAt: new Date("2026-11-20T09:00:00-05:00"),
      closesAt: new Date("2026-11-20T15:30:00-05:00"),
    };
    expect(tripWindowLabel(sameDay)).toBe("9 AM–3:30 PM");
    expect(tripWindowLabel({ ...sameDay, whileSuppliesLast: true })).toBe("from 9 AM");
  });
});
