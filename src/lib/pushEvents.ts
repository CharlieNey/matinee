import {
  allPrograms,
  getProgramStatus,
  Program,
  programKindLabel,
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
};

/**
 * How far past a window's opening we still count it as "just opened". Covers
 * the cron cadence (15 min) plus scheduler jitter without double-sending —
 * dedup is by occurrence, so a late second run is filtered by the log.
 */
const OPENED_GRACE_MS = 30 * 60 * 1000;

const closeTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});

function price(value: number): string {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

function programKey(item: Program): string {
  return `${item.showSlug}/${item.kind}/${item.platform}`;
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
