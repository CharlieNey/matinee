"use client";

import { useEffect, useMemo, useState } from "react";
import { Forward } from "lucide-react";
import { Poster } from "@/components/Poster";
import { useToast } from "@/components/Toast";
import { collection } from "@/lib/data";
import { onLotteryLogChange, readLotteryLog } from "@/lib/entries";
import { allPrograms, programKey } from "@/lib/programs";
import { renderWrappedCard, shareImage } from "@/lib/shareCards";
import { getShow, Show } from "@/lib/shows";
import { allTheaters, currentShowAt } from "@/lib/theaters";
import { useApp } from "@/lib/store";
import { useNow } from "@/lib/useNow";

function seasonLabel(now: Date): string {
  const year = now.getFullYear();
  const month = now.getMonth(); // Broadway seasons turn over in June
  const start = month >= 5 ? year : year - 1;
  return `${start}–${String(start + 1).slice(2)} season`;
}

/** Owner of the house a show is playing in, via the theaters dataset. */
function ownerOf(show: Show): string | null {
  for (const theater of allTheaters()) {
    if (currentShowAt(theater)?.slug === show.slug) return theater.owner;
  }
  return null;
}

export function WrappedScreen() {
  const now = useNow();
  const { diary } = useApp();
  const toast = useToast();
  const [log, setLog] = useState(() => [] as ReturnType<typeof readLotteryLog>);

  useEffect(() => {
    const sync = () => setLog(readLotteryLog());
    sync();
    return onLotteryLogChange(sync);
  }, []);

  const data = useMemo(() => {
    const programByKey = new Map(
      allPrograms().map((program) => [programKey(program), program]),
    );
    const wins = log.filter((entry) => entry.won);
    const saved = wins.reduce((sum, entry) => {
      const program = programByKey.get(entry.key);
      if (!program) return sum;
      const face = getShow(program.showSlug)?.faceValue ?? 0;
      return sum + Math.max(0, face - program.price);
    }, 0);

    const showsSeen = diary.length + collection.attended.count;

    const ownerCounts = new Map<string, number>();
    for (const entry of diary) {
      const owner = ownerOf(entry.show);
      if (owner) ownerCounts.set(owner, (ownerCounts.get(owner) ?? 0) + 1);
    }
    const topOwner =
      [...ownerCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const stats: { label: string; value: string }[] = [
      { label: "Shows seen", value: String(showsSeen) },
      { label: "Lottery & rush entries", value: String(log.length) },
      {
        label: "Wins",
        value:
          log.length > 0
            ? `${wins.length} · ${Math.round((wins.length / log.length) * 100)}%`
            : String(wins.length),
      },
      ...(saved > 0
        ? [{ label: "Saved vs face value", value: `$${saved}` }]
        : []),
      ...(topOwner
        ? [{ label: "Most-visited houses", value: topOwner }]
        : []),
    ];

    return { stats, shows: diary.map((entry) => entry.show) };
  }, [diary, log]);

  if (!now) return null;
  const season = seasonLabel(now);

  const handleShare = async () => {
    const blob = await renderWrappedCard({
      stats: data.stats,
      shows: data.shows,
      season,
    });
    const result = await shareImage(blob, "theatr-wrapped.png", season);
    toast({
      message: result === "shared" ? "Shared!" : "Image downloaded",
    });
  };

  return (
    <div>
      <div
        className="mt-4 rounded-card p-6 text-white"
        style={{
          background:
            "linear-gradient(180deg, var(--color-espresso-glow) 0%, var(--color-espresso) 70%)",
        }}
      >
        <p className="text-caption font-semibold uppercase tracking-wide text-white/60">
          {season}
        </p>
        <h2 className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight">
          A season at the theater
        </h2>
        <dl className="mt-5 divide-y divide-white/10">
          {data.stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-baseline justify-between py-3"
            >
              <dt className="text-body text-white/60">{stat.label}</dt>
              <dd className="text-[22px] font-bold">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {data.shows.length > 0 && (
        <div className="-mx-4 mt-5 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {data.shows.map((show) => (
            <Poster
              key={show.slug}
              show={show}
              className="w-[96px] shrink-0 rounded-thumb"
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleShare}
        className="mt-6 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform] duration-150 active:scale-[0.98] active:bg-vermilion-pressed"
      >
        <Forward className="size-5" strokeWidth={2} />
        Share as image
      </button>
      <p className="mt-3 text-center text-label text-ink-faint">
        Rendered on your device — nothing leaves it until you share.
      </p>
    </div>
  );
}
