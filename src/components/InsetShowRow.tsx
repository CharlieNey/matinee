"use client";

import Link from "next/link";
import { Show } from "@/lib/shows";
import { InterestedButton } from "./InterestedButton";
import { Poster } from "./Poster";

/** Show row inside a timeline/list card — always `Venue-tier · Genre`.
 *  Row navigates to the show; the corner bookmark is the Interested toggle. */
export function InsetShowRow({ show }: { show: Show }) {
  return (
    <div className="relative flex items-center gap-3.5 rounded-2xl bg-inset p-3 transition-transform duration-150 active:scale-[0.99]">
      <Link
        href={`/shows/${show.slug}`}
        className="absolute inset-0 rounded-2xl"
        aria-label={`${show.title} tickets`}
      />
      <Poster show={show} className="w-14 rounded-thumb" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold">{show.title}</p>
        <p className="mt-0.5 text-caption text-ink-soft">
          {show.tier} · {show.genre}
        </p>
      </div>
      <InterestedButton show={show} variant="icon" />
    </div>
  );
}
