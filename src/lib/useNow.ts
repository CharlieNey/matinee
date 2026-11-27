"use client";

import { useEffect, useState } from "react";

/**
 * Hydration-safe wall-clock ticker shared by live program surfaces: null on
 * the server and first client render, then the current time every
 * `intervalMs`. Program status is a pure function of this value.
 */
export function useNow(intervalMs = 30_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
