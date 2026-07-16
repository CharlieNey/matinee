import { currentShowAt, allTheaters, theatersLastVerified, TICKETER_LABELS } from "@/lib/theaters";

// Pure curated data — prerender it as a static JSON document.
export const dynamic = "force-static";

/** The open Broadway-houses dataset (see /about). */
export async function GET() {
  return Response.json({
    meta: {
      what: "All 41 Broadway houses: owner, official ticketer, address, current production",
      lastVerified: theatersLastVerified(),
      docs: "/about",
      license:
        "Facts of theater ownership and ticketing, hand-curated; provided as-is.",
    },
    theaters: allTheaters().map((theater) => {
      const current = currentShowAt(theater);
      return {
        name: theater.name,
        owner: theater.owner,
        ticketer: theater.ticketer,
        ticketerLabel: TICKETER_LABELS[theater.ticketer],
        address: theater.address,
        currentShow: current
          ? { slug: current.slug, title: current.title, genre: current.genre }
          : null,
      };
    }),
  });
}
