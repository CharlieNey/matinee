"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Armchair,
  BellPlus,
  Bookmark,
  Calendar,
  EyeOff,
  Mail,
  Settings,
  SquarePen,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Zap,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { EntryHeatmap } from "@/components/EntryHeatmap";
import { InsetShowRow } from "@/components/InsetShowRow";
import { Poster } from "@/components/Poster";
import { ShareButton } from "@/components/ShareButton";
import { Sheet } from "@/components/Sheet";
import { FollowSpot } from "@/components/FollowSpot";
import { Toggle } from "@/components/Toggle";
import { useToast } from "@/components/Toast";
import { TopTenShelf } from "@/components/TopTenShelf";
import { TopTenSheet } from "@/components/TopTenSheet";
import {
  ActivityEntry,
  activityFeed,
  profile as profileData,
} from "@/lib/data";
import {
  LotteryEntry,
  onLotteryLogChange,
  readLotteryLog,
} from "@/lib/entries";
import {
  allPrograms,
  etDayKey,
  programKey,
  programKindLabel,
} from "@/lib/programs";
import { renderStubCard, shareImage } from "@/lib/shareCards";
import { encodeSharedProfile } from "@/lib/shareProfile";
import { DiaryEntry, useApp } from "@/lib/store";
import { getShow, Show } from "@/lib/shows";
import { useNow } from "@/lib/useNow";

const PROFILE_TABS = [
  ["activity", "Activity"],
  ["record", "Record"],
  ["collection", "Collection"],
] as const;
type Tab = (typeof PROFILE_TABS)[number][0];
type SheetName =
  | "edit"
  | "settings"
  | "messages"
  | "follows"
  | "interested"
  | "attended"
  | "topten"
  | null;

function HeaderPill({
  icon,
  label,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "flex h-12 items-center justify-center gap-2 rounded-full bg-espresso-raised text-body font-medium text-white transition-transform duration-150 active:scale-[0.97]";
  if (href) {
    return (
      <Link href={href} className={className}>
        {icon}
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {icon}
      {label}
    </button>
  );
}

/** Sentiment suffix on the "Marked as attended" line. Recommend keeps its
 *  gold chip; disliked mirrors it with a quiet-ink thumbs-down (gold stays
 *  praise-only); mixed stays the quiet pill — never vermilion. */
function SentimentChip({
  sentiment,
}: {
  sentiment: DiaryEntry["sentiment"];
}) {
  if (sentiment === "recommend") {
    return (
      <span className="flex items-center gap-1.5 text-[15px] font-semibold text-gold-ink">
        <ThumbsUp className="size-4" strokeWidth={2} fill="currentColor" />
        Recommend it
      </span>
    );
  }
  if (sentiment === "disliked") {
    return (
      <span className="flex items-center gap-1.5 text-[15px] font-semibold text-ink-soft">
        <ThumbsDown className="size-4" strokeWidth={2} fill="currentColor" />
        Didn&apos;t like it
      </span>
    );
  }
  return (
    <span className="rounded-full bg-inset px-2.5 py-1 text-caption font-medium text-ink-soft">
      Mixed feelings
    </span>
  );
}

/** Rich "ticket stub" card for an entry logged through the diary flow. */
function DiaryCard({ entry }: { entry: DiaryEntry }) {
  const toast = useToast();

  // Phase 11: the stub as a share image, rendered on-device.
  const handleShare = async () => {
    const blob = await renderStubCard({
      show: entry.show,
      sentimentLine:
        entry.sentiment === "recommend"
          ? "👍 Recommend it"
          : entry.sentiment === "mixed"
            ? "Mixed feelings"
            : "Didn't like it",
      thoughts: entry.visibility === "public" ? entry.thoughts : null,
      date: new Date(entry.loggedAt),
    });
    const result = await shareImage(
      blob,
      `matinee-stub-${entry.show.slug}.png`,
      entry.show.title,
    );
    toast({
      message: result === "shared" ? "Shared!" : "Image downloaded",
    });
  };

  return (
    // The diary entry as a ticket (DESIGN.md §13): everything typeset flat
    // on the ticket paper — no nested inset card, no controls — body above
    // the tear line, stub below. The app's single skeuomorphic flourish.
    // Body and stub each carry the paper; the tear strip between them is
    // masked, so the notches and perforation are genuine cutouts.
    <div className="mt-4">
      <div className="flex flex-col gap-3 rounded-t-card bg-paper p-4 pb-2.5">
        <Link
          href={`/shows/${entry.show.slug}`}
          className="flex items-center gap-3.5 transition-opacity duration-150 active:opacity-70"
        >
          <Poster show={entry.show} className="w-14 shrink-0 rounded-thumb" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold">
              {entry.show.title}
            </p>
            <p className="mt-0.5 truncate text-caption text-ink-soft">
              {entry.show.tier} · {entry.show.genre} · {entry.show.venue}
            </p>
          </div>
        </Link>
        {entry.visibility === "public" && entry.thoughts && (
          <p className="text-body italic text-ink-soft">“{entry.thoughts}”</p>
        )}
        {entry.photo && (
          // data: URL from the log flow — next/image can't optimize it
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.photo}
            alt={`Your photo from ${entry.show.title}`}
            className="aspect-[3/4] w-full max-w-[220px] rounded-thumb object-cover"
          />
        )}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg border border-line px-2.5 py-1 text-caption text-ink-soft"
              >
                # {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      {/* Tear line — real perforation: edge notches and punch holes are
          masked out of the paper, not painted on top. */}
      <div className="ticket-tear" aria-hidden />
      {/* The stub — what a ticket keeps: your seat, your private words. */}
      <div className="flex flex-col gap-3 rounded-b-card bg-paper p-4 pt-2.5">
        <p className="flex items-center gap-2 text-caption text-ink-soft">
          <Armchair className="size-4 shrink-0" strokeWidth={1.8} />
          {entry.seat}
        </p>
        {entry.note && (
          <p className="flex items-start gap-2 text-caption text-ink-faint">
            <EyeOff className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
            <span>
              <span className="font-medium">Only you</span> · {entry.note}
            </span>
          </p>
        )}
        <ShareButton
          variant="quiet"
          label="Share as image"
          onShare={handleShare}
        />
      </div>
    </div>
  );
}

