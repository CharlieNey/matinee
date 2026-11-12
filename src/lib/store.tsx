"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Follow,
  attendedSeed,
  initialRanking,
  initialFollows,
  profile as initialProfile,
} from "./data";
import {
  clearDiaryPhotos,
  deleteDiaryPhoto,
  readDiaryPhotos,
  replaceDiaryPhotos,
  writeDiaryPhoto,
} from "./diaryPhotos";
import {
  createPersistedStateStorage,
  PERSISTENCE_VERSION,
  PersistedState,
} from "./persistence";
import { getShow, Show } from "./shows";

type ProfileInfo = { name: string; handle: string; bio: string | null };

export type DiaryEntry = {
  id: string;
  show: Show;
  /** ISO timestamp of when the entry was published. */
  loggedAt: string;
  /** Calendar day of the performance, YYYY-MM-DD. */
  performanceDate: string;
  seat: string;
  sentiment: "recommend" | "mixed" | "disliked";
  thoughts: string | null;
  tags: string[];
  visibility: "public" | "private";
  note: string | null;
  /** Downscaled JPEG data URL, loaded from IndexedDB. */
  photo: string | null;
};

type AppState = {
  /* Follows — followed shows; the push pipeline pings on their windows */
  follows: Follow[];
  toggleFollow: (show: Show) => void;
  setFollowEnabled: (id: string, enabled: boolean) => void;
  removeFollow: (id: string) => Follow | undefined;
  restoreFollow: (follow: Follow, index: number) => void;

  /* Interested — the bookmark state, "Interested" everywhere in the UI */
  isSaved: (slug: string) => boolean;
  toggleSaved: (slug: string) => void;
  savedShows: Show[];

  /* Diary */
  diary: DiaryEntry[];
  addDiaryEntry: (entry: Omit<DiaryEntry, "id">) => void;
  updateDiaryEntry: (
    id: string,
    patch: Partial<Omit<DiaryEntry, "id" | "show" | "loggedAt">>,
  ) => void;
  removeDiaryEntry: (id: string) => DiaryEntry | undefined;
  restoreDiaryEntry: (entry: DiaryEntry) => void;
  clearDiary: () => void;
  restoreDiaryBackup: (
    entries: DiaryEntry[],
    mode: "merge" | "replace",
  ) => void;
  hydrated: boolean;
  persistenceError: boolean;

  /* Attended — diary + directly-marked shows + pre-app history, deduped,
     minus anything removed on the Collection page */
  attended: Show[];
  addAttended: (slug: string) => void;
  removeAttended: (slug: string) => void;

  /* Personal ranking — attended shows, best-first (Collection matchups) */
  rankedShows: Show[];
  setRanking: (slugs: string[]) => void;

  /* Profile */
  profile: ProfileInfo;
  updateProfile: (patch: Partial<ProfileInfo>) => void;
};

const AppContext = createContext<AppState | null>(null);

