"use client";

import Link from "next/link";
import { BellPlus, BellRing } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useApp } from "@/lib/store";
import { Show } from "@/lib/shows";

/**
 * The show page's engagement action (Phase 14) — the buy CTA's replacement.
 * Follows the show; the push pipeline pings when one of its rush or lottery
 * windows opens or is about to close.
 */
export function FollowShowCard({ show }: { show: Show }) {
  const { follows, toggleFollow, setFollowEnabled } = useApp();
  const toast = useToast();
  const follow = follows.find((item) => item.show.slug === show.slug);
  const following = follow !== undefined;
  const enabled = follow?.enabled ?? false;

  return (
    <div className="mt-3 flex items-center gap-3.5 rounded-card bg-paper p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream">
        {following ? (
          <BellRing className="size-5 text-ink" strokeWidth={1.8} />
        ) : (
          <BellPlus className="size-5 text-ink" strokeWidth={1.8} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">
          {following
            ? enabled
              ? "Following this show"
              : "Alerts paused"
            : "Follow this show"}
        </p>
        <p className="mt-0.5 text-caption text-ink-soft">
          {following && enabled ? (
            <>
              Rush &amp; lottery alerts are on ·{" "}
              <Link
                href="/notify"
                className="underline underline-offset-2 transition-opacity active:opacity-60"
              >
                Manage follows
              </Link>
            </>
          ) : following ? (
            "This show stays saved here until you resume alerts"
          ) : (
            "Get a push when a rush or lottery window opens"
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          if (follow && !enabled) setFollowEnabled(follow.id, true);
          else toggleFollow(show);
          toast({
            message:
              follow && !enabled
                ? `${show.title} alerts resumed`
                : following
                  ? `Unfollowed ${show.title}`
                  : `Following ${show.title}`,
          });
        }}
        className={`h-10 shrink-0 rounded-full px-4 text-caption font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.96] ${
          following && enabled ? "bg-inset text-ink" : "bg-espresso text-white"
        }`}
      >
        {following ? (enabled ? "Following" : "Resume") : "Follow"}
      </button>
    </div>
  );
}
