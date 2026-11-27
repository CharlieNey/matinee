import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * One day of push, end to end through the real routes: browsers subscribe
 * with POST /api/push, then the scheduler calls POST /api/notify/run every
 * minute. The in-process store (PUSH_STORE=memory) and the real delivery,
 * ledger and copy code run; only the push service itself is faked, so the
 * test sees exactly what each device would be sent.
 */
const sent = vi.hoisted(
  () => [] as { endpoint: string; title: string; url: string; ttl: number; urgency: string }[],
);

vi.mock("web-push", () => ({
  default: {
    sendNotification: vi.fn(
      async (
        target: { endpoint: string },
        payload: string,
        options: { TTL: number; urgency: string },
      ) => {
        // A device that uninstalled the app: the push service says it's gone.
        if (target.endpoint.endsWith("/gone")) {
          throw Object.assign(new Error("Gone"), { statusCode: 410 });
        }
        const message = JSON.parse(payload) as { title: string; url: string };
        sent.push({
          endpoint: target.endpoint,
          title: message.title,
          url: message.url,
          ttl: options.TTL,
          urgency: options.urgency,
        });
      },
    ),
  },
}));

import { etWallClock } from "@/lib/programs";
import { getPushStore } from "@/lib/push/server";
import { POST as runScheduler } from "../notify/run/route";
import { POST as subscribe } from "./route";

const SECRET = "journey-secret";
const FCM = "https://fcm.googleapis.com/fcm/send/";
const WICKED_LOTTERY = "wicked/digital-lottery/broadway-direct";
const DAY = "2026-12-01"; // a Tuesday, four days after the Nov 27 check

const at = (time: string) => etWallClock(new Date(`${DAY}T17:00:00Z`), time);

async function follow(
  device: string,
  slugs: string[],
  entries: { key: string; day: string }[] = [],
) {
  const response = await subscribe(
    new Request("http://localhost:3000/api/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: FCM + device,
          keys: { p256dh: "p".repeat(87), auth: "a".repeat(22) },
        },
        slugs,
        entries,
      }),
    }),
  );
  expect(response.status).toBe(200);
}

async function tick(instant: Date) {
  const response = await runScheduler(
    new Request(
      `http://localhost:3000/api/notify/run?at=${instant.toISOString()}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${SECRET}`,
          "x-matinee-scheduler": "journey-test",
        },
      },
    ),
  );
  expect(response.status).toBe(200);
  return (await response.json()) as { sent: number; pruned: number; deduped: number };
}

const titlesFor = (device: string) =>
  sent.filter((push) => push.endpoint === FCM + device).map((push) => push.title);

describe("a day of push alerts, through the real routes", () => {
  beforeEach(() => {
    vi.stubEnv("PUSH_STORE", "memory");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "test-public-key");
    vi.stubEnv("VAPID_PRIVATE_KEY", "test-private-key");
    delete (globalThis as { __matineeMemoryPushStore?: unknown })
      .__matineeMemoryPushStore;
    sent.length = 0;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("alerts before each followed window, calls last call, dedupes and prunes", async () => {
    await follow("follower", ["wicked"]);
    await follow("entrant", ["wicked"], [{ key: WICKED_LOTTERY, day: DAY }]);
    await follow("gone", ["wicked"]);
    // Every row these shows have is unverified on the Nov 27 check.
    await follow("doubtful", ["chicago", "hadestown", "aladdin"]);

    // Two scheduler calls at the same instant (Supabase Cron plus the
    // GitHub backup) must not double-send.
    const [first, second] = await Promise.all([tick(at("08:55")), tick(at("08:55"))]);
    expect(first.sent + second.sent).toBe(2); // follower and entrant
    expect(first.pruned + second.pruned).toBe(1); // the dead endpoint

    let pruned = 0;
    for (let t = at("08:56"); t < at("16:00"); t = new Date(t.getTime() + 60_000)) {
      pruned += (await tick(t)).pruned;
    }
    expect(pruned).toBe(0); // pruned once, never tried again

    // A push five minutes before each window opens, and a last call an hour
    // before the lottery closes, each exactly once.
    expect(titlesFor("follower")).toEqual([
      "Wicked lottery opens at 9:00 AM",
      "Wicked rush opens at 10:00 AM",
      "Wicked lottery closes at 3:00 PM",
    ]);
    // Someone who logged an entry skips last call and hears about the draw.
    expect(titlesFor("entrant")).toEqual([
      "Wicked lottery opens at 9:00 AM",
      "Wicked rush opens at 10:00 AM",
      expect.stringMatching(/^Wicked lottery has closed\./),
    ]);
    expect(titlesFor("gone")).toEqual([]);
    expect(titlesFor("doubtful")).toEqual([]);

    // Each push opens the show and expires when it stops being useful.
    for (const push of sent) {
      expect(push.url).toBe("/shows/wicked#ways-to-save");
      expect(push.ttl).toBeGreaterThan(0);
    }
    const rush = sent.find((push) => push.title.includes("rush"))!;
    expect(rush.urgency).toBe("high");

    const store = getPushStore()!;
    expect(await store.getSubscription(FCM + "gone")).toBeNull();
    expect(await store.getSubscription(FCM + "follower")).not.toBeNull();
  }, 60_000);
});
