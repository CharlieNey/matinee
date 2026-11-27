"use client";

import { useState } from "react";
import { Check, ChevronDown, ExternalLink, Trophy } from "lucide-react";
import { ReportLink } from "@/components/ReportLink";
import { WinCardSheet } from "@/components/WinCardSheet";
import { formatCheckedDate } from "@/lib/contact";
import { useEnteredToday } from "@/lib/entries";
import { nyClock, shortWait } from "@/lib/clock";
import {
  ClaimChannel,
  formatMinutes,
  isProgramStale,
  Program,
  programKey,
  programKindLabel,
  programOccurrencesNear,
  programPlatformLabel,
  programSourceLabel,
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

/** Within this long after a window closes, say so rather than jump ahead. */
const JUST_CLOSED_MS = 60 * 60 * 1000;

/** How long ago this program's latest window closed, if within the hour. */
function closedAgo(program: Program, now: Date): number | null {
  let latest: number | null = null;
  for (const occurrence of programOccurrencesNear(now, program)) {
    const ago = now.getTime() - occurrence.closesAt.getTime();
    if (ago >= 0 && ago < JUST_CLOSED_MS && (latest === null || ago < latest)) {
      latest = ago;
    }
  }
  return latest;
}

/**
 * Collapsed-row status, the way a New Yorker would say it: "Closes 3 PM",
 * "Closes in 42 min" in the last hour, "While they last" for first-come
 * rush, "Closed 5 min ago", "Opens tomorrow 9 AM". Quiet text with the time
 * carrying the emphasis (DESIGN.md §2). Color is confined to a 6px dot: sage
 * for an open window, the gold marquee pulse for one that's closing (§11).
 */
function StatusShort({
  program,
  status,
  now,
}: {
  program: Program;
  status: ProgramStatus;
  now: Date;
}) {
  const strong = (text: string) => (
    <b className="font-semibold text-ink">{text}</b>
  );
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
    let text: React.ReactNode = "Open now";
    if (status.whileSuppliesLast) {
      text = "While they last";
    } else if (status.countdownMs !== null && status.countdownMs < JUST_CLOSED_MS) {
      text = <>Closes in {strong(shortWait(status.countdownMs))}</>;
    } else if (status.nextCloseAt) {
      text = <>Closes {strong(nyClock(status.nextCloseAt, now))}</>;
    }
    return (
      <>
        {dot}
        <span>{text}</span>
      </>
    );
  }

  const ago = closedAgo(program, now);
  if (ago !== null) return <span>Closed {shortWait(ago)} ago</span>;
  if (!status.nextOpenAt) return <span>Check site</span>;
  return <span>Opens {strong(nyClock(status.nextOpenAt, now))}</span>;
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
  // A row the app can't vouch for doesn't get a clock: its times may be the
  // fact in doubt. The detail says why.
  const doubtful = stale || program.unverified !== undefined;
  const isLottery =
    program.kind === "digital-lottery" || program.kind === "in-person-lottery";
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
          {doubtful ? (
            <span>Unverified</span>
          ) : status && now ? (
            <StatusShort program={program} status={status} now={now} />
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
        inert={!open}
        aria-hidden={!open}
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="space-y-1.5 pb-4 text-caption leading-snug text-ink-soft">
            <p>
              <b className="font-semibold text-ink">{platform}</b> ·{" "}
              {program.schedule.summary}
            </p>
            {(program.maxTickets !== undefined || program.notes) && (
              <p>
                {[
                  program.maxTickets !== undefined &&
                    `Up to ${program.maxTickets} ticket${program.maxTickets === 1 ? "" : "s"}`,
                  program.notes,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {program.claimWindow && (
              <p>
                Winners are {CHANNEL_VERBS[program.claimWindow.channel]} and
                have{" "}
                <b className="font-semibold text-ink">
                  {formatMinutes(program.claimWindow.minutes)}
                </b>{" "}
                to buy.
              </p>
            )}
            {program.unverified && (
              <p>
                <b className="font-semibold text-ink">Unverified:</b>{" "}
                {program.unverified} Confirm on the entry site.
              </p>
            )}
            {stale && !program.unverified && (
              <p>
                <b className="font-semibold text-ink">Unverified:</b> not
                re-checked in over two weeks. Confirm on the entry site.
              </p>
            )}
            <p className="text-ink-faint">
              Checked {formatCheckedDate(program.lastVerified)} ·{" "}
              <a
                href={program.source}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 transition-opacity active:opacity-60"
              >
                <span className="sr-only">Source: </span>
                {programSourceLabel(program)}
              </a>{" "}
              ·{" "}
              <ReportLink show={show} program={program}>
                Report a wrong fact
              </ReportLink>
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <a
                href={program.entryUrl}
                target="_blank"
                rel="noreferrer"
                data-seller-link="program"
                data-show={program.showSlug}
                data-platform={program.platform}
                className="flex h-10 items-center gap-1.5 rounded-md bg-espresso px-4 text-caption font-semibold text-white transition-transform duration-150 active:scale-[0.97]"
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
                    className={`flex h-10 items-center gap-1.5 rounded-md px-4 text-caption font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                      entered ? "bg-sage text-sage-ink" : "border border-ink-faint text-ink"
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
                      className="flex h-10 items-center gap-1.5 rounded-md border border-ink-faint px-4 text-caption font-semibold text-ink transition-transform duration-150 active:scale-[0.97]"
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
  /** "first" opens only the first row: one full answer, the rest a tap away. */
  defaultOpen?: boolean | "first";
  /** Hide the first row's top hairline (no header above it). */
  flushTop?: boolean;
}) {
  return (
    <div className={flushTop ? "[&>div:first-child]:border-t-0" : ""}>
      {entries.map(({ program, status }, index) => (
        <ProgramRow
          key={programKey(program)}
          program={program}
          show={show}
          status={status}
          now={now}
          defaultOpen={defaultOpen === "first" ? index === 0 : defaultOpen}
        />
      ))}
    </div>
  );
}
