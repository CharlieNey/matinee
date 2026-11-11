import { fetchTktsData } from "@/lib/tktsServer";

/**
 * TKTS live board, normalized (Phase 13). Two upstreams, fetched in parallel:
 * TDF's per-show board page (cached 30 min — uncached per-request PHP on their
 * end, so poll gently) and Duffy Dashboard's public Community API (cached
 * 10 min) for real-time booth status + aggregates, since TDF's page can lag
 * days behind. Either source failing never breaks the other.
 */
export async function GET() {
  return Response.json(await fetchTktsData());
}
