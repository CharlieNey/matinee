import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/contact";

/**
 * Crawl everything public. Personal pages (a visitor's diary, follows and
 * shared-diary links) hold nothing worth indexing, so they're left out.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/p", "/profile", "/notify", "/log/", "/wrapped"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
