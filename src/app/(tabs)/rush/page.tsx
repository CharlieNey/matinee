import { BackHeader } from "@/components/BackHeader";
import { RushFeed } from "@/components/RushFeed";
import { allPrograms } from "@/lib/programs";
import { currentBroadwayShows } from "@/lib/shows";

export default function RushPage() {
  const productionCount = currentBroadwayShows().length;
  const programShowCount = new Set(allPrograms().map((program) => program.showSlug))
    .size;

  return (
    <main className="pb-6 web:mx-auto web:max-w-[1160px]">
      <BackHeader title="Rush & Lottery" />
      <div className="px-4">
        <p className="mt-2 text-body text-ink-soft">
          The cheapest official ways in, organized around what you can enter
          right now.
        </p>
        <p className="mt-2 text-caption text-ink-faint">
          {productionCount} Broadway productions checked · {programShowCount}{" "}
          with programs · verified July 13
        </p>
        <RushFeed />
      </div>
    </main>
  );
}
