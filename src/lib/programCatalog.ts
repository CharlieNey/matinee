/**
 * The curated catalog: every rush, lottery and standing-room row, with the
 * builders that stamp each one. Edit this file to change the data; the
 * schedule engine that reads it is programs.ts.
 */
import type {
  Program,
  ProgramKind,
  ProgramPlatform,
  ProgramSchedule,
  Weekday,
} from "@/lib/programs";

const TIMEZONE = "America/New_York" as const;

/**
 * Date of the latest full catalog check. Builders stamp it on every program;
 * rows that could not be re-verified pin their older date explicitly so the
 * per-row staleness note (and /api/health) stays honest.
 */
export const LAST_VERIFIED = "2026-11-20";
const MONDAY_TO_FRIDAY: readonly Weekday[] = [1, 2, 3, 4, 5];
const MONDAY_TO_SATURDAY: readonly Weekday[] = [1, 2, 3, 4, 5, 6];
const TUESDAY_TO_SATURDAY: readonly Weekday[] = [2, 3, 4, 5, 6];
const PERFORMANCE_DAYS: readonly Weekday[] = [0, 2, 3, 4, 5, 6];

function program(
  showSlug: string,
  kind: ProgramKind,
  platform: ProgramPlatform,
  price: number,
  maxTickets: number,
  entryUrl: string,
  schedule: ProgramSchedule,
  options: Pick<Program, "name" | "notes" | "claimWindow" | "tips"> = {},
): Program {
  return {
    showSlug,
    kind,
    platform,
    price,
    maxTickets,
    entryUrl,
    schedule,
    lastVerified: LAST_VERIFIED,
    ...options,
  };
}

function dailyWindow(
  summary: string,
  opensAt: string,
  closesAt: string,
  days: readonly Weekday[] = MONDAY_TO_SATURDAY,
  whileSuppliesLast = false,
): ProgramSchedule {
  return {
    timezone: TIMEZONE,
    summary,
    windows: [{ days, opensAt, closesAt, whileSuppliesLast }],
  };
}

function telechargeLottery(
  showSlug: string,
  price = 49,
  maxTickets = 2,
): Program {
  return program(
    showSlug,
    "digital-lottery",
    "telecharge",
    price,
    maxTickets,
    "https://rush.telecharge.com/",
    dailyWindow(
      "Midnight–3 PM the day before a performance",
      "00:00",
      "15:00",
    ),
    {
      notes: "Winners are drawn at 10 AM and 3 PM.",
      claimWindow: {
        minutes: 300,
        channel: "email",
        notifiedAround: "shortly after the 10 AM and 3 PM drawings",
      },
      tips: [
        "Telecharge lotteries require a US phone number for verification — international visitors should set one up before entering.",
      ],
    },
  );
}

function telechargeDigitalRush(showSlug: string, price = 49): Program {
  return program(
    showSlug,
    "digital-rush",
    "telecharge",
    price,
    2,
    "https://rush.telecharge.com/",
    dailyWindow(
      "Opens at 11 AM on performance days",
      "11:00",
      "20:00",
      PERFORMANCE_DAYS,
      true,
    ),
    { notes: "Subject to same-day availability." },
  );
}

function luckySeatLottery(
  showSlug: string,
  price: number,
  entryUrl: string,
  closesAt = "09:30",
): Program {
  return program(
    showSlug,
    "digital-lottery",
    "lucky-seat",
    price,
    2,
    entryUrl,
    dailyWindow(
      `Enter by ${formatTime(closesAt)} the day before; Friday for weekend shows`,
      "00:00",
      closesAt,
      MONDAY_TO_FRIDAY,
    ),
    {
      // No claim length: no source states one (2026-11-20); Other Desert
      // Cities' official page says only "a limited window".
      notes:
        "Winners are selected after entries close and have a limited window to buy.",
      tips: [
        "Lucky Seat occasionally switches winners to box-office pickup — bring the ID you entered with.",
      ],
    },
  );
}

