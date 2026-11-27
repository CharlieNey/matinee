"use client";

import { PlatformTips } from "@/components/PlatformTips";
import { ProgramRows } from "@/components/ProgramRows";
import { TktsShowRow } from "@/components/TktsBoard";
import { getProgramStatus, programsForShow } from "@/lib/programs";
import { closingLabel, Show } from "@/lib/shows";
import { useNow } from "@/lib/useNow";

export function ShowPrograms({
  show,
  answer,
}: {
  show: Show;
  /** The page's plain answer (showAnswer), rendered on the server. */
  answer: string;
}) {
  const now = useNow();
  const programs = programsForShow(show.slug);
  const closed = closingLabel(show);

  if (closed) {
    return (
      <section
        id="ways-to-save"
        className="mt-4 scroll-mt-20 px-4 web:px-6"
      >
        <div className="rule-double" aria-hidden />
        <h2 className="eyebrow mt-7">Ways to save</h2>
        <div className="mt-4 rounded-card bg-paper px-4 py-5">
          <p className="text-body font-semibold">This production has closed</p>
          <p className="mt-1 text-caption text-ink-soft">
            Its final performance was {closed}. Rush and lottery listings come
            down when a show closes.
          </p>
        </div>
      </section>
    );
  }

  if (programs.length === 0) {
    return (
      <section
        id="ways-to-save"
        className="mt-4 scroll-mt-20 px-4 web:px-6"
      >
        <div className="rule-double" aria-hidden />
        <h2 className="eyebrow mt-7">Ways to save</h2>
        <div className="mt-4 rounded-card bg-paper px-4 py-5">
          <p className="text-body font-semibold">No verified program listed</p>
          <p className="mt-1 text-caption text-ink-soft">
            We couldn&apos;t confirm a current rush or lottery offer for this show.
            Check the official box office before planning your visit.
          </p>
        </div>
        <TktsShowRow slug={show.slug} />
      </section>
    );
  }

  return (
    <section
      id="ways-to-save"
      className="mt-4 scroll-mt-20 px-4 web:px-6"
    >
      <div className="rule-double" aria-hidden />
      <div className="mt-7 flex items-baseline justify-between">
        <h2 className="eyebrow">Ways to save</h2>
        <span className="text-caption text-ink-soft">
          {programs.length} program{programs.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-2.5 text-caption leading-relaxed text-ink-soft web:max-w-[640px]">
        {answer}
      </p>
      <div className="mt-4 rounded-card bg-paper px-4 py-1.5">
        <ProgramRows
          show={show}
          entries={programs.map((program) => ({
            program,
            status: now ? getProgramStatus(now, program) : null,
          }))}
          now={now}
          defaultOpen
          flushTop
        />
      </div>
      <TktsShowRow slug={show.slug} />
      <PlatformTips programs={programs} labeled />
    </section>
  );
}
