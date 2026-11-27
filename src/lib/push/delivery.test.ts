import { describe, expect, it, vi } from "vitest";
import { programKey, Program } from "../programs";
import { runNotifications } from "./delivery";
import { duePushEvents } from "./events";
import { PushDelivery, PushSender, PushTarget } from "./sender";
import { MemoryPushStore, PushStore } from "./store";
import {
  et,
  GATSBY_RUSH,
  GATSBY_STUDENT,
  MIDNIGHT_LOTTERY,
  minutes,
  RUSH,
} from "./testPrograms";

type Sent = { at: Date; endpoint: string; delivery: PushDelivery };

/** A recording sender with an injectable failure per call. */
function recorder(
  fail?: (target: PushTarget, attempt: number) => number | Error | null,
) {
  const sent: Sent[] = [];
  const attempts = new Map<string, number>();
  let clock = new Date(0);
  const send: PushSender = async (target, delivery) => {
    // Yield so concurrent runs genuinely interleave.
    await new Promise((resolve) => setTimeout(resolve, 1));
    const attempt = (attempts.get(target.endpoint) ?? 0) + 1;
    attempts.set(target.endpoint, attempt);
    const failure = fail?.(target, attempt);
    if (typeof failure === "number") {
      throw Object.assign(new Error(`push service ${failure}`), {
        statusCode: failure,
      });
    }
    if (failure) throw failure;
    sent.push({ at: clock, endpoint: target.endpoint, delivery });
  };
  return {
    sent,
    send,
    attempts,
    at(date: Date) {
      clock = date;
    },
  };
}

const ALICE = "https://fcm.googleapis.com/fcm/send/alice";
const BOB = "https://web.push.apple.com/bob";
const CAROL = "https://updates.push.services.mozilla.com/carol";
const DAVE = "https://fcm.googleapis.com/fcm/send/dave";

async function storeWith(
  followers: Record<string, string[]>,
  entries: Record<string, { key: string; day: string }[]> = {},
) {
  const store = new MemoryPushStore();
  for (const [endpoint, slugs] of Object.entries(followers)) {
    await store.saveSubscription(
      { endpoint, p256dh: "p", auth: "a", slugs, entries: entries[endpoint] ?? [] },
      et("00:00"),
    );
  }
  return store;
}

/** Run the scheduler at each instant, sequentially, like a cron. */
async function schedule(
  store: PushStore,
  rec: ReturnType<typeof recorder>,
  programs: Program[],
  instants: Date[],
) {
  const summaries = [];
  for (const at of instants) {
    rec.at(at);
    summaries.push(
      await runNotifications({
        store,
        send: rec.send,
        source: "test",
        now: () => at,
        events: (now) => duePushEvents(now, programs),
      }),
    );
  }
  return summaries;
}

const everyMinute = (from: Date, to: Date) => {
  const out: Date[] = [];
  for (let t = from; t <= to; t = minutes(t, 1)) out.push(t);
  return out;
};

