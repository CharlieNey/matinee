/**
 * Versioned, validated persistence formats. Browser storage and imported
 * backups are untrusted input: old versions are migrated here and malformed
 * rows are dropped before they reach React state.
 */

export const STORAGE_KEY = "matinee-state-v1";
export const LEGACY_STORAGE_KEY = "theatr-state-v1";
export const PERSISTENCE_VERSION = 2 as const;
export const BACKUP_FORMAT = "matinee-diary" as const;
export const TEXT_LIMITS = {
  name: 80,
  handle: 80,
  bio: 400,
  thoughts: 10_000,
  note: 10_000,
  tag: 40,
  seat: 120,
} as const;
export const MAX_DIARY_TAGS = 12;

export type PersistedProfile = {
  name: string;
  handle: string;
  bio: string | null;
};

export type PersistedDiaryEntry = {
  id: string;
  slug: string;
  loggedAt: string;
  performanceDate: string;
  seat: string;
  sentiment: "recommend" | "mixed" | "disliked";
  thoughts: string | null;
  tags: string[];
  visibility: "public" | "private";
  note: string | null;
};

export type PortableDiaryEntry = PersistedDiaryEntry & {
  photo: string | null;
};

export type PersistedState = {
  version: typeof PERSISTENCE_VERSION;
  alerts: { id: string; slug: string; enabled: boolean }[];
  saved: string[];
  ranking: string[];
  attendedExtra: string[];
  attendedHidden: string[];
  profile: PersistedProfile;
  diary: PersistedDiaryEntry[];
};

export type ParsedPersistedState = {
  state: PersistedState;
  /** Photos from the old localStorage shape, queued for IndexedDB migration. */
  legacyPhotos: Map<string, string>;
};

export type ParsedDiaryBackup = {
  entries: PortableDiaryEntry[];
  profile: PersistedProfile | null;
  skipped: number;
};

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length <= max ? value : null;
}

// Free text can be repaired without discarding the diary. Structured values
// (IDs, dates, slugs and photos) still use the strict validator above.
function repairedText(value: unknown, max: number): string | null {
  return typeof value === "string" ? value.slice(0, max) : null;
}

function stringList(value: unknown, maxItems = 200, maxLength = 120): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string =>
      typeof item === "string" && item.length > 0 && item.length <= maxLength
    )
    .slice(0, maxItems);
}

function isoInstant(value: unknown): string | null {
  const candidate = text(value, 40);
  return candidate && !Number.isNaN(Date.parse(candidate)) ? candidate : null;
}

