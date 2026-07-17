import { allShows } from "@/lib/shows";
import {
  DUFFY_SUMMARY_URL,
  makeSlugResolver,
  parseLiveSummary,
  parseTktsHtml,
  TKTS_LIVE_URL,
  TktsData,
  TktsLiveSummary,
} from "@/lib/tkts";

const USER_AGENT =
  "matinee-prototype/0.1 (non-commercial portfolio project; ~2 fetches/hour)";

/**
 * TKTS live board, normalized (Phase 13). Two upstreams, fetched in parallel:
 * TDF's per-show board page (cached 30 min — uncached per-request PHP on their
 * end, so poll gently) and Duffy Dashboard's public Community API (cached
 * 10 min) for real-time booth status + aggregates, since TDF's page can lag
 * days behind. Either source failing never breaks the other.
 */
export async function GET() {
  const fetchedAt = new Date().toISOString();

  const [boardResult, summaryResult] = await Promise.allSettled([
    fetch(TKTS_LIVE_URL, {
      next: { revalidate: 1800 },
      headers: { "User-Agent": USER_AGENT },
    }).then(async (upstream) => {
      if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
      return parseTktsHtml(await upstream.text(), makeSlugResolver(allShows()));
    }),
    fetch(DUFFY_SUMMARY_URL, {
      next: { revalidate: 600 },
      headers: { "User-Agent": USER_AGENT },
    }).then(async (upstream) => {
      if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
      return parseLiveSummary(await upstream.json());
    }),
  ]);

  const booths = boardResult.status === "fulfilled" ? boardResult.value : [];
  const summary: TktsLiveSummary | null =
    summaryResult.status === "fulfilled" ? summaryResult.value : null;

  const data: TktsData = {
    // Markup drift parses to empty booths — report that as unavailable.
    ok: booths.length > 0 || summary !== null,
    sourceUrl: TKTS_LIVE_URL,
    fetchedAt,
    booths,
    summary,
  };
  return Response.json(data);
}
