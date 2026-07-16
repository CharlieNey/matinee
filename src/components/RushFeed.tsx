"use client";

import { useMemo } from "react";
import { Clock3 } from "lucide-react";
import { ProgramCard } from "@/components/ProgramCard";
import {
  allPrograms,
  getProgramStatus,
  Program,
  ProgramStatus,
} from "@/lib/programs";
import { getShow, Show } from "@/lib/shows";
import { useNow } from "@/lib/useNow";

type Entry = {
  program: Program;
  show: Show;
  status: ProgramStatus;
};

function FeedSection({
  title,
  entries,
  empty,
  now,
}: {
  title: string;
  entries: Entry[];
  empty: string;
  now: Date;
}) {
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-heading">{title}</h2>
        <span className="text-caption text-ink-soft">{entries.length}</span>
      </div>
      {entries.length > 0 ? (
        <div className="mt-3 space-y-3 web:grid web:grid-cols-2 web:gap-3 web:space-y-0">
          {entries.map((entry, index) => (
            <div
              key={`${entry.program.showSlug}-${entry.program.kind}-${entry.program.platform}`}
              className="card-enter"
              style={{ animationDelay: `${Math.min(index * 35, 210)}ms` }}
            >
              <ProgramCard {...entry} now={now} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-card bg-paper px-4 py-5 text-body text-ink-soft">
          {empty}
        </p>
      )}
    </section>
  );
}

export function RushFeed() {
  const now = useNow();

  const groups = useMemo(() => {
    if (!now) return null;

    const entries = allPrograms()
      .map((program): Entry | null => {
        const show = getShow(program.showSlug);
        if (!show) return null;
        return { program, show, status: getProgramStatus(now, program) };
      })
      .filter((entry): entry is Entry => entry !== null);

    const open = entries
      .filter(({ status }) =>
        ["open", "closes-soon"].includes(status.state),
      )
      .sort((a, b) => {
        if (a.status.countdownMs === null) return 1;
        if (b.status.countdownMs === null) return -1;
        return a.status.countdownMs - b.status.countdownMs;
      });
    const later = entries
      .filter(({ status }) => status.state === "opens-later-today")
      .sort((a, b) =>
        (a.status.nextOpenAt?.getTime() ?? 0) -
        (b.status.nextOpenAt?.getTime() ?? 0),
      );
    const coming = entries
      .filter(({ status }) =>
        ["closed-today", "next-open-day"].includes(status.state),
      )
      .sort((a, b) =>
        (a.status.nextOpenAt?.getTime() ?? Infinity) -
        (b.status.nextOpenAt?.getTime() ?? Infinity),
      );

    return { open, later, coming };
  }, [now]);

  if (!now || !groups) {
    return (
      <div className="mt-8" aria-live="polite">
        <div className="flex items-center gap-2 text-body text-ink-soft">
          <Clock3 className="size-5" strokeWidth={1.8} />
          Checking today&apos;s entry windows…
        </div>
        <div className="mt-4 space-y-3" aria-hidden>
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-[190px] animate-pulse rounded-card bg-paper" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <FeedSection
        title="Open now"
        entries={groups.open}
        empty="Nothing is open right now. Check what starts later today."
        now={now}
      />
      <FeedSection
        title="Later today"
        entries={groups.later}
        empty="No more entry windows open later today."
        now={now}
      />
      <FeedSection
        title="Coming up"
        entries={groups.coming}
        empty="No upcoming programs found."
        now={now}
      />
    </div>
  );
}
