import Link from "next/link";
import { Show } from "@/lib/shows";
import { Poster } from "./Poster";

/** Marketplace card: one show, summarizing its live listings. */
export function ShowCard({
  show,
  count,
  minPrice,
}: {
  show: Show;
  count: number;
  minPrice: number;
}) {
  return (
    <Link
      href={`/shows/${show.slug}`}
      className="block overflow-hidden rounded-card bg-paper shadow-float transition-transform duration-150 active:scale-[0.98]"
    >
      <Poster show={show} className="w-full" />
      <div className="p-4">
        <h3 className="truncate text-heading">{show.title}</h3>
        <p className="mt-0.5 truncate text-caption text-ink-soft">
          {show.tier} · {show.genre}
        </p>
        <p className="mt-2.5 flex items-baseline gap-1.5">
          <span className="text-caption text-ink-soft">from</span>
          <span className="text-[24px] font-bold leading-none tracking-tight">
            ${minPrice}
          </span>
          <span className="ml-auto text-caption text-ink-soft">
            {count} listing{count > 1 ? "s" : ""}
          </span>
        </p>
      </div>
    </Link>
  );
}
