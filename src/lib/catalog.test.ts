import { describe, expect, it } from "vitest";
import { allPrograms, programKey, programsLastVerified } from "./programs";
import { allShows, getShow, isRunning, runningShows } from "./shows";
import { allTheaters, currentShowAt } from "./theaters";

/**
 * Integrity checks on the hand-curated data. A data refresh is a hand edit
 * of a large file; these catch the mistakes that would otherwise ship
 * silently (a typo'd slug, a program left on a closed show, a bad time).
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

describe("show catalog", () => {
  it("has unique slugs", () => {
    const slugs = allShows().map((show) => show.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("dates every closing as YYYY-MM-DD", () => {
    for (const show of allShows()) {
      if (show.closedOn !== undefined) expect(show.closedOn).toMatch(ISO_DATE);
    }
  });

  it("splits into running and closed productions", () => {
    expect(runningShows().every(isRunning)).toBe(true);
    expect(runningShows().length).toBeLessThan(allShows().length);
  });
});

describe("program data", () => {
  const programs = allPrograms();

  it("points every program at a running show in the catalog", () => {
    for (const program of programs) {
      const show = getShow(program.showSlug);
      expect(show, program.showSlug).toBeDefined();
      expect(isRunning(show!), `${program.showSlug} has closed`).toBe(true);
    }
  });

  it("has one program per show, kind and platform", () => {
    const keys = programs.map(programKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("uses valid prices, limits and https entry links", () => {
    for (const program of programs) {
      const key = programKey(program);
      expect(program.price, key).toBeGreaterThan(0);
      expect(program.maxTickets, key).toBeGreaterThanOrEqual(1);
      expect(new URL(program.entryUrl).protocol, key).toBe("https:");
    }
  });

  it("uses 24-hour HH:MM times and real weekdays", () => {
    for (const program of programs) {
      const key = programKey(program);
      expect(program.schedule.windows.length, key).toBeGreaterThan(0);
      for (const window of program.schedule.windows) {
        expect(window.opensAt, key).toMatch(CLOCK);
        expect(window.closesAt, key).toMatch(CLOCK);
        expect(window.days.length, key).toBeGreaterThan(0);
        for (const day of window.days) {
          expect(day, key).toBeGreaterThanOrEqual(0);
          expect(day, key).toBeLessThanOrEqual(6);
        }
      }
    }
  });

  it("stamps every row with a verification date no later than the catalog's", () => {
    const latest = programsLastVerified();
    for (const program of programs) {
      expect(program.lastVerified, programKey(program)).toMatch(ISO_DATE);
      expect(program.lastVerified <= latest).toBe(true);
    }
  });
});

describe("theaters", () => {
  it("seats every running Broadway show in a known house", () => {
    const houses = new Set(allTheaters().map((theater) => theater.name));
    for (const show of runningShows()) {
      if (show.tier === "Broadway") expect(houses, show.slug).toContain(show.venue);
    }
  });

  it("never maps a closed show to a house", () => {
    for (const theater of allTheaters()) {
      const show = currentShowAt(theater);
      if (show) expect(isRunning(show), show.slug).toBe(true);
    }
  });
});
