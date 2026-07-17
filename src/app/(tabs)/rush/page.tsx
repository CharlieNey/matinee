import { RushFeed } from "@/components/RushFeed";
import { allPrograms } from "@/lib/programs";
import { allShows } from "@/lib/shows";

export default function RushPage() {
  // Phase 12: the catalog spans Broadway and Off-Broadway, so the checked
  // count does too — it must never read smaller than the programs count.
  const productionCount = allShows().filter(
    (show) => show.currentlyRunning !== false,
  ).length;
  const programShowCount = new Set(allPrograms().map((program) => program.showSlug))
    .size;

  return (
    <main className="px-4 pb-6 pt-6 web:mx-auto web:max-w-[1160px] web:px-6">
      <h1 className="text-display">Rush &amp; Lottery</h1>
      <p className="mt-2 text-body text-ink-soft">
        The cheapest official ways in, organized around what you can enter
        right now.
      </p>
      <p className="mt-2 text-caption text-ink-faint">
        {productionCount} productions checked · {programShowCount} with
        programs · verified July 13
      </p>
      <RushFeed />
    </main>
  );
}
