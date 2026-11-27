import { describe, expect, it } from "vitest";
import { GET } from "./route";

const get = (query: string) => GET(new Request(`https://matinee.nyc/api/calendar.ics${query}`));

describe("GET /api/calendar.ics", () => {
  it("serves a calendar for known shows", async () => {
    const response = get("?shows=wicked,six");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    const body = await response.text();
    expect(body.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });

  it("drops unknown and odd slugs, and refuses an empty list", async () => {
    const body = await get("?shows=wicked,not-a-show,%3Cscript%3E").text();
    expect(body).toContain("X-WR-CALNAME:Matinee: Wicked\r\n");
    expect(get("").status).toBe(400);
    expect(get("?shows=nope,,").status).toBe(400);
  });
});
