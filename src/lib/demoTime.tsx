"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";

/**
 * Demo time machine (PLAN.md Phase 5). The rush board is a pure function of
 * `now`, so simulating time is one number: an offset added to the real clock.
 * Per-tab (sessionStorage), never the default, and always visibly labeled in
 * the UI. The push-notification pipeline runs server-side and is unaffected.
 */

const STORAGE_KEY = "matinee-demo-time-v1";
const ET = "America/New_York";

type DemoTime = {
  /** null = live. Otherwise simulated now = real now + offsetMs. */
  offsetMs: number | null;
  /** Jump to a wall-clock time in NYC, `dayOffset` days from today. */
  scrubTo: (dayOffset: number, minuteOfDay: number) => void;
  backToLive: () => void;
};

const DemoTimeContext = createContext<DemoTime>({
  offsetMs: null,
  scrubTo: () => {},
  backToLive: () => {},
});

const etParts = new Intl.DateTimeFormat("en-US", {
  timeZone: ET,
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Minutes (and seconds) elapsed today in NYC at the given instant. */
function etClock(date: Date): { minuteOfDay: number; seconds: number } {
  const parts = Object.fromEntries(
    etParts
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, Number(p.value)]),
  );
  return {
    minuteOfDay: parts.hour * 60 + parts.minute,
    seconds: parts.second,
  };
}

/* The offset lives in a tiny module store — memory is the source of truth,
 * sessionStorage the per-tab mirror — so the provider can read it with
 * useSyncExternalStore instead of mirroring storage into post-mount state
 * (and scrubbing still works when storage is unavailable). */
let currentOffset: number | null | undefined;
const listeners = new Set<() => void>();

function readOffset(): number | null {
  if (currentOffset === undefined) {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      currentOffset =
        saved !== null && !Number.isNaN(Number(saved)) ? Number(saved) : null;
    } catch {
      // Storage unavailable — stay live.
      currentOffset = null;
    }
  }
  return currentOffset;
}

function writeOffset(next: number | null) {
  currentOffset = next;
  try {
    if (next === null) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, String(next));
  } catch {}
  listeners.forEach((notify) => notify());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

const readServerOffset = () => null;

export function DemoTimeProvider({ children }: { children: React.ReactNode }) {
  const offsetMs = useSyncExternalStore(subscribe, readOffset, readServerOffset);

  const scrubTo = useCallback((dayOffset: number, minuteOfDay: number) => {
    const real = new Date();
    const current = etClock(real);
    const deltaMinutes =
      dayOffset * 24 * 60 + minuteOfDay - current.minuteOfDay;
    // Land exactly on the chosen minute: also cancel the current seconds.
    writeOffset(deltaMinutes * 60_000 - current.seconds * 1_000);
  }, []);

  const backToLive = useCallback(() => {
    writeOffset(null);
  }, []);

  return (
    <DemoTimeContext.Provider value={{ offsetMs, scrubTo, backToLive }}>
      {children}
    </DemoTimeContext.Provider>
  );
}

export function useDemoTime(): DemoTime {
  return useContext(DemoTimeContext);
}
