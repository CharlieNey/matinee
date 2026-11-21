import {
  allPrograms,
  isProgramStale,
  programsLastVerified,
  programsOldestVerified,
} from "@/lib/programs";
import { getPushStore } from "@/lib/push/server";
import type { PipelineStatus } from "@/lib/push/store";
import { allShows } from "@/lib/shows";
import { fetchTktsData } from "@/lib/tktsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * No successful scheduler run for this long means push is dead. The scheduler
 * ticks every minute (Supabase Cron) or every 15 (the GitHub backup, which
 * lags), so 20 minutes is a miss, not jitter.
 */
const SCHEDULER_OVERDUE_MINUTES = 20;

type Check = "ok" | "error" | "not-configured";

/**
 * Public, non-secret readiness for uptime monitors and the hourly CI check.
 * 503 when the catalog is stale, the database or TKTS is unreachable, the
 * rate limiter is broken, or the push scheduler has stopped.
 */
export async function GET() {
  const now = new Date();
  const stalePrograms = allPrograms().filter((program) =>
    isProgramStale(program, now),
  );

  const store = getPushStore();
  let database: Check | "local" = store
    ? store.kind === "memory"
      ? "local"
      : "ok"
    : "not-configured";
  let rateLimit: Check = "not-configured";
  let scheduler: "ok" | "overdue" | "never-run" | "unknown" = "unknown";
  let pipeline: PipelineStatus | null = null;

  if (store) {
    const [status, probe] = await Promise.allSettled([
      store.pipelineStatus(),
      // Huge limit: this checks that the limiter answers, not that it limits.
      store.consumeRateLimit("health-probe", 60, 1_000),
    ]);
    if (status.status === "fulfilled") {
      pipeline = status.value;
      const lastOk = pipeline.lastOkRunAt?.getTime();
      scheduler =
        lastOk === undefined
          ? "never-run"
          : now.getTime() - lastOk <= SCHEDULER_OVERDUE_MINUTES * 60 * 1000
            ? "ok"
            : "overdue";
    } else {
      database = "error";
    }
    rateLimit = probe.status === "fulfilled" && probe.value ? "ok" : "error";
  }

  let tkts: "ok" | "error" = "error";
  try {
    const data = await fetchTktsData();
    if (data.ok) tkts = "ok";
  } catch {
    tkts = "error";
  }

  const ok =
    stalePrograms.length === 0 &&
    (database === "ok" || database === "local") &&
    rateLimit === "ok" &&
    scheduler === "ok" &&
    tkts === "ok";
  const iso = (date: Date | null | undefined) => date?.toISOString() ?? null;

  return Response.json(
    {
      ok,
      checkedAt: now.toISOString(),
      release: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      catalog: {
        shows: allShows().length,
        programs: allPrograms().length,
        lastVerified: programsLastVerified(),
        oldestVerified: programsOldestVerified(),
        stalePrograms: stalePrograms.length,
      },
      services: { database, rateLimit, scheduler, tkts },
      push: {
        overdueAfterMinutes: SCHEDULER_OVERDUE_MINUTES,
        lastRunAt: iso(pipeline?.lastRunAt),
        lastRunSource: pipeline?.lastRunSource ?? null,
        lastRunError: pipeline?.lastRunError ?? null,
        lastOkRunAt: iso(pipeline?.lastOkRunAt),
        lastSentAt: iso(pipeline?.lastSentAt),
        subscriptions: pipeline?.subscriptions ?? null,
      },
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
