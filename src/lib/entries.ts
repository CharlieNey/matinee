"use client";

import { useCallback, useEffect, useState } from "react";
import { etDayKey, Program, programKey } from "./programs";

/**
 * The lottery log (Phase 8 substrate): which programs the user tapped
 * "I entered" on, per NYC calendar day. localStorage only — no platform
 * integration — but synced onto the push subscription so the cron can arm
 * claim-window watches. A stats view is deliberately deferred (go/no-go in
 * PLAN.md).
 */

const STORAGE_KEY = "theatr-lottery-log-v1";
const SYNC_EVENT = "theatr-lottery-log";
const MAX_ENTRIES = 400;

export type LotteryEntry = {
  /** programKey() of the entered program. */
  key: string;
  /** NYC calendar day (YYYY-MM-DD) the entry was made. */
  day: string;
  /** ISO timestamp of the tap — substrate for a possible stats view. */
  at: string;
};

export function readLotteryLog(): LotteryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLotteryLog(entries: LotteryEntry[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(-MAX_ENTRIES)),
    );
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    // Private browsing — the log just won't persist.
  }
}

export function onLotteryLogChange(listener: () => void): () => void {
  window.addEventListener(SYNC_EVENT, listener);
  return () => window.removeEventListener(SYNC_EVENT, listener);
}

/** Entered/undo state for one program on the current (possibly demo) day. */
export function useEnteredToday(program: Program, now: Date | null) {
  const key = programKey(program);
  const day = now ? etDayKey(now) : null;
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!day) return;
    const sync = () =>
      setEntered(
        readLotteryLog().some((e) => e.key === key && e.day === day),
      );
    sync();
    return onLotteryLogChange(sync);
  }, [key, day]);

  const toggle = useCallback(() => {
    if (!day) return;
    const log = readLotteryLog();
    const exists = log.some((e) => e.key === key && e.day === day);
    writeLotteryLog(
      exists
        ? log.filter((e) => !(e.key === key && e.day === day))
        : [...log, { key, day, at: new Date().toISOString() }],
    );
  }, [key, day]);

  return { entered, toggle };
}
