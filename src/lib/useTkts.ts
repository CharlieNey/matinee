"use client";

import { useEffect, useState } from "react";
import { TktsData } from "./tkts";

/**
 * Client fetch of the normalized TKTS board (Phase 13). Null while loading or
 * when unavailable — every consumer degrades to its static presentation.
 * Deliberately real-time only: the board is external data the demo time
 * machine cannot simulate.
 */
export function useTkts(): TktsData | null {
  const [data, setData] = useState<TktsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tkts")
      .then((response) => (response.ok ? response.json() : null))
      .then((json: TktsData | null) => {
        if (!cancelled && json?.ok) setData(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
