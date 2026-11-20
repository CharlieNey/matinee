import { randomUUID } from "node:crypto";
import { renderAlert } from "./copy";
import { alertApplies, duePushEvents, PushEvent } from "./events";
import { classifySendError, PushSender } from "./sender";
import type { DeliveryPair, PushStore, StoredSubscription } from "./store";

/**
 * One scheduler run: decide what is due, claim it, send it, record it.
 * Safe to run twice, late, or concurrently with itself (docs/NOTIFICATIONS.md).
 */

/** Longer than the route's maxDuration, so a live run never loses its lease. */
export const CLAIM_LEASE_SECONDS = 5 * 60;
const LOG_RETENTION_DAYS = 45;
const RUN_RETENTION_DAYS = 14;
const SEND_CONCURRENCY = 8;

export type RunSummary = {
  runId: string;
  source: string;
  events: number;
  subscriptions: number;
  /** (subscription, alert) pairs that applied this run. */
  pairs: number;
  /** Pairs another run already sent, failed, or holds. */
  deduped: number;
  /** Notifications delivered to push services (one may cover several alerts). */
  sent: number;
  failed: number;
  /** Transient failures handed back for the next run to retry. */
  released: number;
  pruned: number;
  expired: { logs: number; runs: number };
};

export type RunOptions = {
  store: PushStore;
  send: PushSender;
  source: string;
  /** Injected clock; read once at the start so the run sees one instant. */
  now?: () => Date;
  /**
   * Clock for what the run records (heartbeat, ledger). Defaults to `now`.
   * Only a local demo that evaluates another instant sets it apart.
   */
  recordAt?: () => Date;
  events?: (now: Date) => PushEvent[];
  runId?: string;
};

async function inPool<T>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await work(item);
    }
  });
  await Promise.all(workers);
}

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export async function runNotifications(options: RunOptions): Promise<RunSummary> {
  const { store, send, source } = options;
  const now = (options.now ?? (() => new Date()))();
  const at = options.recordAt?.() ?? now;
  const runId = options.runId ?? randomUUID();
  const summary: RunSummary = {
    runId,
    source,
    events: 0,
    subscriptions: 0,
    pairs: 0,
    deduped: 0,
    sent: 0,
    failed: 0,
    released: 0,
    pruned: 0,
    expired: { logs: 0, runs: 0 },
  };

  await store.startRun(runId, source, at);
  try {
    summary.expired = await store.expire(at, {
      logDays: LOG_RETENTION_DAYS,
      runDays: RUN_RETENTION_DAYS,
    });

    const events = (options.events ?? duePushEvents)(now);
    summary.events = events.length;
    if (events.length > 0) await deliver(events);

    await store.finishRun(runId, { ok: true, summary, error: null }, at);
    return summary;
  } catch (error) {
    await store
      .finishRun(runId, { ok: false, summary, error: errorText(error) }, at)
      .catch(() => {});
    throw error;
  }

  async function deliver(events: PushEvent[]) {
    const subscriptions = await store.listSubscriptions({
      slugs: [...new Set(events.map((event) => event.slug))],
      entryKeys: [
        ...new Set(
          events.flatMap((event) =>
            event.audience.type === "entrants"
              ? [event.audience.entered.key]
              : event.audience.exceptEntered
                ? [event.audience.exceptEntered.key]
                : [],
          ),
        ),
      ],
    });
    summary.subscriptions = subscriptions.length;

    const byEndpoint = new Map(subscriptions.map((sub) => [sub.endpoint, sub]));
    const byKey = new Map(events.map((event) => [event.eventKey, event]));
    const pairs: DeliveryPair[] = subscriptions.flatMap((sub) =>
      events
        .filter((event) => alertApplies(sub, event))
        .map((event) => ({ endpoint: sub.endpoint, eventKey: event.eventKey })),
    );
    summary.pairs = pairs.length;
    if (pairs.length === 0) return;

    // Claim before sending: only pairs this run wins are sent.
    const claimed = await store.claim(runId, pairs, CLAIM_LEASE_SECONDS, at);
    summary.deduped = pairs.length - claimed.length;

    // One notification per (subscription, group): same show, same minute.
    const notifications = new Map<
      string,
      { sub: StoredSubscription; events: PushEvent[] }
    >();
    for (const pair of claimed) {
      const event = byKey.get(pair.eventKey)!;
      const id = `${pair.endpoint}\u0000${event.group}`;
      const entry = notifications.get(id) ?? {
        sub: byEndpoint.get(pair.endpoint)!,
        events: [],
      };
      entry.events.push(event);
      notifications.set(id, entry);
    }

    const sent: DeliveryPair[] = [];
    const failed: DeliveryPair[] = [];
    const released: DeliveryPair[] = [];
    const gone = new Set<string>();

    await inPool([...notifications.values()], SEND_CONCURRENCY, async (item) => {
      const pairsOf = item.events.map((event) => ({
        endpoint: item.sub.endpoint,
        eventKey: event.eventKey,
      }));
      if (gone.has(item.sub.endpoint)) {
        released.push(...pairsOf);
        return;
      }
      const expiresAt = Math.max(
        ...item.events.map((event) => event.expiresAt.getTime()),
      );
      try {
        await send(item.sub, {
          message: renderAlert(item.events, now),
          ttlSeconds: (expiresAt - now.getTime()) / 1000,
          urgency: item.events.some((event) => event.urgency === "high")
            ? "high"
            : "normal",
        });
        summary.sent += 1;
        sent.push(...pairsOf);
      } catch (error) {
        const outcome = classifySendError(error);
        if (outcome === "gone") {
          gone.add(item.sub.endpoint);
          released.push(...pairsOf);
        } else if (outcome === "rejected") {
          summary.failed += 1;
          failed.push(...pairsOf);
          console.error(
            `push rejected (${(error as { statusCode?: number }).statusCode}) for ${item.sub.endpoint.slice(0, 48)}…`,
          );
        } else {
          summary.released += 1;
          released.push(...pairsOf);
          console.error(
            `push to ${item.sub.endpoint.slice(0, 48)}… failed, will retry:`,
            errorText(error),
          );
        }
      }
    });

    await store.settle(runId, { sent, failed, released }, at);
    if (gone.size) {
      summary.pruned = await store.pruneSubscriptions([...gone]);
    }
  }
}