describe("exactly one push per follower per alert", () => {
  it("sends once at 9:55 for a 10 AM rush, across 31 one-minute runs", async () => {
    const store = await storeWith({
      [ALICE]: ["hadestown"],
      [BOB]: ["hadestown", "wicked"],
      [CAROL]: ["hadestown"],
      [DAVE]: ["wicked"],
    });
    const rec = recorder();
    await schedule(store, rec, [RUSH], everyMinute(et("09:50"), et("10:20")));

    expect(rec.sent.map((s) => s.endpoint).sort()).toEqual([ALICE, BOB, CAROL].sort());
    for (const push of rec.sent) {
      expect(push.at).toEqual(et("09:55"));
      expect(push.delivery.message.title).toBe("Hadestown rush opens at 10:00 AM");
      expect(push.delivery.urgency).toBe("high");
      // Useful until 10:30: an offline phone must not get it at noon.
      expect(push.delivery.ttlSeconds).toBe(35 * 60);
    }
  });

  it("doesn't double-send when the scheduler fires twice at the same instant", async () => {
    const store = await storeWith({ [ALICE]: ["hadestown"] });
    const rec = recorder();
    const [, second] = await schedule(store, rec, [RUSH], [et("09:56"), et("09:56")]);
    expect(rec.sent).toHaveLength(1);
    expect(second.deduped).toBe(1);
  });

  it("doesn't double-send when runs overlap", async () => {
    const followers = Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => [
        `https://fcm.googleapis.com/fcm/send/f${i}`,
        ["hadestown"],
      ]),
    );
    const store = await storeWith(followers);
    const rec = recorder();
    rec.at(et("09:57"));
    const run = () =>
      runNotifications({
        store,
        send: rec.send,
        source: "test",
        now: () => et("09:57"),
        events: (now) => duePushEvents(now, [RUSH]),
      });
    const summaries = await Promise.all([run(), run(), run()]);

    expect(rec.sent).toHaveLength(25);
    expect(new Set(rec.sent.map((s) => s.endpoint)).size).toBe(25);
    expect(summaries.reduce((n, s) => n + s.sent, 0)).toBe(25);
    expect(summaries.reduce((n, s) => n + s.deduped, 0)).toBe(50);
  });

  it("catches up after missed runs, worded for the time it lands", async () => {
    const store = await storeWith({ [ALICE]: ["hadestown"] });
    const rec = recorder();
    // Scheduler dead from 9:50; comes back at 10:09.
    await schedule(store, rec, [RUSH], everyMinute(et("10:09"), et("10:20")));
    expect(rec.sent).toHaveLength(1);
    expect(rec.sent[0].at).toEqual(et("10:09"));
    expect(rec.sent[0].delivery.message.title).toBe("Hadestown rush opened at 10:00 AM");
  });

  it("never sends a stale opening hours late", async () => {
    const store = await storeWith({ [ALICE]: ["hadestown"] });
    const rec = recorder();
    await schedule(store, rec, [RUSH], [et("10:15"), et("10:45"), et("13:00"), et("19:59")]);
    expect(rec.sent).toEqual([]);
  });

  it("sends a midnight lottery once, at 8 AM, from a 15-minute scheduler", async () => {
    const store = await storeWith({ [ALICE]: ["oh-mary"] });
    const rec = recorder();
    const every15: Date[] = [];
    for (let t = et("23:00", "2026-11-19"); t <= et("09:30"); t = minutes(t, 15)) {
      every15.push(t);
    }
    await schedule(store, rec, [MIDNIGHT_LOTTERY], every15);
    expect(rec.sent.map((s) => [s.at, s.delivery.message.title])).toEqual([
      [et("08:00"), "Oh, Mary! lottery is open until 3:00 PM"],
    ]);
  });

  it("sends one notification for one show's same-minute alerts, and never re-sends either", async () => {
    const store = await storeWith({ [ALICE]: ["the-great-gatsby"] });
    const rec = recorder();
    const [first, second] = await schedule(
      store,
      rec,
      [GATSBY_RUSH, GATSBY_STUDENT],
      [et("09:55"), et("10:05")],
    );
    expect(rec.sent).toHaveLength(1);
    expect(rec.sent[0].delivery.message.title).toBe(
      "The Great Gatsby rush and student rush open at 10:00 AM",
    );
    expect(first.pairs).toBe(2);
    expect(second.deduped).toBe(2);
  });

  it("skips last call for followers who logged an entry, and tells only entrants about the draw", async () => {
    const key = programKey(MIDNIGHT_LOTTERY);
    const store = await storeWith(
      { [ALICE]: ["oh-mary"], [BOB]: ["oh-mary"] },
      { [BOB]: [{ key, day: "2026-11-20" }] },
    );
    const rec = recorder();
    await schedule(store, rec, [MIDNIGHT_LOTTERY], [et("14:00"), et("15:00")]);
    expect(rec.sent.map((s) => [s.endpoint, s.delivery.message.title])).toEqual([
      [ALICE, "Oh, Mary! lottery closes at 3:00 PM"],
      [BOB, "Oh, Mary! lottery has closed. Watch your email."],
    ]);
  });
});

