"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { EntryHeatmap } from "@/components/EntryHeatmap";
import { Poster } from "@/components/Poster";
import {
  LotteryEntry,
  onLotteryLogChange,
  readLotteryLog,
} from "@/lib/entries";
import { allPrograms, programKey, programKindLabel } from "@/lib/programs";
import { getShow } from "@/lib/shows";
import { useNow } from "@/lib/useNow";

/** The lottery record (Phase 14): the "I entered" log as a stats view —
 *  entries, wins, streak, saved vs face. Numbers stay quiet ink on paper;
 *  never a colored chip (DESIGN.md §6). */
export function RecordTab() {
  const now = useNow();
  const [log, setLog] = useState<LotteryEntry[]>([]);

  useEffect(() => {
    const sync = () => setLog(readLotteryLog());
    sync();
    return onLotteryLogChange(sync);
  }, []);

  if (log.length === 0) {
    return (
      <div className="pt-10">
        <EmptyState
          text="Lotteries you tap “I entered” on are counted here."
          actionLabel="See today's windows"
          actionHref="/rush"
        />
      </div>
    );
  }

  const programByKey = new Map(
    allPrograms().map((program) => [programKey(program), program]),
  );
  const wins = log.filter((e) => e.won);
  const saved = wins.reduce((sum, entry) => {
    const program = programByKey.get(entry.key);
    if (!program) return sum;
    const face = getShow(program.showSlug)?.faceValue ?? 0;
    return sum + Math.max(0, face - program.price);
  }, 0);
  const recentWins = [...wins]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);

  return (
    <div className="flex flex-col gap-7 pb-8 pt-6">
      {now && <EntryHeatmap log={log} now={now} />}

      {recentWins.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <p className="eyebrow">Wins · {wins.length}</p>
            {saved > 0 && (
              <p className="text-caption text-ink-soft">
                saved <b className="font-semibold text-ink">${saved}</b> vs
                face
              </p>
            )}
          </div>
          <div className="mt-2.5 flex flex-col gap-2.5">
            {recentWins.map((entry) => {
              const program = programByKey.get(entry.key);
              const show = program ? getShow(program.showSlug) : undefined;
              if (!program || !show) return null;
              const savedHere = Math.max(0, show.faceValue - program.price);
              return (
                <Link
                  key={`${entry.key}-${entry.day}`}
                  href={`/shows/${show.slug}`}
                  className="flex items-center gap-3.5 rounded-card bg-paper p-3.5 transition-transform duration-150 active:scale-[0.99]"
                >
                  <Poster show={show} className="w-14 rounded-thumb" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold">
                      {show.title}
                    </p>
                    <p className="mt-0.5 text-caption text-ink-soft">
                      {programKindLabel(program.kind)} · ${program.price} ·{" "}
                      {new Date(entry.at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  {savedHere > 0 && (
                    <p className="text-body font-semibold">
                      saved ${savedHere}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
