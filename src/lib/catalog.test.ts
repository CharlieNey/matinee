import { describe, expect, it } from "vitest";
import { allPrograms, isProgramStale, programKey } from "./programs";
import { duePushEvents } from "./pushEvents";
import { getShow, isRunning } from "./shows";

/**
 * Integrity checks on the hand-curated rows. A data refresh is a hand edit
 * of a large file; these catch what would otherwise ship silently.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

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

  it("uses valid prices, limits, times and https links", () => {
    for (const program of programs) {
      const key = programKey(program);
      expect(program.price, key).toBeGreaterThan(0);
      if (program.maxTickets !== undefined) {
        expect(program.maxTickets, key).toBeGreaterThanOrEqual(1);
      }
      expect(new URL(program.entryUrl).protocol, key).toBe("https:");
      expect(new URL(program.source).protocol, key).toBe("https:");
      expect(program.lastVerified, key).toMatch(ISO_DATE);
      for (const window of program.schedule.windows) {
        expect(window.opensAt, key).toMatch(CLOCK);
        expect(window.closesAt, key).toMatch(CLOCK);
      }
    }
  });

  it("says in a sentence why each unverified row is in doubt", () => {
    for (const program of programs) {
      if (program.unverified === undefined) continue;
      expect(program.unverified, programKey(program)).toMatch(/^[A-Z].{20,}\.$/);
    }
  });

  it("never alerts from an unverified or stale row", () => {
    const untrusted = new Set(
      programs.filter((program) => program.unverified).map(programKey),
    );
    expect(untrusted.size).toBeGreaterThan(0);
    // A full day in 5-minute steps (the grace windows are 30 minutes), while
    // every row is fresh...
    const fresh: string[] = [];
    for (let t = Date.parse("2026-12-01T05:00:00Z"); t < Date.parse("2026-12-02T05:00:00Z"); t += 5 * 60_000) {
      for (const event of duePushEvents(new Date(t))) fresh.push(event.eventKey);
    }
    expect(fresh.length).toBeGreaterThan(0);
    for (const key of fresh) {
      expect(untrusted.has(key.split("|")[0]), key).toBe(false);
    }
    // ...and nothing at all once every row has gone stale.
    const later = new Date("2027-01-15T15:00:00Z");
    expect(programs.every((program) => isProgramStale(program, later))).toBe(true);
    expect(duePushEvents(later)).toEqual([]);
  }, 30_000);
});
