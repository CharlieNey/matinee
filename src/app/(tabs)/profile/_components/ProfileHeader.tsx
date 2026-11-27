"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings, SquarePen, UserRound, Zap } from "lucide-react";
import { FollowSpot } from "@/components/FollowSpot";
import { ShareButton } from "@/components/ShareButton";
import { useToast } from "@/components/Toast";
import {
  LotteryEntry,
  onLotteryLogChange,
  readLotteryLog,
} from "@/lib/entries";
import { allPrograms, etDayKey, programKey } from "@/lib/programs";
import { encodeSharedProfile } from "@/lib/shareProfile";
import { getShow } from "@/lib/shows";
import { useApp } from "@/lib/store";
import { useNow } from "@/lib/useNow";

/** Consecutive ET days with at least one entry, ending today or yesterday. */
function entryStreak(log: LotteryEntry[], now: Date): number {
  const days = new Set(log.map((e) => e.day));
  const cursor = new Date(now);
  if (!days.has(etDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(etDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** The espresso identity header: name, record stats, share and settings. */
export function ProfileHeader({
  onEdit,
  onSettings,
  onAttended,
  onRecord,
}: {
  onEdit: () => void;
  onSettings: () => void;
  onAttended: () => void;
  onRecord: () => void;
}) {
  const { profile, diary, attended, follows } = useApp();
  const toast = useToast();
  const now = useNow();

  // The identity card is a live theater record, never social-proof theater.
  const [log, setLog] = useState<LotteryEntry[]>([]);
  useEffect(() => {
    const sync = () => setLog(readLotteryLog());
    sync();
    return onLotteryLogChange(sync);
  }, []);
  const programByKey = new Map(
    allPrograms().map((program) => [programKey(program), program]),
  );
  const wins = log.filter((entry) => entry.won);
  const moneySaved = wins.reduce((sum, entry) => {
    const program = programByKey.get(entry.key);
    if (!program) return sum;
    const face = getShow(program.showSlug)?.faceValue ?? 0;
    return sum + Math.max(0, face - program.price);
  }, 0);
  const streak = now ? entryStreak(log, now) : 0;
  const hasRecap = attended.length > 0 || log.length > 0;

  // Phase 11: the whole diary travels inside the link — no backend, no
  // account. Photos and private words are stripped before encoding.
  const shareProfile = async () => {
    try {
      const fragment = await encodeSharedProfile({
        v: 1,
        name: profile.name,
        handle: profile.handle,
        bio: profile.bio,
        diary: diary.map((entry) => ({
          slug: entry.show.slug,
          performanceDate: entry.performanceDate,
          sentiment: entry.sentiment,
          thoughts: entry.visibility === "public" ? entry.thoughts : null,
          tags: entry.visibility === "public" ? entry.tags : [],
        })),
      });
      const url = `${window.location.origin}/p#${fragment}`;
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: profile.name ? `${profile.name} on Matinee` : "My Matinee diary",
            url,
          });
          return;
        } catch {
          // Cancelled or unsupported — fall through to clipboard.
        }
      }
      await navigator.clipboard.writeText(url);
      toast({ message: "Profile link copied — diary included" });
    } catch {
      toast({ message: "Couldn't build the share link" });
    }
  };

  const iconBtn =
    "transition-transform duration-150 active:scale-90";

  // Dark = identity: espresso header with a follow spot settled over the
  // avatar + name; the gradient is the no-WebGL fallback. Web mode: the
  // header becomes a sticky identity card in the left rail (DESIGN.md §10 —
  // the espresso header reads as a card).
  return (
    <header
      className="relative min-w-0 overflow-hidden px-4 pb-12 pt-4 text-white web:sticky web:top-24 web:rounded-card web:px-6 web:pb-8"
      style={{
        background:
          "linear-gradient(180deg, var(--color-espresso-glow) 0%, var(--color-espresso) 45%)",
      }}
    >
      <FollowSpot />
      <div className="relative">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-10 items-center gap-2 rounded-full bg-espresso-raised px-4 text-body font-medium transition-transform duration-150 active:scale-[0.97]"
          >
            <SquarePen className="size-[18px]" strokeWidth={1.8} />
            Edit profile
          </button>
          <button
            type="button"
            aria-label="Settings"
            className={iconBtn}
            onClick={onSettings}
          >
            <Settings className="size-6" strokeWidth={1.8} />
          </button>
          <ShareButton
            variant="icon"
            label="Share profile"
            onShare={shareProfile}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-5">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit profile photo"
          className="flex size-[88px] shrink-0 items-center justify-center rounded-full bg-espresso-raised text-[40px] font-semibold transition-transform duration-150 active:scale-[0.97]"
        >
          {profile.name ? (
            profile.name[0]
          ) : (
            <UserRound className="size-10" strokeWidth={1.6} aria-hidden="true" />
          )}
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-[28px] font-bold tracking-normal">
            {profile.name || (
              <button
                type="button"
                onClick={onEdit}
                className="text-white/70 underline decoration-white/30 underline-offset-4 transition-opacity active:opacity-70"
              >
                Add your name
              </button>
            )}
          </h1>
          <p className="mt-1 text-body text-white/60">Your theater record</p>
        </div>
      </div>

      {/* One line of what there is, in words; nothing at all until there is
          something. A grid of zeros told a new visitor nothing. */}
      {(() => {
        const stat = "font-semibold text-white tabular-nums";
        const link =
          "underline decoration-white/30 underline-offset-4 transition-opacity active:opacity-70";
        const items = [
          attended.length > 0 && (
            <button key="shows" type="button" onClick={onAttended} className={link}>
              <b className={stat}>{attended.length}</b>{" "}
              {attended.length === 1 ? "show" : "shows"}
            </button>
          ),
          log.length > 0 && (
            <button key="entries" type="button" onClick={onRecord} className={link}>
              <b className={stat}>{log.length}</b>{" "}
              {log.length === 1 ? "entry" : "entries"}
            </button>
          ),
          wins.length > 0 && (
            <button key="wins" type="button" onClick={onRecord} className={link}>
              <b className={stat}>{wins.length}</b>{" "}
              {wins.length === 1 ? "win" : "wins"}
            </button>
          ),
          moneySaved > 0 && (
            <button key="saved" type="button" onClick={onRecord} className={link}>
              <b className={stat}>${moneySaved}</b> saved
            </button>
          ),
          follows.length > 0 && (
            <Link key="following" href="/notify" className={link}>
              <b className={stat}>{follows.length}</b> following
            </Link>
          ),
        ].filter(Boolean);
        if (items.length === 0) return null;
        return (
          <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-body text-white/70">
            {items}
          </p>
        );
      })()}

      {streak > 1 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() =>
              toast({
                message: `${streak} days in a row with a rush or lottery entry`,
              })
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-body font-semibold transition-transform duration-150 active:scale-[0.96]"
          >
            <Zap
              className="size-5 text-white"
              fill="currentColor"
              strokeWidth={0}
            />
            {streak}-day streak
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onEdit}
        className="mt-4 block max-w-full text-left text-body text-white/60 [overflow-wrap:anywhere] transition-opacity active:opacity-70"
      >
        {profile.bio ?? "Add a few words about yourself"}
      </button>

      {/* "Following" only when the stats line has no "N following" link to
          the same page; the season recap once there is something to recap. */}
      {(follows.length === 0 || hasRecap) && (
        <p className="mt-6 flex gap-6 text-body font-semibold">
          {follows.length === 0 && (
            <Link
              href="/notify"
              className="underline decoration-white/40 underline-offset-4 transition-opacity active:opacity-70"
            >
              Following
            </Link>
          )}
          {hasRecap && (
            <Link
              href="/wrapped"
              className="underline decoration-white/40 underline-offset-4 transition-opacity active:opacity-70"
            >
              Wrapped
            </Link>
          )}
        </p>
      )}
      </div>
    </header>
  );
}
