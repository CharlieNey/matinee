import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/push/server", () => ({ getPushStore: vi.fn() }));
vi.mock("@/lib/push/sender", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/push/sender")>()),
  webPushSender: vi.fn(),
}));

import { webPushSender } from "@/lib/push/sender";
import { getPushStore } from "@/lib/push/server";
import { MemoryPushStore } from "@/lib/push/store";
import { GET, POST } from "./route";

const SECRET = "test-cron-secret";

function call(
  method: "GET" | "POST",
  headers: Record<string, string> = {},
): Promise<Response> {
  const request = new Request("https://matinee.test/api/notify/run", {
    method,
    headers,
  });
  return method === "GET" ? GET(request) : POST(request);
}

describe("/api/notify/run", () => {
  let store: MemoryPushStore;
  const send = vi.fn(async () => {});

  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public");
    vi.stubEnv("VAPID_PRIVATE_KEY", "private");
    store = new MemoryPushStore();
    vi.mocked(getPushStore).mockReturnValue(store);
    vi.mocked(webPushSender).mockReturnValue(send);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it("rejects a missing or wrong bearer secret", async () => {
    expect((await call("POST")).status).toBe(401);
    expect(
      (await call("POST", { Authorization: `Bearer ${SECRET}x` })).status,
    ).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect(
      (await call("POST", { Authorization: "Bearer " })).status,
    ).toBe(401);
  });

  it("runs, and records which scheduler called", async () => {
    const response = await call("POST", {
      Authorization: `Bearer ${SECRET}`,
      "X-Matinee-Scheduler": "supabase-cron",
    });
    expect(response.status).toBe(200);
    const summary = await response.json();
    expect(summary).toMatchObject({ source: "supabase-cron", sent: 0 });
    expect((await store.pipelineStatus()).lastRunSource).toBe("supabase-cron");
  });

  it("accepts Vercel Cron's GET and names it from the user agent", async () => {
    const response = await call("GET", {
      Authorization: `Bearer ${SECRET}`,
      "User-Agent": "vercel-cron/1.0",
    });
    expect(response.status).toBe(200);
    expect((await response.json()).source).toBe("vercel-cron");
  });

  it("ignores a malformed scheduler name", async () => {
    const response = await call("POST", {
      Authorization: `Bearer ${SECRET}`,
      "X-Matinee-Scheduler": "<script>",
    });
    expect((await response.json()).source).toBe("unknown");
  });

  it("honors ?at= only on the local in-process store", async () => {
    const request = (url: string) =>
      POST(
        new Request(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${SECRET}` },
        }),
      );
    const response = await request(
      "https://matinee.test/api/notify/run?at=2026-11-21T14:55:00Z",
    );
    // 9:55 AM Saturday has rush openings due; the heartbeat stays real time.
    expect((await response.json()).events).toBeGreaterThan(0);
    const lastRunAt = (await store.pipelineStatus()).lastRunAt!;
    expect(Math.abs(lastRunAt.getTime() - Date.now())).toBeLessThan(60_000);

    const remote = {
      ...store,
      kind: "supabase",
      startRun: vi.fn(async () => {}),
      finishRun: vi.fn(async () => {}),
      expire: vi.fn(async () => ({ logs: 0, runs: 0 })),
      listSubscriptions: vi.fn(async () => []),
    };
    vi.mocked(getPushStore).mockReturnValue(
      remote as unknown as MemoryPushStore,
    );
    await request("https://matinee.test/api/notify/run?at=2020-01-01T00:00:00Z");
    const startedAt = (remote.startRun.mock.calls[0] as unknown[])[2] as Date;
    expect(startedAt.getFullYear()).toBeGreaterThan(2020);
  });

  it("is 503 without a store or VAPID keys, and 500 when the run fails", async () => {
    const auth = { Authorization: `Bearer ${SECRET}` };
    vi.mocked(getPushStore).mockReturnValueOnce(null);
    expect((await call("POST", auth)).status).toBe(503);

    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    expect((await call("POST", auth)).status).toBe(503);
    vi.stubEnv("VAPID_PRIVATE_KEY", "private");

    vi.spyOn(store, "expire").mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await call("POST", auth)).status).toBe(500);
    expect((await store.pipelineStatus()).lastRunError).toBe("db down");
  });
});
