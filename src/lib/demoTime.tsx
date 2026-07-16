"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Demo time machine (PLAN.md Phase 5). The rush board is a pure function of
 * `now`, so simulating time is one number: an offset added to the real clock.
 * Per-tab (sessionStorage), never the default, and always visibly labeled in
 * the UI. The push-notification pipeline runs server-side and is unaffected.
 */

const STORAGE_KEY = "theatr-demo-time-v1";
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

export function DemoTimeProvider({ children }: { children: React.ReactNode }) {
  const [offsetMs, setOffsetMs] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved !== null && !Number.isNaN(Number(saved))) {
        setOffsetMs(Number(saved));
      }
    } catch {
      // Storage unavailable — stay live.
    }
  }, []);

  const scrubTo = useCallback((dayOffset: number, minuteOfDay: number) => {
    const real = new Date();
    const current = etClock(real);
    const deltaMinutes =
      dayOffset * 24 * 60 + minuteOfDay - current.minuteOfDay;
    // Land exactly on the chosen minute: also cancel the current seconds.
    const next = deltaMinutes * 60_000 - current.seconds * 1_000;
    setOffsetMs(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, String(next));
    } catch {}
  }, []);

  const backToLive = useCallback(() => {
    setOffsetMs(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
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
