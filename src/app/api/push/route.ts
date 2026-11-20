import { renderTestAlert } from "@/lib/push/copy";
import { isPushServiceEndpoint } from "@/lib/push/endpoints";
import { nextOpeningAlert } from "@/lib/push/events";
import {
  classifySendError,
  vapidFromEnv,
  webPushSender,
} from "@/lib/push/sender";
import { getPushStore } from "@/lib/push/server";
import type { LotteryLogEntry } from "@/lib/push/store";
import { rateLimitResponse, rejectCrossOrigin } from "@/lib/rateLimit";
import { getShow } from "@/lib/shows";

// web-push signs payloads with Node crypto.
export const runtime = "nodejs";

const notConfigured = () =>
  Response.json({ error: "Push is not configured" }, { status: 503 });

async function readObjectBody(
  request: Request,
): Promise<
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: Response }
> {
  const tooLarge = () => ({
    ok: false as const,
    response: Response.json({ error: "Payload too large" }, { status: 413 }),
  });
  if (Number(request.headers.get("content-length") ?? 0) > 100_000) {
    return tooLarge();
  }
  try {
    const text = await request.text();
    if (text.length > 100_000) return tooLarge();
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

/** The synced lottery log: {key, day} pairs, capped. Absent means "keep". */
function sanitizeEntries(raw: unknown): LotteryLogEntry[] | null {
  if (raw === undefined) return null;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is LotteryLogEntry =>
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

/** Followed show slugs, known shows only. Absent means "keep". */
function sanitizeSlugs(raw: unknown): string[] | null {
  if (raw === undefined) return null;
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw.filter((s): s is string => typeof s === "string" && !!getShow(s)),
    ),
  ].slice(0, 100);
}

/**
 * Create or update a subscription: the endpoint, its keys, followed shows and
 * lottery-log days. Also takes `previousEndpoint` from the service worker's
 * pushsubscriptionchange, which moves the old row's follows across.
 */
export async function POST(request: Request) {
  const store = getPushStore();
  if (!store) return notConfigured();
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const limited = await rateLimitResponse(request, store, "push-subscribe", 30, 60);
  if (limited) return limited;
  const parsed = await readObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value as {
    subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
    slugs?: unknown;
    entries?: unknown;
    previousEndpoint?: unknown;
  };

  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;
  // Real keys are ~87 and ~22 characters.
  if (
    !isPushServiceEndpoint(endpoint) ||
    typeof p256dh !== "string" ||
    p256dh.length > 256 ||
    typeof auth !== "string" ||
    auth.length > 128
  ) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const previousEndpoint =
    body.previousEndpoint === undefined || body.previousEndpoint === null
      ? null
      : isPushServiceEndpoint(body.previousEndpoint)
        ? body.previousEndpoint
        : undefined;
  if (previousEndpoint === undefined) {
    return Response.json({ error: "Invalid previous endpoint" }, { status: 400 });
  }

  try {
    await store.saveSubscription(
      {
        endpoint,
        p256dh,
        auth,
        slugs: sanitizeSlugs(body.slugs),
        entries: sanitizeEntries(body.entries),
        previousEndpoint,
      },
      new Date(),
    );
  } catch (error) {
    console.error("push subscribe failed:", error);
    return Response.json({ error: "Storage failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const store = getPushStore();
  if (!store) return notConfigured();
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const limited = await rateLimitResponse(request, store, "push-delete", 30, 60);
  if (limited) return limited;
  const parsed = await readObjectBody(request);
  if (!parsed.ok) return parsed.response;
  if (typeof parsed.value.endpoint !== "string") {
    return Response.json({ error: "Invalid endpoint" }, { status: 400 });
  }
  try {
    await store.deleteSubscription(parsed.value.endpoint);
  } catch (error) {
    console.error("push unsubscribe failed:", error);
    return Response.json({ error: "Storage failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}

/**
 * Send a test to the caller's stored subscription: a real alert for one of
 * its followed shows, as it will read when that window opens, deep link
 * included. The endpoint is a high-entropy capability URL only this browser
 * and the push backend know; cross-origin JSON calls are preflighted.
 */
export async function PUT(request: Request) {
  const store = getPushStore();
  if (!store) return notConfigured();
  const vapid = vapidFromEnv();
  if (!vapid) {
    return Response.json({ error: "VAPID keys missing" }, { status: 503 });
  }
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const limited = await rateLimitResponse(request, store, "push-test", 3, 600);
  if (limited) return limited;
  const parsed = await readObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const endpoint = parsed.value.endpoint;
  if (!isPushServiceEndpoint(endpoint)) {
    return Response.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  let subscription;
  try {
    subscription = await store.getSubscription(endpoint);
  } catch (error) {
    console.error("loading test subscription failed:", error);
    return Response.json({ error: "Storage failed" }, { status: 500 });
  }
  if (!subscription) {
    return Response.json({ error: "Subscription not found" }, { status: 404 });
  }

  const now = new Date();
  const sample =
    subscription.slugs
      .map((slug) => nextOpeningAlert(slug, now))
      .find((alert) => alert !== null) ?? null;
  const message = renderTestAlert(sample, now);
  try {
    await webPushSender(vapid)(subscription, {
      message,
      ttlSeconds: 5 * 60,
      urgency: "high",
    });
  } catch (error) {
    if (classifySendError(error) === "gone") {
      await store.deleteSubscription(endpoint).catch(() => {});
      return Response.json({ error: "Subscription expired" }, { status: 410 });
    }
    console.error("test push failed:", error);
    return Response.json({ error: "Push delivery failed" }, { status: 502 });
  }
  return Response.json({ ok: true, title: message.title, tag: message.tag });
}
