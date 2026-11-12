import { describe, expect, it, vi } from "vitest";
import {
  BACKUP_FORMAT,
  createPersistedStateStorage,
  LEGACY_STORAGE_KEY,
  parseDiaryBackup,
  parsePersistedState,
  PERSISTENCE_VERSION,
  STORAGE_KEY,
  TEXT_LIMITS,
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

const baseState = {
  alerts: [],
  saved: [],
  profile: { name: "John", handle: "@john", bio: null },
  diary: [baseEntry],
};

function memoryStorage(key = STORAGE_KEY, raw: string | null = null) {
  const values = new Map<string, string>(raw === null ? [] : [[key, raw]]);
  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
  };
}

describe("persisted state migrations", () => {
  it("repairs oversized free text without losing the profile or diary", () => {
    const parsed = parsePersistedState({
      ...baseState,
      profile: {
        name: "N".repeat(81),
        handle: "H".repeat(81),
        bio: "B".repeat(401),
      },
      diary: [{
        ...baseEntry,
        seat: "S".repeat(121),
        thoughts: "T".repeat(10_001),
        note: "P".repeat(10_001),
        tags: ["A".repeat(41), "Preview"],
      }],
    });

    expect(parsed.state.profile).toEqual({
      name: "N".repeat(TEXT_LIMITS.name),
      handle: "H".repeat(TEXT_LIMITS.handle),
      bio: "B".repeat(TEXT_LIMITS.bio),
    });
    expect(parsed.state.diary).toHaveLength(1);
    expect(parsed.state.diary[0]).toMatchObject({
      id: baseEntry.id,
      seat: "S".repeat(TEXT_LIMITS.seat),
      thoughts: "T".repeat(TEXT_LIMITS.thoughts),
      note: "P".repeat(TEXT_LIMITS.note),
      tags: ["A".repeat(TEXT_LIMITS.tag), "Preview"],
    });
    expect(parsePersistedState(parsed.state).state).toEqual(parsed.state);
  });

  it("keeps rejecting oversized identifiers instead of truncating them", () => {
    const parsed = parsePersistedState({
      ...baseState,
      diary: [{ ...baseEntry, id: "d".repeat(181) }],
    });
    expect(parsed.state.diary).toEqual([]);
  });

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

describe("safe diary storage", () => {
  const now = new Date("2026-11-12T21:00:00Z");
  const nextState = parsePersistedState({ ...baseState, diary: [] }).state;

  it.each([
    [STORAGE_KEY, "{broken diary JSON"],
    [STORAGE_KEY, JSON.stringify({ ...baseState, version: 99 })],
    [STORAGE_KEY, JSON.stringify({ ...baseState, profile: null })],
    [LEGACY_STORAGE_KEY, "{broken legacy diary JSON"],
    [STORAGE_KEY, ""],
  ])("backs up unreadable %s data without overwriting it", (key, raw) => {
    const storage = memoryStorage(key, raw);
    const session = createPersistedStateStorage(storage);
    expect(() => session.read()).toThrow();
    expect(session.write(nextState, now)).toBe(false);
    expect(storage.values.get(key)).toBe(raw);
    expect(storage.values.get(`${key}-backup-${now.toISOString()}`)).toBe(raw);
    expect(storage.setItem).toHaveBeenCalledTimes(1);

    // Editing the fallback profile cannot erase the old diary or clear the
    // warning, and does not create a backup on every keystroke.
    expect(session.write(nextState, new Date(now.getTime() + 1000))).toBe(false);
    expect(storage.setItem).toHaveBeenCalledTimes(1);

    const reloaded = createPersistedStateStorage(storage);
    expect(() => reloaded.read()).toThrow();
    expect(reloaded.write(nextState, new Date(now.getTime() + 2000))).toBe(false);
    expect(storage.values.get(key)).toBe(raw);
  });

  it("does not overwrite a diary when a storage read failed transiently", () => {
    const raw = JSON.stringify(baseState);
    const storage = memoryStorage(STORAGE_KEY, raw);
    storage.getItem.mockImplementationOnce(() => { throw new Error("Unavailable"); });
    const session = createPersistedStateStorage(storage);
    expect(() => session.read()).toThrow("Unavailable");
    expect(session.write(nextState, now)).toBe(false);
    expect(storage.values.get(STORAGE_KEY)).toBe(raw);
    expect(storage.values.get(`${STORAGE_KEY}-backup-${now.toISOString()}`)).toBe(raw);
  });

  it("preserves the original when backup storage is full", () => {
    const storage = memoryStorage(STORAGE_KEY, "broken");
    const session = createPersistedStateStorage(storage);
    expect(() => session.read()).toThrow();
    storage.setItem.mockImplementation(() => { throw new Error("Quota exceeded"); });
    expect(() => session.write(nextState, now)).toThrow("Quota exceeded");
    expect(storage.values.get(STORAGE_KEY)).toBe("broken");
  });

  it("backs up corruption introduced after a successful read", () => {
    const storage = memoryStorage(STORAGE_KEY, JSON.stringify(baseState));
    const session = createPersistedStateStorage(storage);
    expect(session.read()?.state.diary).toHaveLength(1);
    storage.values.set(STORAGE_KEY, "broken");
    expect(session.write(nextState, now)).toBe(false);
    expect(storage.values.get(STORAGE_KEY)).toBe("broken");
    expect(storage.values.get(`${STORAGE_KEY}-backup-${now.toISOString()}`)).toBe("broken");
  });

  it("writes after successfully reading repaired or empty storage", () => {
    for (const raw of [null, JSON.stringify({
      ...baseState,
      profile: { ...baseState.profile, name: "N".repeat(81) },
    })]) {
      const storage = memoryStorage(STORAGE_KEY, raw);
      const session = createPersistedStateStorage(storage);
      const loaded = session.read();
      const state = loaded?.state ?? nextState;
      expect(session.write(state, now)).toBe(true);
      expect(JSON.parse(storage.values.get(STORAGE_KEY)!)).toEqual(state);
      expect(storage.values.size).toBe(1);
    }
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