function calendarDay(value: unknown): string | null {
  const candidate = text(value, 10);
  if (!candidate || !/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null;
  const parsed = new Date(`${candidate}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === candidate
    ? candidate
    : null;
}

function profile(value: unknown): PersistedProfile | null {
  const item = record(value);
  if (!item) return null;
  const name = repairedText(item.name, TEXT_LIMITS.name);
  const handle = repairedText(item.handle, TEXT_LIMITS.handle);
  if (!name || handle === null) return null;
  return { name, handle, bio: repairedText(item.bio, TEXT_LIMITS.bio) };
}

function photo(value: unknown): string | null {
  const candidate = text(value, 6_000_000);
  return candidate?.startsWith("data:image/") ? candidate : null;
}

function diaryEntry(value: unknown): PortableDiaryEntry | null {
  const item = record(value);
  if (!item) return null;
  const show = record(item.show);
  const slug = text(item.slug, 100) ?? text(show?.slug, 100);
  const id = text(item.id, 180);
  const loggedAt = isoInstant(item.loggedAt);
  const performanceDate =
    calendarDay(item.performanceDate) ?? loggedAt?.slice(0, 10) ?? null;
  if (!slug || !id || !loggedAt || !performanceDate) return null;

  const sentiment =
    item.sentiment === "recommend" ||
    item.sentiment === "mixed" ||
    item.sentiment === "disliked"
      ? item.sentiment
      : null;
  if (!sentiment) return null;

  return {
    id,
    slug,
    loggedAt,
    performanceDate,
    seat: repairedText(item.seat, TEXT_LIMITS.seat) ?? "",
    sentiment,
    thoughts: repairedText(item.thoughts, TEXT_LIMITS.thoughts),
    tags: Array.isArray(item.tags)
      ? item.tags
          .filter((tag): tag is string => typeof tag === "string" && tag.length > 0)
          .slice(0, MAX_DIARY_TAGS)
          .map((tag) => tag.slice(0, TEXT_LIMITS.tag))
      : [],
    visibility: item.visibility === "public" ? "public" : "private",
    note: repairedText(item.note, TEXT_LIMITS.note),
    photo: photo(item.photo),
  };
}

/** Parse unversioned/v1 state and return only the current v2 shape. */
export function parsePersistedState(value: unknown): ParsedPersistedState {
  const raw = record(value);
  if (!raw) throw new Error("Stored state is not an object");
  if (
    raw.version !== undefined &&
    raw.version !== 1 &&
    raw.version !== PERSISTENCE_VERSION
  ) {
    throw new Error("Stored state was created by a newer Matinee version");
  }

  const parsedProfile = profile(raw.profile);
  if (!parsedProfile || !Array.isArray(raw.alerts) || !Array.isArray(raw.saved)) {
    throw new Error("Stored state is missing required fields");
  }

  const alerts = raw.alerts.slice(0, 100).flatMap((value) => {
    const item = record(value);
    const id = text(item?.id, 180);
    const slug = text(item?.slug, 100);
    return id && slug ? [{ id, slug, enabled: item?.enabled !== false }] : [];
  });
  const portableDiary = Array.isArray(raw.diary)
    ? raw.diary.slice(0, 500).flatMap((value) => diaryEntry(value) ?? [])
    : [];
  const legacyPhotos = new Map<string, string>();
  for (const entry of portableDiary) {
    if (entry.photo) legacyPhotos.set(entry.id, entry.photo);
  }

  return {
    state: {
      version: PERSISTENCE_VERSION,
      alerts,
      saved: stringList(raw.saved),
      ranking: stringList(raw.ranking ?? raw.topTen),
      attendedExtra: stringList(raw.attendedExtra),
      attendedHidden: stringList(raw.attendedHidden),
      profile: parsedProfile,
      diary: portableDiary.map((entry) => ({
        id: entry.id,
        slug: entry.slug,
        loggedAt: entry.loggedAt,
        performanceDate: entry.performanceDate,
        seat: entry.seat,
        sentiment: entry.sentiment,
        thoughts: entry.thoughts,
        tags: entry.tags,
        visibility: entry.visibility,
        note: entry.note,
      })),
    },
    legacyPhotos,
  };
}

/** Keep unreadable state intact, even if the user edits the fallback session.
 * A failed read blocks writes for the lifetime of this storage session. */
export function createPersistedStateStorage(
  storage: Pick<Storage, "getItem" | "setItem">,
) {
  let readSucceeded = false;
  const backedUp = new Map<string, string>();
  const storedValue = () => {
    const current = storage.getItem(STORAGE_KEY);
    return current !== null
      ? { key: STORAGE_KEY, raw: current }
      : { key: LEGACY_STORAGE_KEY, raw: storage.getItem(LEGACY_STORAGE_KEY) };
  };

  return {
    read(): ParsedPersistedState | null {
      readSucceeded = false;
      const { raw } = storedValue();
      const parsed = raw === null ? null : parsePersistedState(JSON.parse(raw));
      readSucceeded = true;
      return parsed;
    },
    write(state: PersistedState, now = new Date()): boolean {
      const { key, raw } = storedValue();
      let unreadable = !readSucceeded;
      if (raw !== null && !unreadable) {
        try {
          parsePersistedState(JSON.parse(raw));
        } catch {
          unreadable = true;
          readSucceeded = false;
        }
      }
      if (unreadable) {
        if (raw !== null && backedUp.get(key) !== raw) {
          storage.setItem(`${key}-backup-${now.toISOString()}`, raw);
          backedUp.set(key, raw);
        }
        return false;
      }
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    },
  };
}

/** Accept current backups plus the versionless export shipped before v2. */
export function parseDiaryBackup(value: unknown): ParsedDiaryBackup {
  const raw = record(value);
  if (!raw || !Array.isArray(raw.diary)) {
    throw new Error("This is not a Matinee diary backup");
  }
  if (raw.format !== undefined && raw.format !== BACKUP_FORMAT) {
    throw new Error("This backup belongs to another application");
  }
  if (
    typeof raw.version === "number" &&
    raw.version > PERSISTENCE_VERSION
  ) {
    throw new Error("This backup needs a newer version of Matinee");
  }

  const entries = raw.diary
    .slice(0, 500)
    .flatMap((value) => diaryEntry(value) ?? []);
  return {
    entries,
    profile: profile(raw.profile),
    skipped: raw.diary.length - entries.length,
  };
}
