export type ProgramKind =
  | "digital-lottery"
  | "in-person-lottery"
  | "rush"
  | "digital-rush"
  | "student-rush"
  | "sro";

export type ProgramPlatform =
  | "broadway-direct"
  | "lucky-seat"
  | "telecharge"
  | "todaytix"
  | "official-site"
  | "box-office";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ScheduleWindow = {
  /** JavaScript weekday numbers: Sunday = 0, Saturday = 6. */
  days: readonly Weekday[];
  opensAt: string;
  closesAt: string;
  /** Number of calendar days after opening that the window closes. */
  closesDayOffset?: number;
  /** In-person and rush inventory may disappear before nominal closing. */
  whileSuppliesLast?: boolean;
};

export type ProgramSchedule = {
  timezone: "America/New_York";
  summary: string;
  windows: readonly ScheduleWindow[];
};

export type ClaimChannel = "email" | "text" | "app";

/**
 * What happens after you win (Phase 8): the claim clock starts when the
 * notification is SENT, not read — the sharpest documented pain in lottery
 * folk knowledge. Curated per program, like everything else.
 */
export type ClaimWindow = {
  /** Minutes to claim once notified. */
  minutes: number;
  channel: ClaimChannel;
  /** Human phrasing of when winners usually hear, e.g. "after the 3 PM drawing". */
  notifiedAround: string;
};

export type Program = {
  showSlug: string;
  kind: ProgramKind;
  platform: ProgramPlatform;
  /** Optional branded program name, such as “Friday Forty.” */
  name?: string;
  price: number;
  maxTickets: number;
  entryUrl: string;
  schedule: ProgramSchedule;
  lastVerified: string;
  notes?: string;
  claimWindow?: ClaimWindow;
  /** Platform folk knowledge, curated from community reports (MARKET.md). */
  tips?: readonly string[];
};

export type ProgramStatusState =
  | "open"
  | "closes-soon"
  | "opens-later-today"
  | "closed-today"
  | "next-open-day";

export type ProgramStatus = {
  state: ProgramStatusState;
  countdownMs: number | null;
  nextOpenAt: Date | null;
  nextCloseAt: Date | null;
  whileSuppliesLast: boolean;
};

const TIMEZONE = "America/New_York" as const;
const LAST_VERIFIED = "2026-07-13";
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
        minutes: 60,
        channel: "email",
        notifiedAround: "after the 10 AM and 3 PM drawings",
      },
      tips: [
        "Telecharge lotteries require a US phone number for verification — international visitors should set one up before entering.",
      ],
    },
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
      notes: "Winners are selected after entries close.",
      claimWindow: {
        minutes: 60,
        channel: "email",
        notifiedAround: "within a few hours of entries closing",
      },
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
      tips: [
        "Broadway Direct entries actually open at 12:01 AM — set the alarm a minute past midnight, not midnight.",
      ],
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
 * Source: Playbill’s Broadway rush, lottery, and standing-room roundup,
 * updated 2026-07-13. Two current productions (Two Strangers and Stranger
 * Things: The First Shadow) had no listed program and are intentionally absent.
 */
