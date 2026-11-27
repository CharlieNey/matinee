import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/contact";
import { programsForShow, programsLastVerified } from "@/lib/programs";
import { allShows } from "@/lib/shows";

/**
 * Every page worth finding from a search: the board, the map, the trip
 * planner, About, and one page per show. Closed shows stay listed: their
 * pages say so. A show's lastModified is the day its rows were last checked.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const catalogChecked = new Date(`${programsLastVerified()}T12:00:00Z`);
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: catalogChecked, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/rush`, lastModified: catalogChecked, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/district`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/trip`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
  ];
  for (const show of allShows()) {
    const checked = programsForShow(show.slug)
      .map((program) => program.lastVerified)
      .sort()
      .at(-1);
    pages.push({
      url: `${SITE_URL}/shows/${show.slug}`,
      ...(checked ? { lastModified: new Date(`${checked}T12:00:00Z`) } : {}),
      changeFrequency: show.closedOn ? "yearly" : "weekly",
      priority: show.closedOn ? 0.2 : 0.8,
    });
  }
  return pages;
}
