"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import { FilterChip } from "@/components/FilterChip";
import { enteredKeysOn, onLotteryLogChange, toggleLotteryEntry } from "@/lib/entries";
import {
  etDayKey,
  Program,
  ProgramPlatform,
  programKey,
  programKindLabel,
  programPlatformLabel,
} from "@/lib/programs";
import { nyClock } from "@/lib/clock";
import { getShow } from "@/lib/shows";
import { useApp } from "@/lib/store";
import {
  onRushDoneChange,
  readRushDone,
  todaysWindows,
  toggleRushDone,
  TodayWindow,
} from "@/lib/today";
import { useNow } from "@/lib/useNow";

/** "the show's site" reads better mid-sentence than "Official site". */
const where = (platform: ProgramPlatform, label: string) =>
  platform === "official-site" ? "the show's site" : label;

const isLottery = (program: Program) =>
  program.kind === "digital-lottery" || program.kind === "in-person-lottery";

function when(window: TodayWindow, now: Date): string {
  if (window.opensAt > now) return `opens ${nyClock(window.opensAt, now)}`;
  if (window.whileSuppliesLast) return "while they last";
  return `closes ${nyClock(window.closesAt, now)}`;
}

/** Everything ticked today: logged lottery entries plus tried rushes. */
function useTicks(day: string | null): Set<string> {
  const [ticks, setTicks] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!day) return;
    const sync = () =>
      setTicks(new Set([...enteredKeysOn(day), ...readRushDone(day)]));
    sync();
    const offLog = onLotteryLogChange(sync);
    const offRush = onRushDoneChange(sync);
    return () => {
      offLog();
      offRush();
    };
  }, [day]);
  return ticks;
}

