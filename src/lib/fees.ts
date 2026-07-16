import { ProgramPlatform } from "./programs";
import { OfficialTicketProvider } from "./officialTickets";

/**
 * Curated per-platform fee schedules (Phase 10). Fees are the #1 complaint
 * against every platform (MARKET.md), so we show all-in estimates — always
 * labeled approximate, never presented as a quote. Ranges because platforms
 * vary fees by show and price tier.
 */

export type FeeSchedule = {
  /** Per-ticket service fee range, dollars. */
  perTicket: [number, number];
  /** Flat per-order fee, if the platform charges one. */
  perOrder?: number;
};

export const FEES_LAST_VERIFIED = "2026-07-16";

/** null = no added fees (the box office's quiet superpower). */
const PLATFORM_FEES: Record<string, FeeSchedule | null> = {
  telecharge: { perTicket: [12, 15], perOrder: 3 },
  "broadway-direct": { perTicket: [13, 17] },
  todaytix: { perTicket: [10, 15] },
  "lucky-seat": { perTicket: [4, 6] },
  "official-site": { perTicket: [10, 15] },
  atg: { perTicket: [12, 16] },
  criterion: { perTicket: [10, 14] },
  roundabout: { perTicket: [10, 14] },
  "box-office": null,
};

const PROVIDER_KEYS: Record<OfficialTicketProvider, string> = {
  Telecharge: "telecharge",
  "Broadway Direct": "broadway-direct",
  "ATG Tickets": "atg",
  "Criterion Ticketing": "criterion",
  "Roundabout Theatre Company": "roundabout",
};

export type AllInEstimate =
  | { kind: "estimate"; low: number; high: number }
  | { kind: "no-fees" };

function estimate(
  price: number,
  schedule: FeeSchedule | null | undefined,
): AllInEstimate | null {
  if (schedule === undefined) return null;
  if (schedule === null) return { kind: "no-fees" };
  const order = schedule.perOrder ?? 0;
  return {
    kind: "estimate",
    low: Math.round(price + schedule.perTicket[0] + order),
    high: Math.round(price + schedule.perTicket[1] + order),
  };
}

export function allInForPlatform(
  price: number,
  platform: ProgramPlatform,
): AllInEstimate | null {
  return estimate(price, PLATFORM_FEES[platform]);
}

export function allInForProvider(
  price: number,
  provider: OfficialTicketProvider,
): AllInEstimate | null {
  return estimate(price, PLATFORM_FEES[PROVIDER_KEYS[provider]]);
}

/** One-line label per DESIGN.md voice: plain, numbers carry the emphasis. */
export function allInLabel(result: AllInEstimate): string {
  if (result.kind === "no-fees") return "No added fees at the box office";
  return result.low === result.high
    ? `≈ $${result.low} all-in with fees (est.)`
    : `≈ $${result.low}–${result.high} all-in with fees (est.)`;
}
