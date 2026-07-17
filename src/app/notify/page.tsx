"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Trash2 } from "lucide-react";
import { BackHeader } from "@/components/BackHeader";
import { NotifyPushCard } from "@/components/NotifyPushCard";
import { Poster } from "@/components/Poster";
import { Sheet } from "@/components/Sheet";
import { ShowPicker } from "@/components/ShowPicker";
import { Toggle } from "@/components/Toggle";
import { useToast } from "@/components/Toast";
import { Follow } from "@/lib/data";
import {
  etDayKey,
  getProgramStatus,
  programKindLabel,
  programsForShow,
} from "@/lib/programs";
import { useApp } from "@/lib/store";
import { allShows, Show } from "@/lib/shows";
import { useNow } from "@/lib/useNow";

function fmtTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

function fmtWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "America/New_York",
  });
}

/** One line per follow: the most urgent thing its programs are doing. */
function windowLine(slug: string, now: Date | null): string {
  const programs = programsForShow(slug);
  if (programs.length === 0) {
    return "No verified rush or lottery yet — we'll stay quiet.";
  }
  const count = `${programs.length} program${programs.length === 1 ? "" : "s"} tracked`;
  if (!now) return count;

  const statuses = programs.map((p) => ({ p, s: getProgramStatus(now, p) }));
  const open = statuses.find(
    ({ s }) => s.state === "open" || s.state === "closes-soon",
  );
  if (open?.s.nextCloseAt) {
    return `${programKindLabel(open.p.kind)} open now · closes ${fmtTime(open.s.nextCloseAt)}`;
  }

  const upcoming = statuses
    .filter(({ s }) => s.nextOpenAt !== null)
    .sort((a, b) => a.s.nextOpenAt!.getTime() - b.s.nextOpenAt!.getTime())[0];
  if (upcoming?.s.nextOpenAt) {
    const opensAt = upcoming.s.nextOpenAt;
    const when =
      etDayKey(opensAt) === etDayKey(now)
        ? fmtTime(opensAt)
        : `${fmtWeekday(opensAt)} ${fmtTime(opensAt)}`;
    return `${programKindLabel(upcoming.p.kind)} opens ${when}`;
  }
  return count;
}

function FollowCard({
  follow,
  line,
  onEnabledChange,
  onDelete,
}: {
  follow: Follow;
  line: string;
  onEnabledChange: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-card bg-paper p-4">
      <div className="flex gap-4">
        <Poster show={follow.show} className="w-[72px] rounded-thumb" />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-[20px] font-bold leading-tight tracking-tight">
            {follow.show.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-body text-ink-soft">{line}</p>
        </div>
        <Toggle
          on={follow.enabled}
          onChange={onEnabledChange}
          label={`Alerts for ${follow.show.title}`}
        />
      </div>
      <div className="mt-4 flex justify-end border-t border-line pt-2 text-ink-soft">
        <button
          type="button"
          aria-label={`Unfollow ${follow.show.title}`}
          onClick={onDelete}
          className="p-2.5 transition-transform duration-150 active:scale-90"
        >
          <Trash2 className="size-6" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

/**
 * Following (Phase 14): the shows you follow and what their rush/lottery
 * windows are doing next. Replaces the marketplace-era price alerts — the
 * push backend only ever knew program windows; now the page tells the truth.
 */
export default function FollowingPage() {
  const {
    follows,
    toggleFollow,
    setFollowEnabled,
    removeFollow,
    restoreFollow,
  } = useApp();
  const toast = useToast();
  const now = useNow();

  const [addOpen, setAddOpen] = useState(false);

  const followedSlugs = new Set(follows.map((f) => f.show.slug));
  const pickableShows = allShows().filter((s) => !followedSlugs.has(s.slug));

  const handleDelete = (follow: Follow) => {
    const index = follows.findIndex((f) => f.id === follow.id);
    removeFollow(follow.id);
    toast({
      message: `Unfollowed ${follow.show.title}`,
      action: { label: "Undo", onClick: () => restoreFollow(follow, index) },
    });
  };

  const handleAdd = (show: Show) => {
    toggleFollow(show);
    setAddOpen(false);
    toast({ message: `Following ${show.title}` });
  };

  return (
    <main className="px-4 pb-10 web:mx-auto web:max-w-[560px]">
      <BackHeader title="Following" />

      <NotifyPushCard />

      <h2 className="mt-9 text-heading">Shows you follow</h2>
      <div className="mt-4 flex flex-col gap-3.5">
        <AnimatePresence initial={false} mode="popLayout">
          {follows.map((follow) => (
            <motion.div
              key={follow.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -48 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <FollowCard
                follow={follow}
                line={windowLine(follow.show.slug, now)}
                onEnabledChange={(enabled) => {
                  setFollowEnabled(follow.id, enabled);
                  toast({
                    message: `${follow.show.title} alerts ${enabled ? "resumed" : "paused"}`,
                  });
                }}
                onDelete={() => handleDelete(follow)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {follows.length === 0 && (
          <p className="py-6 text-center text-body text-ink-faint">
            You&apos;re not following any shows yet — pick one and we&apos;ll
            ping you when its rush or lottery opens.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="mt-7 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform] duration-150 active:scale-[0.98] active:bg-vermilion-pressed"
      >
        <Plus className="size-6" strokeWidth={2.2} />
        Follow a show
      </button>

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Follow a show"
      >
        <p className="mt-1 text-body text-ink-soft">
          We&apos;ll ping you when one of its rush or lottery windows opens or
          is about to close.
        </p>
        <div className="mt-5">
          <ShowPicker
            shows={pickableShows}
            selected={null}
            onSelect={handleAdd}
          />
        </div>
      </Sheet>
    </main>
  );
}
