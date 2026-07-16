import { getShow } from "@/lib/shows";
import { pushBackendConfigured, supabaseAdmin } from "@/lib/supabaseAdmin";

type SubscribeBody = {
  subscription?: {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  slugs?: unknown;
};

/** Create or update a subscription (also used to re-sync followed shows). */
export async function POST(request: Request) {
  if (!pushBackendConfigured()) {
    return Response.json({ error: "Push is not configured" }, { status: 503 });
  }

  let body: SubscribeBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    typeof p256dh !== "string" ||
    typeof auth !== "string"
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
      { endpoint, p256dh, auth, slugs, updated_at: new Date().toISOString() },
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

  let body: { endpoint?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
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
