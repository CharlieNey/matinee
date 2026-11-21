import { timingSafeEqual } from "node:crypto";
import { captureServerEvents, ServerEvent } from "@/lib/analyticsServer";
import { runNotifications } from "@/lib/push/delivery";
import { vapidFromEnv, webPushSender } from "@/lib/push/sender";
import { getPushStore } from "@/lib/push/server";

// web-push needs Node crypto.
export const runtime = "nodejs";
// Claims are leased for 5 minutes (CLAIM_LEASE_SECONDS); a run must end first.
export const maxDuration = 60;

/** Constant-time bearer check: string !== leaks a timing oracle. */
function authorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

/** Which scheduler called, for the push_runs heartbeat. */
function schedulerSource(request: Request): string {
  const declared = request.headers.get("x-matinee-scheduler");
  if (declared && /^[a-z0-9-]{1,40}$/.test(declared)) return declared;
  if (request.headers.get("user-agent")?.includes("vercel-cron")) {
    return "vercel-cron";
  }
  return "unknown";
}

/**
 * One scheduler tick: send the alerts due now, exactly once per device.
 * Called every minute by Supabase Cron (supabase/scheduler/enable.sql) or
 * the GitHub Actions backup; safe to call twice, late, or concurrently.
 */
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = getPushStore();
  if (!store) {
    return Response.json({ error: "Push is not configured" }, { status: 503 });
  }
  const vapid = vapidFromEnv();
  if (!vapid) {
    return Response.json({ error: "VAPID keys missing" }, { status: 503 });
  }

  // Local demos only: ?at=<ISO> runs the in-process store at another instant
  // ("9:55 AM Saturday"). Ignored for Supabase, so never in production.
  const at =
    store.kind === "memory"
      ? new URL(request.url).searchParams.get("at")
      : null;
  const pinned = at && !Number.isNaN(Date.parse(at)) ? new Date(at) : null;

  try {
    const delivered: ServerEvent[] = [];
    const summary = await runNotifications({
      store,
      send: webPushSender(vapid),
      source: schedulerSource(request),
      // The heartbeat keeps real time, so health never sees a future run.
      ...(pinned ? { now: () => pinned, recordAt: () => new Date() } : {}),
      onSent: (events) =>
        delivered.push({
          event: "push_sent",
          properties: {
            show: events[0].slug,
            kinds: [...new Set(events.map((event) => event.kind))].join(","),
            alerts: events.length,
          },
        }),
    });
    // Off unless NEXT_PUBLIC_POSTHOG_KEY is set; bounded by a 2 s timeout.
    await captureServerEvents(delivered);
    return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("notify run failed:", error);
    return Response.json({ error: "Run failed" }, { status: 500 });
  }
}

export const POST = run;
// Vercel Cron calls with GET and the same bearer secret.
export const GET = run;
