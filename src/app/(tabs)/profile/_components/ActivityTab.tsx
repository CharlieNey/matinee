"use client";

import Link from "next/link";
import {
  Armchair,
  EyeOff,
  Pencil,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Poster } from "@/components/Poster";
import { ShareButton } from "@/components/ShareButton";
import { useToast } from "@/components/Toast";
import { renderStubCard, shareImage } from "@/lib/shareCards";
import { DiaryEntry, useApp } from "@/lib/store";

function performanceDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
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
  const { removeDiaryEntry, restoreDiaryEntry } = useApp();

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
      date: performanceDate(entry.performanceDate),
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
          {entry.seat || "Seat not recorded"}
        </p>
        {entry.note && (
          <p className="flex items-start gap-2 text-caption text-ink-faint">
            <EyeOff className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
            <span>
              <span className="font-medium">Only you</span> · {entry.note}
            </span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <ShareButton
            variant="quiet"
            label="Share as image"
            onShare={handleShare}
          />
          <Link
            href={`/log/${entry.show.slug}?entry=${encodeURIComponent(entry.id)}`}
            className="flex items-center gap-2 text-caption font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            <Pencil className="size-4" strokeWidth={2} />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => {
              const removed = removeDiaryEntry(entry.id);
              if (!removed) return;
              toast({
                message: `${entry.show.title} removed`,
                action: {
                  label: "Undo",
                  onClick: () => restoreDiaryEntry(removed),
                },
              });
            }}
            className="flex items-center gap-2 text-caption font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            <Trash2 className="size-4" strokeWidth={2} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/** The Activity tab: the diary as a dated timeline of ticket stubs. */
export function ActivityTab() {
  const { diary } = useApp();

  if (diary.length === 0) {
    return (
      <div className="pt-10">
        <EmptyState
          text="Log a show you’ve seen and your diary starts here…"
          actionLabel="Find a show"
          actionHref="/"
        />
      </div>
    );
  }

  // The editable performance day, not publish time, determines diary order.
  const sorted = [...diary].sort(
    (a, b) =>
      b.performanceDate.localeCompare(a.performanceDate) ||
      b.loggedAt.localeCompare(a.loggedAt),
  );

  return (
    <ol className="pt-6">
      {sorted.map((entry, i) => (
        <li key={entry.id} className="relative pl-9 pb-9">
          {i < sorted.length - 1 && (
            <span className="absolute left-[4px] top-4 bottom-[-8px] w-[1.5px] bg-line" />
          )}
          <span className="absolute left-0 top-1.5 size-2.5 rounded-full bg-espresso-raised" />
          <h2 className="text-heading">
            {performanceDate(entry.performanceDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </h2>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-ink-soft">
            Marked as attended
            <SentimentChip sentiment={entry.sentiment} />
          </p>
          <DiaryCard entry={entry} />
        </li>
      ))}
    </ol>
  );
}