function broadwayDirectLottery(
  showSlug: string,
  price: number,
  entryUrl: string,
  opensAt: string,
  closesAt: string,
): Program {
  return program(
    showSlug,
    "digital-lottery",
    "broadway-direct",
    price,
    2,
    entryUrl,
    dailyWindow(
      `${formatTime(opensAt)}–${formatTime(closesAt)} the day before a performance`,
      opensAt,
      closesAt,
    ),
    {
      notes: "Winners have 60 minutes to purchase.",
      claimWindow: {
        minutes: 60,
        channel: "email",
        notifiedAround: "shortly after the window closes",
      },
      // No blanket opening-time tip: each show sets its own window (Wicked's
      // official page, 2026-11-12: "open the day before at 9am and close the
      // day before at 3PM"), and a 12:01 AM tip contradicted them.
    },
  );
}

function boxOfficeSchedule(
  startDay: "monday" | "tuesday" = "monday",
  sundayOpensAt = "12:00",
): ProgramSchedule {
  return {
    timezone: TIMEZONE,
    summary: "From box-office opening until sold out",
    windows: [
      {
        days:
          startDay === "monday" ? MONDAY_TO_SATURDAY : TUESDAY_TO_SATURDAY,
        opensAt: "10:00",
        closesAt: "20:00",
        whileSuppliesLast: true,
      },
      {
        days: [0],
        opensAt: sundayOpensAt,
        closesAt: "18:00",
        whileSuppliesLast: true,
      },
    ],
  };
}

function boxOfficeUrl(venue: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue} box office NYC`)}`;
}

function boxOfficeProgram(
  showSlug: string,
  kind: Extract<ProgramKind, "rush" | "student-rush" | "sro">,
  price: number,
  venue: string,
  maxTickets = 2,
  options: {
    startDay?: "monday" | "tuesday";
    sundayOpensAt?: string;
    notes?: string;
  } = {},
): Program {
  const defaultNotes =
    kind === "sro"
      ? "Available only when the performance is sold out."
      : kind === "student-rush"
        ? "Valid student ID required; subject to availability."
        : "Subject to same-day availability.";

  return program(
    showSlug,
    kind,
    "box-office",
    price,
    maxTickets,
    boxOfficeUrl(venue),
    boxOfficeSchedule(options.startDay, options.sundayOpensAt),
    { notes: options.notes ?? defaultNotes },
  );
}

function todayTixRush(
  showSlug: string,
  price: number,
  entryUrl: string,
): Program {
  return program(
    showSlug,
    "digital-rush",
    "todaytix",
    price,
    2,
    entryUrl,
    dailyWindow(
      "Unlocks in the TodayTix app at 9 AM",
      "09:00",
      "20:00",
      PERFORMANCE_DAYS,
      true,
    ),
    {
      notes: "First come, first served in the TodayTix app.",
      tips: [
        "If TodayTix says all tickets are being held, those are pending carts that can time out — keep trying for a few minutes.",
      ],
    },
  );
}

/**
 * Sources, re-checked 2026-11-20: each show's official site where it publishes
 * a policy, TDF show pages, Lincoln Center Theater, TodayTix show pages,
 * BroadwayWorld's rush list ("Updated November 2026") and New York Theatre
 * Guide's guide. Playbill's roundups were read only as search-result snippets:
 * playbill.com's robots.txt disallows Anthropic's agents, so it is not fetched.
 * Broadway Direct, Telecharge and Lucky Seat are linked to, never fetched.
 *
 * A row keeps an older lastVerified when a fact on it could not be confirmed
 * (each says why), so it reads as unverified rather than fresh. Two Strangers
 * (closing 2026-11-29) is deliberately absent. Programs of closed shows are
 * removed rather than kept: the feed, banner, trip planner and push cron read
 * every program.
 */
