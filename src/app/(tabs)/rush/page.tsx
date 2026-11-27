import Link from "next/link";
import { RushFeed } from "@/components/RushFeed";
import { formatCheckedDate } from "@/lib/contact";
import { allPrograms, programsOldestVerified } from "@/lib/programs";
import { runningShows } from "@/lib/shows";

export const metadata = {
  title: "Rush & Lottery",
  description:
    "Every official rush, lottery, and standing-room program, sorted by what you can enter right now.",
  alternates: { canonical: "/rush" },
};

export default function RushPage() {
  // Phase 12: the catalog spans Broadway and Off-Broadway, so the checked
  // count does too — it must never read smaller than the programs count.
  const productionCount = runningShows().length;
  const programs = allPrograms();
  const programShowCount = new Set(programs.map((program) => program.showSlug))
    .size;
  const unverifiedCount = programs.filter(
    (program) => program.unverified !== undefined,
  ).length;

  return (
    <main className="px-4 pb-6 pt-6 web:mx-auto web:max-w-[1160px] web:px-6">
      <h1 className="text-display">Rush &amp; Lottery</h1>
      <p className="mt-2 text-caption text-ink-soft">
        {/* The oldest check, never the newest: quoting the freshest row would
            overstate how fresh the rest are. */}
        Checked since {formatCheckedDate(programsOldestVerified())}
        {unverifiedCount > 0 && ` · ${unverifiedCount} unverified`} ·{" "}
        <Link
          href="/today"
          className="font-semibold text-ink underline underline-offset-4 transition-opacity active:opacity-60"
        >
          Today&apos;s checklist
        </Link>
      </p>
      <RushFeed />
      <p className="mt-10 text-caption text-ink-faint">
        {productionCount} productions checked; {programShowCount} have a rush,
        lottery or standing room.
      </p>
    </main>
  );
}
