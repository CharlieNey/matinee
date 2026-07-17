"use client";

import { useEffect, useMemo, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";
import { Poster } from "@/components/Poster";
import { ShareButton } from "@/components/ShareButton";
import { useToast } from "@/components/Toast";
import { useWebGL } from "@/lib/useWebGL";
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

function seasonStartYear(now: Date): number {
  return now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
}

/** Jun→May month keys ("YYYY-MM") for the season containing `now`. */
function seasonMonths(now: Date): { key: string; letter: string }[] {
  const start = seasonStartYear(now);
  return Array.from({ length: 12 }, (_, i) => {
    const month = ((5 + i) % 12) + 1; // 6..12, 1..5
    const year = month >= 6 ? start : start + 1;
    return {
      key: `${year}-${String(month).padStart(2, "0")}`,
      letter: "JJASONDJFMAM"[i],
    };
  });
}

const MONTH_NAME = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
});

function monthName(key: string): string {
  return MONTH_NAME.format(new Date(`${key}-15T12:00:00Z`));
}

/** Longest run of consecutive entry days in the log. */
function longestStreak(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const day of sorted) {
    const t = new Date(`${day}T12:00:00Z`).getTime();
    run = prev !== null && t - prev === 86_400_000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
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
  const { diary, attended } = useApp();
  const toast = useToast();
  const webgl = useWebGL();
  const reduced = useReducedMotion();
  const [barTip, setBarTip] = useState<number | null>(null);
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
    // Season-scoped: the card is "A season at the theater", so the record
    // resets each June like Broadway does. The all-time log lives in Record.
    const seasonFloor = now ? `${seasonStartYear(now)}-06-01` : "";
    const seasonLog = log.filter((entry) => entry.day >= seasonFloor);
    const wins = seasonLog.filter((entry) => entry.won);
    const saved = wins.reduce((sum, entry) => {
      const program = programByKey.get(entry.key);
      if (!program) return sum;
      const face = getShow(program.showSlug)?.faceValue ?? 0;
      return sum + Math.max(0, face - program.price);
    }, 0);

    // The one attended list (store) — diary + pre-app history, deduped.
    const showsSeen = attended.length;

    const ownerCounts = new Map<string, number>();
    for (const entry of diary) {
      const owner = ownerOf(entry.show);
      if (owner) ownerCounts.set(owner, (ownerCounts.get(owner) ?? 0) + 1);
    }
    const topOwner =
      [...ownerCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const streak = longestStreak(seasonLog.map((entry) => entry.day));

    const entryCounts = new Map<string, number>();
    for (const entry of seasonLog) {
      const slug = programByKey.get(entry.key)?.showSlug;
      if (slug) entryCounts.set(slug, (entryCounts.get(slug) ?? 0) + 1);
    }
    const topEntered =
      [...entryCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const topEnteredShow = topEntered ? getShow(topEntered[0]) : null;

    const months = now ? seasonMonths(now) : [];
    const monthCounts = months.map(
      ({ key }) =>
        seasonLog.filter((entry) => entry.day.startsWith(key)).length,
    );

    const stats: { label: string; value: string }[] = [
      { label: "Shows seen", value: String(showsSeen) },
      { label: "Lottery & rush entries", value: String(seasonLog.length) },
      { label: "Wins", value: String(wins.length) },
      ...(streak > 1
        ? [{ label: "Longest entry streak", value: `${streak} days` }]
        : []),
      ...(saved > 0
        ? [{ label: "Saved vs face value", value: `$${saved}` }]
        : []),
      ...(topEnteredShow && topEntered && topEntered[1] >= 3
        ? [{ label: "Most-entered show", value: topEnteredShow.title }]
        : []),
      ...(topOwner
        ? [{ label: "Most-visited houses", value: topOwner }]
        : []),
    ];

    // Repeat visits belong in diary chronology, but this poster shelf is a
    // set of productions. Dedupe here so repeat logs cannot produce duplicate
    // React keys (or duplicate covers) on Wrapped.
    const diaryShows = [
      ...new Map(diary.map((entry) => [entry.show.slug, entry.show])).values(),
    ];

    return {
      stats,
      months,
      monthCounts,
      shows: diaryShows,
    };
  }, [attended, diary, log, now]);

  if (!now) return null;
  const season = seasonLabel(now);

  const handleShare = async () => {
    const blob = await renderWrappedCard({
      stats: data.stats,
      shows: data.shows,
      season,
    });
    const result = await shareImage(blob, "matinee-wrapped.png", season);
    toast({
      message: result === "shared" ? "Shared!" : "Image downloaded",
    });
  };

  return (
    <div>
      <div
        className="relative mt-4 overflow-hidden rounded-card p-6 text-white"
        style={{
          background:
            "linear-gradient(180deg, var(--color-espresso-glow) 0%, var(--color-espresso) 70%)",
        }}
      >
        {/* House-curtain backdrop: a slow velvet swirl (fixed velvet hexes —
            shaders can't read CSS vars). Decorative; the scrim below keeps
            white text readable over the brightest folds. */}
        {webgl && (
          <MeshGradient
            colors={["#3a0d19", "#5a1a2a", "#a61e33", "#24060d"]}
            distortion={0.8}
            swirl={0.3}
            speed={reduced ? 0 : 0.1}
            className="absolute inset-0"
            width="100%"
            height="100%"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgb(58 13 25 / 0.35) 0%, rgb(42 7 16 / 0.72) 100%)",
          }}
        />

        <div className="relative">
          <p className="text-caption font-semibold text-white/60">
            {season}
          </p>
          <h2 className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight">
            A season at the theater
          </h2>
          <dl className="mt-5 divide-y divide-white/10">
            {data.stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-baseline justify-between gap-4 py-3"
              >
                <dt className="text-body text-white/60">{stat.label}</dt>
                <dd className="text-right text-[22px] font-bold">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          {/* Entries by month — single gilt series, Jun→May season, bars
              anchored to the baseline with rounded data-ends. Hover/tap a
              month for the exact count (dataviz: per-mark tooltip). */}
          {data.monthCounts.some((count) => count > 0) && (
            <div className="mt-6">
              <p className="text-caption font-semibold text-white/60">
                Entries by month
              </p>
              <div className="relative mt-2.5">
                <div className="flex h-14 items-end gap-1.5 border-b border-white/15">
                  {data.months.map((month, i) => {
                    const count = data.monthCounts[i];
                    const max = Math.max(...data.monthCounts);
                    const bar = (
                      <span
                        className="pointer-events-none block w-full rounded-t-[4px]"
                        style={{
                          height:
                            count > 0
                              ? Math.max(6, (count / max) * 52)
                              : 2,
                          background:
                            count > 0
                              ? "var(--color-gold)"
                              : "rgb(255 255 255 / 0.14)",
                        }}
                      />
                    );
                    if (count === 0) {
                      return (
                        <span
                          key={month.key}
                          aria-hidden
                          className="flex flex-1 items-end"
                        >
                          {bar}
                        </span>
                      );
                    }
                    return (
                      <button
                        key={month.key}
                        type="button"
                        aria-label={`${count} entr${count === 1 ? "y" : "ies"} in ${monthName(month.key)}`}
                        className="flex flex-1 items-end outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        onMouseEnter={() => setBarTip(i)}
                        onMouseLeave={() =>
                          setBarTip((v) => (v === i ? null : v))
                        }
                        onFocus={() => setBarTip(i)}
                        onBlur={() => setBarTip((v) => (v === i ? null : v))}
                        onClick={() => setBarTip(i)}
                      >
                        {bar}
                      </button>
                    );
                  })}
                </div>
                <div aria-hidden className="mt-1.5 flex gap-1.5">
                  {data.months.map((month) => (
                    <span
                      key={month.key}
                      className="flex-1 text-center text-label text-white/55"
                    >
                      {month.letter}
                    </span>
                  ))}
                </div>

                {barTip !== null && data.monthCounts[barTip] > 0 && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute z-10 whitespace-nowrap rounded-thumb border border-line bg-paper px-3 py-1.5 text-caption text-ink shadow-float"
                    style={{
                      left: `${((barTip + 0.5) / 12) * 100}%`,
                      top: 0,
                      transform: "translate(-50%, calc(-100% - 6px))",
                      animation: "card-fade 150ms ease-out both",
                    }}
                  >
                    <b className="font-semibold">
                      {monthName(data.months[barTip].key)}
                    </b>{" "}
                    · {data.monthCounts[barTip]} entr
                    {data.monthCounts[barTip] === 1 ? "y" : "ies"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {data.shows.length > 0 && (
        <>
          <p className="mt-5 text-caption font-medium text-ink-soft">
            From your diary
          </p>
          <div className="-mx-4 mt-2 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {data.shows.map((show) => (
              <Poster
                key={show.slug}
                show={show}
                className="w-[96px] shrink-0 rounded-thumb"
              />
            ))}
          </div>
        </>
      )}

      <ShareButton label="Share as image" onShare={handleShare} className="mt-6" />
      <p className="mt-3 text-center text-label text-ink-faint">
        Rendered on your device — nothing leaves it until you share.
      </p>
    </div>
  );
}
