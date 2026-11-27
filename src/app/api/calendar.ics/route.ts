import { calendarFeed } from "@/lib/calendar";
import { getShow } from "@/lib/shows";

// The feed depends on the clock and the query.
export const dynamic = "force-dynamic";

/** Enough for anyone's follows; keeps one request from asking for everything twice. */
const MAX_SHOWS = 60;

/**
 * GET /api/calendar.ics?shows=wicked,six: the opening alerts for those shows
 * as a subscribable calendar (src/lib/calendar.ts). Unknown slugs are
 * dropped; the server stores nothing.
 */
export function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("shows") ?? "";
  const slugs = [
    ...new Set(
      raw
        .split(",")
        .map((slug) => slug.trim())
        .filter((slug) => slug.length <= 80 && getShow(slug)),
    ),
  ].slice(0, MAX_SHOWS);
  if (slugs.length === 0) {
    return Response.json(
      { error: "Name at least one show, like ?shows=wicked,six" },
      { status: 400 },
    );
  }
  return new Response(calendarFeed(slugs, new Date()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="matinee.ics"',
      // Calendar apps poll every few hours; an hour at the edge is plenty fresh.
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
