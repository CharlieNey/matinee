"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { Show } from "@/lib/shows";
import { Poster } from "./Poster";

/** A show you attended, in the activity feed, rendered as a torn ticket
 *  (DESIGN.md §13/§344 — torn = attended, the app's single skeuomorphic
 *  flourish). Mirrors the diary ticket's anatomy for the static feed, where
 *  there's no seat or private note: body (poster + title + Tier · Genre,
 *  links to the show), the CSS-masked perforation, then a stub carrying the
 *  venue — where you were. No bookmark: controls don't belong on a keepsake. */
export function AttendedTicket({ show }: { show: Show }) {
  return (
    <div className="mt-4">
      <Link
        href={`/shows/${show.slug}`}
        className="flex items-center gap-3.5 rounded-t-card bg-paper p-4 pb-2.5 transition-opacity duration-150 active:opacity-70"
      >
        <Poster show={show} className="w-14 shrink-0 rounded-thumb" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold">{show.title}</p>
          <p className="mt-0.5 truncate text-caption text-ink-soft">
            {show.tier} · {show.genre}
          </p>
        </div>
      </Link>
      {/* Tear line — real perforation, masked out of the paper (see globals.css). */}
      <div className="ticket-tear" aria-hidden />
      <div className="rounded-b-card bg-paper px-4 pb-3.5 pt-2.5">
        <p className="flex items-center gap-2 text-caption text-ink-soft">
          <MapPin className="size-4 shrink-0" strokeWidth={1.8} />
          {show.venue}
        </p>
      </div>
    </div>
  );
}
