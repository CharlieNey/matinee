"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Clock3, X } from "lucide-react";
import { useDemoTime } from "@/lib/demoTime";
import { useNow } from "@/lib/useNow";

const ET = "America/New_York";
const DAY_MS = 24 * 60 * 60 * 1000;

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: ET,
  hour: "numeric",
  minute: "2-digit",
});
const weekdayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: ET,
  weekday: "short",
});
const dateKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: ET,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const clockFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: ET,
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
});

function minuteOfDayInET(date: Date): number {
  const parts = Object.fromEntries(
    clockFormat
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, Number(p.value)]),
  );
  return parts.hour * 60 + parts.minute;
}

/** Whole NYC calendar days between two instants (b - a). */
function etDayDiff(a: Date, b: Date): number {
  const utcMidnight = (d: Date) => Date.parse(`${dateKeyFormat.format(d)}T00:00:00Z`);
  return Math.round((utcMidnight(b) - utcMidnight(a)) / DAY_MS);
}

function formatMinute(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const display = h % 12 || 12;
  return `${display}:${String(m).padStart(2, "0")} ${suffix}`;
}

function dayLabel(dayOffset: number, from: Date): string {
  if (dayOffset === 0) return "Today";
  if (dayOffset === 1) return "Tmrw";
  return weekdayFormat.format(new Date(from.getTime() + dayOffset * DAY_MS));
}

/**
 * The demo time machine (PLAN.md Phase 5): scrub NYC's clock and the whole
 * rush board re-derives live. Real time is the default; simulated time gets
 * the espresso pill + gold dot so it can't pass for live data.
 */
export function TimeMachine() {
  const { offsetMs, scrubTo, backToLive } = useDemoTime();
  const now = useNow(10_000);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const [minuteOfDay, setMinuteOfDay] = useState(0);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  if (!now) return null;
  const simulated = offsetMs !== null;

  const openCard = () => {
    const real = new Date(simulated ? now.getTime() - offsetMs : now.getTime());
    setDayOffset(simulated ? etDayDiff(real, now) : 0);
    setMinuteOfDay(Math.floor(minuteOfDayInET(now) / 5) * 5);
    setOpen(true);
  };

  const scrub = (nextDay: number, nextMinute: number) => {
    setDayOffset(nextDay);
    setMinuteOfDay(nextMinute);
    scrubTo(nextDay, nextMinute);
  };

  const realToday = new Date(simulated ? now.getTime() - offsetMs : now.getTime());

  return (
    <div className="fixed bottom-24 left-4 z-50 flex flex-col items-start gap-2 web:bottom-5 web:left-5">
      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label="Time machine"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-[290px] rounded-card border border-line bg-paper p-4 shadow-float"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-body font-semibold">Time machine</h2>
              <button
                ref={closeRef}
                type="button"
                aria-label="Close time machine"
                onClick={() => setOpen(false)}
                className="p-1 text-ink-soft transition-transform duration-150 active:scale-90"
              >
                <X className="size-5" strokeWidth={1.8} />
              </button>
            </div>
            <p className="mt-1 text-caption text-ink-soft">
              Scrub the clock and watch the board move. All times NYC.
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.from({ length: 7 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={dayOffset === i}
                  onClick={() => scrub(i, minuteOfDay)}
                  className={`h-8 rounded-full px-3 text-caption font-semibold transition-colors duration-150 ${
                    dayOffset === i
                      ? "bg-espresso text-white"
                      : "bg-cream text-ink-soft"
                  }`}
                >
                  {dayLabel(i, realToday)}
                </button>
              ))}
            </div>

            <input
              type="range"
              min={0}
              max={1435}
              step={5}
              value={minuteOfDay}
              onChange={(e) => scrub(dayOffset, Number(e.target.value))}
              aria-label="Time of day"
              className="mt-4 w-full accent-espresso"
            />

            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-title tabular-nums">
                {formatMinute(minuteOfDay)}
              </span>
              {simulated && (
                <button
                  type="button"
                  onClick={() => {
                    backToLive();
                    setOpen(false);
                  }}
                  className="text-caption font-semibold text-ink underline underline-offset-2"
                >
                  Back to live
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openCard())}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={
          simulated ? "Simulated time — open time machine" : "Open time machine"
        }
        className={`flex h-11 items-center gap-2 rounded-full border px-4 text-caption font-semibold shadow-float transition-[background-color,transform] duration-150 active:scale-[0.97] ${
          simulated
            ? "border-espresso bg-espresso text-white"
            : "border-line bg-paper text-ink-soft"
        }`}
      >
        {simulated ? (
          <span className="size-2 rounded-full bg-gold" aria-hidden />
        ) : (
          <Clock3 className="size-4" strokeWidth={2} />
        )}
        <span className="tabular-nums">
          {simulated
            ? `${weekdayFormat.format(now)} ${timeFormat.format(now)} · demo`
            : timeFormat.format(now)}
        </span>
      </button>
    </div>
  );
}
