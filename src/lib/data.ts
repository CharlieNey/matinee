import { Show, show } from "./shows";

/** A followed show (Phase 14) — the push cron watches its program windows. */
export type Watch = {
  id: string;
  show: Show;
  enabled: boolean;
};

export const initialWatches: Watch[] = [
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
  following: 1,
  followers: 1,
  likes: 0,
  points: 39,
  bio: null as string | null,
  joined: "December 2025",
};

export const collection = {
  topTen: [
    show("death-of-a-salesman"),
    show("maybe-happy-ending"),
    show("ragtime"),
    show("little-shop-of-horrors"),
    show("hadestown"),
    show("operation-mincemeat"),
  ],
  interested: { count: 10, cover: show("the-play-that-goes-wrong") },
  attended: { count: 20, cover: show("drunk-shakespeare") },
  attendedRecent: [
    show("operation-mincemeat"),
    show("drunk-shakespeare"),
    show("spelling-bee"),
    show("the-gin-game"),
    show("ragtime"),
    show("death-of-a-salesman"),
  ],
};
