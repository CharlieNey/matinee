import { etDayKey } from "./programs";

/**
 * Times the way a New Yorker says them, in New York time: "3 PM", "10:30 AM",
 * "noon", "midnight"; "tomorrow 9 AM" and "Thu noon" for other days. One
 * formatter for every screen, so the board, the checklist and the follow list
 * never disagree about how to say the same moment.
 */
const time = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});
const weekday = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
});
const DAY = 24 * 60 * 60 * 1000;

/** "3 PM", "10:30 AM", "noon", "midnight". */
export function nyTime(at: Date): string {
  const text = time.format(at).replace(/ /g, " ");
  if (text === "12:00 PM") return "noon";
  if (text === "12:00 AM") return "midnight";
  return text.replace(":00 ", " ");
}

/** nyTime, with "tomorrow" or the weekday when it isn't today in New York. */
export function nyClock(at: Date, now: Date): string {
  const day = etDayKey(at);
  if (day === etDayKey(now)) return nyTime(at);
  if (day === etDayKey(new Date(now.getTime() + DAY))) return `tomorrow ${nyTime(at)}`;
  return `${weekday.format(at)} ${nyTime(at)}`;
}

/** "5 min", "1 hr 10 min": for the last hour, when a countdown helps. */
export function shortWait(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} hr ${rest} min` : `${minutes / 60} hr`;
}