function Row({
  program,
  detail,
  ticked,
  onToggle,
}: {
  program: Program;
  detail: string;
  ticked: boolean;
  onToggle: () => void;
}) {
  const show = getShow(program.showSlug);
  const platform = programPlatformLabel(program.platform);
  const what = `${program.name ?? programKindLabel(program.kind)} · $${program.price}`;
  const verb = isLottery(program) ? "Entered" : "Done";
  return (
    <li className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
      <a
        href={program.entryUrl}
        target="_blank"
        rel="noreferrer"
        data-seller-link="today"
        data-show={program.showSlug}
        data-platform={program.platform}
        className={`min-w-0 flex-1 transition-opacity active:opacity-60 ${ticked ? "opacity-55" : ""}`}
      >
        <span className="block truncate text-body font-semibold">
          {show?.title ?? program.showSlug}
        </span>
        <span className="mt-0.5 block truncate text-caption text-ink-soft">
          {what} · {detail}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-caption font-medium text-ink underline underline-offset-2">
          {program.platform === "box-office"
            ? "Find the box office"
            : `${isLottery(program) ? "Enter on" : "Open"} ${where(program.platform, platform)}`}
          <ExternalLink className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </span>
      </a>
      <button
        type="button"
        aria-pressed={ticked}
        aria-label={`${verb}: ${show?.title ?? program.showSlug} ${programKindLabel(program.kind).toLowerCase()}`}
        onClick={onToggle}
        className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-[0.94] ${
          ticked
            ? "bg-sage text-sage-ink"
            : "border-[1.5px] border-ink-faint bg-paper text-transparent"
        }`}
      >
        {/* Unticked is an empty ring: a grey check read as already done. */}
        <Check className="size-5" strokeWidth={2.6} aria-hidden />
      </button>
    </li>
  );
}

function Section({
  title,
  count,
  note,
  children,
}: {
  title: string;
  count: number;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="eyebrow">{title}</h2>
        <span className="text-caption text-ink-soft">{count}</span>
      </div>
      {note && <p className="mt-1.5 text-caption text-ink-soft">{note}</p>}
      <ul className="mt-3 rounded-card bg-paper px-4">{children}</ul>
    </section>
  );
}

const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  month: "long",
  day: "numeric",
});

/**
 * Today's to-do list of lotteries and rush, each linked to its official
 * entry page. The tick is the visitor's own note, kept on this device for
 * today only. Matinee never enters anything for anyone.
 */
export function TodayEntries() {
  const now = useNow();
  const day = now ? etDayKey(now) : null;
  const ticks = useTicks(day);
  const { follows } = useApp();
  const [followedOnly, setFollowedOnly] = useState(false);
  const followed = useMemo(
    () => new Set(follows.map((follow) => follow.show.slug)),
    [follows],
  );

  const list = useMemo(() => (now ? todaysWindows(now) : null), [now]);

  if (!now || !day || !list) {
    return (
      <p className="mt-8 min-h-40 text-body text-ink-faint" aria-live="polite">
        Checking today&apos;s windows…
      </p>
    );
  }

  const keep = (program: Program) =>
    !followedOnly || followed.has(program.showSlug);
  const open = list.open.filter((w) => keep(w.program));
  const later = list.later.filter((w) => keep(w.program));
  const unverified = list.unverified.filter(keep);
  const actionable = [...open, ...later];
  // Lotteries are the checklist; rush (mostly walk-up) follows on its own,
  // in the order its windows open.
  const openLotteries = open.filter((w) => isLottery(w.program));
  const laterLotteries = later.filter((w) => isLottery(w.program));
  const rush = actionable
    .filter((w) => !isLottery(w.program))
    .sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime());
  const done = actionable.filter((w) => ticks.has(programKey(w.program))).length;

  const toggle = (program: Program) => {
    const key = programKey(program);
    if (isLottery(program)) toggleLotteryEntry(key, day);
    else toggleRushDone(key, day);
  };
  const row = (program: Program, detail: string) => (
    <Row
      key={programKey(program)}
      program={program}
      detail={detail}
      ticked={ticks.has(programKey(program))}
      onToggle={() => toggle(program)}
    />
  );

  return (
    <>
      <p className="mt-2 text-caption text-ink-faint">
        {dayFormat.format(now)} ·{" "}
        <b className="font-semibold text-ink">
          {done} of {actionable.length}
        </b>{" "}
        done
      </p>
      {follows.length > 0 && (
        <div className="mt-5 flex">
          <FilterChip
            icon={null}
            label="Shows I follow"
            chevron={false}
            active={followedOnly}
            onClick={() => setFollowedOnly((v) => !v)}
          />
        </div>
      )}

      {openLotteries.length > 0 && (
        <Section title="Lotteries open now" count={openLotteries.length}>
          {openLotteries.map((w) => row(w.program, when(w, now)))}
        </Section>
      )}
      {laterLotteries.length > 0 && (
        <Section title="Lotteries opening later" count={laterLotteries.length}>
          {laterLotteries.map((w) => row(w.program, when(w, now)))}
        </Section>
      )}
      {rush.length > 0 && (
        <Section title="Rush today" count={rush.length}>
          {rush.map((w) => row(w.program, when(w, now)))}
        </Section>
      )}
      {actionable.length === 0 && (
        <p className="mt-8 rounded-card bg-paper px-4 py-5 text-body text-ink-soft">
          {followedOnly
            ? "Nothing from the shows you follow is open or opening today."
            : "Nothing else opens today. Tomorrow's lotteries are on the "}
          {!followedOnly && (
            <Link href="/rush" className="font-semibold text-ink underline underline-offset-2">
              Rush board
            </Link>
          )}
          {!followedOnly && "."}
        </p>
      )}
      {unverified.length > 0 && (
        <Section
          title="Unverified"
          count={unverified.length}
          note="We couldn't confirm these with the show's own site, so their times aren't shown. Check the entry page first."
        >
          {unverified.map((program) => row(program, "times unconfirmed"))}
        </Section>
      )}
    </>
  );
}
