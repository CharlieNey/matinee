"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Bookmark } from "lucide-react";
import { Show } from "@/lib/shows";
import { useApp } from "@/lib/store";
import { Poster } from "./Poster";

/** Show row inside a timeline/list card — always `Venue-tier · Genre`.
 *  Row navigates to the show; the bookmark toggles saved state. */
export function InsetShowRow({ show }: { show: Show }) {
  const { isSaved, toggleSaved } = useApp();
  const saved = isSaved(show.slug);

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
      <motion.button
        type="button"
        whileTap={{ scale: 0.8 }}
        onClick={() => toggleSaved(show.slug)}
        aria-pressed={saved}
        aria-label={
          saved ? `Remove ${show.title} bookmark` : `Bookmark ${show.title}`
        }
        className="relative z-10 -m-2 p-2 text-ink-soft"
      >
        <Bookmark
          className="size-6 transition-[fill] duration-150"
          strokeWidth={1.8}
          fill={saved ? "currentColor" : "none"}
        />
      </motion.button>
    </div>
  );
}
