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
  Listing,
  NotifyAlert,
  notifyAlerts as initialAlerts,
  notifyMatches,
  profile as initialProfile,
} from "./data";
import { getShow, Show } from "./shows";

const STORAGE_KEY = "theatr-state-v1";

/** Shows are persisted as slugs and rehydrated, so stale saved data can
 *  never render a broken poster after the catalog changes. */
type PersistedState = {
  alerts: { id: string; slug: string; maxPrice: number; enabled: boolean }[];
  listings: {
    id: string;
    slug: string;
    seat: string;
    price: number;
    qty: number;
    when: Listing["when"];
    postedAgo: string;
    seller: Listing["seller"];
    /** Optional so saved state from before the pipeline still loads. */
    status?: ListingStatus;
  }[];
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

export type ListingStatus = "listed" | "sold" | "paid";

/** A listing the user posted — carries its seller-pipeline status. */
export type UserListing = Listing & { status: ListingStatus };

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
  /* Notify */
  alerts: NotifyAlert[];
  matches: number;
  addAlert: (show: Show, maxPrice: number) => void;
  updateAlert: (id: string, maxPrice: number) => void;
  removeAlert: (id: string) => NotifyAlert | undefined;
  restoreAlert: (alert: NotifyAlert, index: number) => void;

  /* Selling */
  userListings: UserListing[];
  addUserListing: (listing: Omit<Listing, "id" | "seller">) => void;
  /** Moves a listing listed→sold→paid; no-op once paid. */
  advanceListing: (id: string) => void;
  /** Sum of price × qty across paid listings. */
  walletBalance: number;

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
  const [alerts, setAlerts] = useState<NotifyAlert[]>(initialAlerts);
  const [userListings, setUserListings] = useState<UserListing[]>([]);
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
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data: PersistedState = JSON.parse(raw);
          setAlerts(
            data.alerts.flatMap((a) => {
              const s = getShow(a.slug);
              return s
                ? [{ id: a.id, show: s, maxPrice: a.maxPrice, enabled: a.enabled }]
                : [];
            }),
          );
          setUserListings(
            data.listings.flatMap((l) => {
              const s = getShow(l.slug);
              return s
                ? [{ ...l, show: s, status: l.status ?? "listed" }]
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
      alerts: alerts.map((a) => ({
        id: a.id,
        slug: a.show.slug,
        maxPrice: a.maxPrice,
        enabled: a.enabled,
      })),
      listings: userListings.map(({ show, ...rest }) => ({
        ...rest,
        slug: show.slug,
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
  }, [alerts, userListings, saved, profile, diary]);

  const addAlert = useCallback((show: Show, maxPrice: number) => {
    setAlerts((prev) => [
      ...prev,
      { id: `n-new-${nextId++}`, show, maxPrice, enabled: true },
    ]);
  }, []);

  const updateAlert = useCallback((id: string, maxPrice: number) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, maxPrice } : a)),
    );
  }, []);

  const removeAlert = useCallback(
    (id: string) => {
      const removed = alerts.find((a) => a.id === id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      return removed;
    },
    [alerts],
  );

  const restoreAlert = useCallback((alert: NotifyAlert, index: number) => {
    setAlerts((prev) => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, alert);
      return next;
    });
  }, []);

  const addUserListing = useCallback(
    (listing: Omit<Listing, "id" | "seller">) => {
      setUserListings((prev) => [
        {
          ...listing,
          id: `u-${nextId++}`,
          seller: { initial: profile.name[0] ?? "C", color: "#2563ab" },
          status: "listed" as const,
        },
        ...prev,
      ]);
    },
    [profile.name],
  );

  const advanceListing = useCallback((id: string) => {
    setUserListings((prev) =>
      prev.map((l) =>
        l.id === id && l.status !== "paid"
          ? { ...l, status: l.status === "listed" ? "sold" : "paid" }
          : l,
      ),
    );
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

  const walletBalance = useMemo(
    () =>
      userListings.reduce(
        (sum, l) => (l.status === "paid" ? sum + l.price * l.qty : sum),
        0,
      ),
    [userListings],
  );

  const value = useMemo<AppState>(
    () => ({
      alerts,
      // each alert watches ~5 live listings in this prototype
      matches: Math.max(0, notifyMatches + (alerts.length - 3) * 5),
      addAlert,
      updateAlert,
      removeAlert,
      restoreAlert,
      userListings,
      addUserListing,
      advanceListing,
      walletBalance,
      isSaved,
      toggleSaved,
      savedShows,
      diary,
      addDiaryEntry,
      profile,
      updateProfile,
    }),
    [
      alerts,
      addAlert,
      updateAlert,
      removeAlert,
      restoreAlert,
      userListings,
      addUserListing,
      advanceListing,
      walletBalance,
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