export const PROGRAMS: readonly Program[] = [
  telechargeLottery("860", 59),
  boxOfficeProgram("860", "rush", 59, "Imperial Theatre"),
  telechargeDigitalRush("860", 59),

  // Lincoln Center Theater routes entries through its Telecharge-run
  // lctlottery.com (lct.org/shows/a-few-good-men).
  {
    ...telechargeLottery("a-few-good-men", 49),
    entryUrl: "https://lctlottery.com/",
  },

  todayTixRush(
    "and-juliet",
    49,
    "https://www.todaytix.com/nyc/shows/25598-and-juliet-on-broadway",
  ),
  boxOfficeProgram("and-juliet", "rush", 49, "Stephen Sondheim Theatre", 2, {
    sundayOpensAt: "10:00",
  }),
  boxOfficeProgram("and-juliet", "sro", 45, "Stephen Sondheim Theatre", 2, {
    sundayOpensAt: "10:00",
  }),

  // Unverified 2026-11-20: $45 (Playbill snippet, BroadwayWorld's price
  // field) against $35 (TDF, BroadwayWorld's text, broadway.org). The official
  // site's robots.txt is unreadable (403), so it was not fetched. Retried
  // 2026-11-21: TDF still says $35, with the same window and 60 minutes.
  {
    ...program(
      "aladdin",
      "digital-lottery",
      "official-site",
      45,
      2,
      "https://www.aladdinthemusical.com/lottery",
      dailyWindow(
        "9 AM–3 PM the day before a performance",
        "09:00",
        "15:00",
      ),
      {
        notes: "Winners have 60 minutes to purchase.",
        claimWindow: {
          minutes: 60,
          channel: "email",
          notifiedAround: "shortly after 3 PM",
        },
      },
    ),
    lastVerified: "2026-11-11",
  },

  {
    // Unverified 2026-11-20: sources give three entry deadlines (9:30, 10 and
    // 11 AM) and the official site no longer mentions Lucky Seat. Retried
    // 2026-11-21: the site still lists only the $15 monthly lottery.
    ...luckySeatLottery(
      "the-book-of-mormon",
      49,
      "https://www.luckyseat.com/shows/thebookofmormon-newyork",
    ),
    lastVerified: "2026-11-11",
  },
  // TodayTix show page, 2026-11-20: "Rush tickets from $49" (was $53).
  todayTixRush(
    "the-book-of-mormon",
    49,
    "https://www.todaytix.com/nyc/shows/127-the-book-of-mormon-on-broadway",
  ),

  telechargeLottery("buena-vista-social-club"),
  boxOfficeProgram(
    "buena-vista-social-club",
    "rush",
    45,
    "Gerald Schoenfeld Theatre",
  ),

  boxOfficeProgram("chicago", "rush", 49, "Ambassador Theatre", 2, {
    notes:
      "Subject to availability. Not offered for Saturday evening performances.",
  }),
  {
    // Unverified 2026-11-20: $39 (Playbill snippet, NYTG) against $27 (TDF,
    // BroadwayWorld's text). The official site lists neither. Retried
    // 2026-11-21: TDF still says $27 "when the performance is sold out".
    ...boxOfficeProgram("chicago", "sro", 39, "Ambassador Theatre"),
    lastVerified: "2026-11-11",
  },

  telechargeLottery("galileo", 45),
  boxOfficeProgram("galileo", "rush", 45, "Shubert Theatre", 2, {
    notes:
      "Subject to availability. Sunday hours unconfirmed: Playbill says noon, the show's site lists the box office closed Sundays.",
  }),

  telechargeLottery("the-great-gatsby", 45),
  boxOfficeProgram("the-great-gatsby", "rush", 40, "Broadway Theatre"),
  boxOfficeProgram(
    "the-great-gatsby",
    "student-rush",
    25,
    "Broadway Theatre",
  ),

  {
    // Unverified 2026-11-20: $49 and Lucky Seat confirmed on hadestown.com,
    // but sources disagree on the deadline (TDF: 10:30 AM day of; BWW: 9:30 AM
    // day of; NYTG: 9:30 AM the day before). Retried 2026-11-21: the official
    // tickets page still gives no deadline; TDF now says $47.50, entries close
    // 10:30 AM day of, drawing from 11 AM.
    ...luckySeatLottery(
      "hadestown",
      49,
      "https://www.luckyseat.com/shows/hadestown-newyork",
    ),
    lastVerified: "2026-11-11",
  },
  program(
    "hadestown",
    "sro",
    "box-office",
    39,
    2,
    boxOfficeUrl("Walter Kerr Theatre"),
    dailyWindow(
      "From noon for matinees or 5 PM for evening shows",
      "12:00",
      "20:00",
      PERFORMANCE_DAYS,
      true,
    ),
    { notes: "Available only when the performance is sold out." },
  ),

  program(
    "hamilton",
    "digital-lottery",
    "official-site",
    10,
    2,
    "https://hamiltonmusical.com/new-york/tickets/#lottery",
    {
      timezone: TIMEZONE,
      summary: "Friday 10 AM–Thursday noon for the following week",
      windows: [
        { days: [5], opensAt: "10:00", closesAt: "12:00", closesDayOffset: 6 },
      ],
    },
    {
      notes: "Winners are notified Thursday afternoon.",
      claimWindow: {
        minutes: 120,
        channel: "email",
        notifiedAround: "Thursday afternoon",
      },
    },
  ),

  program(
    "harry-potter-cursed-child",
    "digital-lottery",
    "todaytix",
    40,
    2,
    "https://www.todaytix.com/nyc/shows/8728-harry-potter-and-the-cursed-child",
    {
      timezone: TIMEZONE,
      summary: "Monday 12:01 AM–Friday 1 PM for the following week",
      windows: [
        { days: [1], opensAt: "00:01", closesAt: "13:00", closesDayOffset: 4 },
      ],
    },
    {
      name: "Friday Forty",
      // The show states when winners hear but not how long they have to buy.
      notes:
        "40 tickets are offered each week. Winners hear between 1 and 5 PM Friday.",
    },
  ),

  telechargeLottery("inter-alia", 45),
  boxOfficeProgram("inter-alia", "rush", 45, "Music Box Theatre"),

  boxOfficeProgram("just-in-time", "rush", 40, "Circle in the Square Theatre"),

  broadwayDirectLottery(
    "the-lion-king",
    60,
    "https://lottery.broadwaydirect.com/show/the-lion-king/",
    "09:00",
    "15:00",
  ),

  broadwayDirectLottery(
    "the-lost-boys",
    45,
    "https://lottery.broadwaydirect.com/show/lost-boys/",
    "07:00",
    "14:00",
  ),
  boxOfficeProgram("the-lost-boys", "rush", 45, "Palace Theatre", 2, {
    startDay: "tuesday",
  }),

  // $20.64 is real, not a typo: the show is set in the year 2064 and the
  // production prices its lottery as a nod to it.
  // maybehappyending.com/faqs (2026-11-20): "offers a digital lottery and in
  // person rush tickets", so the digital rush is gone; standing room is $42.
  {
    ...telechargeLottery("maybe-happy-ending", 20.64),
    notes: "Select performances only. Winners are drawn at 10 AM and 3 PM.",
  },
  boxOfficeProgram("maybe-happy-ending", "rush", 49, "Belasco Theatre"),
  boxOfficeProgram("maybe-happy-ending", "sro", 42, "Belasco Theatre"),

  broadwayDirectLottery(
    "mj-the-musical",
    49,
    "https://lottery.broadwaydirect.com/show/mj-ny/",
    "09:00",
    "15:00",
  ),

  telechargeLottery("much-ado-about-nothing", 49),

  telechargeLottery("oh-mary", 47),
  boxOfficeProgram("oh-mary", "rush", 43, "Lyceum Theatre"),

  // TDF and NYTG, 2026-11-20: $39 (was $49); the show's site gives no price.
  telechargeLottery("operation-mincemeat", 39),
  boxOfficeProgram("operation-mincemeat", "rush", 49, "John Golden Theatre"),

  luckySeatLottery(
    "other-desert-cities",
    49,
    "https://www.luckyseat.com/shows/otherdesertcities-newyork-2026Sep",
    "10:30",
  ),
  todayTixRush(
    "other-desert-cities",
    49,
    "https://www.todaytix.com/nyc/shows/47066-other-desert-cities",
  ),

  telechargeLottery("the-outsiders"),
  boxOfficeProgram("the-outsiders", "rush", 45, "Bernard B. Jacobs Theatre"),
  // No standing room: re-checked 2026-11-21, the official FAQ
  // (outsidersmusical.com, "Does THE OUTSIDERS offer rush, lottery, or
  // standing room tickets?") lists the lottery, a $30 Under 30 rush and the
  // $45 rush only. The $39 row from July was removed. The Under 30 rush isn't
  // modeled: a second box-office rush per show breaks programKey uniqueness.

  todayTixRush(
    "paranormal-activity",
    40,
    "https://www.todaytix.com/nyc/shows/46971-paranormal-activity",
  ),
  boxOfficeProgram("paranormal-activity", "rush", 40, "August Wilson Theatre"),

  // Verified 2026-11-21 from the TodayTix show page's performance data:
  // "$30 Lottery tickets", maxTickets 2, open 17:00 the day before until
  // 09:00 the day of, for each performance listed. The claim time isn't
  // published, so the row doesn't state one (it used to say one hour).
  {
    ...program(
      "rocky-horror-show",
      "digital-lottery",
      "todaytix",
      30,
      2,
      "https://www.todaytix.com/nyc/shows/43905-the-rocky-horror-show-on-broadway",
      dailyWindow(
        "5 PM the day before–9 AM the day of the performance",
        "17:00",
        "09:00",
        MONDAY_TO_SATURDAY,
      ),
      { notes: "Winners buy in the TodayTix app." },
    ),
    lastVerified: "2026-11-21",
  },

  broadwayDirectLottery(
    "schmigadoon",
    45,
    "https://lottery.broadwaydirect.com/schmigadoon-ny",
    "10:00",
    "14:00",
  ),
  boxOfficeProgram("schmigadoon", "rush", 40, "Nederlander Theatre", 2, {
    startDay: "tuesday",
  }),

  broadwayDirectLottery(
    "six",
    45,
    "https://lottery.broadwaydirect.com/show/six-ny/",
    "09:00",
    "18:00",
  ),
  boxOfficeProgram("six", "sro", 49, "Lena Horne Theatre"),

  // broadway.strangerthingsonstage.com/ticket-info (2026-11-20).
  broadwayDirectLottery(
    "stranger-things-first-shadow",
    45,
    "https://lottery.broadwaydirect.com/show/st-nyc/",
    "07:00",
    "14:00",
  ),
  boxOfficeProgram(
    "stranger-things-first-shadow",
    "rush",
    40,
    "Marquis Theatre",
  ),

  telechargeLottery("wanted", 35),

  boxOfficeProgram("wicked", "rush", 45, "Gershwin Theatre"),
  broadwayDirectLottery(
    "wicked",
    55,
    "https://lottery.broadwaydirect.com/show/wicked/",
    "09:00",
    "15:00",
  ),

  /*
   * Off-Broadway programs (Phase 12), first verified 2026-07-16 against the
   * shows' sites and the NYTG Off-Broadway guide; last re-checked 2026-11-20
   * against the shows' own sites and TodayTix. Only rows we could confirm —
   * shows without a verified program correctly render "No verified program
   * listed" on their pages.
   */
  {
    // littleshopnyc.com (2026-11-20): "$45 tickets two days before the
    // performance", entry 12:00 AM–3:00 PM, limit 2. Some roundups list $40
    // or "the day before"; the show's own site wins. Draw times and claim
    // window follow the Telecharge default.
    ...telechargeLottery("little-shop-of-horrors", 45),
    schedule: dailyWindow(
      "Midnight–3 PM two days before a performance",
      "00:00",
      "15:00",
    ),
  },
  // Entered on the show's own site (broadwaygoeswrong.com/tickets.php,
  // 2026-11-20: "opens at 12AM & closes at 3PM two days prior").
  program(
    "the-play-that-goes-wrong",
    "digital-lottery",
    "official-site",
    35,
    2,
    "https://broadwaygoeswrong.com/lottery/",
    dailyWindow(
      "Midnight–3 PM two days before a performance",
      "00:00",
      "15:00",
    ),
    {
      notes: "Winners are drawn at 10 AM and 3 PM.",
      claimWindow: {
        minutes: 360,
        channel: "email",
        notifiedAround: "after the 10 AM and 3 PM drawings",
      },
    },
  ),
  // Verified 2026-11-21. The official FAQ (perfect-crime.com): "Rush tickets
  // are available at the Box Office on the day of the performance" and "are
  // also available on TodayTix", linking the TodayTix page, which reads
  // "Unlock Rush for $35 tickets". No source ties a student ID to the price,
  // so the old $35 box-office student rush is gone; the box-office rush has
  // no published price, so it isn't listed. Days come from TodayTix's
  // calendar: dark Wednesdays.
  {
    ...todayTixRush(
      "perfect-crime",
      35,
      "https://www.todaytix.com/nyc/shows/1299-perfect-crime",
    ),
    lastVerified: "2026-11-21",
    schedule: dailyWindow(
      "Unlocks in the TodayTix app at 9 AM",
      "09:00",
      "20:00",
      [0, 1, 2, 4, 5, 6],
      true,
    ),
  },
];

function formatTime(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${suffix}`;
}