const PROGRAMS: readonly Program[] = [
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

  program(
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

  luckySeatLottery(
    "the-book-of-mormon",
    49,
    "https://www.luckyseat.com/shows/thebookofmormon-newyork",
  ),
  todayTixRush(
    "the-book-of-mormon",
    53,
    "https://www.todaytix.com/nyc/shows/127-the-book-of-mormon-on-broadway",
  ),

  telechargeLottery("buena-vista-social-club"),
  boxOfficeProgram(
    "buena-vista-social-club",
    "rush",
    45,
    "Gerald Schoenfeld Theatre",
  ),

  telechargeLottery("cats-jellicle-ball"),
  boxOfficeProgram("cats-jellicle-ball", "rush", 45, "Broadhurst Theatre"),

  boxOfficeProgram("chicago", "rush", 49, "Ambassador Theatre"),
  boxOfficeProgram("chicago", "sro", 39, "Ambassador Theatre"),

  telechargeLottery("death-of-a-salesman"),

  boxOfficeProgram(
    "every-brilliant-thing",
    "rush",
    45,
    "Hudson Theatre",
    2,
    { startDay: "tuesday" },
  ),
  luckySeatLottery(
    "every-brilliant-thing",
    45,
    "https://www.luckyseat.com/shows/everybrilliantthing-newyork-2026Feb",
    "10:30",
  ),
  todayTixRush(
    "every-brilliant-thing",
    45,
    "https://www.todaytix.com/nyc/shows/45675-every-brilliant-thing",
  ),

  telechargeLottery("the-great-gatsby", 45),
  boxOfficeProgram("the-great-gatsby", "rush", 40, "Broadway Theatre"),
  boxOfficeProgram(
    "the-great-gatsby",
    "student-rush",
    25,
    "Broadway Theatre",
  ),

  luckySeatLottery(
    "hadestown",
    49,
    "https://www.luckyseat.com/shows/hadestown-newyork",
  ),
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
        minutes: 60,
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
    "https://www.todaytix.com/x/nyc/shows/8728-harry-potter-and-the-cursed-child",
    {
      timezone: TIMEZONE,
      summary: "Monday 12:01 AM–Friday 1 PM for the following week",
      windows: [
        { days: [1], opensAt: "00:01", closesAt: "13:00", closesDayOffset: 4 },
      ],
    },
    {
      name: "Friday Forty",
      notes: "40 tickets are offered each week.",
      claimWindow: {
        minutes: 60,
        channel: "app",
        notifiedAround: "Friday afternoon",
      },
    },
  ),

  telechargeLottery("joe-turners-come-and-gone"),
  boxOfficeProgram(
    "joe-turners-come-and-gone",
    "rush",
    45,
    "Ethel Barrymore Theatre",
  ),
  boxOfficeProgram(
    "joe-turners-come-and-gone",
    "student-rush",
    35,
    "Ethel Barrymore Theatre",
  ),

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
  telechargeLottery("maybe-happy-ending", 20.64),
  boxOfficeProgram("maybe-happy-ending", "rush", 49, "Belasco Theatre"),
  program(
    "maybe-happy-ending",
    "digital-rush",
    "telecharge",
    49,
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
  ),
  boxOfficeProgram("maybe-happy-ending", "sro", 49, "Belasco Theatre"),

  broadwayDirectLottery(
    "mj-the-musical",
    49,
    "https://lottery.broadwaydirect.com/show/mj-ny/",
    "09:00",
    "15:00",
  ),

  luckySeatLottery(
    "moulin-rouge",
    49,
    "https://www.luckyseat.com/shows/moulinrouge!themusical-newyork",
  ),

  telechargeLottery("oh-mary", 47),
  boxOfficeProgram("oh-mary", "rush", 43, "Lyceum Theatre"),

  telechargeLottery("operation-mincemeat"),
  boxOfficeProgram("operation-mincemeat", "rush", 49, "John Golden Theatre"),

  telechargeLottery("the-outsiders"),
  boxOfficeProgram("the-outsiders", "rush", 45, "Bernard B. Jacobs Theatre"),
  boxOfficeProgram("the-outsiders", "sro", 39, "Bernard B. Jacobs Theatre"),

  telechargeLottery("proof"),
  boxOfficeProgram("proof", "rush", 45, "Booth Theatre"),

  telechargeLottery("ragtime"),

  program(
    "rocky-horror-show",
    "digital-lottery",
    "todaytix",
    30,
    2,
    "https://www.todaytix.com/nyc/shows/4390",
    dailyWindow(
      "5 PM the day before–9 AM the day of the performance",
      "17:00",
      "09:00",
      MONDAY_TO_SATURDAY,
    ),
    {
      notes: "Winners have one hour to claim tickets.",
      claimWindow: {
        minutes: 60,
        channel: "app",
        notifiedAround: "after the 9 AM drawing",
      },
    },
  ),

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
  boxOfficeProgram("six", "student-rush", 35, "Lena Horne Theatre"),
  boxOfficeProgram("six", "sro", 49, "Lena Horne Theatre"),

  boxOfficeProgram("titanique", "rush", 45, "St. James Theatre"),
  luckySeatLottery(
    "titanique",
    49,
    "https://www.luckyseat.com/shows/titanique-newyork-2026Mar",
    "10:30",
  ),
  todayTixRush(
    "titanique",
    49,
    "https://www.todaytix.com/nyc/shows/25241-titanique",
  ),

  boxOfficeProgram("wicked", "student-rush", 45, "Gershwin Theatre"),
  broadwayDirectLottery(
    "wicked",
    55,
    "https://lottery.broadwaydirect.com/show/wicked/",
    "09:00",
    "15:00",
  ),

  /*
   * Off-Broadway programs (Phase 12), verified 2026-07-16 against the shows'
   * sites and the NYTG Off-Broadway guide. Only rows we could confirm —
   * shows without a verified program correctly render "No verified program
   * listed" on their pages.
   */
  {
    ...telechargeLottery("little-shop-of-horrors", 35),
    lastVerified: "2026-07-16",
  },
  {
    ...telechargeLottery("the-play-that-goes-wrong", 35),
    lastVerified: "2026-07-16",
  },
  {
    ...boxOfficeProgram(
      "perfect-crime",
      "student-rush",
      30,
      "The Theater Center",
    ),
    lastVerified: "2026-07-16",
  },

  // Free Shakespeare in the Park — the platonic ideal of this dataset:
  // completely free, two entry paths, chronically confusing to newcomers.
  {
    ...program(
      "the-winters-tale",
      "digital-lottery",
      "todaytix",
      0,
      2,
      "https://www.todaytix.com/nyc/shows/free-shakespeare-in-the-park",
      dailyWindow(
        "Midnight–noon the day of the performance",
        "00:00",
        "12:00",
        [0, 2, 3, 4, 5, 6],
      ),
      {
        notes: "Performances begin July 25. Winners drawn after noon.",
        claimWindow: {
          minutes: 60,
          channel: "app",
          notifiedAround: "early afternoon",
        },
      },
    ),
    lastVerified: "2026-07-16",
  },
  {
    ...program(
      "the-winters-tale",
      "rush",
      "box-office",
      0,
      2,
      "https://publictheater.org/free-shakespeare-in-the-park/",
      dailyWindow(
        "Free tickets distributed at noon at the Delacorte — line up early",
        "08:00",
        "12:00",
        [0, 2, 3, 4, 5, 6],
        true,
      ),
      {
        notes: "Performances begin July 25. Two tickets per person.",
      },
    ),
    lastVerified: "2026-07-16",
  },
];

