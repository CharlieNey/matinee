/**
 * The schedule engine: program types, labels, and the code that turns a
 * weekly schedule into "open now" at a given instant. The rows themselves
 * live in programCatalog.ts.
 */
import { LAST_VERIFIED, PROGRAMS } from "@/lib/programCatalog";

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

/**
 * Oldest lastVerified across the catalog. A trust line that quotes only the
 * newest date overstates freshness when some rows could not be re-checked.
 */
export function programsOldestVerified(): string {
  let oldest = LAST_VERIFIED;
  for (const item of PROGRAMS) {
    if (item.lastVerified < oldest) oldest = item.lastVerified;
  }
  return oldest;
}

/** "45 min", "2 hr", "5 hr", "1 hr 30 min". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
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

/** New York wall-clock hour (0–23) of an instant. */
export function etHour(date: Date): number {
  return getZonedParts(date).hour;
}

/**
 * The instant of `time` (HH:MM, New York wall clock) on the New York calendar
 * day of `date`, shifted by `dayOffset` days. DST-safe: "08:00 tomorrow" is
 * 8 AM local whichever offset tomorrow has.
 */
export function etWallClock(date: Date, time: string, dayOffset = 0): Date {
  return zonedDate(calendarDate(getZonedParts(date), dayOffset), time);
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

/** Days a row may go unchecked before it reads as unverified (and /api/health fails). */
export const STALE_AFTER_DAYS = 14;

/**
 * True once noon New York time on lastVerified is more than STALE_AFTER_DAYS
 * old. Noon is resolved in the zone, so the boundary holds across DST.
 */
export function isProgramStale(item: Program, now: Date): boolean {
  const [year, month, day] = item.lastVerified.split("-").map(Number);
  const verifiedAt = zonedDate({ year, month, day }, "12:00");
  return (
    now.getTime() - verifiedAt.getTime() >
    STALE_AFTER_DAYS * 24 * 60 * 60 * 1000
  );
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
