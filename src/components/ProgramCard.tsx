"use client";

import { useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ExternalLink,
  Lightbulb,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import { Poster } from "@/components/Poster";
import { allInForPlatform, allInLabel } from "@/lib/fees";
import { useEnteredToday } from "@/lib/entries";
import {
  ClaimChannel,
  isProgramStale,
  Program,
  programKindLabel,
  programPlatformLabel,
  ProgramStatus,
} from "@/lib/programs";
import { Show } from "@/lib/shows";

const easternDateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
});

const CHANNEL_VERBS: Record<ClaimChannel, string> = {
  email: "emailed",
  text: "texted",
  app: "pinged in the app",
};

function countdown(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function StatusLine({ status }: { status: ProgramStatus | null }) {
  if (!status) {
    return <span className="text-ink-soft">Checking schedule…</span>;
  }

  if (status.state === "open" || status.state === "closes-soon") {
    if (status.whileSuppliesLast) {
      return (
        <>
          <span>Open now</span>
          <span className="font-normal text-sage-ink/75">
            {" "}
            · while supplies last
          </span>
        </>
      );
    }
    return (
      <>
        <span>{status.state === "closes-soon" ? "Closes in " : "Open · "}</span>
        <strong className="font-bold">{countdown(status.countdownMs!)}</strong>
        {status.state === "open" && <span className="font-normal"> left</span>}
      </>
    );
  }

  if (status.state === "opens-later-today") {
    return (
      <>
        <span>Opens in </span>
        <strong className="font-bold">{countdown(status.countdownMs!)}</strong>
      </>
    );
  }

  if (!status.nextOpenAt) return <span>Schedule unavailable</span>;

  return (
    <>
      {status.state === "closed-today" && <span>Closed today · </span>}
      <span>Opens {easternDateTime.format(status.nextOpenAt)}</span>
    </>
  );
}

function statusClasses(status: ProgramStatus | null): string {
  if (!status) return "bg-cream text-ink-soft";
  // Closing window = live urgency: warm chip + marquee pulse (DESIGN.md §11).
  if (status.state === "closes-soon") {
    return "marquee-pulse bg-gold/15 text-ink";
  }
  if (status.state === "open") {
    return "bg-sage text-sage-ink";
  }
  if (status.state === "opens-later-today") {
    return "bg-blush text-ink";
  }
  return "bg-cream text-ink-soft";
}

export function ProgramCard({
  program,
  show,
  status,
  now,
}: {
  program: Program;
  show: Show;
  status: ProgramStatus | null;
  now: Date | null;
}) {
  const stale = now ? isProgramStale(program, now) : false;
  const [tipsOpen, setTipsOpen] = useState(false);
  const { entered, toggle } = useEnteredToday(program, now);
  const isLottery =
    program.kind === "digital-lottery" || program.kind === "in-person-lottery";
  const allIn = allInForPlatform(program.price, program.platform);
  const tips = program.tips ?? [];

  return (
    <div className="rounded-card bg-paper p-4">
      <a
        href={program.entryUrl}
        target="_blank"
        rel="noreferrer"
        className="block transition-transform duration-150 active:scale-[0.985]"
      >
        <div className="flex gap-3.5">
          <Poster show={show} className="size-[72px] rounded-thumb" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-body font-semibold leading-tight">
                {show.title}
              </h3>
              <ExternalLink
                className="mt-0.5 size-4 shrink-0 text-ink-faint"
                strokeWidth={1.9}
                aria-hidden="true"
              />
              <span className="sr-only">Opens entry site in a new tab</span>
            </div>
            <p className="mt-1 text-caption text-ink-soft">
              {program.name ?? programKindLabel(program.kind)} ·{" "}
              {programPlatformLabel(program.platform)}
            </p>
            <p className="mt-1.5 line-clamp-2 text-label leading-snug text-ink-soft">
              {program.schedule.summary}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
          <div
            className={`min-w-0 rounded-full px-3 py-2 text-label font-semibold ${statusClasses(status)}`}
          >
            <StatusLine status={status} />
          </div>
          <div className="shrink-0 text-right">
            <p className="text-caption text-ink-soft">
              <strong className="text-[20px] font-bold leading-none text-ink">
                ${program.price}
              </strong>{" "}
              each
            </p>
            {allIn && (
              <p className="mt-0.5 text-label text-ink-faint">
                {allInLabel(allIn)}
              </p>
            )}
          </div>
        </div>
      </a>

      <div className="mt-3 flex items-start gap-2 text-label text-ink-soft">
        {stale ? (
          <>
            <ShieldAlert className="mt-px size-3.5 shrink-0" strokeWidth={1.9} />
            <span>Details are due for verification — confirm on the entry site.</span>
          </>
        ) : (
          <>
            <CalendarClock className="mt-px size-3.5 shrink-0" strokeWidth={1.9} />
            <span>
              Up to {program.maxTickets} ticket{program.maxTickets === 1 ? "" : "s"}
              {program.notes ? ` · ${program.notes}` : ""}
            </span>
          </>
        )}
      </div>

      {program.claimWindow && (
        <p className="mt-2 flex items-start gap-2 text-label text-ink-soft">
          <Trophy
            className="mt-px size-3.5 shrink-0 text-gold"
            strokeWidth={1.9}
            aria-hidden="true"
          />
          <span>
            If you win: {CHANNEL_VERBS[program.claimWindow.channel]}{" "}
            {program.claimWindow.notifiedAround} ·{" "}
            <b className="font-semibold text-ink">
              {program.claimWindow.minutes} min
            </b>{" "}
            to claim — the clock starts on send.
          </span>
        </p>
      )}

      {(tips.length > 0 || isLottery) && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-2.5">
          {tips.length > 0 ? (
            <button
              type="button"
              aria-expanded={tipsOpen}
              onClick={() => setTipsOpen((v) => !v)}
              className="flex items-center gap-1.5 py-1 text-caption font-semibold text-ink-soft transition-colors duration-150 hover:text-ink"
            >
              <Lightbulb className="size-4" strokeWidth={1.9} aria-hidden="true" />
              Tips
              <ChevronDown
                className={`size-4 transition-transform duration-200 ${tipsOpen ? "rotate-180" : ""}`}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>
          ) : (
            <span />
          )}
          {isLottery && now && (
            <button
              type="button"
              aria-pressed={entered}
              onClick={toggle}
              className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-caption font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                entered
                  ? "bg-sage text-sage-ink"
                  : "bg-cream text-ink-soft"
              }`}
            >
              {entered && <Check className="size-4" strokeWidth={2.2} />}
              {entered ? "Entered today" : "I entered"}
            </button>
          )}
        </div>
      )}

      {tipsOpen && tips.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {tips.map((tip) => (
            <li
              key={tip}
              className="rounded-thumb bg-cream px-3 py-2.5 text-label leading-snug text-ink-soft"
            >
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
