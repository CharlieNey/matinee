import {
  allPrograms,
  etDayKey,
  etHour,
  etWallClock,
  isProgramTrusted,
  Program,
  programKey,
  programOccurrencesNear,
  ProgramOccurrence,
} from "../programs";

/**
 * Which alerts are due at an instant. Pure: the catalog and the clock in,
 * alerts out. docs/NOTIFICATIONS.md is the spec; constants are named there.
 */

export type PushAlertKind = "opening" | "last-call" | "claim";

/** A lottery-log match: an entry for `key` on one of `days` (NYC dates). */
export type EntryMatch = { key: string; days: string[] };

export type PushEvent = {
  /** Ledger identity: one push per (subscription, eventKey), ever. */
  eventKey: string;
  /**
   * Alerts sharing a group are sent as one notification (same show, same
   * minute). Also the notification tag, so a repeat replaces, never stacks.
   */
  group: string;
  kind: PushAlertKind;
  slug: string;
  program: Program;
  opensAt: Date;
  closesAt: Date;
  whileSuppliesLast: boolean;
  /** When the alert is announced: the opening, or 8 AM after a quiet night. */
  announceAt: Date;
  /** Due while sendFrom <= now < sendUntil; never sent after sendUntil. */
  sendFrom: Date;
  sendUntil: Date;
  /** When the message stops being useful — the push TTL anchor. */
  expiresAt: Date;
  urgency: "high" | "normal";
  audience:
    | { type: "followers"; exceptEntered?: EntryMatch }
    | { type: "entrants"; entered: EntryMatch };
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Heads-up before an opening. One scheduler tick per minute lands inside it. */
export const OPENING_LEAD_MS = 5 * MINUTE;
/** Catch-up limit after a rush opens: past this, "rush opens at 10" is stale. */
export const RUSH_GRACE_MS = 15 * MINUTE;
/** Catch-up limit after a lottery is announced (it stays enterable longer). */
export const LOTTERY_GRACE_MS = 60 * MINUTE;
/** No opening alert this close to the close; no catch-up past it either. */
export const CLOSE_MARGIN_MS = 15 * MINUTE;
/** Last call fires this long before a lottery closes... */
export const LAST_CALL_BEFORE_MS = 60 * MINUTE;
/** ...stops this long before it, when entering is no longer realistic... */
export const LAST_CALL_STOP_MS = 10 * MINUTE;
/** ...and only if the window ran this long after the opening alert. */
export const LAST_CALL_MIN_GAP_MS = 3 * HOUR;
/** Claim watch: sent in the half hour after a lottery closes. */
export const CLAIM_GRACE_MS = 30 * MINUTE;
export const CLAIM_EXPIRES_MS = 3 * HOUR;
/** Quiet hours, New York time: [22:00, 08:00). */
export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 8;

const LOTTERY_KINDS = new Set<Program["kind"]>([
  "digital-lottery",
  "in-person-lottery",
]);

export function isQuietHour(at: Date): boolean {
  const hour = etHour(at);
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

/** The end of the quiet stretch containing `at` (8 AM New York). */
function quietEnds(at: Date): Date {
  return etHour(at) < QUIET_END_HOUR
    ? etWallClock(at, "08:00")
    : etWallClock(at, "08:00", 1);
}

/** NYC days an entry for this occurrence could have been logged on. */
function entryDays(opensAt: Date, closesAt: Date): string[] {
  const days = new Set<string>();
  for (let t = opensAt.getTime(); t < closesAt.getTime(); t += 24 * HOUR) {
    days.add(etDayKey(new Date(t)));
  }
  days.add(etDayKey(closesAt));
  return [...days];
}

const minDate = (a: Date, b: Date) => (a < b ? a : b);
const maxDate = (a: Date, b: Date) => (a > b ? a : b);

/** Every alert a program occurrence can produce, due or not. */
export function alertsForOccurrence(
  program: Program,
  occurrence: ProgramOccurrence,
): PushEvent[] {
  // Standing room is sold only when a performance sells out: no clock.
  if (program.kind === "sro") return [];

  const { opensAt, closesAt, whileSuppliesLast } = occurrence;
  const key = programKey(program);
  const isLottery = LOTTERY_KINDS.has(program.kind);
  const base = {
    slug: program.showSlug,
    program,
    opensAt,
    closesAt,
    whileSuppliesLast,
  };
  const entered: EntryMatch = { key, days: entryDays(opensAt, closesAt) };
  const alerts: PushEvent[] = [];

  // Opening — 5 minutes ahead, or at 8 AM when it opened during quiet hours.
  const deferred = isQuietHour(opensAt);
  const announceAt = deferred ? quietEnds(opensAt) : opensAt;
  const openingFits =
    announceAt.getTime() < closesAt.getTime() - 2 * CLOSE_MARGIN_MS;
  if (openingFits) {
    const grace = whileSuppliesLast ? RUSH_GRACE_MS : LOTTERY_GRACE_MS;
    alerts.push({
      ...base,
      eventKey: `${key}|opening|${opensAt.toISOString()}`,
      group: `${program.showSlug}|opening|${announceAt.toISOString()}`,
      kind: "opening",
      announceAt,
      sendFrom: deferred
        ? announceAt
        : new Date(opensAt.getTime() - OPENING_LEAD_MS),
      sendUntil: minDate(
        new Date(announceAt.getTime() + grace),
        new Date(closesAt.getTime() - CLOSE_MARGIN_MS),
      ),
      expiresAt: whileSuppliesLast
        ? maxDate(new Date(opensAt.getTime() + 30 * MINUTE), announceAt)
        : closesAt,
      urgency: whileSuppliesLast ? "high" : "normal",
      audience: { type: "followers" },
    });
  }

  // Last call — lotteries only, when the window outlasts the opening alert.
  const lastCallAt = new Date(closesAt.getTime() - LAST_CALL_BEFORE_MS);
  if (
    isLottery &&
    !whileSuppliesLast &&
    closesAt.getTime() - announceAt.getTime() >= LAST_CALL_MIN_GAP_MS &&
    !isQuietHour(lastCallAt)
  ) {
    alerts.push({
      ...base,
      eventKey: `${key}|last-call|${opensAt.toISOString()}`,
      group: `${key}|last-call|${opensAt.toISOString()}`,
      kind: "last-call",
      announceAt: lastCallAt,
      sendFrom: lastCallAt,
      sendUntil: new Date(closesAt.getTime() - LAST_CALL_STOP_MS),
      expiresAt: closesAt,
      urgency: "high",
      audience: { type: "followers", exceptEntered: entered },
    });
  }

  // Claim watch — only for people who logged an entry for this window.
  if (program.claimWindow && !isQuietHour(closesAt)) {
    alerts.push({
      ...base,
      eventKey: `${key}|claim|${opensAt.toISOString()}`,
      group: `${key}|claim|${opensAt.toISOString()}`,
      kind: "claim",
      announceAt: closesAt,
      sendFrom: closesAt,
      sendUntil: new Date(closesAt.getTime() + CLAIM_GRACE_MS),
      expiresAt: new Date(closesAt.getTime() + CLAIM_EXPIRES_MS),
      urgency: "normal",
      audience: { type: "entrants", entered },
    });
  }

  return alerts;
}

/**
 * Alerts whose send window contains `now`. Nothing is due in quiet hours, and
 * nothing is ever due from a row the app can't vouch for at `now` (stale or
 * unverified): a wrong push sends people to a window that may not exist.
 */
export function duePushEvents(
  now: Date,
  programs: readonly Program[] = allPrograms(),
): PushEvent[] {
  if (isQuietHour(now)) return [];
  const due: PushEvent[] = [];
  const seen = new Set<string>();
  for (const program of programs) {
    if (!isProgramTrusted(program, now)) continue;
    for (const occurrence of programOccurrencesNear(now, program)) {
      for (const alert of alertsForOccurrence(program, occurrence)) {
        if (alert.sendFrom > now || now >= alert.sendUntil) continue;
        if (seen.has(alert.eventKey)) continue;
        seen.add(alert.eventKey);
        due.push(alert);
      }
    }
  }
  return due;
}

/**
 * The next opening alert for a show after `now`: the test push's sample and
 * the Follow card's "next alert". Untrusted rows are skipped here too, so the
 * app never promises an alert that won't be sent.
 */
export function nextOpeningAlert(
  slug: string,
  now: Date,
  programs: readonly Program[] = allPrograms(),
): PushEvent | null {
  let best: PushEvent | null = null;
  for (const program of programs) {
    if (program.showSlug !== slug) continue;
    for (const occurrence of programOccurrencesNear(now, program)) {
      for (const alert of alertsForOccurrence(program, occurrence)) {
        if (alert.kind !== "opening" || alert.sendFrom <= now) continue;
        // Trusted when it would be sent, not just now: a row can go stale
        // between today and next Friday's alert.
        if (!isProgramTrusted(program, alert.sendFrom)) continue;
        if (!best || alert.sendFrom < best.sendFrom) best = alert;
      }
    }
  }
  return best;
}

type EntryLike = { key: string; day: string };

function matches(entries: readonly EntryLike[], match: EntryMatch): boolean {
  return entries.some(
    (entry) => entry.key === match.key && match.days.includes(entry.day),
  );
}

/** Whether a subscription should get this alert. */
export function alertApplies(
  subscription: { slugs: readonly string[]; entries: readonly EntryLike[] },
  event: PushEvent,
): boolean {
  if (event.audience.type === "entrants") {
    return matches(subscription.entries, event.audience.entered);
  }
  if (!subscription.slugs.includes(event.slug)) return false;
  const except = event.audience.exceptEntered;
  return !(except && matches(subscription.entries, except));
}
