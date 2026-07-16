"use client";

import { ProgramCard } from "@/components/ProgramCard";
import { getProgramStatus, programsForShow } from "@/lib/programs";
import { Show } from "@/lib/shows";
import { useNow } from "@/lib/useNow";

export function ShowPrograms({ show }: { show: Show }) {
  const now = useNow();
  const programs = programsForShow(show.slug);

  if (programs.length === 0) {
    return (
      <section className="border-t border-line px-4 pt-7">
        <h2 className="text-heading">Ways to save</h2>
        <div className="mt-4 rounded-card bg-paper px-4 py-5">
          <p className="text-body font-semibold">No verified program listed</p>
          <p className="mt-1 text-caption text-ink-soft">
            We couldn&apos;t confirm a current rush or lottery offer for this show.
            Check the official box office before planning your visit.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-line px-4 pt-7">
      <div className="flex items-baseline justify-between">
        <h2 className="text-heading">Ways to save</h2>
        <span className="text-caption text-ink-soft">
          {programs.length} program{programs.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-1 text-caption text-ink-soft">
        Official rush and lottery options, updated with live entry windows.
      </p>
      <div className="mt-4 space-y-3">
        {programs.map((program) => (
          <ProgramCard
            key={`${program.kind}-${program.platform}`}
            program={program}
            show={show}
            status={now ? getProgramStatus(now, program) : null}
            now={now}
          />
        ))}
      </div>
    </section>
  );
}
