"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Ticket,
} from "lucide-react";
import { Poster } from "@/components/Poster";
import { Stepper } from "@/components/Stepper";
import { TktsTripCard } from "@/components/TktsBoard";
import {
  etDayKey,
  Program,
  programKindLabel,
  programPlatformLabel,
} from "@/lib/programs";
import { buildTripPlan, TripDay, TripSlot } from "@/lib/trip";
import { useApp } from "@/lib/store";
import { useNow } from "@/lib/useNow";

const DAY_MS = 24 * 60 * 60 * 1000;

const chipDay = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  day: "numeric",
});
const headingDay = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  month: "long",
  day: "numeric",
});
const shortDay = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
});
const clock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});

function windowLabel(slot: TripSlot): string {
  const opens = clock.format(slot.opensAt).replace(":00", "");
  if (slot.whileSuppliesLast) return `from ${opens}`;
  const closes = clock.format(slot.closesAt).replace(":00", "");
  return `${opens}–${closes}`;
}

function isAdvanceEntry(slot: TripSlot): boolean {
  return slot.program.kind === "digital-lottery";
}

function sortedSlots(day: TripDay, isSaved: (slug: string) => boolean) {
  return [...day.slots].sort((a, b) => {
    const interested = Number(isSaved(b.show.slug)) - Number(isSaved(a.show.slug));
    if (interested !== 0) return interested;
    return a.opensAt.getTime() - b.opensAt.getTime();
  });
}

function recommendedSlots(
  plan: TripDay[],
  isSaved: (slug: string) => boolean,
): { day: TripDay; slot: TripSlot }[] {
  const candidates = plan.flatMap((day, dayIndex) =>
    day.slots.map((slot) => ({ day, dayIndex, slot })),
  );

  candidates.sort((a, b) => {
    const interested =
      Number(isSaved(b.slot.show.slug)) - Number(isSaved(a.slot.show.slug));
    if (interested !== 0) return interested;
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    const advance = Number(isAdvanceEntry(b.slot)) - Number(isAdvanceEntry(a.slot));
    if (advance !== 0) return advance;
    if (a.slot.program.price !== b.slot.program.price) {
      return a.slot.program.price - b.slot.program.price;
    }
    return a.slot.opensAt.getTime() - b.slot.opensAt.getTime();
  });

  const seenShows = new Set<string>();
  const picks: { day: TripDay; slot: TripSlot }[] = [];
  for (const candidate of candidates) {
    if (seenShows.has(candidate.slot.show.slug)) continue;
    seenShows.add(candidate.slot.show.slug);
    picks.push(candidate);
    if (picks.length === 5) break;
  }
  return picks;
}

function SlotRow({
  slot,
  interested,
}: {
  slot: TripSlot;
  interested: boolean;
}) {
  const program: Program = slot.program;
  return (
    <a
      href={program.entryUrl}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-card bg-paper p-3 transition-transform duration-150 active:scale-[0.985]"
    >
      <Poster show={slot.show} className="size-12 shrink-0 rounded-thumb" />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-body font-semibold">
            {slot.show.title}
          </span>
          {interested && (
            <Bookmark
              className="size-3.5 shrink-0 text-gold-ink"
              fill="currentColor"
              strokeWidth={0}
              aria-label="Interested"
            />
          )}
        </span>
        <span className="mt-0.5 block truncate text-caption text-ink-soft">
          {program.name ?? programKindLabel(program.kind)} ·{" "}
          {programPlatformLabel(program.platform)}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-caption font-semibold text-ink">
          {windowLabel(slot)}
        </span>
        <span className="mt-0.5 block text-caption text-ink-soft">
          {program.price === 0 ? "Free" : `$${program.price}`}
          {slot.whileSuppliesLast ? " · supplies last" : ""}
        </span>
      </span>
      <ExternalLink
        className="size-4 shrink-0 text-ink-faint"
        strokeWidth={1.9}
        aria-hidden="true"
      />
    </a>
  );
}

