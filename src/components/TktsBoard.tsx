"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Ticket } from "lucide-react";
import { Sheet } from "@/components/Sheet";
import { useDemoTime } from "@/lib/demoTime";
import {
  bestDiscount,
  boardIsToday,
  boardStampLabel,
  DUFFY_URL,
  TKTS_LIVE_URL,
  TktsBoard,
  TktsBooth,
  TktsCircuit,
  TktsData,
  TktsLiveSummary,
  TktsRow,
} from "@/lib/tkts";
import { useTkts } from "@/lib/useTkts";

/*
 * TKTS live board surfaces (Phase 13). All of these run on REAL time — the
 * board is external data the demo time machine cannot simulate, so when the
 * demo clock is active they say so instead of pretending.
 */

function timesSquare(data: TktsData | null): TktsBooth | null {
  return data?.booths.find((booth) => booth.key === "times-square") ?? null;
}

function DemoClockNote() {
  const { offsetMs } = useDemoTime();
  if (offsetMs === null) return null;
  return (
    <p className="mt-1.5 text-label text-ink-faint">
      Live TDF data — real time, unaffected by the demo clock.
    </p>
  );
}

function Attribution({ withDuffy }: { withDuffy?: boolean }) {
  return (
    <p className="mt-3 text-label text-ink-faint">
      <a
        href={TKTS_LIVE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
      >
        Data: TDF TKTS Live
        <ExternalLink className="size-3" strokeWidth={2} aria-hidden="true" />
      </a>
      {withDuffy && (
        <>
          {" · "}
          <a
            href={DUFFY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
          >
            Live status: Duffy Dashboard
            <ExternalLink className="size-3" strokeWidth={2} aria-hidden="true" />
          </a>
        </>
      )}
    </p>
  );
}

/**
 * Real-time booth status from Duffy Dashboard's Community API — the freshness
 * complement when TDF's per-show board is stale.
 */
function LiveSummaryLine({ summary }: { summary: TktsLiveSummary }) {
  const parts = summary.live
    ? [
        "Booth open now",
        summary.showQuantity > 0
          ? `${summary.showQuantity} show${summary.showQuantity === 1 ? "" : "s"} on the board`
          : null,
        summary.averageDiscount > 0
          ? `avg ${Math.round(summary.averageDiscount)}% off`
          : null,
      ]
    : ["Booth closed right now"];
  return (
    <p
      className={`text-caption font-semibold ${
        summary.live ? "text-sage-ink" : "text-ink-soft"
      }`}
    >
      {parts.filter(Boolean).join(" · ")}
      <span className="font-normal text-ink-faint"> · live</span>
    </p>
  );
}

function prettyPrice(price: string): string {
  return price.replace("-", "–");
}

function RowLine({ row }: { row: TktsRow }) {
  const meta = [
    row.pctOff !== null ? `${row.pctOff}% off` : null,
    prettyPrice(row.price),
    row.curtain,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      {row.showSlug ? (
        <Link
          href={`/shows/${row.showSlug}`}
          className="min-w-0 truncate text-body font-semibold"
        >
          {row.title}
        </Link>
      ) : (
        <span className="min-w-0 truncate text-body">{row.title}</span>
      )}
      <span className="shrink-0 text-caption text-ink-soft">{meta}</span>
    </div>
  );
}

function BoardList({ boards }: { boards: TktsBoard[] }) {
  const [showAll, setShowAll] = useState(false);
  const labeled = boards.filter((board) => board.rows.length > 0);
  const total = labeled.reduce((n, board) => n + board.rows.length, 0);
  if (total === 0) return null;

  const visible: { circuit: TktsCircuit; rows: TktsRow[] }[] = [];
  let remaining = showAll ? total : 6;
  for (const board of labeled) {
    if (remaining <= 0) break;
    const rows = board.rows.slice(0, remaining);
    remaining -= rows.length;
    visible.push({ circuit: board.circuit, rows });
  }

  return (
    <div>
      {visible.map((board) => (
        <div key={board.circuit} className="mt-3 first:mt-0">
          {labeled.length > 1 && (
            <p className="pt-1 text-label font-semibold uppercase tracking-[0.08em] text-ink-faint">
              {board.circuit === "broadway" ? "Broadway" : "Off-Broadway"}
            </p>
          )}
          <div className="divide-y divide-line">
            {board.rows.map((row) => (
              <RowLine key={`${row.title}-${row.curtain}`} row={row} />
            ))}
          </div>
        </div>
      ))}
      {!showAll && total > 6 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 text-caption font-semibold text-ink underline-offset-2 hover:underline"
        >
          Show all {total} shows
        </button>
      )}
    </div>
  );
}

function boothHeadline(booth: TktsBooth, realNow: Date): string {
  const board = booth.boards[0] ?? { updatedAt: null, updatedLabel: null };
  const stamp = boardStampLabel(board, realNow);
  // The open/closed notice renders from the same TDF sync as the board rows —
  // when the board isn't today's, the booth status is equally stale, so
  // repeat neither. Observed for real: "closed until Tuesday" on a Thursday.
  if (!boardIsToday(board.updatedAt, realNow)) {
    return stamp ?? "Live board unavailable";
  }
  const state =
    booth.open === null
      ? null
      : booth.open
        ? `Booth open${booth.notice ? ` · ${booth.notice.replace(/^open\s*(and\s*)?/i, "")}` : ""}`
        : `Booth ${booth.notice ?? "closed"}`;
  return [state, stamp].filter(Boolean).join(" · ");
}

/**
 * /rush surface: the board as a distinct card — walk-up inventory, no entry
 * window, kept visually separate from program cards.
 */
export function TktsRushSection() {
  const data = useTkts();
  const booth = timesSquare(data);
  const summary = data?.summary ?? null;
  const hasRows =
    booth?.boards.some((board) => board.rows.length > 0) ?? false;
  if (!hasRows && !summary) return null;
  const realNow = new Date();
  const boardFresh = booth
    ? boardIsToday(booth.boards[0]?.updatedAt ?? null, realNow)
    : false;

  return (
    <section className="mt-9">
      <div className="flex items-baseline justify-between">
        <h2 className="text-heading">The TKTS board</h2>
        <span className="text-caption text-ink-soft">Times Square</span>
      </div>
      <p className="mt-1 text-caption text-ink-soft">
        Same-day discounts under the red steps — no entry, just show up.
      </p>
      <div className="mt-4 rounded-card bg-paper px-4 py-3">
        {/* One status block — the live Duffy line leads; the stale TDF stamp
            is a subordinate footnote to it, not a second header. */}
        {summary && !boardFresh && <LiveSummaryLine summary={summary} />}
        {booth && hasRows && (
          <p
            className={
              summary && !boardFresh
                ? "mt-0.5 text-label text-ink-faint"
                : "text-caption font-medium text-ink-soft"
            }
          >
            {boothHeadline(booth, realNow)}
          </p>
        )}
        {booth && hasRows && (
          <div className="mt-2.5 border-t border-line">
            <BoardList boards={booth.boards} />
          </div>
        )}
        <Attribution withDuffy={summary !== null} />
        <DemoClockNote />
      </div>
    </section>
  );
}

/** Show-page surface: one honest line, only when today's board lists the show. */
export function TktsShowRow({ slug }: { slug: string }) {
  const data = useTkts();
  const booth = timesSquare(data);
  if (!booth || booth.open === false) return null;
  const realNow = new Date();

  for (const board of booth.boards) {
    if (!boardIsToday(board.updatedAt, realNow)) continue;
    const row = board.rows.find((item) => item.showSlug === slug);
    if (!row) continue;
    const meta = [
      row.pctOff !== null ? `${row.pctOff}% off` : null,
      prettyPrice(row.price),
      row.curtain,
      boardStampLabel(board, realNow)?.toLowerCase(),
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <a
        href={row.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center gap-3 rounded-card bg-paper p-3.5 transition-transform duration-150 active:scale-[0.985]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-inset text-vermilion">
          <Ticket className="size-5" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold">
            On the TKTS board now
          </span>
          <span className="mt-0.5 block text-caption text-ink-soft">
            {meta} · Times Square booth
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
  return null;
}

/**
 * Trip-mode surface: the standing fallback card, live for today only — future
 * boards are unknowable in advance, and the card says so by staying generic.
 */
export function TktsTripCard({ isToday }: { isToday: boolean }) {
  const data = useTkts();
  const booth = timesSquare(data);
  const summary = data?.summary ?? null;
  const realNow = new Date();

  const todayBoards =
    isToday && booth
      ? booth.boards.filter((board) => boardIsToday(board.updatedAt, realNow))
      : [];
  const count = todayBoards.reduce((n, board) => n + board.rows.length, 0);
  const best = bestDiscount(todayBoards);
  const live = count > 0;
  // TDF's board is stale but Duffy Dashboard says the booth is open right now.
  const summaryLive = !live && isToday && summary?.live === true;

  return (
    <div className="mt-4 rounded-card bg-inset p-3.5">
      <a
        href={TKTS_LIVE_URL}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 transition-transform duration-150 active:scale-[0.985]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-paper text-ink">
          <Ticket className="size-5" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold">
            Fallback: TKTS Times Square
          </span>
          <span className="mt-0.5 block text-caption text-ink-soft">
            {live
              ? `${count} show${count === 1 ? "" : "s"} on the board${
                  best !== null ? ` · up to ${best}% off` : ""
                } · ${boardStampLabel(todayBoards[0], realNow)?.toLowerCase()}`
              : summaryLive
                ? `Booth open now · ${
                    summary!.showQuantity > 0
                      ? `${summary!.showQuantity} shows on the board · `
                      : ""
                  }${
                    summary!.averageDiscount > 0
                      ? `avg ${Math.round(summary!.averageDiscount)}% off · `
                      : ""
                  }live via Duffy Dashboard`
                : "Same-day discounts under the red steps, typically 3–8 PM"}
          </span>
        </span>
        <ExternalLink
          className="size-4 shrink-0 text-ink-faint"
          strokeWidth={1.9}
          aria-hidden="true"
        />
      </a>
      {(live || summaryLive) && <DemoClockNote />}
    </div>
  );
}

/** District-map surface: the board sheet behind the Duffy Square marker. */
export function TktsBoardSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const data = useTkts();
  const booth = timesSquare(data);
  const summary = data?.summary ?? null;
  const realNow = new Date();
  const boardFresh = booth
    ? boardIsToday(booth.boards[0]?.updatedAt ?? null, realNow)
    : false;

  return (
    <Sheet open={open} onClose={onClose} title="TKTS · Duffy Square">
      <div className="mt-5">
        <p className="text-caption text-ink-soft">
          Broadway &amp; W 47th — same-day discounts under the red steps.
        </p>
        {summary && !boardFresh && (
          <div className="mt-3">
            <LiveSummaryLine summary={summary} />
          </div>
        )}
        {booth ? (
          <>
            <p
              className={
                summary && !boardFresh
                  ? "mt-0.5 text-label text-ink-faint"
                  : "mt-3 text-caption font-medium text-ink-soft"
              }
            >
              {boothHeadline(booth, realNow)}
            </p>
            <div className="mt-3 rounded-card bg-inset px-4 py-1.5">
              <BoardList boards={booth.boards} />
            </div>
          </>
        ) : (
          <p className="mt-4 text-body text-ink-faint">
            The live board isn&apos;t available right now — check it directly
            at TDF.
          </p>
        )}
        <Attribution withDuffy={summary !== null} />
        <DemoClockNote />
      </div>
    </Sheet>
  );
}
