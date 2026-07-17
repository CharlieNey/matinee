"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Armchair,
  BellPlus,
  Calendar,
  EyeOff,
  Plus,
  Settings,
  SquarePen,
  Swords,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Zap,
} from "lucide-react";
import { AttendedTicket } from "@/components/AttendedTicket";
import { CollectionEditorSheet } from "@/components/CollectionEditorSheet";
import { EmptyState } from "@/components/EmptyState";
import { EntryHeatmap } from "@/components/EntryHeatmap";
import { InsetShowRow } from "@/components/InsetShowRow";
import { Poster } from "@/components/Poster";
import { RankSheet } from "@/components/RankSheet";
import { ShareButton } from "@/components/ShareButton";
import { Sheet } from "@/components/Sheet";
import { FollowSpot } from "@/components/FollowSpot";
import { useToast } from "@/components/Toast";
import {
  ActivityEntry,
  activityFeed,
  profile as profileData,
} from "@/lib/data";
import {
  LotteryEntry,
  onLotteryLogChange,
  readLotteryLog,
  seedLotteryLogIfEmpty,
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
import { allShows, getShow, Show } from "@/lib/shows";
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
  | "interested"
  | "attended"
  | "rank"
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
                {item.entry.action === "Marked as attended" ? (
                  // Attended → a torn ticket, matching the diary keepsake
                  // (DESIGN.md §344: torn = attended). Interested stays flat.
                  item.entry.shows.map((show) => (
                    <AttendedTicket key={show.slug} show={show} />
                  ))
                ) : (
                  <div className="mt-4 flex flex-col gap-2.5">
                    {item.entry.shows.map((show) => (
                      <InsetShowRow key={show.slug} show={show} />
                    ))}
                  </div>
                )}
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
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

/** A titled poster wall — the header opens the search-and-add editor, the wall
 *  shows the most recent members four-across (posters link straight to the
 *  show). Keeps the Collection dense instead of teasing one cover over empty
 *  space. */
function Gallery({
  label,
  shows,
  onOpen,
  emptyText,
}: {
  label: string;
  shows: Show[];
  onOpen: () => void;
  emptyText: string;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <p className="eyebrow">
          {label}
          {shows.length > 0 ? ` · ${shows.length}` : ""}
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-1.5 text-caption font-semibold text-ink-soft transition-colors duration-150 active:text-ink"
        >
          <Plus className="size-4" strokeWidth={2} />
          Add
        </button>
      </div>
      {shows.length > 0 ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {shows.slice(0, 8).map((show) => (
            <Link
              key={show.slug}
              href={`/shows/${show.slug}`}
              aria-label={`${show.title} tickets`}
              className="transition-transform duration-150 active:scale-[0.96]"
            >
              <Poster show={show} className="w-full rounded-thumb" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-body text-ink-faint">{emptyText}</p>
      )}
    </section>
  );
}

/** Taste, from real state, filling the screen (DESIGN.md §151): the personal
 *  ranking as the hero — attended shows in your order, built by the matchup
 *  flow — then two dense walls, Seen (attended) and Interested (the bookmark
 *  set). No empty room reserved for other lists; these three are the tab. */
function CollectionTab({ openSheet }: { openSheet: (s: SheetName) => void }) {
  const { savedShows, attended, rankedShows } = useApp();

  return (
    <div className="flex flex-col gap-8 pb-6 pt-5">
      {/* 1 — Ranking: the taste statement, ordered #1…#N. */}
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow">Your ranking</p>
          <button
            type="button"
            onClick={() => openSheet("rank")}
            className="flex items-center gap-1.5 text-caption font-semibold text-ink-soft transition-colors duration-150 active:text-ink"
          >
            <Swords className="size-4" strokeWidth={2} />
            Rank
          </button>
        </div>
        {rankedShows.length > 0 ? (
          <ol className="mt-3 flex flex-col gap-2">
            {rankedShows.map((show, i) => (
              <li key={show.slug}>
                <Link
                  href={`/shows/${show.slug}`}
                  className="flex items-center gap-3.5 rounded-card bg-paper p-3 transition-transform duration-150 active:scale-[0.99]"
                >
                  <span className="w-6 shrink-0 text-center text-body font-bold tabular-nums">
                    {i + 1}
                  </span>
                  <Poster show={show} className="w-12 shrink-0 rounded-thumb" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold">
                      {show.title}
                    </p>
                    <p className="mt-0.5 truncate text-caption text-ink-soft">
                      {show.tier} · {show.genre}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            text="Rank the shows you've seen — a few quick “which did you like more?” matchups build the list."
            actionLabel="Start ranking"
            onAction={() => openSheet("rank")}
            icon={<Swords className="size-16 text-ink-faint" strokeWidth={1.4} />}
          />
        )}
      </section>

      {/* 2 — Attended: everywhere you've been. */}
      <Gallery
        label="Attended"
        shows={attended}
        onOpen={() => openSheet("attended")}
        emptyText="Log a show you've been to and it collects here…"
      />

      {/* 3 — Interested: what's next. */}
      <Gallery
        label="Interested"
        shows={savedShows}
        onOpen={() => openSheet("interested")}
        emptyText="Tap Interested on any show and it collects here…"
      />
    </div>
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

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("activity");
  const [sheet, setSheet] = useState<SheetName>(null);
  const {
    profile,
    updateProfile,
    diary,
    savedShows,
    attended,
    follows,
    toggleSaved,
    addAttended,
    removeAttended,
  } = useApp();
  const toast = useToast();
  const now = useNow();

  // The identity card is a live theater record, never social-proof theater.
  const [log, setLog] = useState<LotteryEntry[]>([]);
  useEffect(() => {
    // Fresh visitors start with a seeded entry streak so the record reads
    // as lived-in (once ever; real logs are never overwritten).
    seedLotteryLogIfEmpty(new Date());
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

  // Search pools for the Collection editors: the catalog minus what's already
  // in each list.
  const savedSlugs = new Set(savedShows.map((s) => s.slug));
  const attendedSlugs = new Set(attended.map((s) => s.slug));
  const interestedCandidates = allShows().filter((s) => !savedSlugs.has(s.slug));
  const attendedCandidates = allShows().filter((s) => !attendedSlugs.has(s.slug));

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
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={openEdit}
              className="flex h-10 items-center gap-2 rounded-full bg-espresso-raised px-4 text-body font-medium transition-transform duration-150 active:scale-[0.97]"
            >
              <SquarePen className="size-[18px]" strokeWidth={1.8} />
              Edit profile
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
            <p className="mt-1 text-body text-white/60">Your theater record</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-6 overflow-hidden rounded-card border border-white/10 bg-white/10">
          <button
            type="button"
            onClick={() => setSheet("attended")}
            className="col-span-2 flex min-h-16 flex-col items-center justify-center border-b border-r border-white/10 px-2 py-2 text-center transition-colors active:bg-white/10"
          >
            <b className="text-heading font-semibold tabular-nums">{attended.length}</b>
            <span className="mt-0.5 text-label leading-tight text-white/60">Shows logged</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("record")}
            className="col-span-2 flex min-h-16 flex-col items-center justify-center border-b border-r border-white/10 px-2 py-2 text-center transition-colors active:bg-white/10"
          >
            <b className="text-heading font-semibold tabular-nums">{log.length}</b>
            <span className="mt-0.5 text-label leading-tight text-white/60">Entries</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("record")}
            className="col-span-2 flex min-h-16 flex-col items-center justify-center border-b border-white/10 px-2 py-2 text-center transition-colors active:bg-white/10"
          >
            <b className="text-heading font-semibold tabular-nums">{wins.length}</b>
            <span className="mt-0.5 text-label leading-tight text-white/60">Wins</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("record")}
            className="col-span-3 flex min-h-16 flex-col items-center justify-center border-r border-white/10 px-2 py-2 text-center transition-colors active:bg-white/10"
          >
            <b className="text-heading font-semibold tabular-nums">${moneySaved}</b>
            <span className="mt-0.5 text-label leading-tight text-white/60">Money saved</span>
          </button>
          <Link
            href="/notify"
            className="col-span-3 flex min-h-16 flex-col items-center justify-center px-2 py-2 text-center transition-colors active:bg-white/10"
          >
            <b className="text-heading font-semibold tabular-nums">{follows.length}</b>
            <span className="mt-0.5 text-label leading-tight text-white/60">Following</span>
          </Link>
        </div>

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
        title="Edit profile"
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
        <div className="mt-5 overflow-hidden rounded-card bg-paper px-4">
          <Link
            href="/notify"
            onClick={() => setSheet(null)}
            className="flex items-center gap-3 border-b border-line py-4 transition-opacity active:opacity-70"
          >
            <BellPlus className="size-5 shrink-0" strokeWidth={1.8} />
            <span className="min-w-0">
              <span className="block text-body font-semibold">
                Deadline notifications
              </span>
              <span className="mt-0.5 block text-caption text-ink-soft">
                Manage alerts for shows you follow
              </span>
            </span>
          </Link>
          <div className="flex items-start gap-3 py-4">
            <EyeOff className="mt-0.5 size-5 shrink-0" strokeWidth={1.8} />
            <div className="min-w-0">
              <p className="text-body font-semibold">Private by default</p>
              <p className="mt-0.5 text-caption text-ink-soft">
                Your diary stays in this browser. A profile is visible only
                through a link you choose to share.
              </p>
            </div>
          </div>
        </div>
      </Sheet>

      {/* Collection drill-ins — search-and-add editors */}
      <CollectionEditorSheet
        open={sheet === "interested"}
        onClose={() => setSheet(null)}
        title="Interested"
        members={savedShows}
        candidates={interestedCandidates}
        onAdd={(show) => toggleSaved(show.slug)}
        onRemove={(show) => toggleSaved(show.slug)}
        searchPlaceholder="Search shows to add"
        emptyText="Search a show to add it, or tap Interested anywhere in the app."
      />
      <CollectionEditorSheet
        open={sheet === "attended"}
        onClose={() => setSheet(null)}
        title="Attended"
        members={attended}
        candidates={attendedCandidates}
        onAdd={(show) => addAttended(show.slug)}
        onRemove={(show) => removeAttended(show.slug)}
        searchPlaceholder="Search shows you've seen"
        emptyText="Search a show you've seen to add it here."
      />
      <RankSheet open={sheet === "rank"} onClose={() => setSheet(null)} />
    </main>
  );
}
