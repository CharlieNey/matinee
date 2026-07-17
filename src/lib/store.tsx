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
  attendedShows,
  initialTopTen,
  initialFollows,
  profile as initialProfile,
} from "./data";
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
  /** "My Top 10" slugs, in shelf order. Optional: pre-editor blobs. */
  topTen?: string[];
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

  /* Attended — diary + pre-app history, deduped (see attendedShows) */
  attended: Show[];

  /* My Top 10 — user-curated shelf, in order */
  topTenShows: Show[];
  setTopTen: (slugs: string[]) => void;

  /* Profile */
  profile: ProfileInfo;
  updateProfile: (patch: Partial<ProfileInfo>) => void;
};

const AppContext = createContext<AppState | null>(null);

let nextId = 1;

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
  const [topTen, setTopTenState] = useState<string[]>(initialTopTen);
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
          const seenFollows = new Set<string>();
          setFollows(
            data.alerts.flatMap((a) => {
              if (seenFollows.has(a.slug)) return [];
              const s = getShow(a.slug);
              if (!s) return [];
              seenFollows.add(a.slug);
              return [{ id: a.id, show: s, enabled: a.enabled ?? true }];
            }),
          );
          setSaved(new Set(data.saved));
          if (data.topTen) setTopTenState([...new Set(data.topTen)].slice(0, 10));
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
      alerts: follows.map((f) => ({
        id: f.id,
        slug: f.show.slug,
        enabled: f.enabled,
      })),
      saved: [...saved],
      topTen,
      profile,
      diary: diary.map(({ show, ...rest }) => ({ ...rest, slug: show.slug })),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full/unavailable: state stays session-only
    }
  }, [follows, saved, topTen, profile, diary]);

  const toggleFollow = useCallback((show: Show) => {
    setFollows((prev) =>
      prev.some((f) => f.show.slug === show.slug)
        ? prev.filter((f) => f.show.slug !== show.slug)
        : [...prev, { id: `f-${nextId++}`, show, enabled: true }],
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
    setDiary((prev) => [{ ...entry, id: `d-${nextId++}` }, ...prev]);
  }, []);

  const savedShows = useMemo(
    () => [...saved].flatMap((slug) => getShow(slug) ?? []),
    [saved],
  );

  const attended = useMemo(
    () => attendedShows(diary.map((entry) => entry.show)),
    [diary],
  );

  const setTopTen = useCallback((slugs: string[]) => {
    setTopTenState([...new Set(slugs)].slice(0, 10));
  }, []);

  const topTenShows = useMemo(
    () => topTen.flatMap((slug) => getShow(slug) ?? []),
    [topTen],
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
      attended,
      topTenShows,
      setTopTen,
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
      attended,
      topTenShows,
      setTopTen,
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
