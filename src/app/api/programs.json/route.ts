import { allPrograms } from "@/lib/programs";
import { show } from "@/lib/shows";

// Pure curated data — prerender it as a static JSON document.
export const dynamic = "force-static";

/** The open rush/lottery dataset (see /about). */
export async function GET() {
  return Response.json({
    meta: {
      what: "Curated Broadway rush, lottery, standing-room, and student programs",
      timezone: "America/New_York",
      docs: "/about",
      license:
        "Facts, hand-curated; provided as-is. Verify with the linked platform before you plan a night around it — each row carries its own lastVerified date.",
    },
    programs: allPrograms().map((program) => ({
      showSlug: program.showSlug,
      showTitle: show(program.showSlug).title,
      kind: program.kind,
      platform: program.platform,
      name: program.name ?? null,
      price: program.price,
      maxTickets: program.maxTickets,
      entryUrl: program.entryUrl,
      schedule: program.schedule,
      notes: program.notes ?? null,
      lastVerified: program.lastVerified,
    })),
  });
}
