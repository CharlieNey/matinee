"use client";

import Link from "next/link";
import { BellPlus, BellRing } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useApp } from "@/lib/store";
import { Show } from "@/lib/shows";

/**
 * The show page's engagement action (Phase 14) — the buy CTA's replacement.
 * Adds the show to Watches; the push pipeline pings when one of its rush or
 * lottery windows opens or is about to close.
 */
export function WatchShowCard({ show }: { show: Show }) {
  const { isWatched, toggleWatch } = useApp();
  const toast = useToast();
  const watched = isWatched(show.slug);

  return (
    <div className="mt-3 flex items-center gap-3.5 rounded-card bg-paper p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream">
        {watched ? (
          <BellRing className="size-5 text-ink" strokeWidth={1.8} />
        ) : (
          <BellPlus className="size-5 text-ink" strokeWidth={1.8} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">
          {watched ? "Watching this show" : "Watch this show"}
        </p>
        <p className="mt-0.5 text-caption text-ink-soft">
          {watched ? (
            <>
              Rush &amp; lottery alerts are on ·{" "}
              <Link
                href="/notify"
                className="underline underline-offset-2 transition-opacity active:opacity-60"
              >
                Manage watches
              </Link>
            </>
          ) : (
            "Get a push when a rush or lottery window opens"
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          toggleWatch(show);
          toast({
            message: watched ? "Watch removed" : `Watching ${show.title}`,
          });
        }}
        className={`h-10 shrink-0 rounded-full px-4 text-caption font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.96] ${
          watched ? "bg-inset text-ink" : "bg-espresso text-white"
        }`}
      >
        {watched ? "Watching" : "Watch"}
      </button>
    </div>
  );
}
