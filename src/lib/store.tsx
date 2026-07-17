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
  /** Personal ranking slugs, best-first. Optional; `topTen` is the pre-rename
   *  key, read once for back-compat. */
  ranking?: string[];
  topTen?: string[];
  /** Shows marked attended directly (search-and-add on the Collection page),
   *  separate from diary entries. `attendedHidden` removes shows from the
   *  attended list regardless of source (added extra, seed, or diary). */
  attendedExtra?: string[];
  attendedHidden?: string[];
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
  const [ranking, setRankingState] = useState<string[]>(initialRanking);
  // Shows added to / removed from Attended via the Collection page, kept apart
  // from the diary so the rich log flow stays the source of truth for entries.
  const [attendedExtra, setAttendedExtra] = useState<Set<string>>(
    () => new Set(),
  );
  const [attendedHidden, setAttendedHidden] = useState<Set<string>>(
    () => new Set(),
  );
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
          const persistedRanking = data.ranking ?? data.topTen;
          if (persistedRanking)
            setRankingState([...new Set(persistedRanking)]);
          if (data.attendedExtra)
            setAttendedExtra(new Set(data.attendedExtra));
          if (data.attendedHidden)
            setAttendedHidden(new Set(data.attendedHidden));
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
      ranking,
      attendedExtra: [...attendedExtra],
      attendedHidden: [...attendedHidden],
      profile,
      diary: diary.map(({ show, ...rest }) => ({ ...rest, slug: show.slug })),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full/unavailable: state stays session-only
    }
  }, [follows, saved, ranking, attendedExtra, attendedHidden, profile, diary]);

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
