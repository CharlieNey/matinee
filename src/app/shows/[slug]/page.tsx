import Link from "next/link";
import { notFound } from "next/navigation";
import { BackHeader } from "@/components/BackHeader";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { OfficialTicketsCard } from "@/components/OfficialTicketsCard";
import { Poster } from "@/components/Poster";
import { ShowPrograms } from "@/components/ShowPrograms";
import { WatchShowCard } from "@/components/WatchShowCard";
import { officialTicketsForShow } from "@/lib/officialTickets";
import { programsForShow } from "@/lib/programs";
import { allShows, getShow } from "@/lib/shows";

export function generateStaticParams() {
  return allShows().map((show) => ({ slug: show.slug }));
}

/**
 * The show page as an answer sheet (Phase 14): where the official box office
 * is, every verified way to see it cheap, and a watch CTA — never a checkout.
 */
export default async function ShowPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const show = getShow(slug);
  if (!show) notFound();

  const officialTickets = officialTicketsForShow(slug);
  const hasPrograms = programsForShow(slug).length > 0;

  return (
    <main className="pb-10 web:mx-auto web:max-w-[1160px]">
      <div className="px-4 web:px-6">
        <div className="web:hidden">
          <BackHeader />
        </div>
        <div className="relative mt-1 overflow-hidden rounded-card web:mt-4">
          <HeroBackdrop show={show} />
          <div className="relative flex items-end gap-4 p-4 web:gap-8 web:p-8">
            <Poster
              show={show}
              className="w-[104px] shrink-0 rounded-thumb shadow-float web:w-[230px] web:rounded-card"
              name={`poster-${show.slug}`}
            />
            <div className="min-w-0 pb-0.5 web:pb-1">
              <p className="truncate text-label font-medium text-ink-soft web:text-caption">
                {show.tier} · {show.genre} ·{" "}
                <Link
                  href="/district"
                  className="underline underline-offset-2 transition-opacity active:opacity-60"
                >
                  {show.venue}
                </Link>
              </p>
              <h1 className="mt-1 text-title web:mt-1.5 web:text-display">
                {show.title}
              </h1>
              <p className="mt-1.5 text-caption text-ink-soft web:mt-3 web:text-body">
                {show.faceValue > 0 ? (
                  <>
                    Face value{" "}
                    <b className="font-semibold text-ink">${show.faceValue}</b>{" "}
                    at the box office
                  </>
                ) : (
                  <b className="font-semibold text-ink">
                    Free — every ticket, every night
                  </b>
                )}
              </p>
            </div>
          </div>
        </div>
        {officialTickets && (
          <OfficialTicketsCard show={show} ticketLink={officialTickets} />
        )}
        {hasPrograms && <WatchShowCard show={show} />}
      </div>

      <ShowPrograms show={show} />
    </main>
  );
}