describe("failures", () => {
  it("retries a transient failure next run, still sending only once", async () => {
    const store = await storeWith({ [ALICE]: ["hadestown"], [BOB]: ["hadestown"] });
    const rec = recorder((target, attempt) =>
      target.endpoint === ALICE && attempt === 1 ? 503 : null,
    );
    const [first, second, third] = await schedule(store, rec, [RUSH], [
      et("09:55"),
      et("09:56"),
      et("09:57"),
    ]);
    expect(first).toMatchObject({ sent: 1, released: 1 });
    expect(second).toMatchObject({ sent: 1, released: 0 });
    expect(third).toMatchObject({ sent: 0, deduped: 2 });
    expect(rec.sent.map((s) => s.endpoint).sort()).toEqual([ALICE, BOB].sort());
    expect(rec.attempts.get(ALICE)).toBe(2);
  });

  it("treats a network error like a 5xx", async () => {
    const store = await storeWith({ [ALICE]: ["hadestown"] });
    const rec = recorder((_t, attempt) => (attempt === 1 ? new Error("ECONNRESET") : null));
    await schedule(store, rec, [RUSH], [et("09:55"), et("09:56")]);
    expect(rec.sent).toHaveLength(1);
  });

  it("prunes a subscription the push service says is gone", async () => {
    const store = await storeWith({ [ALICE]: ["hadestown"], [BOB]: ["hadestown"] });
    const rec = recorder((target) => (target.endpoint === ALICE ? 410 : null));
    const [first] = await schedule(store, rec, [RUSH], [et("09:55"), et("09:56")]);
    expect(first.pruned).toBe(1);
    expect(await store.getSubscription(ALICE)).toBeNull();
    expect(rec.attempts.get(ALICE)).toBe(1);
  });

  it("records a rejected push as failed and doesn't retry or prune it", async () => {
    const store = await storeWith({ [ALICE]: ["hadestown"] });
    const rec = recorder(() => 403);
    const [first] = await schedule(store, rec, [RUSH], [et("09:55"), et("09:56"), et("09:57")]);
    expect(first.failed).toBe(1);
    expect(rec.attempts.get(ALICE)).toBe(1);
    expect(await store.getSubscription(ALICE)).not.toBeNull();
  });

  it("recovers a run that died after claiming, with the same tag so the device replaces it", async () => {
    const store = await storeWith({ [ALICE]: ["hadestown"] });
    const rec = recorder();
    // The run sends, then dies before recording the outcome.
    const settle = vi
      .spyOn(store, "settle")
      .mockRejectedValueOnce(new Error("function killed"));
    await expect(
      schedule(store, rec, [RUSH], [et("09:55")]),
    ).rejects.toThrow("function killed");
    settle.mockRestore();

    // Inside the 5-minute lease nobody touches it; after it, a run takes over.
    await schedule(store, rec, [RUSH], everyMinute(et("09:56"), et("10:14")));
    expect(rec.sent.map((s) => s.at)).toEqual([et("09:55"), et("10:00")]);
    expect(rec.sent[1].delivery.message.tag).toBe(rec.sent[0].delivery.message.tag);
  });
});

describe("heartbeat", () => {
  it("records each run so health can tell a live scheduler from a dead one", async () => {
    const store = await storeWith({ [ALICE]: ["hadestown"] });
    const rec = recorder();
    await schedule(store, rec, [RUSH], [et("09:50"), et("09:55"), et("10:30")]);
    expect(await store.pipelineStatus()).toMatchObject({
      lastRunAt: et("10:30"),
      lastOkRunAt: et("10:30"),
      lastSentAt: et("09:55"),
      lastRunError: null,
      subscriptions: 1,
    });

    vi.spyOn(store, "listSubscriptions").mockRejectedValueOnce(new Error("db down"));
    await expect(schedule(store, rec, [RUSH], [minutes(et("09:55"), 1440)])).rejects.toThrow(
      "db down",
    );
    expect(await store.pipelineStatus()).toMatchObject({
      lastRunAt: minutes(et("09:55"), 1440),
      lastRunError: "db down",
      lastOkRunAt: et("10:30"),
    });
  });
});

describe("the onSent reporting hook", () => {
  it("reports each delivered notification once, and a throwing hook changes nothing", async () => {
    const store = await storeWith({ [ALICE]: [RUSH.showSlug], [BOB]: [RUSH.showSlug] });
    const rec = recorder();
    const reported: string[] = [];
    let calls = 0;
    const summary = await runNotifications({
      store,
      send: rec.send,
      source: "test",
      now: () => et("09:55"),
      events: (now) => duePushEvents(now, [RUSH]),
      onSent: (events) => {
        calls += 1;
        reported.push(...events.map((event) => event.slug));
        if (calls === 1) throw new Error("analytics down");
      },
    });
    expect(summary.sent).toBe(2);
    expect(summary.failed + summary.released).toBe(0);
    expect(reported).toEqual([RUSH.showSlug, RUSH.showSlug]);
  });
});
