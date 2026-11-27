import type {
  DeliveryPair,
  LotteryLogEntry,
  PipelineStatus,
  PushStore,
  Settlement,
  StoredSubscription,
  SubscriptionInput,
} from "./store";

/**
 * Calls one Postgres function with named arguments and returns what it
 * returns: rows for a set-returning function, the value for a scalar one.
 * Production passes Supabase's `rpc`; the contract test passes PGlite.
 */
export type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<unknown>;

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
  slugs: string[] | null;
  entries: LotteryLogEntry[] | null;
};

type StatusRow = {
  last_run_at: string | Date | null;
  last_run_source: string | null;
  last_run_error: string | null;
  last_ok_run_at: string | Date | null;
  last_sent_at: string | Date | null;
  subscriptions: number | string | bigint;
};

const iso = (date: Date) => date.toISOString();
const toDate = (value: string | Date | null) =>
  value === null ? null : new Date(value);
const asRows = <T>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : value ? [value as T] : [];

const toSubscription = (row: SubscriptionRow): StoredSubscription => ({
  endpoint: row.endpoint,
  p256dh: row.p256dh,
  auth: row.auth,
  slugs: row.slugs ?? [],
  entries: row.entries ?? [],
});

const toWire = (pairs: DeliveryPair[]) =>
  pairs.map(({ endpoint, eventKey }) => ({ endpoint, event_key: eventKey }));

/** PushStore over the functions in 20261120120000_push_delivery_ledger.sql. */
export class RpcPushStore implements PushStore {
  readonly kind = "supabase" as const;

  constructor(private readonly rpc: RpcCaller) {}

  async saveSubscription(input: SubscriptionInput, now: Date): Promise<void> {
    await this.rpc("push_save_subscription", {
      p_endpoint: input.endpoint,
      p_p256dh: input.p256dh,
      p_auth: input.auth,
      p_slugs: input.slugs,
      p_entries: input.entries,
      p_previous_endpoint: input.previousEndpoint ?? null,
      p_now: iso(now),
    });
  }

  async deleteSubscription(endpoint: string): Promise<boolean> {
    return (
      (await this.rpc("push_delete_subscription", { p_endpoint: endpoint })) ===
      true
    );
  }

  async getSubscription(endpoint: string): Promise<StoredSubscription | null> {
    const rows = asRows<SubscriptionRow>(
      await this.rpc("push_get_subscription", { p_endpoint: endpoint }),
    );
    return rows[0] ? toSubscription(rows[0]) : null;
  }

  async listSubscriptions(filter: {
    slugs: string[];
    entryKeys: string[];
  }): Promise<StoredSubscription[]> {
    return asRows<SubscriptionRow>(
      await this.rpc("push_list_subscriptions", {
        p_slugs: filter.slugs,
        p_entry_keys: filter.entryKeys,
      }),
    ).map(toSubscription);
  }

  async pruneSubscriptions(endpoints: string[]): Promise<number> {
    if (endpoints.length === 0) return 0;
    return Number(
      await this.rpc("push_prune_subscriptions", { p_endpoints: endpoints }),
    );
  }

  async claim(
    runId: string,
    pairs: DeliveryPair[],
    leaseSeconds: number,
    now: Date,
  ): Promise<DeliveryPair[]> {
    if (pairs.length === 0) return [];
    return asRows<{ endpoint: string; event_key: string }>(
      await this.rpc("push_claim_deliveries", {
        p_run_id: runId,
        p_pairs: toWire(pairs),
        p_lease_seconds: leaseSeconds,
        p_now: iso(now),
      }),
    ).map((row) => ({ endpoint: row.endpoint, eventKey: row.event_key }));
  }

  async settle(runId: string, outcome: Settlement, now: Date): Promise<void> {
    if (
      !outcome.sent.length &&
      !outcome.failed.length &&
      !outcome.released.length
    ) {
      return;
    }
    await this.rpc("push_settle_deliveries", {
      p_run_id: runId,
      p_sent: toWire(outcome.sent),
      p_failed: toWire(outcome.failed),
      p_released: toWire(outcome.released),
      p_now: iso(now),
    });
  }

  async startRun(runId: string, source: string, now: Date): Promise<void> {
    await this.rpc("push_start_run", {
      p_run_id: runId,
      p_source: source,
      p_now: iso(now),
    });
  }

  async finishRun(
    runId: string,
    result: { ok: boolean; summary: object | null; error: string | null },
    now: Date,
  ): Promise<void> {
    await this.rpc("push_finish_run", {
      p_run_id: runId,
      p_ok: result.ok,
      p_summary: result.summary,
      p_error: result.error,
      p_now: iso(now),
    });
  }

  async expire(
    now: Date,
    retention: { logDays: number; runDays: number },
  ): Promise<{ logs: number; runs: number }> {
    const result = (await this.rpc("push_expire", {
      p_now: iso(now),
      p_log_days: retention.logDays,
      p_run_days: retention.runDays,
    })) as { logs?: number; runs?: number } | null;
    return { logs: result?.logs ?? 0, runs: result?.runs ?? 0 };
  }

  async pipelineStatus(): Promise<PipelineStatus> {
    const [row] = asRows<StatusRow>(
      await this.rpc("push_pipeline_status", {}),
    );
    return {
      lastRunAt: toDate(row?.last_run_at ?? null),
      lastRunSource: row?.last_run_source ?? null,
      lastRunError: row?.last_run_error ?? null,
      lastOkRunAt: toDate(row?.last_ok_run_at ?? null),
      lastSentAt: toDate(row?.last_sent_at ?? null),
      subscriptions: Number(row?.subscriptions ?? 0),
    };
  }

  async consumeRateLimit(
    key: string,
    windowSeconds: number,
    limit: number,
  ): Promise<boolean> {
    return (
      (await this.rpc("consume_api_rate_limit", {
        p_key: key,
        p_window_seconds: windowSeconds,
        p_limit: limit,
      })) === true
    );
  }
}
