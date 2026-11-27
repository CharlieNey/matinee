import { describe, expect, it } from "vitest";
import { pageCountingEnabled, pathOnly } from "./pageCounting";

describe("page counting", () => {
  it("sends only the page's address: never a query or a shared diary's fragment", () => {
    expect(
      pathOnly({ type: "pageview", url: "https://matinee.nyc/p#j.eyJuYW1lIjoiQ2hhcmxpZSJ9" }),
    ).toEqual({ type: "pageview", url: "https://matinee.nyc/p" });
    expect(
      pathOnly({ type: "pageview", url: "https://matinee.nyc/api/calendar.ics?shows=wicked" }).url,
    ).toBe("https://matinee.nyc/api/calendar.ics");
    expect(pathOnly({ type: "pageview", url: "https://matinee.nyc/shows/wicked" }).url).toBe(
      "https://matinee.nyc/shows/wicked",
    );
  });

  it("is off outside a Vercel production build (tests, CI, local, previews)", () => {
    expect(pageCountingEnabled).toBe(false);
  });
});
