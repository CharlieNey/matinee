import webpush from "web-push";
import { duePushEvents } from "@/lib/pushEvents";
import { pushBackendConfigured, supabaseAdmin } from "@/lib/supabaseAdmin";

// web-push needs Node crypto.
export const runtime = "nodejs";

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
  slugs: string[];
  entries: { key: string; day: string }[];
};

/** Slug-followers get window events; claim watches need a matching entry. */
function eventApplies(
  sub: SubscriptionRow,
  event: ReturnType<typeof duePushEvents>[number],
): boolean {
  if (event.requiresEntry) {
    const { key, days } = event.requiresEntry;
    return (sub.entries ?? []).some(
      (entry) => entry.key === key && days.includes(entry.day),
    );
  }
  return sub.slugs.includes(event.slug);
}

/**
 * Evaluate program windows and send due pushes. Driven by an external
 * scheduler (GitHub Actions, every ~15 min) — this request is also what keeps
 * the free-tier Supabase project from pausing for inactivity.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pushBackendConfigured()) {
    return Response.json({ error: "Push is not configured" }, { status: 503 });
  }
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    return Response.json({ error: "VAPID keys missing" }, { status: 503 });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:hello@example.com",
    vapidPublic,
    vapidPrivate,
  );

  const db = supabaseAdmin();
  const { data: subs, error: subsError } = await db
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth,slugs,entries")
    .returns<SubscriptionRow[]>();
  if (subsError) {
    console.error("loading subscriptions failed:", subsError.message);
    return Response.json({ error: "Storage failed" }, { status: 500 });
  }

  const events = duePushEvents(new Date());
  const summary = {
    events: events.length,
    subscribers: subs?.length ?? 0,
    sent: 0,
    deduped: 0,
    pruned: 0,
  };
  if (!subs?.length || !events.length) return Response.json(summary);

  // Every applicable (subscriber, due event) pair...
  const pairs = subs.flatMap((sub) =>
    events
      .filter((event) => eventApplies(sub, event))
      .map((event) => ({ sub, event })),
  );
  if (!pairs.length) return Response.json(summary);

  // ...minus the ones already sent for this occurrence.
  const { data: logged, error: logError } = await db
    .from("notification_log")
    .select("endpoint,event_key")
    .in("event_key", [...new Set(pairs.map(({ event }) => event.eventKey))]);
  if (logError) {
    console.error("loading notification log failed:", logError.message);
    return Response.json({ error: "Storage failed" }, { status: 500 });
  }
  const alreadySent = new Set(
    (logged ?? []).map((row) => `${row.endpoint}|${row.event_key}`),
  );

  const sentRows: { endpoint: string; event_key: string }[] = [];
  const deadEndpoints = new Set<string>();

  for (const { sub, event } of pairs) {
    if (alreadySent.has(`${sub.endpoint}|${event.eventKey}`)) {
      summary.deduped += 1;
      continue;
    }
    if (deadEndpoints.has(sub.endpoint)) continue;
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: event.title,
          body: event.body,
          url: event.url,
          tag: event.eventKey,
        }),
      );
      summary.sent += 1;
      sentRows.push({ endpoint: sub.endpoint, event_key: event.eventKey });
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        deadEndpoints.add(sub.endpoint);
      } else {
        console.error(`push to ${sub.endpoint.slice(0, 40)}… failed:`, error);
      }
    }
  }

  if (sentRows.length) {
    const { error } = await db
      .from("notification_log")
      .upsert(sentRows, {
        onConflict: "endpoint,event_key",
        ignoreDuplicates: true,
      });
    if (error) console.error("logging sends failed:", error.message);
  }
  if (deadEndpoints.size) {
    summary.pruned = deadEndpoints.size;
    const { error } = await db
      .from("push_subscriptions")
      .delete()
      .in("endpoint", [...deadEndpoints]);
    if (error) console.error("pruning endpoints failed:", error.message);
  }

  return Response.json(summary);
}
