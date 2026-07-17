"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { OptionRow } from "@/components/OptionRow";
import { Sheet } from "@/components/Sheet";
import { LotteryEntry } from "@/lib/entries";
import {
  allPrograms,
  etDayKey,
  programKey,
  programKindLabel,
} from "@/lib/programs";
import { getShow } from "@/lib/shows";

/*
 * GitHub-style entry calendar: one cell per NYC day, darkening with the
 * number of rush/lottery entries. Sequential wine ramp validated against
 * the dataviz six checks (adjacent-step ΔE ≥ 15 normal / ≥ 12 CVD); the
 * pale steps sit under 3:1 vs paper, so identity never rides on color
 * alone — every counted cell carries an aria-label and a hover/tap tip,
 * and the Less→More legend anchors the scale.
 */

const WEEKS = 26;
const CELL = 12; // px
const GAP = 3; // px
const COL = CELL + GAP;

const LEVELS = ["#f1ebdd", "#e2a294", "#c4685f", "#99303c", "#5f0c1a"];

function levelOf(count: number): number {
  return count === 0 ? 0 : Math.min(count, 4);
}

const MONTH = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
});
const TIP_DAY = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
});

/** Calendar weekday/labels for a YYYY-MM-DD key, timezone-free (UTC noon). */
function dayDate(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

function addDays(key: string, days: number): string {
  const d = dayDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Tip = { day: string; x: number; y: number };

export function EntryHeatmap({
  log,
  now,
}: {
  log: LotteryEntry[];
  now: Date;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const programByKey = useMemo(
    () => new Map(allPrograms().map((p) => [programKey(p), p])),
    [],
  );

  /** Shows present in the log, by entry count — the filter's option list. */
  const showOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of log) {
      const slug = programByKey.get(entry.key)?.showSlug;
      if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    return [...counts.entries()]
      .flatMap(([slug, count]) => {
        const show = getShow(slug);
        return show ? [{ slug, title: show.title, count }] : [];
      })
      .sort((a, b) => b.count - a.count);
  }, [log, programByKey]);

  const byDay = useMemo(() => {
    const map = new Map<string, LotteryEntry[]>();
    for (const entry of log) {
      if (filter && programByKey.get(entry.key)?.showSlug !== filter) continue;
      map.set(entry.day, [...(map.get(entry.day) ?? []), entry]);
    }
    return map;
  }, [log, filter, programByKey]);

  /** Sunday-aligned week columns, oldest → newest, ending on today's week. */
  const todayKey = etDayKey(now);
  const weeks = useMemo(() => {
    const firstSunday = addDays(todayKey, -(dayDate(todayKey).getUTCDay() + (WEEKS - 1) * 7));
    return Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => addDays(firstSunday, w * 7 + d)),
    );
  }, [todayKey]);

  // Land scrolled to the present, like the feed it is.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const monthLabels = useMemo(() => {
    const labels: { w: number; month: string }[] = [];
    for (let w = 0; w < weeks.length; w++) {
      const month = MONTH.format(dayDate(weeks[w][0]));
      const prev = w > 0 ? MONTH.format(dayDate(weeks[w - 1][0])) : null;
      const last = labels[labels.length - 1];
      // Skip a label that would crowd the previous one (a 1-2 week stub).
      if (month !== prev && (!last || w - last.w >= 3)) {
        labels.push({ w, month });
      }
    }
    return labels;
  }, [weeks]);

  const showTip = (day: string) => (e: React.SyntheticEvent<HTMLElement>) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cell = e.currentTarget.getBoundingClientRect();
    const box = wrap.getBoundingClientRect();
    setTip({
      day,
      x: Math.min(
        Math.max(cell.left - box.left + cell.width / 2, 72),
        box.width - 72,
      ),
      y: cell.top - box.top,
    });
  };

  const tipEntries = tip ? (byDay.get(tip.day) ?? []) : [];
  const filterLabel = filter
    ? (showOptions.find((o) => o.slug === filter)?.title ?? "All shows")
    : "All shows";

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption font-medium text-ink-soft">
          Entry activity ·{" "}
          <b className="font-semibold text-ink">{log.length}</b>
        </p>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className="flex h-9 max-w-[55%] items-center gap-1.5 rounded-full bg-paper px-3.5 text-caption font-semibold transition-transform duration-150 active:scale-[0.97]"
        >
          <span className="truncate">{filterLabel}</span>
          <ChevronDown className="size-4 shrink-0 text-ink-soft" strokeWidth={2} />
        </button>
      </div>

      <div ref={wrapRef} className="relative mt-2.5 rounded-card bg-paper p-4">
        <div className="flex gap-2">
          {/* Mon/Wed/Fri gutter, GitHub-style */}
          <div
            className="grid shrink-0 text-label text-ink-faint"
            style={{
              gridTemplateRows: `repeat(7, ${CELL}px)`,
              rowGap: GAP,
              marginTop: 16 + GAP,
            }}
            aria-hidden
          >
            {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
              <span key={i} className="leading-[12px]">
                {d}
              </span>
            ))}
          </div>

          <div
            ref={scrollRef}
            className="overflow-x-auto [scrollbar-width:none]"
          >
            <div className="relative w-max">
              <div className="relative h-4" aria-hidden>
                {monthLabels.map(({ w, month }) => (
                  <span
                    key={w}
                    className="absolute top-0 text-label text-ink-faint"
                    style={{ left: w * COL }}
                  >
                    {month}
                  </span>
                ))}
              </div>
              <div
                className="grid w-max"
                style={{
                  gridTemplateRows: `repeat(7, ${CELL}px)`,
                  gridAutoFlow: "column",
                  gridAutoColumns: `${CELL}px`,
                  gap: GAP,
                }}
              >
                {weeks.flat().map((day) => {
                  if (day > todayKey) {
                    return <span key={day} className="invisible" />;
                  }
                  const count = byDay.get(day)?.length ?? 0;
                  const swatch = (
                    <span
                      className="pointer-events-none absolute inset-0 rounded-[3px]"
                      style={{ background: LEVELS[levelOf(count)] }}
                    />
                  );
                  if (count === 0) {
                    return (
                      <span key={day} aria-hidden className="relative">
                        {swatch}
                      </span>
                    );
                  }
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-label={`${count} entr${count === 1 ? "y" : "ies"} on ${TIP_DAY.format(dayDate(day))}`}
                      className="relative outline-none focus-visible:ring-2 focus-visible:ring-ink"
                      onMouseEnter={showTip(day)}
                      onFocus={showTip(day)}
                      onClick={showTip(day)}
                      onMouseLeave={() => setTip(null)}
                      onBlur={() => setTip(null)}
                    >
                      {swatch}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div
          className="mt-3 flex items-center justify-end gap-1.5 text-label text-ink-faint"
          aria-hidden
        >
          Less
          {LEVELS.map((c) => (
            <span
              key={c}
              className="size-[10px] rounded-[3px]"
              style={{ background: c }}
            />
          ))}
          More
        </div>

        {/* Day tip — HTML overlay, same paper-card recipe as the district map */}
        {tip && tipEntries.length > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 rounded-thumb border border-line bg-paper px-3 py-2 shadow-float"
            style={{
              left: tip.x,
              top: tip.y,
              transform: "translate(-50%, calc(-100% - 8px))",
              animation: "card-fade 150ms ease-out both",
            }}
          >
            <p className="whitespace-nowrap text-caption font-semibold text-ink">
              {TIP_DAY.format(dayDate(tip.day))} ·{" "}
              {tipEntries.length} entr{tipEntries.length === 1 ? "y" : "ies"}
            </p>
            {tipEntries.slice(0, 4).map((entry, i) => {
              const program = programByKey.get(entry.key);
              const show = program ? getShow(program.showSlug) : undefined;
              return (
                <p
                  key={i}
                  className="whitespace-nowrap text-caption text-ink-soft"
                >
                  {show?.title ?? "Unknown show"} ·{" "}
                  {program ? programKindLabel(program.kind) : entry.key}
                  {entry.won && (
                    <b className="font-semibold text-sage-ink"> · won</b>
                  )}
                </p>
              );
            })}
            {tipEntries.length > 4 && (
              <p className="whitespace-nowrap text-caption text-ink-faint">
                +{tipEntries.length - 4} more
              </p>
            )}
          </div>
        )}
      </div>

      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter by show"
      >
        <div className="mt-5 flex flex-col gap-2">
          <OptionRow
            label="All shows"
            count={log.length}
            selected={filter === null}
            onSelect={() => {
              setFilter(null);
              setFilterOpen(false);
            }}
          />
          {showOptions.map((option) => (
            <OptionRow
              key={option.slug}
              label={option.title}
              count={option.count}
              selected={filter === option.slug}
              onSelect={() => {
                setFilter(option.slug);
                setFilterOpen(false);
              }}
            />
          ))}
        </div>
      </Sheet>
    </section>
  );
}
