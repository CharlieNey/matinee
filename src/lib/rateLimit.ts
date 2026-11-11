import { createHash } from "node:crypto";
import { supabaseAdmin } from "./supabaseAdmin";

function clientAddress(request: Request): string {
  return (
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Supabase-backed rate limiting survives serverless instance churn. */
export async function rateLimitResponse(
  request: Request,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<Response | null> {
  const key = createHash("sha256")
    .update(`${action}:${clientAddress(request)}`)
    .digest("hex");
  const { data, error } = await supabaseAdmin().rpc("consume_api_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });
  if (error) {
    // Availability wins if a migration is rolling out; the error remains
    // visible in Vercel logs and the health check will flag the database.
    console.error("rate limit storage failed:", error.message);
    return null;
  }
  if (data === true) return null;
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
