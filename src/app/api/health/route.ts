import {
  allPrograms,
  isProgramStale,
  programsLastVerified,
} from "@/lib/programs";
import {
  pushBackendConfigured,
  supabaseAdmin,
} from "@/lib/supabaseAdmin";
import { allShows } from "@/lib/shows";
import { fetchTktsData } from "@/lib/tktsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public, non-secret readiness endpoint for uptime monitors and CI. */
export async function GET() {
  const stalePrograms = allPrograms().filter((program) =>
    isProgramStale(program, new Date()),
  );
  let database: "ok" | "error" | "not-configured" = "not-configured";
  if (pushBackendConfigured()) {
    const { error } = await supabaseAdmin()
      .from("push_subscriptions")
      .select("endpoint")
      .limit(1);
    database = error ? "error" : "ok";
  }

  let tkts: "ok" | "error" = "error";
  try {
    const data = await fetchTktsData();
    if (data.ok) tkts = "ok";
  } catch {
    tkts = "error";
  }

  const ok = stalePrograms.length === 0 && database === "ok" && tkts === "ok";
  return Response.json(
    {
      ok,
      checkedAt: new Date().toISOString(),
      release: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      catalog: {
        shows: allShows().length,
        programs: allPrograms().length,
        lastVerified: programsLastVerified(),
        stalePrograms: stalePrograms.length,
      },
      services: { database, tkts },
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
