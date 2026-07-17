import { Show, show } from "./shows";

/** A followed show (Phase 14) — the push cron tracks its program windows. */
export type Follow = {
  id: string;
  show: Show;
  enabled: boolean;
};

export const initialFollows: Follow[] = [
  { id: "n1", show: show("the-lost-boys"), enabled: true },
  { id: "n2", show: show("oh-mary"), enabled: true },
  { id: "n3", show: show("the-book-of-mormon"), enabled: true },
];

export type ActivityEntry =
  | {
      kind: "event";
      date: string;
      yearMarker?: string;
      action: string;
      recommend?: boolean;
      shows: Show[];
      /** Public thoughts from a diary entry, quoted in the timeline. */
      thoughts?: string;
    }
  | { kind: "milestone"; text: string };

export const activityFeed: ActivityEntry[] = [
  {
    kind: "event",
    date: "Apr 26",
    action: "Marked as attended",
    recommend: true,
    shows: [show("operation-mincemeat")],
  },
  {
    kind: "event",
    date: "Apr 2",
    action: "Marked as attended",
    recommend: true,
    shows: [show("heathers")],
  },
  {
    kind: "event",
    date: "Dec 30",
    yearMarker: "2025",
    action: "Marked interested",
    shows: [show("heathers"), show("the-outsiders")],
  },
  {
    kind: "event",
    date: "Dec 24",
    action: "Marked interested",
    shows: [show("chess"), show("two-strangers")],
  },
  { kind: "milestone", text: "First day on Matinee! 🎉" },
];

export const profile = {
  name: "Charlie Ney",
  handle: "@Charlie_yfcn",
  bio: null as string | null,
  joined: "December 2025",
};

/** Seed order for the personal ranking — your attended shows, best first.
 *  Built/refined by the matchup flow in the Collection tab and persisted per
 *  user as slugs; this is only the starting order. Every slug here is one of
 *  the attended seed shows (you rank what you've seen). */
/** Seeded ranking — a *subset* of the attended seed on purpose: the two
 *  attended shows left off (Spelling Bee, The Gin Game) surface in the Rank
 *  sheet's "add a show" search, so the search → place-with-matchups flow works
 *  the moment you open it. */
export const initialRanking: string[] = [
  "death-of-a-salesman",
  "ragtime",
  "operation-mincemeat",
  "drunk-shakespeare",
];

/** Demo history — shows attended before the diary existed. */
export const attendedSeed: Show[] = [
  show("operation-mincemeat"),
  show("drunk-shakespeare"),
  show("spelling-bee"),
  show("the-gin-game"),
  show("ragtime"),
  show("death-of-a-salesman"),
];

/** THE attended list: diary entries first, then the seed history, deduped.
 *  Discover, the Collection tab, and Wrapped all count from here — no
 *  surface carries its own attended number. */
export function attendedShows(diaryShows: Show[]): Show[] {
  const seen = new Set<string>();
  const list: Show[] = [];
  for (const s of [...diaryShows, ...attendedSeed]) {
    if (!seen.has(s.slug)) {
      seen.add(s.slug);
      list.push(s);
    }
  }
  return list;
}
