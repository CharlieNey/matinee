import { describe, expect, it } from "vitest";
import { calendarEvents, calendarFeed, calendarUrl, CALENDAR_DAYS } from "./calendar";
import { programsForShow } from "./programs";

/** New York wall-clock time on a standard-time day (UTC-5 all December). */
const et = (time: string, day: string) => new Date(`${day}T${time}:00-05:00`);
const MONDAY_6AM = et("06:00", "2026-11-30");

describe("calendar events", () => {
  it("puts each opening where its push would go, worded the same", () => {
    const events = calendarEvents(["wicked"], MONDAY_6AM);
    // The feed also keeps the past day (Sunday's noon rush): look from 6 AM.
    const first = events.filter(
      (e) => e.start >= MONDAY_6AM && e.start < et("12:00", "2026-11-30"),
    );
    expect(first.map((e) => [e.start.toISOString(), e.summary])).toEqual([
      [et("09:00", "2026-11-30").toISOString(), "Wicked lottery opens at 9:00 AM"],
      [et("10:00", "2026-11-30").toISOString(), "Wicked rush opens at 10:00 AM"],
    ]);
    expect(first[0].url).toBe("https://lottery.broadwaydirect.com/show/wicked/");
    expect(first[0].description).toContain("Checked Nov 27 against wickedthemusical.com");
  });

  it("announces a midnight lottery at 8 AM, like push", () => {
    const outsiders = calendarEvents(["the-outsiders"], MONDAY_6AM).find(
      (e) => e.summary.includes("lottery"),
    )!;
    expect(outsiders.start.toISOString()).toBe(et("08:00", "2026-11-30").toISOString());
    expect(outsiders.summary).toBe("The Outsiders lottery is open until 3:00 PM");
  });

  it("never makes an event from an unverified row or standing room", () => {
    // Every Chicago row is unverified; SIX's standing room has no clock.
    expect(calendarEvents(["chicago"], MONDAY_6AM)).toEqual([]);
    const six = calendarEvents(["six"], MONDAY_6AM);
    expect(six.length).toBeGreaterThan(0);
    expect(six.every((e) => e.summary.startsWith("SIX: The Musical lottery"))).toBe(true);
    expect(programsForShow("six").some((p) => p.kind === "sro")).toBe(true);
  });

  it("stops where the rows go stale, and never looks past two weeks", () => {
    // Checked Nov 27, so stale from noon New York time on Dec 11.
    const staleAt = et("12:00", "2026-12-11");
    const events = calendarEvents(["wicked", "hamilton", "six"], et("10:30", "2026-12-01"));
    expect(events.length).toBeGreaterThan(10);
    expect(events.every((e) => e.start < staleAt)).toBe(true);
    const fresh = calendarEvents(["wicked"], MONDAY_6AM);
    const horizon = MONDAY_6AM.getTime() + CALENDAR_DAYS * 86_400_000;
    expect(fresh.every((e) => e.start.getTime() < horizon)).toBe(true);
    expect(new Set(fresh.map((e) => e.uid)).size).toBe(fresh.length);
  });
});

describe("the iCalendar document", () => {
  const feed = calendarFeed(["wicked", "oh-mary"], MONDAY_6AM);
  const lines = feed.split("\r\n");

  it("uses CRLF and folds every line to 75 octets", () => {
    expect(feed.endsWith("\r\n")).toBe(true);
    expect(feed.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("balances its blocks and alarms each event 5 minutes ahead", () => {
    const count = (s: string) => lines.filter((l) => l === s).length;
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(count("BEGIN:VEVENT")).toBe(count("END:VEVENT"));
    expect(count("BEGIN:VEVENT")).toBeGreaterThan(0);
    expect(count("TRIGGER:-PT5M")).toBe(count("BEGIN:VEVENT"));
    expect(feed).toContain("X-WR-CALNAME:Matinee: Wicked\\, Oh\\, Mary!");
  });

  it("escapes text and writes times in UTC", () => {
    // Unfolded, the description keeps its escaped commas and newlines.
    const unfolded = feed.replace(/\r\n /g, "");
    expect(unfolded).toContain("Rules change\\, so check the official page");
    expect(unfolded).toMatch(/DTSTART:20261130T140000Z/); // 9:00 AM New York
  });

  it("builds the subscribe address from the page's own origin", () => {
    expect(calendarUrl("webcal://matinee.nyc", ["wicked", "six"])).toBe(
      "webcal://matinee.nyc/api/calendar.ics?shows=wicked,six",
    );
  });
});
