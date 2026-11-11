import webpush from "web-push";
import { rateLimitResponse, rejectCrossOrigin } from "@/lib/rateLimit";
import { getShow } from "@/lib/shows";
import { pushBackendConfigured, supabaseAdmin } from "@/lib/supabaseAdmin";

// web-push signs payloads with Node crypto.
export const runtime = "nodejs";

type SubscribeBody = {
  subscription?: {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  slugs?: unknown;
  entries?: unknown;
};

async function readObjectBody(
  request: Request,
): Promise<
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: Response }
> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 100_000) {
    return {
      ok: false,
      response: Response.json({ error: "Payload too large" }, { status: 413 }),
    };
  }
  try {
    const text = await request.text();
    if (text.length > 100_000) {
      return {
        ok: false,
        response: Response.json(
          { error: "Payload too large" },
          { status: 413 },
        ),
      };
    }
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("Body must be an object");
    }
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }
}

/** Validate the synced lottery-log entries: {key, day} pairs, capped. */
function sanitizeEntries(raw: unknown): { key: string; day: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is { key: string; day: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { key?: unknown }).key === "string" &&
        (item as { key: string }).key.length <= 120 &&
        typeof (item as { day?: unknown }).day === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test((item as { day: string }).day),
    )
    .map(({ key, day }) => ({ key, day }))
    .slice(-200);
}

/** Create or update a subscription (also used to re-sync followed shows). */
export async function POST(request: Request) {
  if (!pushBackendConfigured()) {
    return Response.json({ error: "Push is not configured" }, { status: 503 });
  }
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const limited = await rateLimitResponse(request, "push-subscribe", 30, 60);
  if (limited) return limited;
  const parsed = await readObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value as SubscribeBody;

  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;
  // Length caps: real values are ~200/87/22 chars — reject anything bloated.
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    endpoint.length > 1000 ||
    typeof p256dh !== "string" ||
    p256dh.length > 256 ||
    typeof auth !== "string" ||
    auth.length > 128
  ) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const slugs = Array.isArray(body.slugs)
    ? body.slugs
        .filter((s): s is string => typeof s === "string")
        .filter((s) => getShow(s))
        .slice(0, 100)
    : [];

  const { error } = await supabaseAdmin()
    .from("push_subscriptions")
    .upsert(
      {
        endpoint,
        p256dh,
        auth,
        slugs,
        entries: sanitizeEntries(body.entries),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
  if (error) {
    console.error("push subscribe failed:", error.message);
    return Response.json({ error: "Storage failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!pushBackendConfigured()) {
    return Response.json({ error: "Push is not configured" }, { status: 503 });
  }

  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const limited = await rateLimitResponse(request, "push-delete", 30, 60);
  if (limited) return limited;
  const parsed = await readObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  if (typeof body.endpoint !== "string") {
    return Response.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint);
  if (error) {
    console.error("push unsubscribe failed:", error.message);
    return Response.json({ error: "Storage failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

/**
 * Send an immediate end-to-end test to the caller's stored subscription.
 * The endpoint is a high-entropy capability URL already shared by this browser
 * and the push backend; cross-origin JSON calls are preflighted, so this stays
 * self-service without adding a demo-only account system.
 */
export async function PUT(request: Request) {
  if (!pushBackendConfigured()) {
    return Response.json({ error: "Push is not configured" }, { status: 503 });
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    return Response.json({ error: "VAPID keys missing" }, { status: 503 });
  }
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const limited = await rateLimitResponse(request, "push-test", 3, 600);
  if (limited) return limited;
  const parsed = await readObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  if (
    typeof body.endpoint !== "string" ||
    !body.endpoint.startsWith("https://") ||
    body.endpoint.length > 1000
  ) {
    return Response.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  const { data: subscription, error } = await supabaseAdmin()
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("endpoint", body.endpoint)
    .maybeSingle<{
      endpoint: string;
      p256dh: string;
      auth: string;
    }>();
  if (error) {
    console.error("loading test subscription failed:", error.message);
    return Response.json({ error: "Storage failed" }, { status: 500 });
  }
  if (!subscription) {
    return Response.json({ error: "Subscription not found" }, { status: 404 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:hello@example.com",
    vapidPublic,
    vapidPrivate,
  );
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({
        title: "Matinee · Test successful",
        body: "Deadline alerts are working on this device.",
        url: "/notify",
        tag: `matinee-test-${Date.now()}`,
      }),
    );
  } catch (sendError) {
    const statusCode = (sendError as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await supabaseAdmin()
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);
    }
    console.error("test push failed:", sendError);
    return Response.json({ error: "Push delivery failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
