import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { RpcCaller, RpcPushStore } from "./rpcStore";
import { MemoryPushStore, PushStore } from "./store";

/**
 * One contract, two stores: the in-memory store used in development and
 * tests, and the production Postgres functions running in PGlite against the
 * repo's real migrations.
 */

const MIGRATIONS = path.join(process.cwd(), "supabase/migrations");

/** Supabase provides these; PGlite starts bare. */
const SUPABASE_SHIMS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create schema vault;
  create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
  create schema net;
  create table net.requests (id bigserial primary key, url text, body jsonb, headers jsonb, timeout_milliseconds int);
  create function net.http_post(url text, body jsonb, headers jsonb, timeout_milliseconds int)
  returns bigint language sql as $$
    insert into net.requests (url, body, headers, timeout_milliseconds)
    values (url, body, headers, timeout_milliseconds) returning id;
  $$;
`;

async function freshDatabase(): Promise<PGlite> {
  const db = await PGlite.create();
  await db.exec(SUPABASE_SHIMS);
  for (const file of readdirSync(MIGRATIONS).sort()) {
    await db.exec(readFileSync(path.join(MIGRATIONS, file), "utf8"));
  }
  return db;
}

/** Named-argument calls, shaped like PostgREST's rpc results. */
function pgliteRpc(db: PGlite): RpcCaller {
  return async (fn, args) => {
    const names = Object.keys(args);
    const values = names.map((name) => {
      const value = args[name];
      return value !== null && typeof value === "object" && !Array.isArray(value)
        ? JSON.stringify(value)
        : Array.isArray(value) && value.some((v) => typeof v === "object")
          ? JSON.stringify(value)
          : value;
    });
    const result = await db.query<Record<string, unknown>>(
      `select * from public.${fn}(${names
        .map((name, i) => `${name} => $${i + 1}`)
        .join(", ")})`,
      values,
    );
    if (result.fields.length === 1 && result.fields[0].name === fn) {
      return result.rows[0]?.[fn] ?? null;
    }
    return result.rows;
  };
}

const T0 = new Date("2026-11-20T15:00:00.000Z");
const later = (seconds: number) => new Date(T0.getTime() + seconds * 1000);
const RUN_A = "00000000-0000-4000-8000-00000000000a";
const RUN_B = "00000000-0000-4000-8000-00000000000b";
const ALICE = "https://fcm.googleapis.com/fcm/send/alice";
const BOB = "https://web.push.apple.com/bob";

async function subscribe(store: PushStore, endpoint: string, slugs: string[]) {
  await store.saveSubscription(
    { endpoint, p256dh: "p", auth: "a", slugs, entries: [] },
    T0,
  );
}

const openDatabases: PGlite[] = [];
afterAll(async () => {
  await Promise.all(openDatabases.map((db) => db.close()));
});

const implementations: Array<[string, () => Promise<PushStore>]> = [
  ["MemoryPushStore", async () => new MemoryPushStore()],
  [
    "Postgres functions (PGlite)",
    async () => {
      const db = await freshDatabase();
      openDatabases.push(db);
      return new RpcPushStore(pgliteRpc(db));
    },
  ],
];

describe.each(implementations)("push store contract: %s", (_name, make) => {
  let store: PushStore;
  beforeEach(async () => {
    store = await make();
  });

  it("creates, updates and deletes subscriptions; null keeps stored follows", async () => {
    await subscribe(store, ALICE, ["hadestown"]);
    await store.saveSubscription(
      {
        endpoint: ALICE,
        p256dh: "p2",
        auth: "a2",
        slugs: null,
        entries: [{ key: "wicked/digital-lottery/broadway-direct", day: "2026-11-20" }],
      },
      later(60),
    );
    expect(await store.getSubscription(ALICE)).toEqual({
      endpoint: ALICE,
      p256dh: "p2",
      auth: "a2",
      slugs: ["hadestown"],
      entries: [{ key: "wicked/digital-lottery/broadway-direct", day: "2026-11-20" }],
    });
    expect(await store.deleteSubscription(ALICE)).toBe(true);
    expect(await store.deleteSubscription(ALICE)).toBe(false);
    expect(await store.getSubscription(ALICE)).toBeNull();
  });

  it("moves follows to a rotated endpoint", async () => {
    await subscribe(store, ALICE, ["hadestown", "wicked"]);
    await store.saveSubscription(
      {
        endpoint: `${ALICE}-rotated`,
        p256dh: "p",
        auth: "a",
        slugs: null,
        entries: null,
        previousEndpoint: ALICE,
      },
      later(60),
    );
    expect(await store.getSubscription(ALICE)).toBeNull();
    expect((await store.getSubscription(`${ALICE}-rotated`))?.slugs).toEqual([
      "hadestown",
      "wicked",
    ]);
  });

  it("lists only subscriptions that follow a due show or entered a due program", async () => {
    await subscribe(store, ALICE, ["hadestown"]);
    await store.saveSubscription(
      {
        endpoint: BOB,
        p256dh: "p",
        auth: "a",
        slugs: ["six"],
        entries: [{ key: "wicked/digital-lottery/broadway-direct", day: "2026-11-20" }],
      },
      T0,
    );
    const endpoints = async (slugs: string[], entryKeys: string[]) =>
      (await store.listSubscriptions({ slugs, entryKeys }))
        .map((sub) => sub.endpoint)
        .sort();
    expect(await endpoints(["hadestown"], [])).toEqual([ALICE]);
    expect(
      await endpoints([], ["wicked/digital-lottery/broadway-direct"]),
    ).toEqual([BOB]);
    expect(await endpoints(["chicago"], [])).toEqual([]);
  });

  it("lets exactly one run claim a pair", async () => {
    await subscribe(store, ALICE, ["hadestown"]);
    const pairs = [
      { endpoint: ALICE, eventKey: "e1" },
      { endpoint: ALICE, eventKey: "e1" },
      { endpoint: ALICE, eventKey: "e2" },
      { endpoint: "https://fcm.googleapis.com/fcm/send/gone", eventKey: "e1" },
    ];
    const first = await store.claim(RUN_A, pairs, 300, T0);
    expect(first.map((p) => p.eventKey).sort()).toEqual(["e1", "e2"]);
    expect(await store.claim(RUN_B, pairs, 300, later(1))).toEqual([]);
  });

  it("never re-sends a sent or failed pair, but retries a released one", async () => {
    await subscribe(store, ALICE, ["hadestown"]);
    const sent = { endpoint: ALICE, eventKey: "sent" };
    const failed = { endpoint: ALICE, eventKey: "failed" };
    const released = { endpoint: ALICE, eventKey: "released" };
    await store.claim(RUN_A, [sent, failed, released], 300, T0);
    await store.settle(
      RUN_A,
      { sent: [sent], failed: [failed], released: [released] },
      later(2),
    );
    // Even after the lease would have expired.
    expect(
      await store.claim(RUN_B, [sent, failed, released], 300, later(3600)),
    ).toEqual([released]);
  });

  it("hands an abandoned claim to another run only after the lease", async () => {
    await subscribe(store, ALICE, ["hadestown"]);
    const pair = { endpoint: ALICE, eventKey: "e1" };
    await store.claim(RUN_A, [pair], 300, T0); // run A dies here
    expect(await store.claim(RUN_B, [pair], 300, later(299))).toEqual([]);
    expect(await store.claim(RUN_B, [pair], 300, later(300))).toEqual([pair]);
    // A late settle from the dead run must not overwrite B's claim.
    await store.settle(RUN_A, { sent: [pair], failed: [], released: [] }, later(301));
    expect(await store.claim(RUN_A, [pair], 300, later(900))).toEqual([pair]);
  });

  it("prunes dead subscriptions with their ledger rows", async () => {
    await subscribe(store, ALICE, ["hadestown"]);
    await subscribe(store, BOB, ["hadestown"]);
    await store.claim(RUN_A, [{ endpoint: ALICE, eventKey: "e1" }], 300, T0);
    expect(await store.pruneSubscriptions([ALICE, "https://x.invalid/none"])).toBe(1);
    expect(await store.getSubscription(ALICE)).toBeNull();
    expect(await store.getSubscription(BOB)).not.toBeNull();
  });

  it("reports the pipeline: last run, last good run, last push", async () => {
    expect(await store.pipelineStatus()).toEqual({
      lastRunAt: null,
      lastRunSource: null,
      lastRunError: null,
      lastOkRunAt: null,
      lastSentAt: null,
      subscriptions: 0,
    });
    await subscribe(store, ALICE, ["hadestown"]);
    await store.startRun(RUN_A, "supabase-cron", T0);
    const pair = { endpoint: ALICE, eventKey: "e1" };
    await store.claim(RUN_A, [pair], 300, T0);
    await store.settle(RUN_A, { sent: [pair], failed: [], released: [] }, later(1));
    await store.finishRun(RUN_A, { ok: true, summary: { sent: 1 }, error: null }, later(2));
    await store.startRun(RUN_B, "github-actions", later(60));
    await store.finishRun(RUN_B, { ok: false, summary: null, error: "storage" }, later(61));

    expect(await store.pipelineStatus()).toEqual({
      lastRunAt: later(60),
      lastRunSource: "github-actions",
      lastRunError: "storage",
      lastOkRunAt: later(2),
      lastSentAt: later(1),
      subscriptions: 1,
    });
  });

  it("expires old ledger rows and runs", async () => {
    await subscribe(store, ALICE, ["hadestown"]);
    await store.claim(RUN_A, [{ endpoint: ALICE, eventKey: "old" }], 300, T0);
    await store.startRun(RUN_A, "test", T0);
    const day = 24 * 60 * 60;
    expect(await store.expire(later(10 * day), { logDays: 45, runDays: 14 })).toEqual({ logs: 0, runs: 0 });
    expect(await store.expire(later(20 * day), { logDays: 45, runDays: 14 })).toEqual({ logs: 0, runs: 1 });
    expect(await store.expire(later(50 * day), { logDays: 45, runDays: 14 })).toEqual({ logs: 1, runs: 0 });
  });

  it("rate-limits by key", async () => {
    expect(await store.consumeRateLimit("k", 60, 2)).toBe(true);
    expect(await store.consumeRateLimit("k", 60, 2)).toBe(true);
    expect(await store.consumeRateLimit("k", 60, 2)).toBe(false);
    expect(await store.consumeRateLimit("other", 60, 2)).toBe(true);
  });
});

describe("migration SQL beyond the store contract", () => {
  let db: PGlite;
  beforeEach(async () => {
    db = await freshDatabase();
    openDatabases.push(db);
  });

  it("keeps the pre-ledger route working: a plain insert is a sent row", async () => {
    await db.query(
      "insert into push_subscriptions (endpoint, p256dh, auth) values ($1, 'p', 'a')",
      [ALICE],
    );
    await db.query(
      "insert into notification_log (endpoint, event_key) values ($1, 'legacy') on conflict do nothing",
      [ALICE],
    );
    const { rows } = await db.query<{ status: string; sent: boolean; claimed: boolean }>(
      "select status, sent_at is not null as sent, claimed_at is not null as claimed from notification_log",
    );
    expect(rows).toEqual([{ status: "sent", sent: true, claimed: true }]);
  });

  it("exposes push functions to the server key only", async () => {
    const { rows } = await db.query<{ role: string; allowed: boolean }>(`
      select role, has_function_privilege(role,
        'public.push_claim_deliveries(uuid, jsonb, integer, timestamptz)', 'execute') as allowed
      from unnest(array['anon', 'authenticated', 'service_role']) as role
    `);
    expect(rows).toEqual([
      { role: "anon", allowed: false },
      { role: "authenticated", allowed: false },
      { role: "service_role", allowed: true },
    ]);
  });

  it("ticks: POSTs the run endpoint with the vault secret, or warns and skips", async () => {
    const skipped = await db.query<{ id: number | null }>(
      "select public.matinee_notify_tick() as id",
    );
    expect(skipped.rows[0].id).toBeNull();

    await db.exec(`
      insert into vault.decrypted_secrets values
        ('matinee_app_url', 'https://matinee.nyc/'),
        ('matinee_cron_secret', 's3cret');
    `);
    await db.query("select public.matinee_notify_tick()");
    const { rows } = await db.query<{ url: string; headers: Record<string, string> }>(
      "select url, headers from net.requests",
    );
    expect(rows).toEqual([
      {
        url: "https://matinee.nyc/api/notify/run",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer s3cret",
          "X-Matinee-Scheduler": "supabase-cron",
        },
      },
    ]);
  });
});
