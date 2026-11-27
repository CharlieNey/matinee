/**
 * Push state behind one interface. Production: Postgres functions over the
 * Supabase Data API (rpcStore.ts). Development and tests: MemoryPushStore,
 * which mirrors the functions' semantics. store.contract.test.ts holds both
 * to the same contract, the SQL side in PGlite.
 */

export type LotteryLogEntry = { key: string; day: string };

export type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  slugs: string[];
  entries: LotteryLogEntry[];
};

export type SubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  /** null keeps what is stored (a rotated subscription from the worker). */
  slugs: string[] | null;
  entries: LotteryLogEntry[] | null;
  /** pushsubscriptionchange: move the old endpoint's follows to this one. */
  previousEndpoint?: string | null;
};

export type DeliveryPair = { endpoint: string; eventKey: string };

export type Settlement = {
  sent: DeliveryPair[];
  failed: DeliveryPair[];
  released: DeliveryPair[];
};

export type PipelineStatus = {
  lastRunAt: Date | null;
  lastRunSource: string | null;
  lastRunError: string | null;
  lastOkRunAt: Date | null;
  lastSentAt: Date | null;
  subscriptions: number;
};

export interface PushStore {
  readonly kind: "supabase" | "memory";
  saveSubscription(input: SubscriptionInput, now: Date): Promise<void>;
  deleteSubscription(endpoint: string): Promise<boolean>;
  getSubscription(endpoint: string): Promise<StoredSubscription | null>;
  /** Subscriptions following one of `slugs` or with an entry for `entryKeys`. */
  listSubscriptions(filter: {
    slugs: string[];
    entryKeys: string[];
  }): Promise<StoredSubscription[]>;
  pruneSubscriptions(endpoints: string[]): Promise<number>;
  /** Returns only the pairs this run won (see push_claim_deliveries). */
  claim(
    runId: string,
    pairs: DeliveryPair[],
    leaseSeconds: number,
    now: Date,
  ): Promise<DeliveryPair[]>;
  settle(runId: string, outcome: Settlement, now: Date): Promise<void>;
  startRun(runId: string, source: string, now: Date): Promise<void>;
  finishRun(
    runId: string,
    result: { ok: boolean; summary: object | null; error: string | null },
    now: Date,
  ): Promise<void>;
  expire(
    now: Date,
    retention: { logDays: number; runDays: number },
  ): Promise<{ logs: number; runs: number }>;
  pipelineStatus(): Promise<PipelineStatus>;
  /** True when the request is within the limit (consume_api_rate_limit). */
  consumeRateLimit(
    key: string,
    windowSeconds: number,
    limit: number,
  ): Promise<boolean>;
}

type LedgerRow = {
  status: "claimed" | "sent" | "failed";
  claimedAt: number;
  claimedBy: string;
  sentAt: number | null;
};

type RunRow = {
  id: string;
  source: string;
  startedAt: number;
  finishedAt: number | null;
  ok: boolean | null;
  summary: object | null;
  error: string | null;
};

const pairId = (endpoint: string, eventKey: string) =>
  `${endpoint}\u0000${eventKey}`;

/**
 * In-process store with the SQL functions' semantics. Every method does its
 * read-modify-write without awaiting in between, so concurrent runs in one
 * process interleave the way concurrent transactions do in Postgres.
 */
export class MemoryPushStore implements PushStore {
  readonly kind = "memory" as const;
  private subscriptions = new Map<string, StoredSubscription>();
  private ledger = new Map<string, LedgerRow>();
  private runs = new Map<string, RunRow>();
  private rateLimits = new Map<string, { started: number; count: number }>();

  async saveSubscription(input: SubscriptionInput, now: Date): Promise<void> {
    void now;
    let carried: StoredSubscription | undefined;
    if (input.previousEndpoint && input.previousEndpoint !== input.endpoint) {
      carried = this.subscriptions.get(input.previousEndpoint);
      this.deleteSync(input.previousEndpoint);
    }
    const existing = this.subscriptions.get(input.endpoint);
    this.subscriptions.set(input.endpoint, {
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      slugs: [...(input.slugs ?? carried?.slugs ?? existing?.slugs ?? [])],
      entries: [
        ...(input.entries ?? carried?.entries ?? existing?.entries ?? []),
      ],
    });
  }

  private deleteSync(endpoint: string): boolean {
    const existed = this.subscriptions.delete(endpoint);
    // ON DELETE CASCADE
    for (const id of [...this.ledger.keys()]) {
      if (id.startsWith(`${endpoint}\u0000`)) this.ledger.delete(id);
    }
    return existed;
  }

  async deleteSubscription(endpoint: string): Promise<boolean> {
    return this.deleteSync(endpoint);
  }

  async getSubscription(endpoint: string): Promise<StoredSubscription | null> {
    const row = this.subscriptions.get(endpoint);
    return row ? structuredClone(row) : null;
  }

