import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real modules reach Supabase and tdf.org; the route's own logic is what
// is under test here.
vi.mock("@/lib/push/server", () => ({ getPushStore: vi.fn() }));
vi.mock("@/lib/tktsServer", () => ({ fetchTktsData: vi.fn() }));

import { allPrograms, programsLastVerified } from "@/lib/programs";
import { getPushStore } from "@/lib/push/server";
import { MemoryPushStore, PipelineStatus, PushStore } from "@/lib/push/store";
import { fetchTktsData } from "@/lib/tktsServer";
import { GET } from "./route";

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/** Noon UTC, `days` after a YYYY-MM-DD date. */
function daysAfter(date: string, days: number): Date {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY);
}

/** The oldest row's date: one day later, nothing in the catalog is stale. */
const oldestCheck = allPrograms()
  .map((program) => program.lastVerified)
  .sort()[0];
const NOW = daysAfter(oldestCheck, 1);

const healthyPipeline: PipelineStatus = {
  lastRunAt: new Date(NOW.getTime() - MINUTE),
  lastRunSource: "supabase-cron",
  lastRunError: null,
  lastOkRunAt: new Date(NOW.getTime() - MINUTE),
  lastSentAt: new Date(NOW.getTime() - 3 * 60 * MINUTE),
  subscriptions: 4,
};

/** A Supabase-backed store whose answers the test controls. */
function storeReturning(
  status: PipelineStatus | Error,
  rateLimit: boolean | Error = true,
): PushStore {
  return {
    kind: "supabase",
    pipelineStatus: async () => {
      if (status instanceof Error) throw status;
      return status;
    },
    consumeRateLimit: async () => {
      if (rateLimit instanceof Error) throw rateLimit;
      return rateLimit;
    },
  } as unknown as PushStore;
}

async function check() {
  const response = await GET();
  return { status: response.status, body: await response.json(), response };
}

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    vi.mocked(getPushStore).mockReturnValue(storeReturning(healthyPipeline));
    vi.mocked(fetchTktsData).mockResolvedValue({ ok: true } as Awaited<
      ReturnType<typeof fetchTktsData>
    >);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("is 200 when the catalog, database, limiter, scheduler and TKTS are all fine", async () => {
    const { status, body, response } = await check();
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.services).toEqual({
      database: "ok",
      rateLimit: "ok",
      scheduler: "ok",
      tkts: "ok",
    });
    expect(body.push).toEqual({
      overdueAfterMinutes: 20,
      lastRunAt: healthyPipeline.lastRunAt!.toISOString(),
      lastRunSource: "supabase-cron",
      lastRunError: null,
      lastOkRunAt: healthyPipeline.lastOkRunAt!.toISOString(),
      lastSentAt: healthyPipeline.lastSentAt!.toISOString(),
      subscriptions: 4,
    });
    expect(body.catalog.stalePrograms).toBe(0);
    expect(body.catalog.lastVerified).toBe(programsLastVerified());
    expect(body.catalog.oldestVerified).toBe(oldestCheck);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("is 503 once the catalog passes the 14-day freshness contract", async () => {
    // Every row is on or before the latest check, so all of them are stale.
    const later = daysAfter(programsLastVerified(), 15);
    vi.setSystemTime(later);
    vi.mocked(getPushStore).mockReturnValue(
      storeReturning({ ...healthyPipeline, lastOkRunAt: later }),
    );
    const { status, body } = await check();
    expect(status).toBe(503);
    expect(body.catalog.stalePrograms).toBe(body.catalog.programs);
  });

  it("is 503 when the scheduler has not succeeded in 20 minutes", async () => {
    vi.mocked(getPushStore).mockReturnValue(
      storeReturning({
        ...healthyPipeline,
        lastRunAt: new Date(NOW.getTime() - 30 * MINUTE),
        lastOkRunAt: new Date(NOW.getTime() - 21 * MINUTE),
      }),
    );
    const { status, body } = await check();
    expect(status).toBe(503);
    expect(body.services.scheduler).toBe("overdue");
  });

  it("stays 200 at exactly 20 minutes, which is jitter, not a miss", async () => {
    vi.mocked(getPushStore).mockReturnValue(
      storeReturning({
        ...healthyPipeline,
        lastOkRunAt: new Date(NOW.getTime() - 20 * MINUTE),
      }),
    );
    expect((await check()).status).toBe(200);
  });

  it("is 503 when runs happen but keep failing", async () => {
    vi.mocked(getPushStore).mockReturnValue(
      storeReturning({
        ...healthyPipeline,
        lastRunAt: new Date(NOW.getTime() - MINUTE),
        lastRunError: "push_list_subscriptions: timeout",
        lastOkRunAt: new Date(NOW.getTime() - 45 * MINUTE),
      }),
    );
    const { status, body } = await check();
    expect(status).toBe(503);
    expect(body.services.scheduler).toBe("overdue");
    expect(body.push.lastRunError).toBe("push_list_subscriptions: timeout");
  });

  it("is 503 when the scheduler has never run", async () => {
    vi.mocked(getPushStore).mockReturnValue(
      storeReturning({ ...healthyPipeline, lastRunAt: null, lastOkRunAt: null }),
    );
    const { status, body } = await check();
    expect(status).toBe(503);
    expect(body.services.scheduler).toBe("never-run");
  });

  it("is 503 when the rate limiter is missing (the migration was never applied)", async () => {
    vi.mocked(getPushStore).mockReturnValue(
      storeReturning(
        healthyPipeline,
        new Error("consume_api_rate_limit: function does not exist"),
      ),
    );
    const { status, body } = await check();
    expect(status).toBe(503);
    expect(body.services.rateLimit).toBe("error");
    expect(body.services.database).toBe("ok");
  });

  it("is 503 when the database errors", async () => {
    vi.mocked(getPushStore).mockReturnValue(
      storeReturning(new Error("down"), new Error("down")),
    );
    const { status, body } = await check();
    expect(status).toBe(503);
    expect(body.services).toMatchObject({
      database: "error",
      rateLimit: "error",
      scheduler: "unknown",
    });
  });

  it("is 503 when the database is not configured", async () => {
    vi.mocked(getPushStore).mockReturnValue(null);
    const { status, body } = await check();
    expect(status).toBe(503);
    expect(body.services.database).toBe("not-configured");
  });

  it("is 503 when the TKTS fetch throws", async () => {
    vi.mocked(fetchTktsData).mockRejectedValue(new Error("upstream 500"));
    const { status, body } = await check();
    expect(status).toBe(503);
    expect(body.services.tkts).toBe("error");
  });

  it("reads a real store: a fresh local store has never run", async () => {
    vi.mocked(getPushStore).mockReturnValue(new MemoryPushStore());
    const { status, body } = await check();
    expect(status).toBe(503);
    expect(body.services).toMatchObject({
      database: "local",
      rateLimit: "ok",
      scheduler: "never-run",
    });
  });
});
