import Link from "next/link";
import { collection } from "@/lib/data";
import { Poster } from "./Poster";

/** "My Top 10" poster shelf — the diary's crown jewels. */
export function TopTenShelf({
  claimName,
}: {
  /** Page-level dedupe for shared-element names (see DiscoverPage). */
  claimName?: (slug: string) => string | undefined;
}) {
  return (
    <div className="flex items-center gap-4 overflow-hidden rounded-card bg-paper py-4 pl-5 pr-0">
      <div className="shrink-0 text-center leading-none">
        <span className="block text-[21px] font-bold tracking-tight">
          My Top
        </span>
        <span className="mt-1 block text-[46px] font-extrabold tracking-tight">
          10
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {collection.topTen.map((show) => (
          <Link
            key={show.slug}
            href={`/shows/${show.slug}`}
            className="shrink-0 transition-transform duration-150 active:scale-[0.96]"
            aria-label={`${show.title} tickets`}
          >
            <Poster
              show={show}
              className="w-[84px] rounded-thumb"
              name={claimName?.(show.slug)}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
