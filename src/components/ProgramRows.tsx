"use client";

import { useState } from "react";
import { Check, ChevronDown, ExternalLink, Trophy } from "lucide-react";
import { WinCardSheet } from "@/components/WinCardSheet";
import { allInForPlatform, allInLabel } from "@/lib/fees";
import { useEnteredToday } from "@/lib/entries";
import {
  ClaimChannel,
  etDayKey,
  isProgramStale,
  Program,
  programKey,
  programKindLabel,
  programPlatformLabel,
  ProgramStatus,
} from "@/lib/programs";
import { Show } from "@/lib/shows";

export type ProgramEntry = {
  program: Program;
  status: ProgramStatus | null;
};

const CHANNEL_VERBS: Record<ClaimChannel, string> = {
  email: "emailed",
  text: "texted",
  app: "pinged in the app",
};

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});

const weekdayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
});

/** "3 PM" today, "Fri 10 AM" any other day. */
function shortTime(date: Date, now: Date): string {
  const time = timeFormat.format(date).replace(":00 ", " ");
  return etDayKey(date) === etDayKey(now)
    ? time
    : `${weekdayFormat.format(date)} ${time}`;
}

function countdown(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

/**
 * Collapsed-row status: quiet text with the numbers carrying the emphasis
 * (DESIGN.md §2). Color is confined to a 6px dot — sage for an open window,
 * the gold marquee pulse for one that's closing (§11). No pills.
 */
function StatusShort({ status, now }: { status: ProgramStatus; now: Date }) {
  if (status.state === "open" || status.state === "closes-soon") {
    const dot = (
      <span
        aria-hidden
        className={`size-1.5 shrink-0 rounded-full ${
          status.state === "closes-soon"
            ? "marquee-pulse bg-gold"
            : "bg-sage-ink/70"
        }`}
      />
    );
    if (status.whileSuppliesLast || status.countdownMs === null) {
      return (
        <>
          {dot}
          <span>Open now</span>
        </>
      );
    }
    // A day-plus window reads calmer as a deadline than as a countdown.
    if (status.countdownMs >= 24 * 3_600_000 && status.nextCloseAt) {
      return (
        <>
          {dot}
          <span>
            Open til{" "}
            <b className="font-semibold text-ink">
              {shortTime(status.nextCloseAt, now)}
            </b>
          </span>
        </>
      );
    }
    return (
      <>
        {dot}
        <span>
          <b className="font-semibold text-ink">
            {countdown(status.countdownMs)}
          </b>{" "}
          left
        </span>
      </>
    );
  }

  if (!status.nextOpenAt) return <span>Check site</span>;

  return (
    <span>
      Opens{" "}
      <b className="font-semibold text-ink">
        {shortTime(status.nextOpenAt, now)}
      </b>
    </span>
  );
}

function ProgramRow({
  program,
  show,
  status,
  now,
  defaultOpen = false,
}: {
  program: Program;
  show: Show;
  status: ProgramStatus | null;
  now: Date | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [winOpen, setWinOpen] = useState(false);
  const { entered, won, toggle, markWon } = useEnteredToday(program, now);
  const stale = now ? isProgramStale(program, now) : false;
  const isLottery =
    program.kind === "digital-lottery" || program.kind === "in-person-lottery";
  // Free programs (Shakespeare in the Park) skip the fee estimate entirely.
  const allIn =
    program.price > 0
      ? allInForPlatform(program.price, program.platform)
      : null;
  const platform = programPlatformLabel(program.platform);

  return (
    <div className="border-t border-line">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-13 w-full items-center justify-between gap-3 py-2.5 text-left"
      >
        <span className="min-w-0 truncate text-body">
          {program.name ?? programKindLabel(program.kind)} ·{" "}
          <b className="font-semibold">
            {program.price === 0 ? "Free" : `$${program.price}`}
          </b>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-caption text-ink-soft">
          {entered && (
            <>
              <Check
                className="size-4 text-sage-ink"
                strokeWidth={2.2}
                aria-hidden
              />
              <span className="sr-only">Entered today</span>
            </>
          )}
          {status && now ? (
            <StatusShort status={status} now={now} />
          ) : (
            <span className="text-ink-faint">…</span>
          )}
          <ChevronDown
            className={`size-4 shrink-0 text-ink-faint transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            strokeWidth={2}
            aria-hidden
          />
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="space-y-1.5 pb-4 text-caption leading-snug text-ink-soft">
            <p>
              <b className="font-semibold text-ink">{platform}</b> ·{" "}
              {program.schedule.summary}
            </p>
            <p>
              Up to {program.maxTickets} ticket
              {program.maxTickets === 1 ? "" : "s"}
              {program.notes ? ` · ${program.notes}` : ""}
            </p>
            {program.claimWindow && (
              <p>
                If you win: {CHANNEL_VERBS[program.claimWindow.channel]}{" "}
                {program.claimWindow.notifiedAround} ·{" "}
                <b className="font-semibold text-ink">
                  {program.claimWindow.minutes} min
                </b>{" "}
                to claim — the clock starts on send.
              </p>
            )}
            {allIn && <p className="text-ink-faint">{allInLabel(allIn)}</p>}
            {stale && (
              <p className="text-ink-faint">
                Details are due for verification — confirm on the entry site.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <a
                href={program.entryUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center gap-1.5 rounded-full bg-espresso px-4 text-caption font-semibold text-white transition-transform duration-150 active:scale-[0.97]"
              >
                {program.platform === "box-office"
                  ? "Find the box office"
                  : isLottery
                    ? `Enter on ${platform}`
                    : `Open ${platform}`}
                <ExternalLink
                  className="size-3.5"
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="sr-only">Opens in a new tab</span>
              </a>
              {isLottery && now && (
                <>
                  <button
                    type="button"
                    aria-pressed={entered}
                    onClick={toggle}
                    className={`flex h-10 items-center gap-1.5 rounded-full px-4 text-caption font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                      entered ? "bg-sage text-sage-ink" : "bg-cream text-ink-soft"
                    }`}
                  >
                    {entered && (
                      <Check className="size-4" strokeWidth={2.2} aria-hidden />
                    )}
                    {entered ? "Entered today" : "I entered"}
                  </button>
                  {entered && (
                    <button
                      type="button"
                      onClick={() => {
                        markWon();
                        setWinOpen(true);
                      }}
                      className="flex h-10 items-center gap-1.5 rounded-full bg-cream px-4 text-caption font-semibold text-ink-soft transition-transform duration-150 active:scale-[0.97]"
                    >
                      <Trophy
                        className="size-4 text-gold"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {won ? "Won — share it" : "I won"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {winOpen && (
        <WinCardSheet
          open={winOpen}
          onClose={() => setWinOpen(false)}
          program={program}
          show={show}
          now={now}
        />
      )}
    </div>
  );
}

/**
 * Hairline-divided program rows for one show — collapsed rows carry the
 * decision (kind, price, when it's actionable); expanding a row reveals the
 * operational detail (platform, schedule, claim clock, fees, entry link).
 * Shared by the Rush feed's show cards and the show page's Ways to save.
 */
export function ProgramRows({
  show,
  entries,
  now,
  defaultOpen = false,
  flushTop = false,
}: {
  show: Show;
  entries: readonly ProgramEntry[];
  now: Date | null;
  defaultOpen?: boolean;
  /** Hide the first row's top hairline (no header above it). */
  flushTop?: boolean;
}) {
  return (
    <div className={flushTop ? "[&>div:first-child]:border-t-0" : ""}>
      {entries.map(({ program, status }) => (
        <ProgramRow
          key={programKey(program)}
          program={program}
          show={show}
          status={status}
          now={now}
          defaultOpen={defaultOpen}
        />
      ))}
    </div>
  );
}
