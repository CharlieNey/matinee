export type OfficialTicketProvider =
  | "Telecharge"
  | "Broadway Direct"
  | "ATG Tickets"
  | "Criterion Ticketing"
  | "Roundabout Theatre Company";

export type OfficialTicketLink = {
  showSlug: string;
  provider: OfficialTicketProvider;
  url: string;
  lastVerified: string;
};

const VERIFIED = "2026-07-15";

/**
 * Official primary-sale destinations for the current Broadway slate.
 * Verified against Playbill's Broadway production directory. URLs point
 * directly to the ticketing provider with affiliate/tracking parameters
 * removed. This is curated data and intentionally performs no live fetches.
 */
const OFFICIAL_TICKETS: readonly OfficialTicketLink[] = [
  {
    showSlug: "the-great-gatsby",
    provider: "Telecharge",
    url: "https://www.telecharge.com/The-Great-Gatsby-tickets",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "aladdin",
    provider: "Broadway Direct",
    url: "https://tickets.broadwaydirect.com/shop/tickets/series/527646",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "operation-mincemeat",
    provider: "Telecharge",
    url: "https://www.telecharge.com/Operation-Mincemeat-tickets",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "just-in-time",
    provider: "Telecharge",
    url: "https://www.telecharge.com/Just-In-Time-tickets",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "moulin-rouge",
    provider: "ATG Tickets",
    url: "https://us.atgtickets.com/events/moulin-rouge-the-musical/al-hirschfeld-theatre/calendar",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "the-lion-king",
    provider: "Broadway Direct",
    url: "https://tickets.broadwaydirect.com/shop/tickets/series/546654",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "six",
    provider: "Broadway Direct",
    url: "https://tickets.broadwaydirect.com/shop/tickets/series/719897",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "two-strangers",
    provider: "Telecharge",
    url: "https://www.telecharge.com/Two-Strangers-Carry-a-Cake-Across-New-York-tickets",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "wicked",
    provider: "Broadway Direct",
    url: "https://tickets.broadwaydirect.com/shop/tickets/series/942533",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "hadestown",
    provider: "ATG Tickets",
    url: "https://us.atgtickets.com/events/hadestown/walter-kerr-theatre/calendar/",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "harry-potter-cursed-child",
    provider: "ATG Tickets",
    url: "https://us.atgtickets.com/events/harry-potter-and-the-cursed-child/lyric-broadway/calendar",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "the-lost-boys",
    provider: "Broadway Direct",
    url: "https://tickets.broadwaydirect.com/shop/tickets/series/843567",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "oh-mary",
    provider: "Telecharge",
    url: "https://www.telecharge.com/Oh-Mary-tickets",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "cats-jellicle-ball",
    provider: "Telecharge",
    url: "https://www.telecharge.com/CATS-tickets",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "the-book-of-mormon",
    provider: "ATG Tickets",
    url: "https://us.atgtickets.com/events/the-book-of-mormon/eugene-oneill-theatre/calendar",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "rocky-horror-show",
    provider: "Roundabout Theatre Company",
    url: "https://www.roundabouttheatre.org/production/2025-2026-season/richard-o-brien-s-the-rocky-horror-show/",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "stranger-things-first-shadow",
    provider: "Broadway Direct",
    url: "https://tickets.broadwaydirect.com/shop/tickets/series/787264",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "mj-the-musical",
    provider: "Broadway Direct",
    url: "https://tickets.broadwaydirect.com/shop/tickets/series/658436",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "and-juliet",
    provider: "Criterion Ticketing",
    url: "https://criterionticketing.com/and-juliet",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "death-of-a-salesman",
    provider: "Telecharge",
    url: "https://www.telecharge.com/Death-of-a-Salesman-tickets",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "schmigadoon",
    provider: "Broadway Direct",
    url: "https://tickets.broadwaydirect.com/shop/tickets/series/724644",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "every-brilliant-thing",
    provider: "ATG Tickets",
    url: "https://us.atgtickets.com/events/every-brilliant-thing/hudson-theatre-broadway/calendar",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "hamilton",
    provider: "Broadway Direct",
    url: "https://tickets.broadwaydirect.com/shop/tickets/series/426458",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "joe-turners-come-and-gone",
    provider: "Telecharge",
    url: "https://www.telecharge.com/Joe-Turners-Come-and-Gone-tickets",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "ragtime",
    provider: "Telecharge",
    url: "https://www.telecharge.com/Ragtime-tickets",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "chicago",
    provider: "Telecharge",
    url: "https://www.telecharge.com/Chicago-tickets",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "maybe-happy-ending",
    provider: "Telecharge",
    url: "https://www.telecharge.com/Maybe-Happy-Ending-tickets",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "the-outsiders",
    provider: "Telecharge",
    url: "https://www.telecharge.com/The-Outsiders-tickets",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "titanique",
    provider: "ATG Tickets",
    url: "https://us.atgtickets.com/events/titanique/st-james-theatre/calendar",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "proof",
    provider: "Telecharge",
    url: "https://www.telecharge.com/Proof-tickets",
    lastVerified: VERIFIED,
  },
  {
    showSlug: "buena-vista-social-club",
    provider: "Telecharge",
    url: "https://www.telecharge.com/Buena-Vista-Social-Club-tickets",
    lastVerified: VERIFIED,
  },
];

export function allOfficialTicketLinks(): readonly OfficialTicketLink[] {
  return OFFICIAL_TICKETS;
}

export function officialTicketsForShow(
  showSlug: string,
): OfficialTicketLink | undefined {
  return OFFICIAL_TICKETS.find((link) => link.showSlug === showSlug);
}
