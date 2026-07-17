"use client";

import { useCallback, useEffect, useState } from "react";
import { allPrograms, etDayKey, Program, programKey } from "./programs";

/**
 * The lottery log (Phase 8 substrate): which programs the user tapped
 * "I entered" on, per NYC calendar day. localStorage only — no platform
 * integration — but synced onto the push subscription so the cron can arm
 * claim-window watches. A stats view is deliberately deferred (go/no-go in
 * PLAN.md).
 */

const STORAGE_KEY = "matinee-lottery-log-v1";
/** Pre-rebrand key — read as a fallback so existing logs survive. */
const LEGACY_STORAGE_KEY = "theatr-lottery-log-v1";
const SYNC_EVENT = "matinee-lottery-log";
const MAX_ENTRIES = 400;

export type LotteryEntry = {
  /** programKey() of the entered program. */
  key: string;
  /** NYC calendar day (YYYY-MM-DD) the entry was made. */
  day: string;
  /** ISO timestamp of the tap — substrate for a possible stats view. */
  at: string;
  /** Set when the user taps "I won" (Phase 11 win card). */
  won?: boolean;
};

export function readLotteryLog(): LotteryEntry[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(LEGACY_STORAGE_KEY);
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

const SEED_MARKER = "matinee-lottery-seeded-v1";

/**
 * Demo seed (once ever): a short entry streak ending today, so a fresh
 * profile shows a live-looking record — the streak chip, a filled heatmap,
 * and a win. Real users are never touched: if a log already exists we only
 * set the marker and leave it alone. `now` should be the demo clock so the
 * seeded days line up with the streak calc.
 */
export function seedLotteryLogIfEmpty(now: Date): void {
  try {
    if (localStorage.getItem(SEED_MARKER)) return;
    localStorage.setItem(SEED_MARKER, "1");
    if (
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY)
    ) {
      return; // returning user with real entries — never overwrite
    }

    // One lottery/rush program each from a few distinct shows.
    const seen = new Set<string>();
    const pool = allPrograms().filter((program) => {
      const lotteryish =
        program.kind === "digital-lottery" ||
        program.kind === "in-person-lottery" ||
        program.kind === "rush" ||
        program.kind === "digital-rush";
      if (!lotteryish || seen.has(program.showSlug)) return false;
      seen.add(program.showSlug);
      return true;
    });
    if (pool.length === 0) return;

    // Four consecutive ET days ending today; yesterday's entry is a win.
    const day = 24 * 60 * 60 * 1000;
    const entries: LotteryEntry[] = [];
    for (let i = 0; i < 4; i++) {
      const program = pool[i % pool.length];
      const at = new Date(now.getTime() - i * day);
      entries.push({
        key: programKey(program),
        day: etDayKey(at),
        at: at.toISOString(),
        won: i === 1,
      });
    }
    writeLotteryLog(entries);
  } catch {
    // Storage unavailable — no seed, no streak. Harmless.
  }
}

/** Entered/won state for one program on the current (possibly demo) day. */
export function useEnteredToday(program: Program, now: Date | null) {
  const key = programKey(program);
  const day = now ? etDayKey(now) : null;
  const [entered, setEntered] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (!day) return;
    const sync = () => {
      const entry = readLotteryLog().find(
        (e) => e.key === key && e.day === day,
      );
      setEntered(entry !== undefined);
      setWon(entry?.won === true);
    };
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

  const markWon = useCallback(() => {
    if (!day) return;
    const log = readLotteryLog();
    const exists = log.some((e) => e.key === key && e.day === day);
    writeLotteryLog(
      exists
        ? log.map((e) =>
            e.key === key && e.day === day ? { ...e, won: true } : e,
          )
        : [...log, { key, day, at: new Date().toISOString(), won: true }],
    );
  }, [key, day]);

  return { entered, won, toggle, markWon };
}
