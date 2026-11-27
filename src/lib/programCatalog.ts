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
 * Date of the latest full catalog check. checked() and unverified() stamp it
 * on every row unless a row was checked on another day.
 */
export const LAST_VERIFIED = "2026-11-27";
const MONDAY_TO_FRIDAY: readonly Weekday[] = [1, 2, 3, 4, 5];
const MONDAY_TO_SATURDAY: readonly Weekday[] = [1, 2, 3, 4, 5, 6];
const TUESDAY_TO_SATURDAY: readonly Weekday[] = [2, 3, 4, 5, 6];
const PERFORMANCE_DAYS: readonly Weekday[] = [0, 2, 3, 4, 5, 6];

/** A row before it is checked: every fact, but no source or date yet. */
type Draft = Omit<Program, "source" | "lastVerified" | "unverified">;

/**
 * A row an official page confirms: its seller, price and window (open, close
 * and days). `source` is that page.
 */
function checked(source: string, draft: Draft, on = LAST_VERIFIED): Program {
  return { ...draft, source, lastVerified: on };
}

/**
 * A row the check couldn't confirm. It shows, marked unverified with `why`,
 * and never sends an alert. `source` is the best page there is for it.
 */
function unverified(
  source: string,
  why: string,
  draft: Draft,
  on = LAST_VERIFIED,
): Program {
  return { ...draft, source, lastVerified: on, unverified: why };
}

/** Replace a draft's schedule summary: for rows whose times are in doubt. */
function described(draft: Draft, summary: string): Draft {
  return { ...draft, schedule: { ...draft.schedule, summary } };
}

function program(
  showSlug: string,
  kind: ProgramKind,
  platform: ProgramPlatform,
  price: number,
  maxTickets: number | undefined,
  entryUrl: string,
  schedule: ProgramSchedule,
  options: Pick<Program, "name" | "notes" | "claimWindow" | "tips"> = {},
): Draft {
  return {
    showSlug,
    kind,
    platform,
    price,
    ...(maxTickets === undefined ? {} : { maxTickets }),
    entryUrl,
    schedule,
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

const TELECHARGE_TIP =
  "Telecharge lotteries require a US phone number for verification — international visitors should set one up before entering.";
const LUCKY_SEAT_TIP =
  "Lucky Seat occasionally switches winners to box-office pickup — bring the ID you entered with.";

/**
 * A Telecharge-run digital lottery as show sites describe it: entries open at
 * midnight the day before, and winners are drawn at 10 AM and 3 PM. Most
 * sites give the drawings, not a closing time, so the 3 PM close is the last
 * drawing; Gatsby's and Wanted's sites state it outright ("closing at 3 PM ET
 * that same day"). Ticket limit and claim time only where the site says.
 */
function telechargeLottery(
  showSlug: string,
  price: number,
  options: {
    maxTickets?: number;
    claimHours?: number;
    notes?: string;
    opensAt?: "00:00" | "00:01";
    /** Shows that run entry through their own page (LCT, Oh, Mary!). */
    platform?: ProgramPlatform;
    entryUrl?: string;
  } = {},
): Draft {
  const platform = options.platform ?? "telecharge";
  const opensAt = options.opensAt ?? "00:00";
  return program(
    showSlug,
    "digital-lottery",
    platform,
    price,
    options.maxTickets,
    options.entryUrl ?? "https://rush.telecharge.com/",
    dailyWindow(
      `${opensAt === "00:01" ? "12:01 AM" : "Midnight"}–3 PM the day before a performance`,
      opensAt,
      "15:00",
    ),
    {
      notes: options.notes ?? "Winners are drawn at 10 AM and 3 PM.",
      ...(options.claimHours
        ? {
            claimWindow: {
              minutes: options.claimHours * 60,
              channel: "email" as const,
              notifiedAround: "shortly after the 10 AM and 3 PM drawings",
            },
          }
        : {}),
      ...(platform === "telecharge" ? { tips: [TELECHARGE_TIP] } : {}),
    },
  );
}

function broadwayDirectLottery(
  showSlug: string,
  price: number,
  entryUrl: string,
  opensAt: string,
  closesAt: string,
  options: { maxTickets?: number; claimMinutes?: number; notes?: string } = {},
): Draft {
  return program(
    showSlug,
    "digital-lottery",
    "broadway-direct",
    price,
    options.maxTickets,
    entryUrl,
    dailyWindow(
      `${formatTime(opensAt)}–${formatTime(closesAt)} the day before a performance`,
      opensAt,
      closesAt,
    ),
    {
      ...(options.notes ? { notes: options.notes } : {}),
      ...(options.claimMinutes
        ? {
            claimWindow: {
              minutes: options.claimMinutes,
              channel: "email" as const,
              notifiedAround: "shortly after the window closes",
            },
          }
        : {}),
      // No blanket opening-time tip: each show sets its own window.
    },
  );
}

/**
 * Box-office hours as the show's own site prints them, one entry per run of
 * days. Walk-up inventory, so every window is while-supplies-last.
 */
function hours(
  summary: string,
  ...runs: [days: readonly Weekday[], opensAt: string, closesAt: string][]
): ProgramSchedule {
  return {
    timezone: TIMEZONE,
    summary,
    windows: runs.map(([days, opensAt, closesAt]) => ({
      days,
      opensAt,
      closesAt,
      whileSuppliesLast: true,
    })),
  };
}

const UNTIL_SOLD_OUT = "From box-office opening until sold out";

/** The most common hours on show sites: Mon–Sat 10–8, Sunday noon–6. */
function standardHours(
  startDay: "monday" | "tuesday" = "monday",
  summary = UNTIL_SOLD_OUT,
): ProgramSchedule {
  return hours(
    summary,
    [startDay === "monday" ? MONDAY_TO_SATURDAY : TUESDAY_TO_SATURDAY, "10:00", "20:00"],
    [[0], "12:00", "18:00"],
  );
}

function boxOfficeUrl(venue: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue} box office NYC`)}`;
}

function boxOfficeProgram(
  showSlug: string,
  kind: Extract<ProgramKind, "rush" | "student-rush" | "sro">,
  price: number,
  venue: string,
  maxTickets: number | undefined,
  schedule: ProgramSchedule,
  notes?: string,
): Draft {
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
    schedule,
    { notes: notes ?? defaultNotes },
  );
}

