import { describe, expect, it } from "vitest";
import {
  BACKUP_FORMAT,
  parseDiaryBackup,
  parsePersistedState,
  PERSISTENCE_VERSION,
} from "./persistence";

const baseEntry = {
  id: "d-1",
  slug: "the-outsiders",
  loggedAt: "2026-07-20T20:48:16.903Z",
  seat: "Orchestra B 8",
  sentiment: "recommend",
  thoughts: "Electric staging.",
  tags: ["Preview"],
  visibility: "public",
  note: null,
};

describe("persisted state migrations", () => {
  it("migrates an unversioned diary and extracts legacy photos", () => {
    const parsed = parsePersistedState({
      alerts: [{ id: "n1", slug: "the-outsiders", enabled: true }],
      saved: ["the-outsiders"],
      topTen: ["the-outsiders", "the-outsiders"],
      profile: { name: "John Doe", handle: "@johndoe", bio: null },
      diary: [{ ...baseEntry, photo: "data:image/jpeg;base64,abc" }],
    });

    expect(parsed.state.version).toBe(PERSISTENCE_VERSION);
    expect(parsed.state.ranking).toEqual(["the-outsiders", "the-outsiders"]);
    expect(parsed.state.diary[0].performanceDate).toBe("2026-07-20");
    expect(parsed.legacyPhotos.get("d-1")).toBe(
      "data:image/jpeg;base64,abc",
    );
    expect(parsed.state.diary[0]).not.toHaveProperty("photo");
  });

  it("rejects state from an unsupported future version", () => {
    expect(() =>
      parsePersistedState({
        version: 99,
        alerts: [],
        saved: [],
        profile: { name: "John", handle: "@john", bio: null },
      }),
    ).toThrow(/newer Matinee version/);
  });
});

describe("diary backup validation", () => {
  it("accepts a versioned backup and drops malformed rows", () => {
    const parsed = parseDiaryBackup({
      format: BACKUP_FORMAT,
      version: PERSISTENCE_VERSION,
      profile: { name: "John Doe", handle: "@johndoe", bio: "Broadway fan" },
      diary: [
        { ...baseEntry, performanceDate: "2026-07-16", photo: null },
        { id: "broken" },
      ],
    });

    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].performanceDate).toBe("2026-07-16");
    expect(parsed.skipped).toBe(1);
    expect(parsed.profile?.bio).toBe("Broadway fan");
  });

  it("accepts the original export shape with a nested show", () => {
    const parsed = parseDiaryBackup({
      exportedAt: "2026-07-22T12:00:00.000Z",
      diary: [
        {
          id: baseEntry.id,
          loggedAt: baseEntry.loggedAt,
          seat: baseEntry.seat,
          sentiment: baseEntry.sentiment,
          thoughts: baseEntry.thoughts,
          tags: baseEntry.tags,
          visibility: baseEntry.visibility,
          note: baseEntry.note,
          show: { slug: "the-outsiders", title: "The Outsiders" },
        },
      ],
    });

    expect(parsed.entries[0].slug).toBe("the-outsiders");
  });
});
