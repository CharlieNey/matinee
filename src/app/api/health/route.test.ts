import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real modules reach Supabase and tdf.org; the route's own logic is what
// is under test here.
vi.mock("@/lib/supabaseAdmin", () => ({
  pushBackendConfigured: vi.fn(),
  supabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/tktsServer", () => ({ fetchTktsData: vi.fn() }));

import { allPrograms, programsLastVerified } from "@/lib/programs";
import { pushBackendConfigured, supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchTktsData } from "@/lib/tktsServer";
import { GET } from "./route";

const DAY = 24 * 60 * 60 * 1000;

/** Noon UTC, `days` after a YYYY-MM-DD date. */
function daysAfter(date: string, days: number): Date {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY);
}

/** The oldest row's date: one day later, nothing in the catalog is stale. */
const oldestCheck = allPrograms()
  .map((program) => program.lastVerified)
  .sort()[0];

function databaseReturns(error: unknown) {
  vi.mocked(pushBackendConfigured).mockReturnValue(true);
  vi.mocked(supabaseAdmin).mockReturnValue({
    from: () => ({ select: () => ({ limit: async () => ({ error }) }) }),
  } as unknown as ReturnType<typeof supabaseAdmin>);
}

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(daysAfter(oldestCheck, 1));
    databaseReturns(null);
    vi.mocked(fetchTktsData).mockResolvedValue({ ok: true } as Awaited<
      ReturnType<typeof fetchTktsData>
    >);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("is 200 with a fresh catalog, a reachable database and TKTS", async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.services).toEqual({ database: "ok", tkts: "ok" });
    expect(body.catalog.stalePrograms).toBe(0);
    expect(body.catalog.lastVerified).toBe(programsLastVerified());
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("is 503 once the catalog passes the 14-day freshness contract", async () => {
    // Every row is on or before the latest check, so all of them are stale.
    vi.setSystemTime(daysAfter(programsLastVerified(), 15));
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.catalog.stalePrograms).toBe(body.catalog.programs);
  });

  it("is 503 when the database errors", async () => {
    databaseReturns({ message: "down" });
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).services.database).toBe("error");
  });

  it("is 503 when the database is not configured", async () => {
    vi.mocked(pushBackendConfigured).mockReturnValue(false);
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).services.database).toBe("not-configured");
  });

  it("is 503 when the TKTS fetch throws", async () => {
    vi.mocked(fetchTktsData).mockRejectedValue(new Error("upstream 500"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).services.tkts).toBe("error");
  });
});
