"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { Poster } from "@/components/Poster";
import { RushBanner } from "@/components/RushBanner";
import { Sheet } from "@/components/Sheet";
import { ShowPicker } from "@/components/ShowPicker";
import { TopTenShelf } from "@/components/TopTenShelf";
import { collection } from "@/lib/data";
import { useApp } from "@/lib/store";
import { allShows, Show } from "@/lib/shows";

function PosterShelf({ shows }: { shows: Show[] }) {
  return (
    <div className="-mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {shows.map((show) => (
        <Link
          key={show.slug}
          href={`/shows/${show.slug}`}
          className="w-[104px] shrink-0 transition-transform duration-150 active:scale-[0.96]"
          aria-label={`${show.title} tickets`}
        >
          <Poster show={show} className="w-full rounded-thumb" />
          <p className="mt-1.5 truncate text-caption font-medium text-ink">
            {show.title}
          </p>
        </Link>
      ))}
    </div>
  );
}

function SectionHead({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="mt-8 flex items-baseline justify-between">
      <h2 className="text-heading">{title}</h2>
      {detail && <span className="text-caption text-ink-soft">{detail}</span>}
    </div>
  );
}

export default function DiscoverPage() {
  const { savedShows, diary, alerts } = useApp();
  const router = useRouter();
  const [logOpen, setLogOpen] = useState(false);
  const [logShow, setLogShow] = useState<Show | null>(null);

  const attended = useMemo(() => {
    const seen = new Set<string>();
    const list: Show[] = [];
    for (const s of [...diary.map((d) => d.show), ...collection.attendedRecent]) {
      if (!seen.has(s.slug)) {
        seen.add(s.slug);
        list.push(s);
      }
    }
    return list;
  }, [diary]);

  const forYou = useMemo(() => {
    const taken = new Set([
      ...savedShows.map((s) => s.slug),
      ...attended.map((s) => s.slug),
      ...alerts.map((a) => a.show.slug),
    ]);
    return allShows().filter((s) => !taken.has(s.slug)).slice(0, 6);
  }, [savedShows, attended, alerts]);

  const reason = savedShows[0] ?? attended[0];

  return (
    <main className="px-4 pt-6">
      <h1 className="text-display">Discover</h1>

      <RushBanner />

      <div className="mt-6">
        <TopTenShelf />
      </div>

      <SectionHead title="Interested" detail={`${savedShows.length} saved`} />
      {savedShows.length > 0 ? (
        <PosterShelf shows={savedShows} />
      ) : (
        <p className="mt-3 text-body text-ink-faint">
          Bookmark shows and they&apos;ll collect here.
        </p>
      )}

      <SectionHead
        title="Attended"
        detail={`${collection.attended.count + diary.length} logged`}
      />
      <PosterShelf shows={attended} />

      <SectionHead title="For you" />
      {reason && (
        <p className="mt-1 text-caption text-ink-soft">
          Because you {savedShows[0] ? "saved" : "attended"} {reason.title}
        </p>
      )}
      <PosterShelf shows={forYou} />

      <button
        type="button"
        onClick={() => {
          setLogShow(null);
          setLogOpen(true);
        }}
        className="mt-9 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform] duration-150 active:scale-[0.98] active:bg-vermilion-pressed"
      >
        <NotebookPen className="size-5" strokeWidth={2} />
        Log a show
      </button>

      <Sheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="Which show did you see?"
      >
        <div className="mt-5">
          <ShowPicker
            shows={allShows()}
            selected={logShow}
            onSelect={(show) => {
              setLogShow(show);
              setLogOpen(false);
              router.push(`/log/${show.slug}`);
            }}
          />
        </div>
      </Sheet>
    </main>
  );
}
