import { RushFeed } from "@/components/RushFeed";
import { formatCheckedRange } from "@/lib/contact";
import {
  allPrograms,
  programsLastVerified,
  programsOldestVerified,
} from "@/lib/programs";
import { runningShows } from "@/lib/shows";

export const metadata = {
  title: "Rush & Lottery",
  description:
    "Every official rush, lottery, and standing-room program, sorted by what you can enter right now.",
};

export default function RushPage() {
  // Phase 12: the catalog spans Broadway and Off-Broadway, so the checked
  // count does too — it must never read smaller than the programs count.
  const productionCount = runningShows().length;
  const programShowCount = new Set(allPrograms().map((program) => program.showSlug))
    .size;

  return (
    <main className="px-4 pb-6 pt-6 web:mx-auto web:max-w-[1160px] web:px-6">
      <h1 className="text-display">Rush &amp; Lottery</h1>
      <p className="mt-2 text-caption text-ink-faint">
        {productionCount} productions checked · {programShowCount} with
        programs · verified{" "}
        {/* Oldest to newest: quoting only the newest date would overstate
            how fresh the rows that couldn't be re-checked are. */}
        {formatCheckedRange(programsOldestVerified(), programsLastVerified())}
      </p>
      <RushFeed />
    </main>
  );
}