function PlanAction({
  item,
  index,
  interested,
}: {
  item: { day: TripDay; slot: TripSlot };
  index: number;
  interested: boolean;
}) {
  const { day, slot } = item;
  const action = isAdvanceEntry(slot) ? "Enter ahead" : "Try day-of";
  return (
    <li>
      <a
        href={slot.program.entryUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3.5 rounded-card bg-paper p-3.5 transition-transform duration-150 active:scale-[0.985]"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-espresso text-caption font-semibold text-white">
          {index + 1}
        </span>
        <Poster show={slot.show} className="size-12 shrink-0 rounded-thumb" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-label font-semibold text-ink-soft">
            {action} · {shortDay.format(day.date)} · {windowLabel(slot)}
            {interested && (
              <Bookmark
                className="size-3 shrink-0 text-gold-ink"
                fill="currentColor"
                strokeWidth={0}
                aria-label="Interested"
              />
            )}
          </span>
          <span className="mt-0.5 block truncate text-body font-semibold">
            {slot.show.title}
          </span>
          <span className="mt-0.5 block truncate text-caption text-ink-soft">
            {slot.program.name ?? programKindLabel(slot.program.kind)} ·{" "}
            {slot.program.price === 0 ? "Free" : `$${slot.program.price}`}
          </span>
        </span>
        <ExternalLink
          className="size-4 shrink-0 text-ink-faint"
          strokeWidth={1.9}
          aria-hidden="true"
        />
      </a>
    </li>
  );
}

function FallbackChain() {
  const steps = [
    ["Lottery", "Enter before the deadline"],
    ["Rush", "Try day-of if you don’t win"],
    ["TKTS", "Check the live booth board"],
  ] as const;
  return (
    <div className="mt-4 rounded-card bg-inset p-4">
      <p className="text-caption font-semibold text-ink">Your fallback chain</p>
      <ol className="mt-3 grid grid-cols-3 items-start gap-4">
        {steps.map(([title, copy], index) => (
          <li key={title} className="relative">
            <p className="text-caption font-semibold text-ink">{title}</p>
            <p className="mt-0.5 text-label text-ink-soft">{copy}</p>
            {index < steps.length - 1 && (
              <ArrowRight
                className="absolute -right-2 top-1 size-3.5 translate-x-1/2 text-ink-faint"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TripPlanner() {
  const now = useNow();
  const { isSaved, savedShows } = useApp();
  const [startOffset, setStartOffset] = useState(0);
  const [nights, setNights] = useState(3);
  const [showAll, setShowAll] = useState(false);

  const plan = useMemo(
    () => (now ? buildTripPlan(now, startOffset, nights) : null),
    [now, startOffset, nights],
  );
  const recommendations = useMemo(
    () => (plan ? recommendedSlots(plan, isSaved) : []),
    [plan, isSaved],
  );
  const totalWindows = plan?.reduce((sum, day) => sum + day.slots.length, 0) ?? 0;

  if (!now || !plan) {
    return (
      <div className="mt-6 space-y-3" aria-hidden>
        {[0, 1].map((item) => (
          <div key={item} className="h-40 animate-pulse rounded-card bg-paper" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2.5 mt-6 text-caption font-medium text-ink-soft">
        Arriving
      </p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] web:mx-0 web:flex-wrap web:overflow-visible web:px-0">
        {Array.from({ length: 10 }, (_, i) => {
          const label =
            i === 0
              ? "Today"
              : i === 1
                ? "Tomorrow"
                : chipDay.format(new Date(now.getTime() + i * DAY_MS));
          return (
            <button
              key={i}
              type="button"
              aria-pressed={startOffset === i}
              onClick={() => {
                setStartOffset(i);
                setShowAll(false);
              }}
              className={`h-9 shrink-0 rounded-full px-3.5 text-caption font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                startOffset === i
                  ? "bg-espresso text-white"
                  : "bg-paper text-ink-soft"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <p className="mb-2.5 mt-5 text-caption font-medium text-ink-soft">
        Nights in town
      </p>
      <Stepper
        value={nights}
        onChange={(next) => {
          setNights(next);
          setShowAll(false);
        }}
        min={1}
        max={7}
        step={1}
        label="nights in town"
        format={(v) => `${v} night${v === 1 ? "" : "s"}`}
      />

      <section className="mt-9" aria-labelledby="trip-plan-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Recommended</p>
            <h2 id="trip-plan-heading" className="mt-1 text-title">
              Your plan
            </h2>
          </div>
          {savedShows.length > 0 && (
            <p className="flex items-center gap-1.5 text-label text-ink-soft">
              <Bookmark
                className="size-3.5 text-gold-ink"
                fill="currentColor"
                strokeWidth={0}
                aria-hidden="true"
              />
              Interested first
            </p>
          )}
        </div>
        <p className="mt-1 text-body text-ink-soft">
          The best 3–5 moves for your dates, ranked so saved shows rise to the top.
        </p>

        {recommendations.length > 0 ? (
          <ol className="mt-4 space-y-2.5">
            {recommendations.map((item, index) => (
              <PlanAction
                key={`${item.day.dayKey}-${item.slot.program.showSlug}-${item.slot.program.kind}-${item.slot.program.platform}`}
                item={item}
                index={index}
                interested={isSaved(item.slot.show.slug)}
              />
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-card bg-paper p-4 text-body text-ink-soft">
            No verified rush or lottery windows fall inside these dates. Keep TKTS as your day-of option.
          </p>
        )}
        <FallbackChain />
      </section>

      <section className="mt-8 border-t border-line pt-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-inset text-ink">
            <Ticket className="size-5" strokeWidth={1.9} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-heading">All entry windows</h2>
            <p className="text-caption text-ink-soft">
              {totalWindows} across {plan.length} day{plan.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            aria-expanded={showAll}
            className="flex h-10 items-center gap-1.5 rounded-full bg-paper px-3.5 text-caption font-semibold text-ink transition-transform duration-150 active:scale-[0.97]"
          >
            {showAll ? "Hide windows" : "See all windows"}
            {showAll ? (
              <ChevronUp className="size-4" strokeWidth={2} aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </div>

        {showAll && (
          <div>
            {plan.map((day) => {
              const slots = sortedSlots(day, isSaved);
              const advance = slots.filter(isAdvanceEntry);
              const dayOf = slots.filter((slot) => !isAdvanceEntry(slot));
              return (
                <section key={day.dayKey} className="mt-9">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-heading">{headingDay.format(day.date)}</h3>
                    <span className="text-caption text-ink-soft">
                      {day.slots.length} window{day.slots.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {day.slots.length === 0 && (
                    <p className="mt-3 text-body text-ink-faint">
                      No verified windows open this day. Check TKTS for same-day inventory.
                    </p>
                  )}

                  {advance.length > 0 && (
                    <div className="mt-4">
                      <p className="text-caption font-semibold text-ink">
                        Enter ahead · usually the night before
                      </p>
                      <p className="mt-0.5 text-label text-ink-soft">
                        Lotteries can cover the next day or a future week—confirm the performance on the entry page.
                      </p>
                      <div className="mt-2 space-y-2 web:grid web:grid-cols-2 web:gap-2 web:space-y-0">
                        {advance.map((slot) => (
                          <SlotRow
                            key={`${slot.program.showSlug}-${slot.program.kind}-${slot.program.platform}`}
                            slot={slot}
                            interested={isSaved(slot.show.slug)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {dayOf.length > 0 && (
                    <div className="mt-5">
                      <p className="text-caption font-semibold text-ink">
                        Day-of rush
                      </p>
                      <p className="mt-0.5 text-label text-ink-soft">
                        Go when the app or box office opens; inventory can disappear early.
                      </p>
                      <div className="mt-2 space-y-2 web:grid web:grid-cols-2 web:gap-2 web:space-y-0">
                        {dayOf.map((slot) => (
                          <SlotRow
                            key={`${slot.program.showSlug}-${slot.program.kind}-${slot.program.platform}`}
                            slot={slot}
                            interested={isSaved(slot.show.slug)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <TktsTripCard isToday={day.dayKey === etDayKey(new Date())} />
                </section>
              );
            })}
          </div>
        )}
      </section>

      <p className="mt-8 text-label text-ink-faint">
        Times are New York time. Always confirm the eligible performance on the official entry page.
      </p>
    </div>
  );
}
