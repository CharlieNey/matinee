"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Armchair,
  BellPlus,
  Bookmark,
  Calendar,
  EyeOff,
  Forward,
  Mail,
  Settings,
  SquarePen,
  Star,
  ThumbsUp,
  Ticket,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { InsetShowRow } from "@/components/InsetShowRow";
import { Poster } from "@/components/Poster";
import { Sheet } from "@/components/Sheet";
import { Toggle } from "@/components/Toggle";
import { useToast } from "@/components/Toast";
import { TopTenShelf } from "@/components/TopTenShelf";
import {
  ActivityEntry,
  activityFeed,
  collection,
  profile as profileData,
} from "@/lib/data";
import { DiaryEntry, useApp } from "@/lib/store";
import { allShows, Show } from "@/lib/shows";

type Tab = "activity" | "listing" | "collection";
type SheetName =
  | "edit"
  | "settings"
  | "wallet"
  | "messages"
  | "follows"
  | "interested"
  | "attended"
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
 *  gold chip; mixed/disliked stay quiet — never vermilion. */
function SentimentChip({
  sentiment,
}: {
  sentiment: DiaryEntry["sentiment"];
}) {
  if (sentiment === "recommend") {
    return (
      <span className="flex items-center gap-1.5 text-[15px] font-semibold text-gold">
        <ThumbsUp className="size-4" strokeWidth={2} fill="currentColor" />
        Recommend it
      </span>
    );
  }
  return (
    <span className="rounded-full bg-inset px-2.5 py-1 text-caption font-medium text-ink-soft">
      {sentiment === "mixed" ? "Mixed feelings" : "Didn't like it"}
    </span>
  );
}