type TimelineItem =
  | { kind: "diary"; entry: DiaryEntry }
  | { kind: "static"; entry: ActivityEntry };

function ActivityTimeline() {
  const { diary } = useApp();

  // Fresh diary entries stack on top of the static feed.
  const items: TimelineItem[] = [
    ...diary.map((entry): TimelineItem => ({ kind: "diary", entry })),
    ...activityFeed.map((entry): TimelineItem => ({ kind: "static", entry })),
  ];

  return (
    <ol className="pt-6">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        const key = item.kind === "diary" ? item.entry.id : `static-${i}`;
        return (
          <li key={key} className="relative pl-9 pb-9">
            {!last && (
              <span className="absolute left-[4px] top-4 bottom-[-8px] w-[1.5px] bg-line" />
            )}
            {item.kind === "diary" ? (
              <>
                <span className="absolute left-0 top-1.5 size-2.5 rounded-full bg-espresso-raised" />
                <h3 className="text-heading">
                  {new Date(item.entry.loggedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </h3>
                <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-ink-soft">
                  Marked as attended
                  <SentimentChip sentiment={item.entry.sentiment} />
                </p>
                <DiaryCard entry={item.entry} />
              </>
            ) : item.entry.kind === "milestone" ? (
              <>
                <span className="absolute left-0 top-1 size-2.5 rounded-full bg-espresso-raised" />
                <p className="text-body text-ink-soft">{item.entry.text}</p>
              </>
            ) : (
              <>
                {item.entry.yearMarker && (
                  <p className="mb-4 -mt-1 text-body text-ink-faint">
                    {item.entry.yearMarker}
                  </p>
                )}
                <span
                  className={`absolute left-0 size-2.5 rounded-full bg-espresso-raised ${
                    item.entry.yearMarker ? "top-10" : "top-1.5"
                  }`}
                />
                <h3 className="text-heading">{item.entry.date}</h3>
                <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-ink-soft">
                  {item.entry.action}
                  {item.entry.recommend && (
                    <span className="flex items-center gap-1.5 text-[15px] font-semibold text-gold-ink">
                      <ThumbsUp
                        className="size-4"
                        strokeWidth={2}
                        fill="currentColor"
                      />
                      Recommend it
                    </span>
                  )}
                </p>
                {item.entry.thoughts && (
                  <p className="mt-3 text-body italic text-ink-soft">
                    “{item.entry.thoughts}”
                  </p>
                )}
                <div className="mt-4 flex flex-col gap-2.5">
                  {item.entry.shows.map((show) => (
                    <InsetShowRow key={show.slug} show={show} />
                  ))}
                </div>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}

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

/** The lottery record (Phase 14): the "I entered" log as a stats view —
 *  entries, wins, streak, saved vs face. Numbers stay quiet ink on paper;
 *  never a colored chip (DESIGN.md §6). */
function RecordTab() {
  const now = useNow();
  const [log, setLog] = useState<LotteryEntry[]>([]);

  useEffect(() => {
    const sync = () => setLog(readLotteryLog());
    sync();
    return onLotteryLogChange(sync);
  }, []);

  if (log.length === 0) {
    return (
      <div className="pt-10">
        <EmptyState
          text="Tap “I entered” on a rush or lottery and your record collects here…"
          actionLabel="See today's windows"
          actionHref="/rush"
        />
      </div>
    );
  }

  const programByKey = new Map(
    allPrograms().map((program) => [programKey(program), program]),
  );
  const wins = log.filter((e) => e.won);
  const saved = wins.reduce((sum, entry) => {
    const program = programByKey.get(entry.key);
    if (!program) return sum;
    const face = getShow(program.showSlug)?.faceValue ?? 0;
    return sum + Math.max(0, face - program.price);
  }, 0);
  const recentWins = [...wins]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);

  return (
    <div className="flex flex-col gap-7 pb-8 pt-6">
      {now && <EntryHeatmap log={log} now={now} />}

      {recentWins.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <p className="eyebrow">Wins · {wins.length}</p>
            {saved > 0 && (
              <p className="text-caption text-ink-soft">
                saved <b className="font-semibold text-ink">${saved}</b> vs
                face
              </p>
            )}
          </div>
          <div className="mt-2.5 flex flex-col gap-2.5">
            {recentWins.map((entry) => {
              const program = programByKey.get(entry.key);
              const show = program ? getShow(program.showSlug) : undefined;
              if (!program || !show) return null;
              const savedHere = Math.max(0, show.faceValue - program.price);
              return (
                <Link
                  key={`${entry.key}-${entry.day}`}
                  href={`/shows/${show.slug}`}
                  className="flex items-center gap-3.5 rounded-card bg-paper p-3.5 transition-transform duration-150 active:scale-[0.99]"
                >
                  <Poster show={show} className="w-14 rounded-thumb" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold">
                      {show.title}
                    </p>
                    <p className="mt-0.5 text-caption text-ink-soft">
                      {programKindLabel(program.kind)} · ${program.price} ·{" "}
                      {new Date(entry.at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  {savedHere > 0 && (
                    <p className="text-body font-semibold">
                      saved ${savedHere}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/** Taste, from real state: the editable Top 10 shelf, then the two live
 *  collections — Interested (the bookmark set) and Attended (diary + the
 *  pre-app history). Every count is a `.length`; the covers are the
 *  newest member with the state stamped on the art (DESIGN.md §150). */
function CollectionTab({ openSheet }: { openSheet: (s: SheetName) => void }) {
  const { savedShows, attended } = useApp();

  return (
    <div className="flex flex-col gap-7 pt-5">
      <TopTenShelf onEdit={() => openSheet("topten")} />

      {savedShows.length > 0 ? (
        <button
          type="button"
          onClick={() => openSheet("interested")}
          className="flex items-center gap-5 text-left transition-transform duration-150 active:scale-[0.99]"
        >
          <div className="relative">
            <Poster show={savedShows[0]} className="w-[88px] rounded-thumb" />
            <Bookmark
              className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-white/85"
              fill="currentColor"
              strokeWidth={0}
            />
          </div>
          <div>
            <p className="text-title">Interested</p>
            <p className="mt-1 text-body text-ink-soft">
              {savedShows.length} show{savedShows.length === 1 ? "" : "s"}
            </p>
          </div>
        </button>
      ) : (
        <EmptyState
          text="Tap Interested on any show and it collects here…"
          actionLabel="Browse shows"
          actionHref="/"
          icon={
            <Bookmark className="size-16 text-ink-faint" strokeWidth={1.4} />
          }
        />
      )}

      {attended.length > 0 && (
        <button
          type="button"
          onClick={() => openSheet("attended")}
          className="flex items-center gap-5 text-left transition-transform duration-150 active:scale-[0.99]"
        >
          <div className="relative">
            <Poster show={attended[0]} className="w-[88px] rounded-thumb" />
            <Star
              className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-white/85"
              fill="currentColor"
              strokeWidth={0}
            />
          </div>
          <div>
            <p className="text-title">Attended</p>
            <p className="mt-1 text-body text-ink-soft">
              {attended.length} logged
            </p>
          </div>
        </button>
      )}
    </div>
  );
}

function PosterGridSheet({
  open,
  onClose,
  title,
  subtitle,
  shows,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  shows: Show[];
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="mt-1 text-body text-ink-soft">{subtitle}</p>
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {shows.map((show) => (
          <Link
            key={show.slug}
            href={`/shows/${show.slug}`}
            onClick={onClose}
            className="transition-transform duration-150 active:scale-[0.96]"
            aria-label={`${show.title} tickets`}
          >
            <Poster show={show} className="w-full rounded-thumb" />
          </Link>
        ))}
      </div>
    </Sheet>
  );
}

function PersonRow({
  name,
  handle,
  color,
}: {
  name: string;
  handle: string;
  color: string;
}) {
  const [following, setFollowing] = useState(true);
  return (
    <div className="flex items-center gap-3.5 rounded-card bg-paper p-3.5">
      <span
        className="flex size-11 items-center justify-center rounded-full text-body font-semibold text-white"
        style={{ background: color }}
      >
        {name[0]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold">{name}</p>
        <p className="text-caption text-ink-soft">{handle}</p>
      </div>
      <button
        type="button"
        onClick={() => setFollowing((v) => !v)}
        className={`h-10 rounded-full px-4 text-caption font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.96] ${
          following ? "bg-inset text-ink" : "bg-espresso text-white"
        }`}
      >
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("activity");
  const [sheet, setSheet] = useState<SheetName>(null);
  const { profile, updateProfile, diary, savedShows, attended } = useApp();
  const toast = useToast();
  const now = useNow();

  // Entry streak — surfaces on the identity card next to the points chip.
  const [log, setLog] = useState<LotteryEntry[]>([]);
  useEffect(() => {
    const sync = () => setLog(readLotteryLog());
    sync();
    return onLotteryLogChange(sync);
  }, []);
  const streak = now ? entryStreak(log, now) : 0;

  const [draftName, setDraftName] = useState(profile.name);
  const [draftBio, setDraftBio] = useState(profile.bio ?? "");

  const openEdit = () => {
    setDraftName(profile.name);
    setDraftBio(profile.bio ?? "");
    setSheet("edit");
  };

  const saveProfile = () => {
    updateProfile({
      name: draftName.trim() || profile.name,
      bio: draftBio.trim() || null,
    });
    setSheet(null);
    toast({ message: "Profile updated" });
  };

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
          loggedAt: entry.loggedAt,
          sentiment: entry.sentiment,
          thoughts: entry.visibility === "public" ? entry.thoughts : null,
          tags: entry.visibility === "public" ? entry.tags : [],
        })),
      });
      const url = `${window.location.origin}/p#${fragment}`;
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: `${profile.name} on Matinee`, url });
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

  return (
    <main className="web:mx-auto web:grid web:max-w-[1160px] web:grid-cols-[380px_minmax(0,1fr)] web:items-start web:gap-8 web:px-6 web:pt-8">
      {/* Dark = identity: espresso header with a follow spot settled over
          the avatar + name; the gradient is the no-WebGL fallback.
          Web mode: the header becomes a sticky identity card in the left
          rail (DESIGN.md §10 — the espresso header reads as a card). */}
      <header
        className="relative overflow-hidden px-4 pb-12 pt-4 text-white web:sticky web:top-24 web:rounded-card web:px-6 web:pb-8"
        style={{
          background:
            "linear-gradient(180deg, var(--color-espresso-glow) 0%, var(--color-espresso) 45%)",
        }}
      >
        <FollowSpot />
        <div className="relative">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Messages"
            className={iconBtn}
            onClick={() => setSheet("messages")}
          >
            <Mail className="size-6" strokeWidth={1.8} />
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={openEdit}
              className="flex h-10 items-center gap-2 rounded-full bg-espresso-raised px-4 text-body font-medium transition-transform duration-150 active:scale-[0.97]"
            >
              <SquarePen className="size-[18px]" strokeWidth={1.8} />
              Edit Profile
            </button>
            <button
              type="button"
              aria-label="Settings"
              className={iconBtn}
              onClick={() => setSheet("settings")}
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
            onClick={openEdit}
            aria-label="Edit profile photo"
            className="flex size-[88px] shrink-0 items-center justify-center rounded-full bg-espresso-raised text-[40px] font-semibold transition-transform duration-150 active:scale-[0.97]"
          >
            {profile.name[0]}
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-display text-[28px] font-bold tracking-normal">
              {profile.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-body text-white/60">{profile.handle}</p>
              <span
                className="rounded-full border border-white/20 px-2 py-0.5 text-label font-semibold text-white/70"
                title="Sample activity for this portfolio prototype"
              >
                Demo profile
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSheet("follows")}
              className="mt-2 flex gap-4 text-body transition-opacity active:opacity-70"
            >
              <span>
                <b className="font-semibold">{profileData.following}</b>{" "}
                Following
              </span>
              <span>
                <b className="font-semibold">{profileData.followers}</b>{" "}
                Follower{profileData.followers === 1 ? "" : "s"}
              </span>
              <span>
                <b className="font-semibold">{profileData.likes}</b> Like
                {profileData.likes === 1 ? "" : "s"}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              toast({
                message: `${profileData.points} points — earned by attending shows`,
              })
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-body font-semibold transition-transform duration-150 active:scale-[0.96]"
          >
            <Star
              className="size-5 text-white"
              fill="currentColor"
              strokeWidth={0}
            />
            {profileData.points}
          </button>
          {streak > 1 && (
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
          )}
        </div>

        <button
          type="button"
          onClick={openEdit}
          className="mt-4 block text-left text-body text-white/60 transition-opacity active:opacity-70"
        >
          {profile.bio ?? "Add a few words about yourself"}
        </button>

        <p className="mt-4 flex items-center gap-2.5 text-body text-white/80">
          <Calendar className="size-5" strokeWidth={1.8} />
          Joined {profileData.joined}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <HeaderPill
            icon={<BellPlus className="size-5" strokeWidth={1.8} />}
            label="Following"
            href="/notify"
          />
          <HeaderPill
            icon={<Trophy className="size-5" strokeWidth={1.8} />}
            label="Wrapped"
            href="/wrapped"
          />
        </div>
        </div>
      </header>

      {/* Light = commerce: sheet slides over the espresso header. The 1px
          gold top edge is the box-seat rail — the one gilt line in the app,
          where velvet meets ivory (DESIGN.md §13). Web mode: no overlap, no
          rail — it's the right column beside the card. */}
      <div className="relative -mt-6 rounded-t-sheet border-t border-gold bg-cream web:mt-0 web:rounded-none web:border-t-0">
        <div className="border-b border-line px-4">
          <div
            className="flex gap-8"
            role="tablist"
            aria-label="Profile sections"
          >
            {PROFILE_TABS.map(([key, label], index) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`profile-tab-${key}`}
                aria-controls={`profile-panel-${key}`}
                aria-selected={tab === key}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => setTab(key)}
                onKeyDown={(event) => {
                  if (
                    event.key !== "ArrowLeft" &&
                    event.key !== "ArrowRight" &&
                    event.key !== "Home" &&
                    event.key !== "End"
                  )
                    return;
                  event.preventDefault();
                  const nextIndex =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? PROFILE_TABS.length - 1
                        : (index +
                            (event.key === "ArrowRight" ? 1 : -1) +
                            PROFILE_TABS.length) %
                          PROFILE_TABS.length;
                  const next = PROFILE_TABS[nextIndex][0];
                  setTab(next);
                  requestAnimationFrame(() =>
                    document.getElementById(`profile-tab-${next}`)?.focus(),
                  );
                }}
                className={`relative pb-3 pt-5 text-body font-semibold transition-colors duration-200 ${
                  tab === key ? "text-ink" : "text-ink-soft"
                }`}
              >
                {label}
                {tab === key && (
                  <motion.span
                    layoutId="profile-tab-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-ink"
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-clip px-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              role="tabpanel"
              id={`profile-panel-${tab}`}
              aria-labelledby={`profile-tab-${tab}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {tab === "activity" && <ActivityTimeline />}
              {tab === "record" && <RecordTab />}
              {tab === "collection" && <CollectionTab openSheet={setSheet} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Edit profile */}
      <Sheet
        open={sheet === "edit"}
        onClose={() => setSheet(null)}
        title="Edit Profile"
      >
        <label className="mb-2 mt-6 block text-caption font-medium text-ink-soft">
          Name
        </label>
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          className="h-12 w-full rounded-2xl bg-paper px-4 text-body text-ink outline-none transition-shadow focus:ring-2 focus:ring-espresso/15"
        />
        <label className="mb-2 mt-5 block text-caption font-medium text-ink-soft">
          About you
        </label>
        <textarea
          value={draftBio}
          onChange={(e) => setDraftBio(e.target.value)}
          placeholder="Add a few words about yourself"
          rows={3}
          className="w-full resize-none rounded-2xl bg-paper px-4 py-3 text-body text-ink outline-none transition-shadow placeholder:text-ink-faint focus:ring-2 focus:ring-espresso/15"
        />
        <button
          type="button"
          onClick={saveProfile}
          className="mt-7 flex h-14 w-full items-center justify-center rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform] duration-150 active:scale-[0.98] active:bg-vermilion-pressed"
        >
          Save changes
        </button>
      </Sheet>

      {/* Settings */}
      <Sheet
        open={sheet === "settings"}
        onClose={() => setSheet(null)}
        title="Settings"
      >
        <div className="mt-5 flex flex-col gap-2.5">
          {[
            ["Push notifications", "Rush & lottery deadlines for shows you follow", true],
            ["Email updates", "Weekly digest of shows you follow", false],
            ["Public profile", "Anyone can see your activity", true],
          ].map(([label, sub, on]) => (
            <div
              key={label as string}
              className="flex items-center gap-4 rounded-card bg-paper p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold">{label}</p>
                <p className="mt-0.5 text-caption text-ink-soft">{sub}</p>
              </div>
              <Toggle defaultOn={on as boolean} label={label as string} />
            </div>
          ))}
        </div>
      </Sheet>

      {/* Messages */}
      <Sheet
        open={sheet === "messages"}
        onClose={() => setSheet(null)}
        title="Messages"
      >
        <EmptyState
          text="No messages yet…"
          icon={
            <Mail className="size-16 text-ink-faint" strokeWidth={1.4} />
          }
        />
      </Sheet>

      {/* Follows */}
      <Sheet
        open={sheet === "follows"}
        onClose={() => setSheet(null)}
        title="Follows"
      >
        <p className="eyebrow mb-2.5 mt-6">Following · 1</p>
        <PersonRow name="Matinee Team" handle="@matinee" color="#d7492b" />
        <p className="eyebrow mb-2.5 mt-6">Followers · 1</p>
        <PersonRow name="Jamie Lin" handle="@jamie.lin" color="#2e7d5b" />
      </Sheet>

      {/* Collection drill-ins */}
      <PosterGridSheet
        open={sheet === "interested"}
        onClose={() => setSheet(null)}
        title="Interested"
        subtitle={`${savedShows.length} show${savedShows.length === 1 ? "" : "s"}`}
        shows={savedShows}
      />
      <PosterGridSheet
        open={sheet === "attended"}
        onClose={() => setSheet(null)}
        title="Attended"
        subtitle={`${attended.length} logged`}
        shows={attended}
      />
      <TopTenSheet open={sheet === "topten"} onClose={() => setSheet(null)} />
    </main>
  );
}
