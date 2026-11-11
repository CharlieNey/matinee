import { describe, expect, it } from "vitest";
import {
  boardIsToday,
  makeSlugResolver,
  parseEtStamp,
  parseLiveSummary,
} from "./tkts";

describe("TKTS normalization", () => {
  it("parses EDT and EST wall-clock stamps", () => {
    expect(parseEtStamp("Wednesday, 22 July 2026 10:26 AM")).toBe(
      "2026-07-22T14:26:00.000Z",
    );
    expect(parseEtStamp("Wednesday, 20 January 2027 10:26 AM")).toBe(
      "2027-01-20T15:26:00.000Z",
    );
  });

  it("matches normalized board titles and rejects stale-day stamps", () => {
    const resolve = makeSlugResolver([
      { title: "The Book of Mormon", slug: "the-book-of-mormon" },
    ]);
    expect(resolve("Book of Mormon")).toBe("the-book-of-mormon");
    expect(
      boardIsToday(
        "2026-07-22T14:26:00.000Z",
        new Date("2026-07-22T20:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      boardIsToday(
        "2026-07-21T14:26:00.000Z",
        new Date("2026-07-22T20:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("validates the Duffy community summary", () => {
    expect(
      parseLiveSummary({
        live: true,
        showQuantity: 27,
        averagePrice: 91.73,
        averageDiscount: 44.04,
      }),
    ).toEqual({
      live: true,
      showQuantity: 27,
      averagePrice: 91.73,
      averageDiscount: 44.04,
    });
    expect(parseLiveSummary({ live: "yes" })).toBeNull();
  });
});
