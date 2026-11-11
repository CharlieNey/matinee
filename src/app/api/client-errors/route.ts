import { rateLimitResponse, rejectCrossOrigin } from "@/lib/rateLimit";
import { pushBackendConfigured } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  if (pushBackendConfigured()) {
    const limited = await rateLimitResponse(request, "client-error", 10, 60);
    if (limited) return limited;
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 12_000) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 12_000) throw new Error("too large");
    raw = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid error report" }, { status: 400 });
  }
  if (typeof raw !== "object" || raw === null) {
    return Response.json({ error: "Invalid error report" }, { status: 400 });
  }
  const report = raw as Record<string, unknown>;
  if (typeof report.message !== "string" || report.message.length > 1_000) {
    return Response.json({ error: "Invalid error report" }, { status: 400 });
  }
  console.error(
    JSON.stringify({
      event: "client_error",
      message: report.message,
      stack: typeof report.stack === "string" ? report.stack.slice(0, 8_000) : null,
      digest:
        typeof report.digest === "string" ? report.digest.slice(0, 200) : null,
      path: typeof report.path === "string" ? report.path.slice(0, 500) : null,
      reportedAt: new Date().toISOString(),
    }),
  );
  return new Response(null, { status: 204 });
}
