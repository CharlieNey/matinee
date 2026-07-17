import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackHeader } from "@/components/BackHeader";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { InterestedButton } from "@/components/InterestedButton";
import { OfficialTicketsCard } from "@/components/OfficialTicketsCard";
import { Poster } from "@/components/Poster";
import { ShowPrograms } from "@/components/ShowPrograms";
import { FollowShowCard } from "@/components/FollowShowCard";
import { officialTicketsForShow } from "@/lib/officialTickets";
import {
  cheapestProgram,
  programKindLabel,
  programsForShow,
} from "@/lib/programs";
import { allShows, getShow } from "@/lib/shows";
import { allTheaters, TICKETER_LABELS } from "@/lib/theaters";

/** One program-page fact row: label, dot leader, value (DESIGN.md §13). */
function HouseFact({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-baseline text-caption">
      <span className="shrink-0 text-ink-soft">{label}</span>
      <span className="dot-leader" aria-hidden />
      <span className="truncate font-medium text-ink">{value}</span>
    </p>
  );
}

export function generateStaticParams() {
  return allShows().map((show) => ({ slug: show.slug }));
}

/** Shared show links carry the show's name and its cheapest way in. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const show = getShow(slug);
  if (!show) return {};
  const cheapest = cheapestProgram(slug);
  const description = cheapest
    ? `${programKindLabel(cheapest.kind)} from $${cheapest.price} — every verified way to see ${show.title} for less, and where the official box office is.`
    : `Where the official box office is for ${show.title}, and every verified way to pay less.`;
  // openGraph is shallow-merged and fully overwritten per segment, so
  // re-attach the shared card here — otherwise og:image (and the
  // twitter:image that falls back to it) drop off show links.
  return {
    title: show.title,
    description,
    openGraph: {
      title: show.title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

/**
 * The show page as an answer sheet (Phase 14): where the official box office
 * is, every verified way to see it cheap, and a follow CTA — never a checkout.
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
  // Broadway houses only — Off-Broadway venues aren't in the theater data,
  // so the house section simply doesn't render for them.
  const theater = allTheaters().find((t) => t.name === show.venue);

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
        <div className="mt-3 flex web:mt-4">
          <InterestedButton show={show} />
        </div>
        {officialTickets && (
          <OfficialTicketsCard show={show} ticketLink={officialTickets} />
        )}
        {hasPrograms && <FollowShowCard show={show} />}
      </div>

      <ShowPrograms show={show} />

      {/* The house (Phase 15): the program page's fact block — typeset
          straight on the ivory, no card. Data is the hand-curated theater
          record (owner/ticketer/capacity, DATA.md). */}
      {theater && (
        <section className="mt-9 px-4 web:px-6">
          <div className="rule-double" aria-hidden />
          <h2 className="eyebrow mt-7">The house</h2>
          <div className="mt-4 flex flex-col gap-2.5 web:max-w-[560px]">
            <HouseFact label="Theater" value={theater.name} />
            <HouseFact label="Operated by" value={theater.owner} />
            <HouseFact
              label="Box office"
              value={TICKETER_LABELS[theater.ticketer]}
            />
            <HouseFact
              label="Seats"
              value={theater.capacity.toLocaleString("en-US")}
            />
            <HouseFact label="Address" value={theater.address} />
          </div>
          <Link
            href="/district"
            className="mt-5 inline-block text-caption font-medium underline underline-offset-2 transition-opacity active:opacity-60"
          >
            See it on the District map
          </Link>
        </section>
      )}
    </main>
  );
}
