"use client";

import { Analytics } from "@vercel/analytics/next";
import { pageCountingEnabled, pathOnly } from "@/lib/pageCounting";

/** Cookieless page views, production only (src/lib/pageCounting.ts). */
export function PageCounter() {
  if (!pageCountingEnabled) return null;
  return <Analytics mode="production" beforeSend={pathOnly} />;
}
