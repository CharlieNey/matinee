import { etDayKey, formatMinutes, Program } from "../programs";
import { getShow } from "../shows";
import type { PushEvent } from "./events";

/**
 * Notification text. Rules (docs/NOTIFICATIONS.md): the show first, clock
 * times never countdowns, the price and where to go, past tense on catch-up.
 */

export type PushMessage = {
  title: string;
  body: string;
  /** In-app deep link, opened by the service worker on tap. */
  url: string;
  /** Notification tag: a repeat with the same tag replaces, never stacks. */
  tag: string;
};

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});
const weekdayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
});

/** "3:00 PM", or "12:00 PM Thursday" when it isn't the day of `now`. */
function clock(at: Date, now: Date): string {
  const time = timeFormat.format(at);
  return etDayKey(at) === etDayKey(now)
    ? time
    : `${time} ${weekdayFormat.format(at)}`;
}

const KIND_WORDS: Record<Program["kind"], string> = {
  "digital-lottery": "lottery",
  "in-person-lottery": "in-person lottery",
  rush: "rush",
  "digital-rush": "rush",
  "student-rush": "student rush",
  sro: "standing room",
};

const WHERE: Record<Program["platform"], string> = {
  "broadway-direct": "on Broadway Direct",
  "lucky-seat": "on Lucky Seat",
  telecharge: "on Telecharge",
  todaytix: "in the TodayTix app",
  "official-site": "on the show’s site",
  "box-office": "at the box office",
};

const APP_NAMES: Record<Program["platform"], string> = {
  "broadway-direct": "Broadway Direct",
  "lucky-seat": "Lucky Seat",
  telecharge: "Telecharge",
  todaytix: "TodayTix",
  "official-site": "show’s",
  "box-office": "box office",
};

function price(value: number): string {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

function showTitle(slug: string): string {
  return getShow(slug)?.title ?? slug;
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

export function showUrl(slug: string): string {
  return `/shows/${slug}#ways-to-save`;
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** One opening, in the tense `now` calls for. */
function openingLine(event: PushEvent, now: Date) {
  const { program } = event;
  const kind = KIND_WORDS[program.kind];
  const where = `${price(program.price)} ${WHERE[program.platform]}`;
  const opened = now >= event.opensAt;
  if (event.whileSuppliesLast) {
    return {
      kind,
      verb: opened
        ? `opened at ${clock(event.opensAt, now)}`
        : `opens at ${clock(event.opensAt, now)}`,
      detail: `${where}, ${opened ? "while they last" : "first come, first served"}.`,
      where,
    };
  }
  return {
    kind,
    verb: opened
      ? `is open until ${clock(event.closesAt, now)}`
      : `opens at ${clock(event.opensAt, now)}`,
    detail: opened
      ? `${where}.`
      : `${where}. Enter by ${clock(event.closesAt, now)}.`,
    where,
  };
}

function renderOpening(events: PushEvent[], now: Date): Omit<PushMessage, "tag"> {
  const show = showTitle(events[0].slug);
  const url = showUrl(events[0].slug);
  if (events.length === 1) {
    const line = openingLine(events[0], now);
    return { title: `${show} ${line.kind} ${line.verb}`, body: line.detail, url };
  }

  // Same show, same minute: one notification.
  const lines = events.map((event) => openingLine(event, now));
  const sameVerb = lines.every((line) => line.verb === lines[0].verb);
  const kinds = joinWords(lines.map((line) => line.kind));
  const plural = lines[0].verb
    .replace(/^opens /, "open ")
    .replace(/^is open /, "are open ");
  const title = sameVerb
    ? `${show} ${kinds} ${plural}`
    : `${show} ${kinds} are open`;
  const samePlatform = events.every(
    (event) => event.program.platform === events[0].program.platform,
  );
  const body = samePlatform
    ? `${joinWords(events.map((event) => price(event.program.price)))} ${WHERE[events[0].program.platform]}.`
    : lines.map((line) => `${sentenceCase(line.kind)} ${line.where}.`).join(" ");
  return { title, body, url };
}

function renderLastCall(event: PushEvent, now: Date): Omit<PushMessage, "tag"> {
  const { program } = event;
  return {
    title: `${showTitle(event.slug)} ${KIND_WORDS[program.kind]} closes at ${clock(event.closesAt, now)}`,
    body: `Last hour to enter. ${price(program.price)} ${WHERE[program.platform]}.`,
    url: showUrl(event.slug),
  };
}

function renderClaim(event: PushEvent): Omit<PushMessage, "tag"> {
  const { program } = event;
  const claim = program.claimWindow;
  const watch =
    claim?.channel === "text"
      ? "Watch your texts."
      : claim?.channel === "app"
        ? `Watch the ${APP_NAMES[program.platform]} app.`
        : "Watch your email.";
  return {
    title: `${showTitle(event.slug)} ${KIND_WORDS[program.kind]} has closed. ${watch}`,
    body: claim
      ? `Winners usually hear ${claim.notifiedAround} and have ${formatMinutes(claim.minutes)} to buy.`
      : "Winners hear by email.",
    url: showUrl(event.slug),
  };
}

/** One notification for a group of alerts (same show, same group key). */
export function renderAlert(events: PushEvent[], now: Date): PushMessage {
  if (events.length === 0) throw new Error("renderAlert needs an alert");
  const first = events[0];
  const message =
    first.kind === "opening"
      ? renderOpening(events, now)
      : first.kind === "last-call"
        ? renderLastCall(first, now)
        : renderClaim(first);
  return { ...message, tag: first.group };
}

/**
 * The test push: a real alert for a followed show, rendered as it will look
 * when its window opens, so the demo shows the actual format and deep link.
 */
export function renderTestAlert(
  sample: PushEvent | null,
  now: Date,
): PushMessage {
  if (!sample) {
    return {
      title: "Matinee test alert",
      body: "Alerts work on this device. Follow a show to get its rush and lottery windows.",
      url: "/notify",
      tag: `matinee-test-${now.getTime()}`,
    };
  }
  // Rendered against the real clock, so a window days away names its day.
  const message = renderAlert([sample], now);
  return {
    ...message,
    title: `Test: ${message.title}`,
    tag: `matinee-test-${now.getTime()}`,
  };
}