const KIND_LABELS: Record<ProgramKind, string> = {
  "digital-lottery": "Digital lottery",
  "in-person-lottery": "In-person lottery",
  rush: "Rush",
  "digital-rush": "Digital rush",
  "student-rush": "Student rush",
  sro: "Standing room",
};

const PLATFORM_LABELS: Record<ProgramPlatform, string> = {
  "broadway-direct": "Broadway Direct",
  "lucky-seat": "Lucky Seat",
  telecharge: "Telecharge",
  todaytix: "TodayTix",
  "official-site": "Official site",
  "box-office": "Box office",
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  weekday: Weekday;
  hour: number;
  minute: number;
  second: number;
};

type Occurrence = {
  opensAt: Date;
  closesAt: Date;
  offset: number;
  whileSuppliesLast: boolean;
};

const weekdayIndex: Record<string, Weekday> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function formatTime(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${suffix}`;
}

function getZonedParts(date: Date): ZonedParts {
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdayIndex[parts.weekday],
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function calendarDate(
  start: Pick<ZonedParts, "year" | "month" | "day">,
  offset: number,
) {
  const date = new Date(Date.UTC(start.year, start.month - 1, start.day + offset));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function zonedDate(
  date: Pick<ZonedParts, "year" | "month" | "day">,
  time: string,
): Date {
  const [hour, minute] = time.split(":").map(Number);
  const localAsUtc = Date.UTC(date.year, date.month - 1, date.day, hour, minute);
  const firstPass = getZonedParts(new Date(localAsUtc));
  const firstOffset =
    Date.UTC(
      firstPass.year,
      firstPass.month - 1,
      firstPass.day,
      firstPass.hour,
      firstPass.minute,
      firstPass.second,
    ) - localAsUtc;
  let timestamp = localAsUtc - firstOffset;

  const secondPass = getZonedParts(new Date(timestamp));
  const secondOffset =
    Date.UTC(
      secondPass.year,
      secondPass.month - 1,
      secondPass.day,
      secondPass.hour,
      secondPass.minute,
      secondPass.second,
    ) - timestamp;
  if (secondOffset !== firstOffset) timestamp = localAsUtc - secondOffset;

  return new Date(timestamp);
}

function sameLocalDay(a: Date, b: Date): boolean {
  const first = getZonedParts(a);
  const second = getZonedParts(b);
  return (
    first.year === second.year &&
    first.month === second.month &&
    first.day === second.day
  );
}

function occurrences(now: Date, item: Program): Occurrence[] {
  const localNow = getZonedParts(now);
  const result: Occurrence[] = [];

  // A seven-day lookback supports weekly entry windows such as Hamilton.
  for (let offset = -7; offset <= 7; offset += 1) {
    const day = ((localNow.weekday + offset + 7) % 7) as Weekday;
    const date = calendarDate(localNow, offset);

    for (const window of item.schedule.windows) {
      if (!window.days.includes(day)) continue;

      const opensAt = zonedDate(date, window.opensAt);
      const closeDate = calendarDate(date, window.closesDayOffset ?? 0);
      let closesAt = zonedDate(closeDate, window.closesAt);
      if (window.closesDayOffset === undefined && closesAt <= opensAt) {
        closesAt = zonedDate(calendarDate(date, 1), window.closesAt);
      }

      result.push({
        opensAt,
        closesAt,
        offset,
        whileSuppliesLast: window.whileSuppliesLast ?? false,
      });
    }
  }

  return result.sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime());
}

export function allPrograms(): readonly Program[] {
  return PROGRAMS;
}

/** Freshest lastVerified across the catalog — trust lines derive from this. */
export function programsLastVerified(): string {
  let latest = LAST_VERIFIED;
  for (const item of PROGRAMS) {
    if (item.lastVerified > latest) latest = item.lastVerified;
  }
  return latest;
}

/** Stable identity for a program — (show, kind, platform) is unique. */
export function programKey(item: Program): string {
  return `${item.showSlug}/${item.kind}/${item.platform}`;
}

export type ProgramOccurrence = {
  opensAt: Date;
  closesAt: Date;
  whileSuppliesLast: boolean;
};

/**
 * Concrete entry windows within ±7 days of `around` — the raw material for
 * trip mode and the claim-watch cron, which need windows on days other than
 * "now".
 */
export function programOccurrencesNear(
  around: Date,
  item: Program,
): ProgramOccurrence[] {
  return occurrences(around, item).map((occurrence) => ({
    opensAt: occurrence.opensAt,
    closesAt: occurrence.closesAt,
    whileSuppliesLast: occurrence.whileSuppliesLast,
  }));
}

const etDayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** NYC calendar date (YYYY-MM-DD) of an instant — the entry-log day key. */
export function etDayKey(date: Date): string {
  return etDayFormat.format(date);
}

export function programsForShow(showSlug: string): readonly Program[] {
  return PROGRAMS.filter((item) => item.showSlug === showSlug);
}

/**
 * Cheapest verified way in (Phase 14): the browse grid's answer line.
 * Deliberately schedule-agnostic — it says a $40 door exists; whether it's
 * open right now is /rush's job.
 */
export function cheapestProgram(showSlug: string): Program | null {
  const list = programsForShow(showSlug);
  if (list.length === 0) return null;
  return list.reduce((min, item) => (item.price < min.price ? item : min));
}

export function programKindLabel(kind: ProgramKind): string {
  return KIND_LABELS[kind];
}

/* One-word-ish forms for tight lines (catalog cards): the price is the
 * headline there; digital-vs-in-person nuance lives on the show page. */
const KIND_SHORT_LABELS: Record<ProgramKind, string> = {
  "digital-lottery": "Lottery",
  "in-person-lottery": "Lottery",
  rush: "Rush",
  "digital-rush": "Rush",
  "student-rush": "Student rush",
  sro: "Standing room",
};

export function programKindShortLabel(kind: ProgramKind): string {
  return KIND_SHORT_LABELS[kind];
}

export function programPlatformLabel(platform: ProgramPlatform): string {
  return PLATFORM_LABELS[platform];
}

export function isProgramStale(item: Program, now: Date): boolean {
  const verifiedAt = new Date(`${item.lastVerified}T12:00:00-04:00`);
  return now.getTime() - verifiedAt.getTime() > 14 * 24 * 60 * 60 * 1000;
}

/** Interpret one curated weekly schedule at a caller-supplied instant. */
export function getProgramStatus(now: Date, item: Program): ProgramStatus {
  const schedule = occurrences(now, item);
  const current = schedule.find(
    (occurrence) => occurrence.opensAt <= now && now < occurrence.closesAt,
  );

  if (current) {
    const countdownMs = current.whileSuppliesLast
      ? null
      : current.closesAt.getTime() - now.getTime();
    return {
      state:
        countdownMs !== null && countdownMs <= 60 * 60 * 1000
          ? "closes-soon"
          : "open",
      countdownMs,
      nextOpenAt: current.opensAt,
      nextCloseAt: current.closesAt,
      whileSuppliesLast: current.whileSuppliesLast,
    };
  }

  const next = schedule.find((occurrence) => occurrence.opensAt > now) ?? null;
  const hadWindowToday = schedule.some(
    (occurrence) =>
      occurrence.closesAt <= now && sameLocalDay(occurrence.closesAt, now),
  );

  if (next && sameLocalDay(next.opensAt, now)) {
    return {
      state: "opens-later-today",
      countdownMs: next.opensAt.getTime() - now.getTime(),
      nextOpenAt: next.opensAt,
      nextCloseAt: next.closesAt,
      whileSuppliesLast: next.whileSuppliesLast,
    };
  }

  return {
    state: hadWindowToday ? "closed-today" : "next-open-day",
    countdownMs: next ? next.opensAt.getTime() - now.getTime() : null,
    nextOpenAt: next?.opensAt ?? null,
    nextCloseAt: next?.closesAt ?? null,
    whileSuppliesLast: next?.whileSuppliesLast ?? false,
  };
}