function todayTixRush(
  showSlug: string,
  price: number,
  entryUrl: string,
  maxTickets?: number,
  days: readonly Weekday[] = PERFORMANCE_DAYS,
  notes = "First come, first served in the TodayTix app.",
): Draft {
  return program(
    showSlug,
    "digital-rush",
    "todaytix",
    price,
    maxTickets,
    entryUrl,
    dailyWindow("Unlocks in the TodayTix app at 9 AM", "09:00", "20:00", days, true),
    {
      notes,
      tips: [
        "If TodayTix says all tickets are being held, those are pending carts that can time out — keep trying for a few minutes.",
      ],
    },
  );
}

/**
 * Checked 2026-11-27 against each show's official site: its tickets, lottery,
 * rush or FAQ page, which is each row's `source`. TDF's show pages were read
 * as a cross-check only; where TDF is a row's only source, the row is
 * unverified. Broadway Direct, Telecharge, Lucky Seat and TodayTix are linked
 * to, never fetched, and playbill.com's robots.txt disallows Anthropic's
 * agents, so it isn't read.
 *
 * A row is checked() when the official page states its seller, price and
 * window. A ticket limit or claim time appears only where the page states
 * one. Anything short of that is unverified() with the reason, and sends no
 * alerts. Two Strangers (closing 2026-11-29, with a $48 lottery and $42 rush
 * on its site) is deliberately absent. Programs of closed shows are removed
 * rather than kept: the feed, banner, trip planner and push cron read every
 * program.
 */
