"use client";

import { useEffect, useState } from "react";
import { useDemoTime } from "./demoTime";

/**
 * Hydration-safe wall-clock ticker shared by live program surfaces.
 * When the demo time machine is scrubbing (see demoTime.tsx), the returned
 * clock carries its offset — every consumer re-derives instantly.
 */
export function useNow(intervalMs = 30_000): Date | null {
  const { offsetMs } = useDemoTime();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, intervalMs);
    return () => window.clearInterval(timer);
    // offsetMs in deps: re-tick immediately on scrub so the jump is exact.
  }, [intervalMs, offsetMs]);

  if (now === null) return null;
  return offsetMs === null ? now : new Date(now.getTime() + offsetMs);
}
