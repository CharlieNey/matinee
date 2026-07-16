import { Show, show } from "./shows";

export type Listing = {
  id: string;
  show: Show;
  seat: string;
  price: number;
  /** Number of tickets in the listing. */
  qty: number;
  /** Date bucket used by the Date & Time filter. */
  when: "Tonight" | "This week" | "This weekend";
  /** Concrete performance time used by the ticket-detail screen. */
  performanceAt?: string;
  sold?: { minutes: number };
  postedAgo: string;
  seller: {
    initial: string;
    color: string;
    name?: string;
    note?: string;
  };
  acceptsOffers?: boolean;
  handoff?: string;
};

/** Live tickets on the Marketplace tab. */
export const marketplaceListings: Listing[] = [
  {
    id: "l1",
    show: show("maybe-happy-ending"),
    seat: "Center ORCH / Row F",
    price: 89,
    qty: 2,
    when: "Tonight",
    performanceAt: "2026-07-15T19:00:00-04:00",
    postedAgo: "Just now",
    seller: {
      initial: "S",
      color: "#3b6ea5",
      name: "Sophie",
      note: "Can no longer make it — hoping these find a good home.",
    },
    acceptsOffers: true,
    handoff: "Via original platform (Transfer right away)",
  },
  {
    id: "l2",
    show: show("heathers"),
    seat: "Center ORCH / Row C",
    price: 42,
    qty: 1,
    when: "This week",
    performanceAt: "2026-07-17T19:30:00-04:00",
    postedAgo: "12m ago",
    seller: { initial: "M", color: "#7a4a9e", name: "Maya" },
    acceptsOffers: true,
    handoff: "Via original platform (Transfer right away)",
  },
  {
    id: "l3",
    show: show("oh-mary"),
    seat: "Right MEZZ / Row B",
    price: 65,
    qty: 2,
    when: "This weekend",
    performanceAt: "2026-07-18T20:00:00-04:00",
    postedAgo: "34m ago",
    seller: {
      initial: "J",
      color: "#2e7d5b",
      name: "Jordan",
      note: "Bought an extra pair by mistake.",
    },
    acceptsOffers: true,
    handoff: "Via original platform (Transfer right away)",
  },
  {
    id: "l4",
    show: show("ragtime"),
    seat: "Left ORCH / Row J",
    price: 74,
    qty: 4,
    when: "This week",
    performanceAt: "2026-07-16T19:00:00-04:00",
    postedAgo: "1h ago",
    seller: { initial: "A", color: "#b3541e", name: "Alex" },
    acceptsOffers: false,
    handoff: "Via original platform (Transfer right away)",
  },
  {
    id: "l5",
    show: show("chess"),
    seat: "Center MEZZ / Row A",
    price: 95,
    qty: 2,
    when: "Tonight",
    performanceAt: "2026-07-15T19:30:00-04:00",
    postedAgo: "2h ago",
    seller: { initial: "K", color: "#4a5568", name: "Kai" },
    acceptsOffers: true,
    handoff: "Via original platform (Transfer right away)",
  },
  {
    id: "l6",
    show: show("operation-mincemeat"),
    seat: "Right ORCH / Row H",
    price: 58,
    qty: 3,
    when: "This weekend",
    performanceAt: "2026-07-19T15:00:00-04:00",
    postedAgo: "3h ago",
    seller: {
      initial: "D",
      color: "#8a2e43",
      name: "Devon",
      note: "Will transfer as soon as payment clears.",
    },
    acceptsOffers: true,
    handoff: "Via original platform (Transfer right away)",
  },
];

/** Recently sold — social proof grid on show listing pages. */
export const soldListings: Listing[] = [
  {
    id: "s1",
    show: show("the-outsiders"),
    seat: "Left MEZZ / Row D",
    price: 49,
    qty: 2,
    when: "This week",
    performanceAt: "2026-07-17T19:00:00-04:00",
    sold: { minutes: 5 },
    postedAgo: "Just now",
    seller: { initial: "T", color: "#a83232" },
  },
  {
    id: "s2",
    show: show("the-outsiders"),
    seat: "Center ORCH / Row R",
    price: 59,
    qty: 1,
    when: "Tonight",
    performanceAt: "2026-07-15T19:30:00-04:00",
    sold: { minutes: 3 },
    postedAgo: "1h ago",
    seller: { initial: "R", color: "#4a5568" },
  },
  {
    id: "s3",
    show: show("the-outsiders"),
    seat: "Right MEZZ / Row A",
    price: 55,
    qty: 2,
    when: "This weekend",
    performanceAt: "2026-07-18T14:00:00-04:00",
    sold: { minutes: 11 },
    postedAgo: "2h ago",
    seller: { initial: "P", color: "#2e5b7d" },
  },
  {
    id: "s4",
    show: show("heathers"),
    seat: "Center ORCH / Row E",
    price: 45,
    qty: 2,
    when: "This week",
    performanceAt: "2026-07-16T20:00:00-04:00",
    sold: { minutes: 8 },
    postedAgo: "3h ago",
    seller: { initial: "L", color: "#6e4a2e" },
  },
];

export type NotifyAlert = {
  id: string;
  show: Show;
  maxPrice: number;
  enabled: boolean;
};

export function alertCriteria(alert: NotifyAlert): string {
  return `Under $${alert.maxPrice}, Anytime, Any quantity, Any seat...`;
}

export const notifyMatches = 16;

export const notifyAlerts: NotifyAlert[] = [
  {
    id: "n1",
    show: show("the-lost-boys"),
    maxPrice: 49,
    enabled: true,
  },
  {
    id: "n2",
    show: show("oh-mary"),
    maxPrice: 60,
    enabled: true,
  },
  {
    id: "n3",
    show: show("the-book-of-mormon"),
    maxPrice: 51,
    enabled: true,
  },
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
  { kind: "milestone", text: "First day on Theatr! 🎉" },
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
