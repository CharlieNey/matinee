"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up once on mount (400ms), then eases between later values. Never loops. */
export function useCountUp(target: number, duration = 400): number {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const firstRun = useRef(true);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      fromRef.current = target;
      const raf = requestAnimationFrame(() => setDisplay(target));
      return () => cancelAnimationFrame(raf);
    }

    const from = firstRun.current ? 0 : fromRef.current;
    const ms = firstRun.current ? duration : 250;
    firstRun.current = false;
    fromRef.current = target;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}