/** Rich "ticket stub" card for an entry logged through the diary flow. */
function DiaryCard({ entry }: { entry: DiaryEntry }) {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-card bg-paper p-3.5">
      <InsetShowRow show={entry.show} />
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
      <p className="flex items-center gap-2 text-caption text-ink-soft">
        <Armchair className="size-4 shrink-0" strokeWidth={1.8} />
        {entry.seat}
      </p>
      {entry.note && (
        <p className="flex items-start gap-2 border-t border-line pt-3 text-caption text-ink-faint">
          <EyeOff className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
          <span>
            <span className="font-medium">Only you</span> · {entry.note}
          </span>
        </p>
      )}
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
                    <span className="flex items-center gap-1.5 text-[15px] font-semibold text-gold">
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

function CollectionTab({ openSheet }: { openSheet: (s: SheetName) => void }) {
  return (
    <div className="flex flex-col gap-7 pt-5">
      <TopTenShelf />

      <button
        type="button"
        onClick={() => openSheet("interested")}
        className="flex items-center gap-5 text-left transition-transform duration-150 active:scale-[0.99]"
      >
        <div className="relative">
          <Poster
            show={collection.interested.cover}
            className="w-[88px] rounded-thumb"
          />
          <Bookmark
            className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-white/85"
            fill="currentColor"
            strokeWidth={0}
          />
        </div>
        <div>
          <p className="text-title">Interested</p>
          <p className="mt-1 text-body text-ink-soft">
            {collection.interested.count} saved
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => openSheet("attended")}
        className="flex items-center gap-5 text-left transition-transform duration-150 active:scale-[0.99]"
      >
        <div className="relative">
          <Poster
            show={collection.attended.cover}
            className="w-[88px] rounded-thumb"
          />
          <Star
            className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-white/85"
            fill="currentColor"
            strokeWidth={0}
          />
        </div>
        <div>
          <p className="text-title">Attended</p>
          <p className="mt-1 text-body text-ink-soft">
            {collection.attended.count} logged
          </p>
        </div>
      </button>
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
  const { profile, updateProfile, walletBalance } = useApp();
  const toast = useToast();

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

  const shareProfile = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ message: "Profile link copied" });
    } catch {
      toast({ message: "Couldn't copy link" });
    }
  };

  const iconBtn =
    "transition-transform duration-150 active:scale-90";

  return (
    <main>
      {/* Dark = identity: espresso header, top-lit like stage lighting */}
      <header
        className="px-4 pb-12 pt-4 text-white"
        style={{
          background:
            "linear-gradient(180deg, var(--color-espresso-glow) 0%, var(--color-espresso) 45%)",
        }}
      >
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
            <button
              type="button"
              aria-label="Share profile"
              className={iconBtn}
              onClick={shareProfile}
            >
              <Forward className="size-6" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-5">
          <button
            type="button"
            onClick={openEdit}
            aria-label="Edit profile photo"
            className="flex size-[88px] shrink-0 items-center justify-center rounded-full bg-[#2563ab] text-[40px] font-semibold transition-transform duration-150 active:scale-[0.97]"
          >
            {profile.name[0]}
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[28px] font-extrabold tracking-tight">
              {profile.name}
            </h1>
            <p className="mt-0.5 text-body text-white/60">{profile.handle}</p>
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
                Follower
              </span>
              <span>
                <b className="font-semibold">{profileData.likes}</b> Like
              </span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            toast({
              message: `${profileData.points} points — earned by attending shows`,
            })
          }
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-body font-semibold transition-transform duration-150 active:scale-[0.96]"
        >
          <Star
            className="size-5 text-white"
            fill="currentColor"
            strokeWidth={0}
          />
          {profileData.points}
        </button>

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

        <div className="mt-6 grid grid-cols-3 gap-3">
          <HeaderPill
            icon={<Ticket className="size-5" strokeWidth={1.8} />}
            label="Orders"
            href="/orders"
          />
          <HeaderPill
            icon={<Wallet className="size-5" strokeWidth={1.8} />}
            label="Wallet"
            onClick={() => setSheet("wallet")}
          />
          <HeaderPill
            icon={<BellPlus className="size-5" strokeWidth={1.8} />}
            label="Notify"
            href="/notify"
          />
        </div>
      </header>

      {/* Light = commerce: sheet slides over the espresso header */}
      <div className="relative -mt-6 rounded-t-sheet bg-cream">
        <div className="border-b border-line px-4">
          <div className="flex gap-8">
            {(
              [
                ["activity", "Activity"],
                ["listing", "Listing"],
                ["collection", "Collection"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {tab === "activity" && <ActivityTimeline />}
              {tab === "listing" && (
                <div className="pt-10">
                  <EmptyState
                    text="Nothing here yet…"
                    actionLabel="See all tickets on Marketplace"
                    actionHref="/"
                  />
                </div>
              )}
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
            ["Push notifications", "Notify matches, sales, and messages", true],
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

      {/* Wallet */}
      <Sheet
        open={sheet === "wallet"}
        onClose={() => setSheet(null)}
        title="Wallet"
      >
        <div className="mt-5 rounded-card bg-paper p-6 text-center">
          <p className="text-caption text-ink-soft">Available balance</p>
          <p className="mt-1 text-display">${walletBalance.toFixed(2)}</p>
          <p className="mt-2 text-caption text-ink-soft">
            Ticket sales land here after the show
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {["Add funds", "Withdraw"].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => toast({ message: "Coming soon" })}
              className="flex h-12 items-center justify-center rounded-full bg-paper text-body font-semibold text-ink transition-transform duration-150 active:scale-[0.97]"
            >
              {label}
            </button>
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
        <p className="mb-2.5 mt-6 text-caption font-medium text-ink-soft">
          Following · 1
        </p>
        <PersonRow name="Theatr Team" handle="@theatr" color="#d7492b" />
        <p className="mb-2.5 mt-6 text-caption font-medium text-ink-soft">
          Followers · 1
        </p>
        <PersonRow name="Jamie Lin" handle="@jamie.lin" color="#2e7d5b" />
      </Sheet>

      {/* Collection drill-ins */}
      <PosterGridSheet
        open={sheet === "interested"}
        onClose={() => setSheet(null)}
        title="Interested"
        subtitle={`${collection.interested.count} saved`}
        shows={allShows().slice(0, 10)}
      />
      <PosterGridSheet
        open={sheet === "attended"}
        onClose={() => setSheet(null)}
        title="Attended"
        subtitle={`${collection.attended.count} logged`}
        shows={allShows()}
      />
    </main>
  );
}
