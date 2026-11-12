import { describe, expect, it } from "vitest";
import { buildTripPlan, recommendedSlots } from "./trip";

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
});
