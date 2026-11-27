import {
  allPrograms,
  etDayKey,
  isProgramTrusted,
  Program,
  programOccurrencesNear,
} from "./programs";

/**
 * "Enter today's lotteries": every lottery and rush window that is open now
 * or opens later today (New York), in the order to act on them. Pure: the
 * clock and the catalog in, the list out. Standing room is left out: it's
 * sold only when a show sells out, so there is nothing to enter.
 */

export type TodayWindow = {
  program: Program;
  opensAt: Date;
  closesAt: Date;
  whileSuppliesLast: boolean;
};

export type TodayList = {
  /** Open now, closing soonest first. */
  open: TodayWindow[];
  /** Opening later today, soonest first. */
  later: TodayWindow[];
  /**
   * Rows we can't vouch for whose listed times fall today. Shown apart and
   * without times, because the times are what's in doubt.
   */
  unverified: Program[];
};

/** The window that is open at `now`, or the next one opening later today. */
function windowToday(now: Date, program: Program): TodayWindow | null {
  const today = etDayKey(now);
  for (const occurrence of programOccurrencesNear(now, program)) {
    const openNow = occurrence.opensAt <= now && now < occurrence.closesAt;
    const laterToday =
      occurrence.opensAt > now && etDayKey(occurrence.opensAt) === today;
    if (openNow || laterToday) return { program, ...occurrence };
  }
  return null;
}

export function todaysWindows(
  now: Date,
  programs: readonly Program[] = allPrograms(),
): TodayList {
  const list: TodayList = { open: [], later: [], unverified: [] };
  for (const program of programs) {
    if (program.kind === "sro") continue;
    const window = windowToday(now, program);
    if (!window) continue;
    if (!isProgramTrusted(program, now)) list.unverified.push(program);
    else if (window.opensAt <= now) list.open.push(window);
    else list.later.push(window);
  }
  list.open.sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime());
  list.later.sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime());
  return list;
}

const RUSH_DONE_KEY = "matinee-rush-done-v1";

/**
 * Rush ticks ("I tried the Wicked rush today") live apart from the lottery
 * log, so they never count as lottery entries in the diary's stats. One day
 * is kept; a new day starts empty.
 */
export function readRushDone(day: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RUSH_DONE_KEY) ?? "null");
    return parsed?.day === day && Array.isArray(parsed.keys) ? parsed.keys : [];
  } catch {
    return [];
  }
}

const RUSH_DONE_EVENT = "matinee-rush-done";

/** Tick or untick a rush for one NYC day. */
export function toggleRushDone(key: string, day: string): void {
  const keys = readRushDone(day);
  try {
    localStorage.setItem(
      RUSH_DONE_KEY,
      JSON.stringify({
        day,
        keys: keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key],
      }),
    );
  } catch {
    // Private browsing: the tick just won't survive a reload.
  }
  window.dispatchEvent(new Event(RUSH_DONE_EVENT));
}

/** Changes from this tab and from other tabs ("storage"). */
export function onRushDoneChange(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === RUSH_DONE_KEY) listener();
  };
  window.addEventListener(RUSH_DONE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(RUSH_DONE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
