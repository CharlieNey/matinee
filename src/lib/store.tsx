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
import { Watch, initialWatches, profile as initialProfile } from "./data";
import { getShow, Show } from "./shows";

const STORAGE_KEY = "matinee-state-v1";
/** Pre-rebrand key — read once so existing diaries survive the rename. */
const LEGACY_STORAGE_KEY = "theatr-state-v1";

/** Shows are persisted as slugs and rehydrated, so stale saved data can
 *  never render a broken poster after the catalog changes.
 *
 *  Marketplace-era blobs also carry `listings`, `purchases`, and a
 *  `maxPrice` per alert — all read-tolerated and dropped on the next write
 *  (Phase 14 retired the marketplace; the field name `alerts` survives for
 *  back-compat). */
type PersistedState = {
  alerts: { id: string; slug: string; enabled: boolean }[];
  saved: string[];
  profile: { name: string; handle: string; bio: string | null };
  diary?: {
    id: string;
    slug: string;
    loggedAt: string;
    seat: string;
    sentiment: DiaryEntry["sentiment"];
    thoughts: string | null;
    tags: string[];
    visibility: DiaryEntry["visibility"];
    note: string | null;
    /** Optional so saved state from before photos still loads. */
    photo?: string | null;
  }[];
};

type ProfileInfo = { name: string; handle: string; bio: string | null };

export type DiaryEntry = {
  id: string;
  show: Show;
  /** ISO timestamp of when the entry was published. */
  loggedAt: string;
  seat: string;
  sentiment: "recommend" | "mixed" | "disliked";
  thoughts: string | null;
  tags: string[];
  visibility: "public" | "private";
  note: string | null;
  /** Downscaled JPEG data URL so it survives localStorage. */
  photo: string | null;
};

type AppState = {
  /* Watches — followed shows; the push pipeline pings on their windows */
  watches: Watch[];
  isWatched: (slug: string) => boolean;
  toggleWatch: (show: Show) => void;
  removeWatch: (id: string) => Watch | undefined;
  restoreWatch: (watch: Watch, index: number) => void;

  /* Bookmarks */
  isSaved: (slug: string) => boolean;
  toggleSaved: (slug: string) => void;
  savedShows: Show[];

  /* Diary */
  diary: DiaryEntry[];
  addDiaryEntry: (entry: Omit<DiaryEntry, "id">) => void;

  /* Profile */
  profile: ProfileInfo;
  updateProfile: (patch: Partial<ProfileInfo>) => void;
};

const AppContext = createContext<AppState | null>(null);

let nextId = 1;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [watches, setWatches] = useState<Watch[]>(initialWatches);
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
  const hydrated = useRef(false);

  // Restore persisted state after mount (deferred so SSR markup matches).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        const raw =
          localStorage.getItem(STORAGE_KEY) ??
          localStorage.getItem(LEGACY_STORAGE_KEY);
        if (raw) {
          const data: PersistedState = JSON.parse(raw);
          setWatches(
            data.alerts.flatMap((a) => {
              const s = getShow(a.slug);
              return s
                ? [{ id: a.id, show: s, enabled: a.enabled ?? true }]
                : [];
            }),
          );
          setSaved(new Set(data.saved));
          setProfile(data.profile);
          setDiary(
            (data.diary ?? []).flatMap((d) => {
              const s = getShow(d.slug);
              return s ? [{ ...d, show: s, photo: d.photo ?? null }] : [];
            }),
          );
        }
      } catch {
        // corrupted state: fall back to defaults
      }
      hydrated.current = true;
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Persist on change (only once hydration has finished).
  useEffect(() => {
    if (!hydrated.current) return;
    const state: PersistedState = {
      alerts: watches.map((w) => ({
        id: w.id,
        slug: w.show.slug,
        enabled: w.enabled,
      })),
      saved: [...saved],
      profile,
      diary: diary.map(({ show, ...rest }) => ({ ...rest, slug: show.slug })),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full/unavailable: state stays session-only
    }
  }, [watches, saved, profile, diary]);

  const isWatched = useCallback(
    (slug: string) => watches.some((w) => w.show.slug === slug),
    [watches],
  );

  const toggleWatch = useCallback((show: Show) => {
    setWatches((prev) =>
      prev.some((w) => w.show.slug === show.slug)
        ? prev.filter((w) => w.show.slug !== show.slug)
        : [...prev, { id: `w-${nextId++}`, show, enabled: true }],
    );
  }, []);

  const removeWatch = useCallback(
    (id: string) => {
      const removed = watches.find((w) => w.id === id);
      setWatches((prev) => prev.filter((w) => w.id !== id));
      return removed;
    },
    [watches],
  );

  const restoreWatch = useCallback((watch: Watch, index: number) => {
    setWatches((prev) => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, watch);
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
    setDiary((prev) => [{ ...entry, id: `d-${nextId++}` }, ...prev]);
  }, []);

  const savedShows = useMemo(
    () => [...saved].flatMap((slug) => getShow(slug) ?? []),
    [saved],
  );

  const value = useMemo<AppState>(
    () => ({
      watches,
      isWatched,
      toggleWatch,
      removeWatch,
      restoreWatch,
      isSaved,
      toggleSaved,
      savedShows,
      diary,
      addDiaryEntry,
      profile,
      updateProfile,
    }),
    [
      watches,
      isWatched,
      toggleWatch,
      removeWatch,
      restoreWatch,
      isSaved,
      toggleSaved,
      savedShows,
      diary,
      addDiaryEntry,
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
