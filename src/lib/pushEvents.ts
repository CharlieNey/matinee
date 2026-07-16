import {
  allPrograms,
  etDayKey,
  getProgramStatus,
  Program,
  programKey,
  programKindLabel,
  programOccurrencesNear,
  programPlatformLabel,
} from "./programs";
import { show } from "./shows";

export type PushEvent = {
  /** Show this event belongs to; matched against subscribers' slugs. */
  slug: string;
  /** Stable identity for (program, occurrence, kind) — the dedup key. */
  eventKey: string;
  title: string;
  body: string;
  url: string;
  /**
   * Claim-watch events go only to subscribers whose synced lottery log has
   * an entry for this program on one of these NYC days (the entry window's
   * span) — not to everyone following the show.
   */
  requiresEntry?: { key: string; days: string[] };
};

/**
 * How far past a window's opening we still count it as "just opened". Covers
 * the cron cadence (15 min) plus scheduler jitter without double-sending —
 * dedup is by occurrence, so a late second run is filtered by the log.
 */
const OPENED_GRACE_MS = 30 * 60 * 1000;
/** How far past a window's close the claim-watch push may still fire. */
const CLAIM_GRACE_MS = 30 * 60 * 1000;

const CHANNEL_HINTS: Record<string, string> = {
  email: "watch your email",
  text: "watch your texts",
  app: "watch the app",
};

const closeTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});

function price(value: number): string {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

/** NYC days an entry could have been made for this occurrence. */
function entryDays(opensAt: Date, closesAt: Date): string[] {
  const days = new Set<string>();
  for (
    let t = opensAt.getTime();
    t <= closesAt.getTime();
    t += 24 * 60 * 60 * 1000
  ) {
    days.add(etDayKey(new Date(t)));
  }
  days.add(etDayKey(closesAt));
  return [...days];
}

/**
 * Events due at `now`: a program window that just opened, or one inside its
 * final hour. A window in its final hour only produces the closing event.
 */
export function duePushEvents(now: Date): PushEvent[] {
  const events: PushEvent[] = [];

  for (const item of allPrograms()) {
    const status = getProgramStatus(now, item);
    if (!status.nextOpenAt) continue;
    const occurrence = status.nextOpenAt.toISOString();
    const kindLabel = programKindLabel(item.kind).toLowerCase();
    const title = show(item.showSlug).title;
    const meta = `${price(item.price)} · ${programPlatformLabel(item.platform)}`;

    // Claim-watch (Phase 8): the window just closed and this program notifies
    // winners on a clock — nudge the people who told us they entered.
    if (item.claimWindow) {
      for (const occurrence of programOccurrencesNear(now, item)) {
        const sinceClose = now.getTime() - occurrence.closesAt.getTime();
        if (sinceClose < 0 || sinceClose > CLAIM_GRACE_MS) continue;
        events.push({
          slug: item.showSlug,
          eventKey: `${programKey(item)}|claim|${occurrence.opensAt.toISOString()}`,
          title: `${title} ${kindLabel} closed — watch for winners`,
          body: `Winners usually notified ${item.claimWindow.notifiedAround} · ${item.claimWindow.minutes} min to claim, ${CHANNEL_HINTS[item.claimWindow.channel]}`,
          url: item.entryUrl,
          requiresEntry: {
            key: programKey(item),
            days: entryDays(occurrence.opensAt, occurrence.closesAt),
          },
        });
      }
    }

    if (status.state === "closes-soon" && status.countdownMs !== null) {
      const minutes = Math.max(1, Math.round(status.countdownMs / 60000));
      events.push({
        slug: item.showSlug,
        eventKey: `${programKey(item)}|closing|${occurrence}`,
        title: `${title} ${kindLabel} closes soon`,
        body: `${meta} · ${minutes} min left`,
        url: item.entryUrl,
      });
    } else if (
      status.state === "open" &&
      now.getTime() - status.nextOpenAt.getTime() <= OPENED_GRACE_MS
    ) {
      const ends = status.whileSuppliesLast
        ? "while supplies last"
        : status.nextCloseAt
          ? `closes ${closeTimeFormat.format(status.nextCloseAt)}`
          : "";
      events.push({
        slug: item.showSlug,
        eventKey: `${programKey(item)}|opened|${occurrence}`,
        title: `${title} ${kindLabel} is open`,
        body: ends ? `${meta} · ${ends}` : meta,
        url: item.entryUrl,
      });
    }
  }

  return events;
}
