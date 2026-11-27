"use client";

import { PlatformTips } from "@/components/PlatformTips";
import { ProgramHead } from "@/components/ProgramHead";
import { ProgramRows } from "@/components/ProgramRows";
import { TktsShowRow } from "@/components/TktsBoard";
import { getProgramStatus, programsForShow } from "@/lib/programs";
import { closingLabel, Show } from "@/lib/shows";
import { useNow } from "@/lib/useNow";

function SectionHead({ detail }: { detail?: string }) {
  return <ProgramHead title="Ways to save" detail={detail} />;
}

export function ShowPrograms({ show }: { show: Show }) {
  const now = useNow();
  const programs = programsForShow(show.slug);
  const closed = closingLabel(show);

  return (
    <section
      id="ways-to-save"
      className="mt-8 scroll-mt-20 px-4 web:max-w-[720px] web:px-6"
    >
      {closed ? (
        <>
          <SectionHead />
          <p className="mt-3 text-body text-ink-soft">
            This production closed on {closed}. Its rush and lottery listings
            came down with it.
          </p>
        </>
      ) : programs.length === 0 ? (
        <>
          <SectionHead />
          <p className="mt-3 text-body text-ink-soft">
            No rush or lottery we could confirm. Ask at the box office.
          </p>
          <TktsShowRow slug={show.slug} />
        </>
      ) : (
        <>
          <SectionHead
            detail={`${programs.length} way${programs.length === 1 ? "" : "s"} in`}
          />
          <ProgramRows
            show={show}
            entries={programs.map((program) => ({
              program,
              status: now ? getProgramStatus(now, program) : null,
            }))}
            now={now}
            defaultOpen="first"
            flushTop
          />
          <TktsShowRow slug={show.slug} />
          <PlatformTips programs={programs} labeled />
        </>
      )}
    </section>
  );
}
