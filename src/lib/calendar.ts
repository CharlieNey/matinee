import { SITE_URL, formatCheckedDate } from "./contact";
import {
  allPrograms,
  isProgramTrusted,
  Program,
  programOccurrencesNear,
  programSourceLabel,
} from "./programs";
import { renderAlert } from "./push/copy";
import { alertsForOccurrence } from "./push/events";
import { getShow } from "./shows";

/**
 * A subscribable calendar of the opening alerts for the shows a visitor
 * follows (docs/proposals/calendar-feed.md). Each event sits exactly where
 * the push alert would: the same rules (5 minutes' warning, 8 AM for an
 * overnight opening, nothing from standing room), the same words, and the
 * same trust rule, so an unverified or stale row never makes an event. The
 * followed shows ride in the URL; nothing is stored.
 */

/** How far ahead the feed looks. Calendar apps refresh it every few hours. */
export const CALENDAR_DAYS = 14;
/** Each event is a short block at the moment to act, not the whole window. */
const EVENT_MINUTES = 30;
/** The calendar's own reminder, matching the push heads-up. */
const ALARM_MINUTES_BEFORE = 5;

const DAY = 24 * 60 * 60 * 1000;

export type CalendarEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  url: string;
};

/** The opening events for these shows from a day ago to CALENDAR_DAYS ahead. */
export function calendarEvents(
  slugs: readonly string[],
  now: Date,
  programs: readonly Program[] = allPrograms(),
): CalendarEvent[] {
  const wanted = new Set(slugs);
  const from = now.getTime() - DAY;
  const until = now.getTime() + CALENDAR_DAYS * DAY;
  const events = new Map<string, CalendarEvent>();

  for (const program of programs) {
    if (!wanted.has(program.showSlug)) continue;
    // programOccurrencesNear looks a week either side of its anchor.
    for (const anchor of [now.getTime(), now.getTime() + 7 * DAY, until]) {
      for (const occurrence of programOccurrencesNear(new Date(anchor), program)) {
        for (const alert of alertsForOccurrence(program, occurrence)) {
          if (alert.kind !== "opening") continue;
          const start = alert.announceAt.getTime();
          if (start < from || start >= until || events.has(alert.eventKey)) continue;
          // The same rule as push: never from a row we can't vouch for then.
          if (!isProgramTrusted(program, alert.announceAt)) continue;
          // Worded as the push would read when it goes out.
          const message = renderAlert([alert], alert.sendFrom);
          events.set(alert.eventKey, {
            uid: `${alert.eventKey.replace(/[^A-Za-z0-9-]/g, "-")}@matinee.nyc`,
            start: alert.announceAt,
            end: new Date(start + EVENT_MINUTES * 60 * 1000),
            summary: message.title,
            description: [
              message.body,
              `Enter: ${program.entryUrl}`,
              `${getShow(program.showSlug)?.title ?? program.showSlug} on Matinee: ${SITE_URL}${message.url}`,
              `Checked ${formatCheckedDate(program.lastVerified)} against ${programSourceLabel(program)}. Rules change, so check the official page before you go.`,
            ].join("\n"),
            url: program.entryUrl,
          });
        }
      }
    }
  }

  return [...events.values()].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || a.uid.localeCompare(b.uid),
  );
}

/** RFC 5545 TEXT: backslash, semicolon, comma and newline are escaped. */
function text(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** 20261201T140000Z */
function utc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Lines longer than 75 octets continue on the next line after a space. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** The whole feed as an iCalendar document. */
export function calendarFeed(
  slugs: readonly string[],
  now: Date,
  programs: readonly Program[] = allPrograms(),
): string {
  const titles = slugs.map((slug) => getShow(slug)?.title ?? slug);
  const name = `Matinee: ${titles.join(", ")}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Matinee//Rush and lottery openings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `NAME:${text(name)}`,
    `X-WR-CALNAME:${text(name)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  for (const event of calendarEvents(slugs, now, programs)) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${utc(now)}`,
      `DTSTART:${utc(event.start)}`,
      `DTEND:${utc(event.end)}`,
      `SUMMARY:${text(event.summary)}`,
      `DESCRIPTION:${text(event.description)}`,
      `URL:${event.url}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${text(event.summary)}`,
      `TRIGGER:-PT${ALARM_MINUTES_BEFORE}M`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** The feed's address for these shows, on whichever origin serves the page. */
export function calendarUrl(origin: string, slugs: readonly string[]): string {
  return `${origin}/api/calendar.ics?shows=${slugs.map(encodeURIComponent).join(",")}`;
}
