import { timingSafeEqual } from "node:crypto";
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

  try {
    const summary = await runNotifications({
      store,
      send: webPushSender(vapid),
      source: schedulerSource(request),
    });
    return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("notify run failed:", error);
    return Response.json({ error: "Run failed" }, { status: 500 });
  }
}

export const POST = run;
// Vercel Cron calls with GET and the same bearer secret.
export const GET = run;
