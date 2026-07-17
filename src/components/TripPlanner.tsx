"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Poster } from "@/components/Poster";
import { Stepper } from "@/components/Stepper";
import { TktsTripCard } from "@/components/TktsBoard";
import {
  etDayKey,
  Program,
  programKindLabel,
  programPlatformLabel,
} from "@/lib/programs";
import { Toggle } from "@/components/Toggle";
import { buildTripPlan, daypartOf, TripSlot } from "@/lib/trip";
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
const clock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});

function windowLabel(slot: TripSlot): string {
  const opens = clock.format(slot.opensAt).replace(":00", "");
  // "while supplies last" rides with the price line — a long label here
  // would crush the show title out of the row.
  if (slot.whileSuppliesLast) return `from ${opens}`;
  const closes = clock.format(slot.closesAt).replace(":00", "");
  return `${opens}–${closes}`;
}

function SlotRow({ slot }: { slot: TripSlot }) {
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
        <span className="block truncate text-body font-semibold">
          {slot.show.title}
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

const DAYPARTS = [
  ["morning", "Morning"],
  ["afternoon", "Afternoon"],
  ["evening", "Evening"],
] as const;

export function TripPlanner() {
  const now = useNow();
  const { isSaved, savedShows } = useApp();
  const [startOffset, setStartOffset] = useState(0);
  const [nights, setNights] = useState(3);
  const [interestedOnly, setInterestedOnly] = useState(false);

  const plan = useMemo(() => {
    if (!now) return null;
    const days = buildTripPlan(now, startOffset, nights);
    if (!interestedOnly) return days;
    return days.map((day) => ({
      ...day,
      slots: day.slots.filter((slot) => isSaved(slot.show.slug)),
    }));
  }, [now, startOffset, nights, interestedOnly, isSaved]);

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
              onClick={() => setStartOffset(i)}
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
        onChange={setNights}
        min={1}
        max={7}
        step={1}
        label="nights in town"
        format={(v) => `${v} night${v === 1 ? "" : "s"}`}
      />

      {savedShows.length > 0 && (
        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="text-body">
            Only shows I&apos;m interested in
          </span>
          <Toggle
            on={interestedOnly}
            onChange={setInterestedOnly}
            label="Only shows I'm interested in"
          />
        </div>
      )}

      {plan.map((day) => (
        <section key={day.dayKey} className="mt-9">
          <div className="flex items-baseline justify-between">
            <h2 className="text-heading">{headingDay.format(day.date)}</h2>
            <span className="text-caption text-ink-soft">
              {day.slots.length} window{day.slots.length === 1 ? "" : "s"}
            </span>
          </div>

          {interestedOnly && day.slots.length === 0 && (
            <p className="mt-3 text-body text-ink-faint">
              Nothing from your interested shows this day — flip the toggle
              off to see every window.
            </p>
          )}

          {DAYPARTS.map(([part, label]) => {
            const slots = day.slots.filter(
              (slot) => daypartOf(slot.opensAt) === part,
            );
            if (slots.length === 0) return null;
            return (
              <div key={part} className="mt-4">
                <p className="text-caption font-medium text-ink-faint">
                  {label}
                </p>
                <div className="mt-2 space-y-2 web:grid web:grid-cols-2 web:gap-2 web:space-y-0">
                  {slots.map((slot) => (
                    <SlotRow
                      key={`${slot.program.showSlug}-${slot.program.kind}-${slot.program.platform}`}
                      slot={slot}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* The standing fallback, every day — live board for today only */}
          <TktsTripCard isToday={day.dayKey === etDayKey(new Date())} />
        </section>
      ))}

      <p className="mt-8 text-label text-ink-faint">
        Digital lotteries usually draw for the next day&apos;s performances —
        enter the night before a show you want. All times NYC.
      </p>
    </div>
  );
}
