import "server-only";
import { allShows } from "./shows";
import {
  DUFFY_SUMMARY_URL,
  makeSlugResolver,
  parseLiveSummary,
  parseTktsHtml,
  TKTS_LIVE_URL,
  TktsData,
  TktsLiveSummary,
} from "./tkts";

const USER_AGENT =
  "matinee-prototype/0.1 (non-commercial portfolio project; ~2 fetches/hour)";

/** Fetch both live sources with the same cache and failure semantics. */
export async function fetchTktsData(): Promise<TktsData> {
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
  return {
    // Markup drift parses to empty booths — report that as unavailable.
    ok: booths.length > 0 || summary !== null,
    sourceUrl: TKTS_LIVE_URL,
    fetchedAt,
    booths,
    summary,
  };
}
