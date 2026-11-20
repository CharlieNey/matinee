import { Show } from "./shows";

/** A followed show (Phase 14) — the push cron tracks its program windows. */
export type Follow = {
  id: string;
  show: Show;
  enabled: boolean;
};

/** First run: no name until the visitor adds one. Nothing is seeded. */
export const emptyProfile = { name: "", handle: "", bio: null as string | null };
