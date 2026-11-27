import type { LotteryEntry } from "./entries";
import { allPrograms, etDayKey, Program, programKey } from "./programs";
import { getShow } from "./shows";

/**
 * Your own lottery odds, per show, from this device's "I entered" and "I
 * won" taps (docs/proposals/win-loss-reports.md, version 1). Nothing leaves
 * the device. An entry counts once its drawing has happened: today's daily
 * entries, and a weekly lottery's until its window closes (Hamilton draws on
 * Thursday for entries from the Friday before), are still waiting.
 */

export type ShowRecord = {
  slug: string;
  title: string;
  /** Entries whose drawing has happened (wins included). */
  entries: number;
  wins: number;
  /** Entries still waiting on their drawing. */
  waiting: number;
};

const LOTTERY_KINDS = new Set(["digital-lottery", "in-person-lottery"]);
const DAY = 24 * 60 * 60 * 1000;

/** Days between two YYYY-MM-DD dates (b after a). */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY);
}

/** How many days after an entry its drawing can still be pending. */
function waitDays(program: Program | undefined): number {
  if (!program) return 0;
  return Math.max(0, ...program.schedule.windows.map((w) => w.closesDayOffset ?? 0));
}

export function recordByShow(
  log: readonly LotteryEntry[],
  now: Date,
  programs: readonly Program[] = allPrograms(),
): ShowRecord[] {
  const today = etDayKey(now);
  const byKey = new Map(programs.map((program) => [programKey(program), program]));
  const byShow = new Map<string, ShowRecord>();

  for (const entry of log) {
    // Keys are show/kind/platform; parse them so a retired row still counts.
    const [slug, kind] = entry.key.split("/");
    if (!slug || !LOTTERY_KINDS.has(kind)) continue;
    const record = byShow.get(slug) ?? {
      slug,
      title: getShow(slug)?.title ?? slug,
      entries: 0,
      wins: 0,
      waiting: 0,
    };
    if (entry.won) {
      record.entries += 1;
      record.wins += 1;
    } else if (daysBetween(entry.day, today) <= waitDays(byKey.get(entry.key))) {
      record.waiting += 1;
    } else {
      record.entries += 1;
    }
    byShow.set(slug, record);
  }

  return [...byShow.values()].sort(
    (a, b) =>
      b.entries + b.waiting - (a.entries + a.waiting) ||
      b.wins - a.wins ||
      a.title.localeCompare(b.title),
  );
}

const wins = (n: number) => `${n} win${n === 1 ? "" : "s"}`;
const entries = (n: number) => `${n} ${n === 1 ? "entry" : "entries"}`;

/** "1 win in 14 entries", "No wins in 6 entries · 1 waiting on the draw". */
export function recordLine(record: ShowRecord): string {
  const parts: string[] = [];
  if (record.entries > 0) {
    parts.push(
      record.wins > 0
        ? `${wins(record.wins)} in ${entries(record.entries)}`
        : `No wins in ${entries(record.entries)}`,
    );
  }
  if (record.waiting > 0) parts.push(`${record.waiting} waiting on the draw`);
  return parts.join(" · ");
}
