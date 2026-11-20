import { createHash } from "node:crypto";
import type { PushStore } from "./push/store";

function clientAddress(request: Request): string {
  return (
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * Postgres-backed rate limiting (consume_api_rate_limit), so limits survive
 * serverless instance churn. Without a store there is nothing to count in.
 */
export async function rateLimitResponse(
  request: Request,
  store: PushStore | null,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<Response | null> {
  if (!store) return null;
  const key = createHash("sha256")
    .update(`${action}:${clientAddress(request)}`)
    .digest("hex");
  let allowed: boolean;
  try {
    allowed = await store.consumeRateLimit(key, windowSeconds, limit);
  } catch (error) {
    // Fails open: losing alerts to a broken limiter is worse than a burst of
    // unthrottled requests. It is not silent: /api/health probes the limiter
    // and returns 503 ("rateLimit": "error"), so the hourly check goes red.
    console.error(
      "rate limit storage failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
  if (allowed) return null;
  return Response.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: { "Retry-After": String(windowSeconds) },
    },
  );
}

export function rejectCrossOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin === new URL(request.url).origin) {
    return null;
  }
  return Response.json({ error: "Cross-origin request blocked" }, { status: 403 });
}