export const PROGRAMS: readonly Program[] = [
  // billycrystal860.com FAQ: "$59 digital lottery tickets are available for
  // next day performances", "$59 in-person rush ... at the Imperial Theatre
  // box office", "$59 digital rush tickets are available for same day
  // performances". No times or hours anywhere on the site.
  unverified(
    "https://www.billycrystal860.com/#faq",
    "The show's site gives $59 on Telecharge for next-day performances, but not when entries open or close.",
    described(
      telechargeLottery("860", 59),
      "The day before a performance; entry times not published",
    ),
  ),
  unverified(
    "https://www.billycrystal860.com/#faq",
    "The show's site gives $59 at the Imperial box office for every performance, but publishes no box-office hours.",
    boxOfficeProgram(
      "860",
      "rush",
      59,
      "Imperial Theatre",
      undefined,
      standardHours("monday", "At the box office on the day; hours not published"),
      "First come, first served.",
    ),
  ),
  unverified(
    "https://www.billycrystal860.com/#faq",
    "The show's site gives $59 same-day on Telecharge, but not when it opens.",
    program(
      "860",
      "digital-rush",
      "telecharge",
      59,
      undefined,
      "https://rush.telecharge.com/",
      dailyWindow(
        "On the day of the performance; opening time not published",
        "11:00",
        "20:00",
        PERFORMANCE_DAYS,
        true,
      ),
    ),
  ),

  // lct.org: "$49 tickets (all fees included) ... up to two tickets. Entries
  // open at 12:01am EST, with winners chosen at random at 10:00am and 3:00pm
  // the day before each performance." Entry is lctlottery.com; Telecharge
  // isn't named.
  checked(
    "https://www.lct.org/shows/a-few-good-men/",
    telechargeLottery("a-few-good-men", 49, {
      maxTickets: 2,
      opensAt: "00:01",
      platform: "official-site",
      entryUrl: "https://lctlottery.com/",
      notes: "All fees included. Winners are drawn at 10 AM and 3 PM.",
    }),
  ),

  // andjulietbroadway.com/tickets: "Digital Rush $49 on TodayTix. Fees
  // included. On sale each performance day at 9am"; "In Person Rush $49 ...
  // On sale each performance day at 10am ... Blackouts may apply"; standing
  // room $45 for sold-out performances. Box office: Mondays 10am-6pm,
  // Tues-Sat 10am-8pm, Sundays 10am-7pm.
  checked(
    "https://andjulietbroadway.com/tickets/",
    todayTixRush(
      "and-juliet",
      49,
      "https://www.todaytix.com/nyc/shows/25598-and-juliet-on-broadway",
      undefined,
      PERFORMANCE_DAYS,
      "Fees included. First come, first served in the TodayTix app.",
    ),
  ),
  checked(
    "https://andjulietbroadway.com/tickets/",
    boxOfficeProgram(
      "and-juliet",
      "rush",
      49,
      "Stephen Sondheim Theatre",
      undefined,
      hours(
        UNTIL_SOLD_OUT,
        [[1], "10:00", "18:00"],
        [TUESDAY_TO_SATURDAY, "10:00", "20:00"],
        [[0], "10:00", "19:00"],
      ),
      "First come, first served. Blackouts may apply.",
    ),
  ),
  checked(
    "https://andjulietbroadway.com/tickets/",
    boxOfficeProgram(
      "and-juliet",
      "sro",
      45,
      "Stephen Sondheim Theatre",
      undefined,
      hours(
        UNTIL_SOLD_OUT,
        [[1], "10:00", "18:00"],
        [TUESDAY_TO_SATURDAY, "10:00", "20:00"],
        [[0], "10:00", "19:00"],
      ),
      "Fees included. Only for sold-out performances.",
    ),
  ),

  // Re-checked 2026-11-27 in a browser: aladdinthemusical.com/lottery
  // forwards to lottery.broadwaydirect.com/show/aladdin/ (not read: Broadway
  // Direct's terms bar automated access), and the show's help center says
  // only "a ticket lottery is offered for select performances". TDF: "$35
  // per ticket. Entries are accepted from 9 AM-3 PM the day prior ... you
  // have 60 minutes to pay". Earlier guides said $45.
  unverified(
    "https://www.tdf.org/shows/12819/aladdin/",
    "The show's site confirms a lottery for select performances on Broadway Direct, but gives its terms only there. TDF says $35, 9 AM–3 PM the day before, with 60 minutes to pay; other guides say $45.",
    program(
      "aladdin",
      "digital-lottery",
      "broadway-direct",
      35,
      undefined,
      "https://lottery.broadwaydirect.com/show/aladdin/",
      dailyWindow(
        "9 AM–3 PM the day before a performance, per TDF",
        "09:00",
        "15:00",
      ),
    ),
  ),

  // bookofmormonbroadway.com lists only its $15 monthly lottery (/15-lottery).
  // TDF: "Digital Lottery: $45 including fees. Entries are accepted until
  // 10:30 AM the day before the performance ... 2 tickets per winner ...
  // Visit luckyseat.com." Neither mentions a digital rush.
  unverified(
    "https://www.tdf.org/shows/8843/The-Book-of-Mormon",
    "The show's site lists only its $15 monthly lottery. TDF lists this Lucky Seat lottery at $45, entries until 10:30 AM the day before.",
    program(
      "the-book-of-mormon",
      "digital-lottery",
      "lucky-seat",
      45,
      2,
      "https://www.luckyseat.com/shows/thebookofmormon-newyork",
      dailyWindow(
        "Enter by 10:30 AM the day before, per TDF",
        "00:00",
        "10:30",
        MONDAY_TO_FRIDAY,
      ),
      { tips: [LUCKY_SEAT_TIP] },
    ),
  ),
  unverified(
    "https://bookofmormonbroadway.com/tickets",
    "Neither the show's site nor TDF mentions a digital rush. TodayTix's show page listed it at $49 on Nov 20.",
    todayTixRush(
      "the-book-of-mormon",
      49,
      "https://www.todaytix.com/nyc/shows/127-the-book-of-mormon-on-broadway",
    ),
  ),

  // buenavistamusical.com/tickets: "Entries for the digital lottery start at
  // 12 AM, 1 day before ... drawn the same day at 10 AM and 3 PM. Winners may
  // buy up to 2 tickets at $49 each"; rush "$45 ... limited to two tickets per
  // person"; box office Mon–Sat 10am–8pm, Sunday noon–6pm.
  checked(
    "https://buenavistamusical.com/tickets/",
    telechargeLottery("buena-vista-social-club", 49, { maxTickets: 2 }),
  ),
  checked(
    "https://buenavistamusical.com/tickets/",
    boxOfficeProgram(
      "buena-vista-social-club",
      "rush",
      45,
      "Gerald Schoenfeld Theatre",
      2,
      standardHours(),
      "First come, first served.",
    ),
  ),

  // chicagothemusical.com mentions neither program. Its box office: "Monday –
  // Saturday 10am–8:30pm, Sunday 12pm–7:30pm". TDF: rush "$49 ... Limit 2";
  // standing room "$27 ... only when the performance is sold out ... Limit 2".
  unverified(
    "https://www.tdf.org/shows/1581/Chicago",
    "The show's site doesn't mention a rush. TDF says $49 at the box office, up to two.",
    boxOfficeProgram(
      "chicago",
      "rush",
      49,
      "Ambassador Theatre",
      2,
      hours(UNTIL_SOLD_OUT, [MONDAY_TO_SATURDAY, "10:00", "20:30"], [[0], "12:00", "19:30"]),
      "First come, first served.",
    ),
  ),
  unverified(
    "https://www.tdf.org/shows/1581/Chicago",
    "The show's site doesn't mention standing room. TDF says $27 when a performance sells out, up to two.",
    boxOfficeProgram(
      "chicago",
      "sro",
      27,
      "Ambassador Theatre",
      2,
      hours(UNTIL_SOLD_OUT, [MONDAY_TO_SATURDAY, "10:00", "20:30"], [[0], "12:00", "19:30"]),
    ),
  ),

  // galileomusical.com/tickets: lottery "open at 12 AM ET one day prior ...
  // selected on the same day at 10 AM and 3 PM ET and will have five hours to
  // claim ... up to two tickets at $45"; rush $45 "when the box office opens",
  // two per person. Box office "Monday - Saturday: 10:00 AM - 6:00 PM |
  // Sunday: Closed", though the calendar has Sunday shows.
  checked(
    "https://galileomusical.com/tickets",
    telechargeLottery("galileo", 45, { maxTickets: 2, claimHours: 5 }),
  ),
  checked(
    "https://galileomusical.com/tickets",
    boxOfficeProgram(
      "galileo",
      "rush",
      45,
      "Shubert Theatre",
      2,
      hours(
        "From box-office opening until sold out; the site lists the box office as closed Sundays",
        [MONDAY_TO_SATURDAY, "10:00", "18:00"],
      ),
      "First come, first served.",
    ),
  ),

  // broadwaygatsby.com/en/tickets: lottery "$45 ... open at 12AM one day
  // before the performance and close at 3PM ... five hours to claim"; rush
  // "up to two tickets for $40 each (or $25 each with a valid student ID)";
  // box office Mon–Sat 10AM–8PM, Sunday 12PM–6PM.
  checked(
    "https://broadwaygatsby.com/en/tickets",
    telechargeLottery("the-great-gatsby", 45, { claimHours: 5 }),
  ),
  checked(
    "https://broadwaygatsby.com/en/tickets",
    boxOfficeProgram("the-great-gatsby", "rush", 40, "Broadway Theatre", 2, standardHours()),
  ),
  checked(
    "https://broadwaygatsby.com/en/tickets",
    boxOfficeProgram(
      "the-great-gatsby",
      "student-rush",
      25,
      "Broadway Theatre",
      2,
      standardHours(),
    ),
  ),

  // hadestown.com/tickets: "Digital Lottery: $49 tickets", linked to Lucky
  // Seat, with no deadline; "Standing Room: $39 tickets ... day of sold-out
  // performances ... Limit of 2 per person". Box office Monday 10AM–6PM,
  // Tuesday–Saturday 10AM–8PM, Sunday 12PM–6PM. TDF: lottery $47.50, entries
  // close 10:30 AM on the day of the performance.
  unverified(
    "https://hadestown.com/tickets",
    "The show's site gives $49 on Lucky Seat but no entry deadline. TDF says $47.50, with entries closing 10:30 AM on the day of the show.",
    program(
      "hadestown",
      "digital-lottery",
      "lucky-seat",
      49,
      undefined,
      "https://www.luckyseat.com/shows/hadestown-newyork",
      dailyWindow(
        "Entry deadline not published; TDF says 10:30 AM on the day",
        "00:00",
        "10:30",
        PERFORMANCE_DAYS,
      ),
      { tips: [LUCKY_SEAT_TIP] },
    ),
  ),
  checked(
    "https://hadestown.com/tickets",
    boxOfficeProgram(
      "hadestown",
      "sro",
      39,
      "Walter Kerr Theatre",
      2,
      hours(
        UNTIL_SOLD_OUT,
        [[1], "10:00", "18:00"],
        [TUESDAY_TO_SATURDAY, "10:00", "20:00"],
        [[0], "12:00", "18:00"],
      ),
    ),
  ),

  // hamiltonmusical.com/new-york/tickets: "$10 tickets ... open at 10:00 AM
  // every Friday and will close for entry at 12:00 PM the next Thursday ...
  // Winner notifications will be sent between 12:00 PM and 4:00 PM every
  // Thursday ... two hours to claim ... up to two (2) tickets." Entered in the
  // Hamilton app.
  checked(
    "https://hamiltonmusical.com/new-york/tickets/",
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
        notes: "Entered in the Hamilton app.",
        claimWindow: {
          minutes: 120,
          channel: "email",
          notifiedAround: "between noon and 4 PM Thursday",
        },
      },
    ),
  ),

  // broadway.harrypottertheplay.com/friday-forty: "$40 ... download the
  // TodayTix app ... enter any Monday from 12:01am to Friday at 1:00pm EST
  // ... winners will be notified between 1:00pm and 5:00pm that day." No
  // ticket limit or ticket count stated.
  checked(
    "https://broadway.harrypottertheplay.com/friday-forty",
    program(
      "harry-potter-cursed-child",
      "digital-lottery",
      "todaytix",
      40,
      undefined,
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
        notes: "Winners hear between 1 and 5 PM Friday.",
      },
    ),
  ),

  // interaliabroadway.com/tickets: lottery "start at 12:00 AM ET, one day
  // before ... drawn the same day at 10:00 AM ET and 3:00 PM ET ... up to two
  // tickets at $45 each (inclusive of $5 service fee)"; rush "$45 ... when the
  // Music Box Theatre box office opens. Maximum of two"; box office Monday –
  // Saturday 10:00 AM – 8:00 PM, Sunday closed.
  checked(
    "https://interaliabroadway.com/tickets/",
    telechargeLottery("inter-alia", 45, {
      maxTickets: 2,
      notes: "Includes a $5 service fee. Winners are drawn at 10 AM and 3 PM.",
    }),
  ),
  checked(
    "https://interaliabroadway.com/tickets/",
    boxOfficeProgram(
      "inter-alia",
      "rush",
      45,
      "Music Box Theatre",
      2,
      hours(
        "From box-office opening until sold out; the box office is closed Sundays",
        [MONDAY_TO_SATURDAY, "10:00", "20:00"],
      ),
    ),
  ),

  // justintimebroadway.com/faq: "$40 Rush tickets ... beginning when the
  // Circle in the Square Theatre box office opens ... in-person only ...
  // limited to 2 tickets per person and may be for any location, including
  // standing room." Box office (/tickets): MON 10am-6pm, TUES-SAT 10am-8pm,
  // SUN 12pm-6pm.
  checked(
    "https://justintimebroadway.com/faq",
    boxOfficeProgram(
      "just-in-time",
      "rush",
      40,
      "Circle in the Square Theatre",
      2,
      hours(
        UNTIL_SOLD_OUT,
        [[1], "10:00", "18:00"],
        [TUESDAY_TO_SATURDAY, "10:00", "20:00"],
        [[0], "12:00", "18:00"],
      ),
      "In person only. Seats may be anywhere, including standing room.",
    ),
  ),

  // Re-checked 2026-11-27 in a browser: lionking.com/lottery forwards to
  // Broadway Direct (not read), and the show's help center says only "The
  // Lion King offers a ticket lottery for select performances". TDF: "$35
  // tickets ... starting at 9 AM on the day prior to the performance until
  // 3 PM ... Winners have 60 minutes ... up to 2 tickets." This row said $60.
  unverified(
    "https://www.tdf.org/shows/1601/the-lion-king/",
    "The show's site confirms a lottery for select performances on Broadway Direct, but gives its terms only there. TDF says $35, 9 AM–3 PM the day before, with 60 minutes to pay. This row used to say $60.",
    broadwayDirectLottery(
      "the-lion-king",
      35,
      "https://lottery.broadwaydirect.com/show/the-lion-king/",
      "09:00",
      "15:00",
      { maxTickets: 2 },
    ),
  ),

  // lostboysmusical.com/tickets: lottery "$45 ... open at 7 AM ET the day
  // before each performance and close at 2 PM ET ... limit of two tickets per
  // entry"; rush "$45 ... when the Box Office opens. Limit of two". Dark
  // Mondays (no Monday performances on the calendar checked 2026-11-20).
  checked(
    "https://www.lostboysmusical.com/tickets",
    broadwayDirectLottery(
      "the-lost-boys",
      45,
      "https://lottery.broadwaydirect.com/show/lost-boys/",
      "07:00",
      "14:00",
      { maxTickets: 2, notes: "Lottery seats may be partially obstructed." },
    ),
  ),
  checked(
    "https://www.lostboysmusical.com/tickets",
    boxOfficeProgram(
      "the-lost-boys",
      "rush",
      45,
      "Palace Theatre",
      2,
      standardHours("tuesday"),
      "Subject to availability. Seats may be partial view.",
    ),
  ),

  // maybehappyending.com/tickets: "Club 2064 Digital Lottery ... up to two
  // $20.64 tickets ... Drawings will be made the day before each performance
  // at 10 AM and 3 PM ET", and the FAQ: "available for select performances".
  // Rush "$49 (inclusive of fees)", from 10:00am, Sundays 12:00pm; standing
  // room "$42 (inclusive of fees) ... for performances that are otherwise
  // sold out". Box office Mon–Sat 10:00am–8:00pm, Sunday noon–6pm.
  // $20.64 is real: the show is set in 2064.
  unverified(
    "https://www.maybehappyending.com/tickets/",
    "The show's site gives $20.64 on Telecharge, drawn at 10 AM and 3 PM the day before, but only for select performances, and doesn't say which or when entries open.",
    described(
      telechargeLottery("maybe-happy-ending", 20.64, {
        maxTickets: 2,
        notes: "Select performances only. Winners are drawn at 10 AM and 3 PM.",
      }),
      "The day before select performances; entry times not published",
    ),
  ),
  checked(
    "https://www.maybehappyending.com/tickets/",
    boxOfficeProgram(
      "maybe-happy-ending",
      "rush",
      49,
      "Belasco Theatre",
      undefined,
      standardHours(),
      "Fees included. First come, first served.",
    ),
  ),
  checked(
    "https://www.maybehappyending.com/tickets/",
    boxOfficeProgram(
      "maybe-happy-ending",
      "sro",
      42,
      "Belasco Theatre",
      undefined,
      standardHours(),
      "Fees included. Only for otherwise sold-out performances.",
    ),
  ),

  // newyork.mjthemusical.com/tickets: "$49 ... Lottery opens at 9am ET and
  // closes at 3pm ET the day before each performance." No limit or claim
  // time; the FAQ says prices include fees.
  checked(
    "https://newyork.mjthemusical.com/tickets/",
    broadwayDirectLottery(
      "mj-the-musical",
      49,
      "https://lottery.broadwaydirect.com/show/mj-ny/",
      "09:00",
      "15:00",
      { notes: "Fees included. Seats may be partial view." },
    ),
  ),

  // muchadobroadway.com/tickets: "start at 12:00 AM ET, one day before ...
  // drawn the same day at 10:00 AM ET and 3:00 PM ET ... up to two tickets at
  // $49 each (inclusive of $5 service fee)"; entry at rush.telecharge.com.
  checked(
    "https://muchadobroadway.com/tickets/",
    telechargeLottery("much-ado-about-nothing", 49, {
      maxTickets: 2,
      notes: "Includes a $5 service fee. Winners are drawn at 10 AM and 3 PM.",
    }),
  ),

  // ohmaryplay.com/box-office-accessibility: "$47 Digital Lottery: Entries
  // open at 12:00 AM one day before the performance. Winners are drawn at
  // 10:00 AM and 3:00 PM", entered at ohmaryplay.com/lottery; "$43 In-Person
  // Rush ... on the day of performance at the Lyceum Theatre Box Office".
  // Box office Mon–Fri 10–8, Saturday 10–8:30, Sunday noon–6:30.
  checked(
    "https://www.ohmaryplay.com/box-office-accessibility",
    telechargeLottery("oh-mary", 47, {
      platform: "official-site",
      entryUrl: "https://www.ohmaryplay.com/lottery",
    }),
  ),
  checked(
    "https://www.ohmaryplay.com/box-office-accessibility",
    boxOfficeProgram(
      "oh-mary",
      "rush",
      43,
      "Lyceum Theatre",
      undefined,
      hours(
        UNTIL_SOLD_OUT,
        [MONDAY_TO_FRIDAY, "10:00", "20:00"],
        [[6], "10:00", "20:30"],
        [[0], "12:00", "18:30"],
      ),
    ),
  ),

  // operationbroadway.com: "Daily Lottery — Enter by 3pm for your chance to
  // access $49 tickets for the following day's performance", on the show's
  // own sign-up form; its tickets page still says "Be the first to hear about
  // the official Operation Mincemeat Lottery". TDF: $39 on Telecharge. Rush:
  // "$49 each for the day of the performance" at the Golden; no hours.
  unverified(
    "https://operationbroadway.com/#daily",
    "The show's site shows a $49 daily lottery on its own sign-up form, but its tickets page says the lottery is still to come. TDF says $39 on Telecharge.",
    program(
      "operation-mincemeat",
      "digital-lottery",
      "official-site",
      49,
      undefined,
      "https://operationbroadway.com/#daily",
      dailyWindow(
        "Enter by 3 PM for the next day's performance",
        "00:00",
        "15:00",
      ),
    ),
  ),
  unverified(
    "https://operationbroadway.com/tickets/",
    "The show's site gives $49 at the Golden box office on the day, but no box-office hours. TDF says it opens at 10 AM (noon Sunday), up to two.",
    boxOfficeProgram(
      "operation-mincemeat",
      "rush",
      49,
      "John Golden Theatre",
      undefined,
      standardHours("monday", "At the box office on the day; hours not published"),
    ),
  ),

  // otherdesertcitiesbroadway.com/tickets: "Lucky Seat for $49 each ...
  // Entries open each day at 12pm ET ... For weekday performances, entries
  // will be accepted until 10:30AM ET the day before ... For weekend
  // performances ... until 10:30AM ET the Friday before ... winners being
  // selected beginning at 11AM ET ... a limited window ... Limit of two";
  // rush "$49 the morning of each performance on the TodayTix app, beginning
  // at 9AM ET ... up to two tickets".
  checked(
    "https://otherdesertcitiesbroadway.com/tickets/",
    program(
      "other-desert-cities",
      "digital-lottery",
      "lucky-seat",
      49,
      2,
      "https://www.luckyseat.com/shows/otherdesertcities-newyork-2026Sep",
      dailyWindow(
        "Opens at noon; enter by 10:30 AM the day before (the Friday before for weekend shows)",
        "12:00",
        "10:30",
        [0, 1, 2, 3, 4],
      ),
      {
        notes:
          "Winners are drawn from 11 AM and have a limited window to buy.",
        tips: [LUCKY_SEAT_TIP],
      },
    ),
  ),
  checked(
    "https://otherdesertcitiesbroadway.com/tickets/",
    todayTixRush(
      "other-desert-cities",
      49,
      "https://www.todaytix.com/nyc/shows/47066-other-desert-cities",
      2,
    ),
  ),

  // outsidersmusical.com/faqs: lottery "open at 12 AM on the day before ...
  // drawn at 10am and 3pm ... five hours to claim ... up to 2 tickets at $49";
  // rush "beginning at 10am the day of the performance (and 12pm on Sundays)
  // ... limit of two ... $45"; "$30 Under 30" on the same terms. Box office
  // Mon–Sat 10am–8pm, Sunday 12pm–6pm. No standing room.
  checked(
    "https://outsidersmusical.com/faqs/",
    telechargeLottery("the-outsiders", 49, { maxTickets: 2, claimHours: 5 }),
  ),
  checked(
    "https://outsidersmusical.com/faqs/",
    boxOfficeProgram(
      "the-outsiders",
      "rush",
      45,
      "Bernard B. Jacobs Theatre",
      2,
      standardHours(),
      "Subject to availability. $30 Under 30 tickets are sold on the same terms with ID.",
    ),
  ),

  // paranormalbroadway.com/tickets: "Digital rush tickets are available for
  // $40 the morning of each performance on the TodayTix app, beginning at 9
  // a.m. ... up to two"; "In-person $40 rush tickets ... at the August Wilson
  // Theatre box office ... up to two". No visible box-office hours. Its $40
  // Lucky Seat lottery publishes no times, so it isn't listed.
  checked(
    "https://paranormalbroadway.com/tickets",
    todayTixRush(
      "paranormal-activity",
      40,
      "https://www.todaytix.com/nyc/shows/46971-paranormal-activity",
      2,
    ),
  ),
  unverified(
    "https://paranormalbroadway.com/tickets",
    "The show's site gives $40 at the August Wilson box office on the day, up to two, but no box-office hours.",
    boxOfficeProgram(
      "paranormal-activity",
      "rush",
      40,
      "August Wilson Theatre",
      2,
      standardHours("monday", "At the box office on the day; hours not published"),
    ),
  ),

  // rockyhorrorshowbroadway.com/faq: "$30 digital lottery tickets ... winners
  // of the TodayTix lottery", no window; "$30 rush tickets will be offered at
  // the Studio 54 box office for same-day performances only". Box office
  // Monday 12pm–6pm, Tuesday–Saturday 10am–8pm, Sunday 12pm–6pm.
  unverified(
    "https://rockyhorrorshowbroadway.com/faq",
    "The show's site gives $30 on TodayTix but not the entry window. TodayTix's page listed 5 PM the day before to 9 AM the day of on Nov 21.",
    program(
      "rocky-horror-show",
      "digital-lottery",
      "todaytix",
      30,
      undefined,
      "https://www.todaytix.com/nyc/shows/43905-the-rocky-horror-show-on-broadway",
      dailyWindow(
        "5 PM the day before–9 AM the day of, per TodayTix on Nov 21",
        "17:00",
        "09:00",
        MONDAY_TO_SATURDAY,
      ),
      { notes: "Winners buy in the TodayTix app." },
    ),
  ),
  checked(
    "https://rockyhorrorshowbroadway.com/faq",
    boxOfficeProgram(
      "rocky-horror-show",
      "rush",
      30,
      "Studio 54",
      undefined,
      hours(
        UNTIL_SOLD_OUT,
        [[1], "12:00", "18:00"],
        [TUESDAY_TO_SATURDAY, "10:00", "20:00"],
        [[0], "12:00", "18:00"],
      ),
      "Same-day performances only.",
    ),
  ),

  // schmigadoonbroadway.com/tickets: "open from 10AM-2PM on the day prior ...
  // Winners are drawn as soon as entries close ... 1 hour to purchase up to 2
  // tickets ... at $45 each (inclusive of fees)"; rush "$40 ... Limit 2". Box
  // office Mondays–Saturdays 10am–8pm, Sundays 12pm–6pm; dark Mondays.
  checked(
    "https://schmigadoonbroadway.com/tickets/",
    broadwayDirectLottery(
      "schmigadoon",
      45,
      "https://lottery.broadwaydirect.com/schmigadoon-ny",
      "10:00",
      "14:00",
      {
        maxTickets: 2,
        claimMinutes: 60,
        notes: "Fees included. Winners are drawn as soon as entries close.",
      },
    ),
  ),
  checked(
    "https://schmigadoonbroadway.com/tickets/",
    boxOfficeProgram(
      "schmigadoon",
      "rush",
      40,
      "Nederlander Theatre",
      2,
      standardHours("tuesday"),
      "First come, first served.",
    ),
  ),

  // sixonbroadway.com/lottery: "$45 ... open at 9AM & closes at 6PM the day
  // prior ... two tickets per winner"; /faq: standing room "$49 the day of
  // the performance when the show is sold out ... at the box office only".
  // Box office Mon–Sat 10am–8pm, Sunday 12pm–6pm.
  checked(
    "https://sixonbroadway.com/lottery/",
    broadwayDirectLottery(
      "six",
      45,
      "https://lottery.broadwaydirect.com/show/six-ny/",
      "09:00",
      "18:00",
      { maxTickets: 2 },
    ),
  ),
  checked(
    "https://sixonbroadway.com/faq/",
    boxOfficeProgram("six", "sro", 49, "Lena Horne Theatre", undefined, standardHours()),
  ),

  // broadway.strangerthingsonstage.com/ticket-info: lottery "$45 ... open at
  // 7am ET the day before each performance and close at 2pm ET ... limit of
  // two tickets per entry"; rush "$40 ... Up to two ... may not be available
  // for all performances"; box office MON–SAT 10 AM–8 PM, SUN 12PM–7PM.
  checked(
    "https://broadway.strangerthingsonstage.com/ticket-info/",
    broadwayDirectLottery(
      "stranger-things-first-shadow",
      45,
      "https://lottery.broadwaydirect.com/show/st-nyc/",
      "07:00",
      "14:00",
      { maxTickets: 2 },
    ),
  ),
  checked(
    "https://broadway.strangerthingsonstage.com/ticket-info/",
    boxOfficeProgram(
      "stranger-things-first-shadow",
      "rush",
      40,
      "Marquis Theatre",
      2,
      hours(UNTIL_SOLD_OUT, [MONDAY_TO_SATURDAY, "10:00", "20:00"], [[0], "12:00", "19:00"]),
      "Subject to availability; not offered at every performance.",
    ),
  ),

  // wantedmusical.com/calendar: lottery "$45 ... opening at 12 AM ET the day
  // before each performance and closing at 3 PM ET that same day ... drawn at
  // 10 AM and 3 PM and have five hours to claim ... limit of two tickets per
  // entry" (was $35), with no entry link or seller named; TDF says
  // rush.telecharge.com. Rush "starting at $55 ... the day of the
  // performance, beginning at 10:00am and Sundays at 12:00pm"; box office
  // (/faq) Mon–Sat 10:00 AM–8:00 PM, Sunday 12:00–6:00 PM.
  unverified(
    "https://wantedmusical.com/calendar/",
    "The show's site gives $45, midnight–3 PM the day before and five hours to claim, and sells its tickets through Telecharge, but doesn't say where to enter the lottery. TDF says rush.telecharge.com.",
    telechargeLottery("wanted", 45, { maxTickets: 2, claimHours: 5 }),
  ),
  checked(
    "https://wantedmusical.com/calendar/",
    boxOfficeProgram(
      "wanted",
      "rush",
      55,
      "James Earl Jones Theatre",
      undefined,
      standardHours(),
      "Prices start at $55. First come, first served.",
    ),
  ),

  // wickedthemusical.com/faq: rush "$45 per ticket when the Gershwin Theatre
  // box office opens. The box office opens Monday through Saturday at 10am
  // and Sunday at 12pm. Maximum of two ... A $2 facility fee is included";
  // /tickets: "a digital lottery for select performances ... $55, including
  // all fees ... open the day before at 9am and close the day before at 3PM
  // ... 1 hour to purchase".
  checked(
    "https://wickedthemusical.com/faq/",
    boxOfficeProgram(
      "wicked",
      "rush",
      45,
      "Gershwin Theatre",
      2,
      standardHours("monday", "When the box office opens: 10 AM, noon on Sunday"),
      "Includes a $2 facility fee. Seats may be partial view.",
    ),
  ),
  checked(
    "https://www.wickedthemusical.com/tickets/",
    broadwayDirectLottery(
      "wicked",
      55,
      "https://lottery.broadwaydirect.com/show/wicked/",
      "09:00",
      "15:00",
      { claimMinutes: 60, notes: "Fees included. Select performances only." },
    ),
  ),

  /*
   * Off-Broadway programs (Phase 12). Only rows we could confirm; shows
   * without a verified program render "No verified program listed".
   */
  // littleshopnyc.com/tickets: "$45 tickets two days before the performance.
  // Enter from 12:00 AM until 3:00 PM. Limit of 2 tickets per winner." No
  // drawing times or claim window.
  checked(
    "https://littleshopnyc.com/tickets",
    program(
      "little-shop-of-horrors",
      "digital-lottery",
      "telecharge",
      45,
      2,
      "https://rush.telecharge.com/",
      dailyWindow(
        "Midnight–3 PM two days before a performance",
        "00:00",
        "15:00",
      ),
      { tips: [TELECHARGE_TIP] },
    ),
  ),
  // broadwaygoeswrong.com/tickets.php: "$35 tickets! Lottery opens at 12AM &
  // closes at 3PM two days prior to the performance." No claim time on the
  // show's page.
  checked(
    "https://broadwaygoeswrong.com/tickets.php",
    program(
      "the-play-that-goes-wrong",
      "digital-lottery",
      "official-site",
      35,
      undefined,
      "https://broadwaygoeswrong.com/lottery/",
      dailyWindow(
        "Midnight–3 PM two days before a performance",
        "00:00",
        "15:00",
      ),
    ),
  ),
  // perfect-crime.com: "Rush tickets are also available on TodayTix", with no
  // price or time. Dark Wednesdays (TDF's schedule).
  unverified(
    "https://www.perfect-crime.com/",
    "The show's site says only that rush tickets are on TodayTix. TodayTix's page listed $35 at 9 AM on Nov 21.",
    todayTixRush(
      "perfect-crime",
      35,
      "https://www.todaytix.com/nyc/shows/1299-perfect-crime",
      undefined,
      [0, 1, 2, 4, 5, 6],
    ),
  ),
];

function formatTime(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${suffix}`;
}