  async listSubscriptions(filter: {
    slugs: string[];
    entryKeys: string[];
  }): Promise<StoredSubscription[]> {
    return [...this.subscriptions.values()]
      .filter(
        (sub) =>
          sub.slugs.some((slug) => filter.slugs.includes(slug)) ||
          sub.entries.some((entry) => filter.entryKeys.includes(entry.key)),
      )
      .map((sub) => structuredClone(sub));
  }

  async pruneSubscriptions(endpoints: string[]): Promise<number> {
    let count = 0;
    for (const endpoint of endpoints) if (this.deleteSync(endpoint)) count += 1;
    return count;
  }

  async claim(
    runId: string,
    pairs: DeliveryPair[],
    leaseSeconds: number,
    now: Date,
  ): Promise<DeliveryPair[]> {
    const won: DeliveryPair[] = [];
    const seen = new Set<string>();
    for (const { endpoint, eventKey } of pairs) {
      const id = pairId(endpoint, eventKey);
      if (seen.has(id) || !this.subscriptions.has(endpoint)) continue;
      seen.add(id);
      const row = this.ledger.get(id);
      const leaseExpired =
        row?.status === "claimed" &&
        row.claimedAt <= now.getTime() - leaseSeconds * 1000;
      if (row && !leaseExpired) continue;
      this.ledger.set(id, {
        status: "claimed",
        claimedAt: now.getTime(),
        claimedBy: runId,
        sentAt: null,
      });
      won.push({ endpoint, eventKey });
    }
    return won;
  }

  async settle(runId: string, outcome: Settlement, now: Date): Promise<void> {
    const held = (pair: DeliveryPair) => {
      const row = this.ledger.get(pairId(pair.endpoint, pair.eventKey));
      return row && row.claimedBy === runId && row.status === "claimed"
        ? row
        : null;
    };
    for (const pair of outcome.sent) {
      const row = held(pair);
      if (row) Object.assign(row, { status: "sent", sentAt: now.getTime() });
    }
    for (const pair of outcome.failed) {
      const row = held(pair);
      if (row) row.status = "failed";
    }
    for (const pair of outcome.released) {
      if (held(pair)) this.ledger.delete(pairId(pair.endpoint, pair.eventKey));
    }
  }

  async startRun(runId: string, source: string, now: Date): Promise<void> {
    this.runs.set(runId, {
      id: runId,
      source: source.slice(0, 40),
      startedAt: now.getTime(),
      finishedAt: null,
      ok: null,
      summary: null,
      error: null,
    });
  }

  async finishRun(
    runId: string,
    result: { ok: boolean; summary: object | null; error: string | null },
    now: Date,
  ): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) return;
    Object.assign(run, {
      finishedAt: now.getTime(),
      ok: result.ok,
      summary: result.summary,
      error: result.error?.slice(0, 500) ?? null,
    });
  }

  async expire(
    now: Date,
    retention: { logDays: number; runDays: number },
  ): Promise<{ logs: number; runs: number }> {
    const day = 24 * 60 * 60 * 1000;
    let logs = 0;
    let runs = 0;
    for (const [id, row] of this.ledger) {
      if (row.claimedAt < now.getTime() - retention.logDays * day) {
        this.ledger.delete(id);
        logs += 1;
      }
    }
    for (const [id, run] of this.runs) {
      if (run.startedAt < now.getTime() - retention.runDays * day) {
        this.runs.delete(id);
        runs += 1;
      }
    }
    return { logs, runs };
  }

  async pipelineStatus(): Promise<PipelineStatus> {
    const runs = [...this.runs.values()];
    const latest = runs.reduce<RunRow | null>(
      (best, run) => (!best || run.startedAt > best.startedAt ? run : best),
      null,
    );
    const okRuns = runs
      .filter((run) => run.ok && run.finishedAt !== null)
      .map((run) => run.finishedAt!);
    const sent = [...this.ledger.values()]
      .filter((row) => row.status === "sent" && row.sentAt !== null)
      .map((row) => row.sentAt!);
    return {
      lastRunAt: latest ? new Date(latest.startedAt) : null,
      lastRunSource: latest?.source ?? null,
      lastRunError: latest?.error ?? null,
      lastOkRunAt: okRuns.length ? new Date(Math.max(...okRuns)) : null,
      lastSentAt: sent.length ? new Date(Math.max(...sent)) : null,
      subscriptions: this.subscriptions.size,
    };
  }

  async consumeRateLimit(
    key: string,
    windowSeconds: number,
    limit: number,
  ): Promise<boolean> {
    const now = Date.now();
    const row = this.rateLimits.get(key);
    if (!row || row.started <= now - windowSeconds * 1000) {
      this.rateLimits.set(key, { started: now, count: 1 });
      return 1 <= limit;
    }
    row.count += 1;
    return row.count <= limit;
  }

  /** Test and debugging aid: the ledger as plain rows. */
  ledgerRows(): Array<DeliveryPair & { status: LedgerRow["status"] }> {
    return [...this.ledger].map(([id, row]) => {
      const [endpoint, eventKey] = id.split("\u0000");
      return { endpoint, eventKey, status: row.status };
    });
  }
}