function makeId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${random ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [follows, setFollows] = useState<Follow[]>(initialFollows);
  // timeline shows start bookmarked, matching the reference screenshots
  const [saved, setSaved] = useState<Set<string>>(
    () =>
      new Set([
        "heathers",
        "the-outsiders",
        "chess",
        "two-strangers",
        "operation-mincemeat",
        "little-shop-of-horrors",
      ]),
  );
  const [profile, setProfile] = useState<ProfileInfo>({
    name: initialProfile.name,
    handle: initialProfile.handle,
    bio: initialProfile.bio,
  });
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [ranking, setRankingState] = useState<string[]>(initialRanking);
  // Shows added to / removed from Attended via the Collection page, kept apart
  // from the diary so the rich log flow stays the source of truth for entries.
  const [attendedExtra, setAttendedExtra] = useState<Set<string>>(
    () => new Set(),
  );
  const [attendedHidden, setAttendedHidden] = useState<Set<string>>(
    () => new Set(),
  );
  const storageRef = useRef<ReturnType<typeof createPersistedStateStorage> | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [metadataPersistenceError, setMetadataPersistenceError] =
    useState(false);
  const [photoPersistenceError, setPhotoPersistenceError] = useState(false);
  const persistenceError = metadataPersistenceError || photoPersistenceError;

  // Restore and validate persisted state after mount. Photos are migrated out
  // of legacy localStorage blobs and hydrated from IndexedDB before the diary
  // is marked ready.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      if (cancelled) return;
      try {
        storageRef.current = createPersistedStateStorage(localStorage);
        const parsed = storageRef.current.read();
        if (parsed) {
          const { state: data, legacyPhotos } = parsed;
          const seenFollows = new Set<string>();
          const nextFollows = data.alerts.flatMap((a) => {
            if (seenFollows.has(a.slug)) return [];
            const s = getShow(a.slug);
            if (!s) return [];
            seenFollows.add(a.slug);
            return [{ id: a.id, show: s, enabled: a.enabled ?? true }];
          });
          const nextDiary: DiaryEntry[] = data.diary.flatMap((entry) => {
            const show = getShow(entry.slug);
            return show
              ? [{ ...entry, show, photo: legacyPhotos.get(entry.id) ?? null }]
              : [];
          });

          try {
            await Promise.all(
              [...legacyPhotos].map(([id, value]) =>
                writeDiaryPhoto(id, value),
              ),
            );
            const storedPhotos = await readDiaryPhotos(
              nextDiary.map((entry) => entry.id),
            );
            for (const entry of nextDiary) {
              entry.photo = storedPhotos.get(entry.id) ?? entry.photo;
            }
          } catch {
            // Metadata remains usable. Surface a warning only when a legacy
            // photo actually needed migration and could otherwise be lost.
            if (legacyPhotos.size > 0) setPhotoPersistenceError(true);
          }

          if (cancelled) return;
          setFollows(nextFollows);
          setSaved(new Set(data.saved));
          setRankingState([...new Set(data.ranking)]);
          setAttendedExtra(new Set(data.attendedExtra));
          setAttendedHidden(new Set(data.attendedHidden));
          setProfile(data.profile);
          setDiary(nextDiary);
        }
      } catch {
        // Keep the session usable; the storage guard backs up unreadable data
        // and prevents this fallback session from overwriting it.
        setMetadataPersistenceError(true);
      }
      if (cancelled) return;
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on change (only once hydration has finished).
  useEffect(() => {
    if (!hydrated) return;
    const state: PersistedState = {
      version: PERSISTENCE_VERSION,
      alerts: follows.map((f) => ({
        id: f.id,
        slug: f.show.slug,
        enabled: f.enabled,
      })),
      saved: [...saved],
      ranking,
      attendedExtra: [...attendedExtra],
      attendedHidden: [...attendedHidden],
      profile,
      diary: diary.map((entry) => ({
        id: entry.id,
        slug: entry.show.slug,
        loggedAt: entry.loggedAt,
        performanceDate: entry.performanceDate,
        seat: entry.seat,
        sentiment: entry.sentiment,
        thoughts: entry.thoughts,
        tags: entry.tags,
        visibility: entry.visibility,
        note: entry.note,
      })),
    };
    try {
      const written = storageRef.current?.write(state) ?? false;
      queueMicrotask(() => setMetadataPersistenceError(!written));
    } catch {
      // Storage full/unavailable: state stays session-only and the profile
      // offers a JSON export so the diary is still recoverable.
      queueMicrotask(() => setMetadataPersistenceError(true));
    }
  }, [hydrated, follows, saved, ranking, attendedExtra, attendedHidden, profile, diary]);

  const trackPhotoWrite = useCallback((operation: Promise<void>) => {
    void operation.then(
      () => setPhotoPersistenceError(false),
      () => setPhotoPersistenceError(true),
    );
  }, []);

  const toggleFollow = useCallback((show: Show) => {
    setFollows((prev) =>
      prev.some((f) => f.show.slug === show.slug)
        ? prev.filter((f) => f.show.slug !== show.slug)
        : [...prev, { id: makeId("f"), show, enabled: true }],
    );
  }, []);

  const setFollowEnabled = useCallback((id: string, enabled: boolean) => {
    setFollows((prev) =>
      prev.map((follow) =>
        follow.id === id ? { ...follow, enabled } : follow,
      ),
    );
  }, []);

  const removeFollow = useCallback(
    (id: string) => {
      const removed = follows.find((f) => f.id === id);
      setFollows((prev) => prev.filter((f) => f.id !== id));
      return removed;
    },
    [follows],
  );

  const restoreFollow = useCallback((follow: Follow, index: number) => {
    setFollows((prev) => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, follow);
      return next;
    });
  }, []);

  const isSaved = useCallback((slug: string) => saved.has(slug), [saved]);

  const toggleSaved = useCallback((slug: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const updateProfile = useCallback((patch: Partial<ProfileInfo>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const addDiaryEntry = useCallback((entry: Omit<DiaryEntry, "id">) => {
    const id = makeId("d");
    setDiary((prev) => [{ ...entry, id }, ...prev]);
    if (entry.photo) trackPhotoWrite(writeDiaryPhoto(id, entry.photo));
  }, [trackPhotoWrite]);

  const updateDiaryEntry = useCallback(
    (
      id: string,
      patch: Partial<Omit<DiaryEntry, "id" | "show" | "loggedAt">>,
    ) => {
      setDiary((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
      );
      if ("photo" in patch) {
        trackPhotoWrite(writeDiaryPhoto(id, patch.photo ?? null));
      }
    },
    [trackPhotoWrite],
  );

  const removeDiaryEntry = useCallback(
    (id: string) => {
      const removed = diary.find((entry) => entry.id === id);
      setDiary((prev) => prev.filter((entry) => entry.id !== id));
      if (removed?.photo) {
        trackPhotoWrite(deleteDiaryPhoto(id));
      }
      return removed;
    },
    [diary, trackPhotoWrite],
  );

  const restoreDiaryEntry = useCallback((entry: DiaryEntry) => {
    setDiary((prev) =>
      prev.some((item) => item.id === entry.id) ? prev : [entry, ...prev],
    );
    if (entry.photo) trackPhotoWrite(writeDiaryPhoto(entry.id, entry.photo));
  }, [trackPhotoWrite]);

  const clearDiary = useCallback(() => {
    setDiary([]);
    trackPhotoWrite(clearDiaryPhotos());
  }, [trackPhotoWrite]);

  const restoreDiaryBackup = useCallback(
    (entries: DiaryEntry[], mode: "merge" | "replace") => {
      if (mode === "replace") {
        setDiary(entries);
        trackPhotoWrite(replaceDiaryPhotos(entries));
        return;
      }
      setDiary((current) => {
        const byId = new Map(current.map((entry) => [entry.id, entry]));
        for (const entry of entries) byId.set(entry.id, entry);
        return [...byId.values()];
      });
      trackPhotoWrite(
        Promise.all(
          entries.map((entry) => writeDiaryPhoto(entry.id, entry.photo)),
        ).then(() => undefined),
      );
    },
    [trackPhotoWrite],
  );

  const savedShows = useMemo(
    () => [...saved].flatMap((slug) => getShow(slug) ?? []),
    [saved],
  );

  const addAttended = useCallback((slug: string) => {
    setAttendedExtra((prev) => {
      if (prev.has(slug)) return prev;
      return new Set(prev).add(slug);
    });
    setAttendedHidden((prev) => {
      if (!prev.has(slug)) return prev;
      const next = new Set(prev);
      next.delete(slug);
      return next;
    });
  }, []);

  // Remove works for any source: extra picks drop out, seed/diary shows are
  // hidden. Re-adding through search clears the hide.
  const removeAttended = useCallback((slug: string) => {
    setAttendedExtra((prev) => {
      if (!prev.has(slug)) return prev;
      const next = new Set(prev);
      next.delete(slug);
      return next;
    });
    setAttendedHidden((prev) => {
      if (prev.has(slug)) return prev;
      return new Set(prev).add(slug);
    });
  }, []);

  // Diary first (newest logs), then directly-marked shows (newest add first),
  // then the seed history — deduped, with anything removed filtered out.
  const attended = useMemo(() => {
    const extraShows = [...attendedExtra]
      .reverse()
      .flatMap((slug) => getShow(slug) ?? []);
    const seen = new Set<string>();
    const list: Show[] = [];
    for (const s of [
      ...diary.map((entry) => entry.show),
      ...extraShows,
      ...attendedSeed,
    ]) {
      if (attendedHidden.has(s.slug) || seen.has(s.slug)) continue;
      seen.add(s.slug);
      list.push(s);
    }
    return list;
  }, [diary, attendedExtra, attendedHidden]);

  const setRanking = useCallback((slugs: string[]) => {
    setRankingState([...new Set(slugs)]);
  }, []);

  const rankedShows = useMemo(
    () => ranking.flatMap((slug) => getShow(slug) ?? []),
    [ranking],
  );

  const value = useMemo<AppState>(
    () => ({
      follows,
      toggleFollow,
      setFollowEnabled,
      removeFollow,
      restoreFollow,
      isSaved,
      toggleSaved,
      savedShows,
      diary,
      addDiaryEntry,
      updateDiaryEntry,
      removeDiaryEntry,
      restoreDiaryEntry,
      clearDiary,
      restoreDiaryBackup,
      hydrated,
      persistenceError,
      attended,
      addAttended,
      removeAttended,
      rankedShows,
      setRanking,
      profile,
      updateProfile,
    }),
    [
      follows,
      toggleFollow,
      setFollowEnabled,
      removeFollow,
      restoreFollow,
      isSaved,
      toggleSaved,
      savedShows,
      diary,
      addDiaryEntry,
      updateDiaryEntry,
      removeDiaryEntry,
      restoreDiaryEntry,
      clearDiary,
      restoreDiaryBackup,
      hydrated,
      persistenceError,
      attended,
      addAttended,
      removeAttended,
      rankedShows,
      setRanking,
      profile,
      updateProfile,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
