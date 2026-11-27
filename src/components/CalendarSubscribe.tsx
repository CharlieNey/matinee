"use client";

import { useSyncExternalStore } from "react";
import { CalendarPlus, Copy } from "lucide-react";
import { useToast } from "@/components/Toast";
import { calendarUrl } from "@/lib/calendar";

/** The page's origin never changes while it's open. */
const noSubscription = () => () => {};

/**
 * "In your calendar": subscribe once and the calendar app shows each opening
 * for these shows, two weeks ahead, with its own 5-minute reminder. The shows
 * ride in the URL, so nothing is stored, and the app refreshes it on its own
 * schedule (every few hours), which makes it for planning; push stays the
 * alert.
 */
export function CalendarSubscribe({ slugs }: { slugs: readonly string[] }) {
  const toast = useToast();
  // The page's own origin, so a preview or local build links to itself.
  // Null on the server; the section renders after hydration.
  const origin = useSyncExternalStore(
    noSubscription,
    () => window.location.origin,
    () => null,
  );

  if (slugs.length === 0 || !origin) return null;
  const host = new URL(origin).host;
  const webcal = calendarUrl(`webcal://${host}`, slugs);
  const https = calendarUrl(origin, slugs);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(https);
      toast({ message: "Calendar link copied" });
    } catch {
      toast({ message: "Couldn't copy. Long-press the link to copy it." });
    }
  };

  return (
    <section className="mt-9" aria-labelledby="calendar-heading">
      <h2 id="calendar-heading" className="text-heading">
        In your calendar
      </h2>
      <p className="mt-2 text-body text-ink-soft">
        Subscribe once and your calendar shows each opening for these shows,
        two weeks ahead, with a 5-minute reminder. It refreshes on its own every
        few hours, so use it for planning; alerts on this device stay the
        quickest. Follow another show later? Subscribe again.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <a
          href={webcal}
          className="flex h-11 items-center gap-2 rounded-full bg-espresso px-4 text-caption font-semibold text-white transition-transform duration-150 active:scale-[0.97]"
        >
          <CalendarPlus className="size-4" strokeWidth={2} aria-hidden />
          Subscribe in your calendar
        </a>
        <button
          type="button"
          onClick={copy}
          className="flex h-11 items-center gap-2 rounded-full bg-cream px-4 text-caption font-semibold text-ink-soft transition-transform duration-150 active:scale-[0.97]"
        >
          <Copy className="size-4" strokeWidth={2} aria-hidden />
          Copy link
        </button>
      </div>
      <p className="mt-2.5 text-caption text-ink-faint">
        Google Calendar: Other calendars, then From URL, and paste the link.
      </p>
    </section>
  );
}
