import { describe, expect, it } from "vitest";
import type { LotteryEntry } from "./entries";
import { recordByShow, recordLine } from "./record";

const WICKED = "wicked/digital-lottery/broadway-direct";
const HAMILTON = "hamilton/digital-lottery/official-site";
const entry = (key: string, day: string, won = false): LotteryEntry => ({
  key,
  day,
  at: `${day}T15:00:00.000Z`,
  ...(won ? { won: true } : {}),
});
// Tuesday Dec 1, 2026, 4 PM in New York.
const NOW = new Date("2026-12-01T16:00:00-05:00");

describe("your record by show", () => {
  it("counts entries and wins per show, most-entered first", () => {
    const log = [
      entry(WICKED, "2026-11-20"),
      entry(WICKED, "2026-11-21", true),
      entry(WICKED, "2026-11-23"),
      entry(HAMILTON, "2026-11-06"),
    ];
    const records = recordByShow(log, NOW);
    expect(records.map((r) => [r.title, r.entries, r.wins, r.waiting])).toEqual([
      ["Wicked", 3, 1, 0],
      ["Hamilton", 1, 0, 0],
    ]);
    expect(recordLine(records[0])).toBe("1 win in 3 entries");
    expect(recordLine(records[1])).toBe("No wins in 1 entry");
  });

  it("doesn't count an entry as lost before its drawing", () => {
    // Today's daily lottery hasn't drawn; Hamilton's weekly window runs to
    // next Thursday, so a Friday entry is still waiting on Tuesday.
    const log = [entry(WICKED, "2026-12-01"), entry(HAMILTON, "2026-11-27")];
    const records = recordByShow(log, NOW);
    expect(records.map((r) => [r.slug, r.entries, r.waiting])).toEqual([
      ["hamilton", 0, 1],
      ["wicked", 0, 1],
    ]);
    expect(recordLine(records[1])).toBe("1 waiting on the draw");
    // A win today counts at once.
    expect(recordByShow([entry(WICKED, "2026-12-01", true)], NOW)[0]).toMatchObject({
      entries: 1,
      wins: 1,
      waiting: 0,
    });
  });

  it("ignores rush and keeps a retired show's history", () => {
    const log = [
      entry("wicked/rush/box-office", "2026-11-20"),
      entry("heathers/digital-lottery/telecharge", "2026-09-01", true),
    ];
    expect(recordByShow(log, NOW)).toEqual([
      { slug: "heathers", title: "Heathers", entries: 1, wins: 1, waiting: 0 },
    ]);
  });
});
