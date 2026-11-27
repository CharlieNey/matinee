import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackHeader } from "@/components/BackHeader";
import { InterestedButton } from "@/components/InterestedButton";
import { OfficialTicketsCard } from "@/components/OfficialTicketsCard";
import { Poster } from "@/components/Poster";
import { ShowPrograms } from "@/components/ShowPrograms";
import { FollowShowCard } from "@/components/FollowShowCard";
import { ReportLink } from "@/components/ReportLink";
import { SITE_URL } from "@/lib/contact";
import { officialTicketsForShow } from "@/lib/officialTickets";
import { programsForShow } from "@/lib/programs";
import { showAnswer, showSearchTitle } from "@/lib/showAnswer";
import {
  allShows,
  closingLabel,
  finalPerformance,
  getShow,
} from "@/lib/shows";
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

/**
 * Each show page answers a search: its title names what the show offers
 * ("Wicked lottery and rush"), and its description is the page's own answer
 * sentence, built from the checked rows. One canonical URL per show.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const show = getShow(slug);
  if (!show) return { title: "Show not found" };
  const programs = programsForShow(slug);
  const title = showSearchTitle(show, programs);
  const description = showAnswer(show, programs);
  const canonical = `/shows/${slug}`;
  // openGraph is shallow-merged and fully overwritten per segment, so
  // re-attach the shared card here — otherwise og:image (and the
  // twitter:image that falls back to it) drop off show links.
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
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

  const closed = closingLabel(show);
  const final = finalPerformance(show);
  const officialTickets = closed ? null : officialTicketsForShow(slug);
  const programs = programsForShow(slug);
  const hasPrograms = programs.length > 0;
  // Structured data only where it's exact: a breadcrumb. An Event or Offer
  // would need performance dates and times, which Matinee doesn't publish.
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Matinee", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: show.title,
        item: `${SITE_URL}/shows/${slug}`,
      },
    ],
  };
  // Broadway houses only — Off-Broadway venues aren't in the theater data,
  // so the house section simply doesn't render for them.
  const theater = allTheaters().find((t) => t.name === show.venue);

  return (
    <main className="pb-10 web:mx-auto web:max-w-[1160px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c"),
        }}
      />
      <div className="px-4 web:px-6">
        <div className="web:hidden">
          <BackHeader />
        </div>
        {/* The title block of a program page: poster, title, house. No
            backdrop card; the page itself is the paper. */}
        <div className="mt-2 flex items-start gap-4 web:mt-6 web:gap-8">
          <Poster
            show={show}
            className="w-[88px] shrink-0 rounded-[4px] web:w-[200px]"
            name={`poster-${show.slug}`}
            sizes="(min-width: 1024px) 200px, 88px"
            priority
          />
          <div className="min-w-0">
            <h1 className="text-display leading-[1.05] web:text-[48px]">
              {show.title}
            </h1>
            <p className="mt-2 text-caption text-ink-soft web:text-body">
              <Link
                href="/district"
                className="underline underline-offset-2 transition-opacity active:opacity-60"
              >
                {show.venue}
              </Link>
              {closed
                ? ` · Closed ${closed}`
                : final
                  ? ` · Until ${final.label}`
                  : ""}
              {!closed && !officialTickets && show.faceValue > 0
                ? ` · $${show.faceValue} at the box office`
                : ""}
            </p>
            <div className="mt-2">
              <InterestedButton show={show} />
            </div>
          </div>
        </div>
      </div>

      {/* What people open this page for comes first: the ways in. Following
          and full price follow it, quieter. */}
      <ShowPrograms show={show} />

      {(hasPrograms || officialTickets) && (
        <div className="mt-6 flex flex-col border-b border-line px-4 web:mx-6 web:max-w-[720px] web:px-0">
          {hasPrograms && <FollowShowCard show={show} />}
          {officialTickets && (
            <OfficialTicketsCard show={show} ticketLink={officialTickets} />
          )}
        </div>
      )}

      {/* The house (Phase 15): the program page's fact block — typeset
          straight on the ivory, no card. Data is the hand-curated theater
          record (owner/ticketer/capacity, DATA.md). */}
      {theater && (
        <section className="mt-9 px-4 web:px-6">
          <h2 className="border-b-2 border-ink pb-2 font-display text-[24px] italic leading-none">
            The house
          </h2>
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

      <p className="mt-9 px-4 text-caption text-ink-faint web:px-6">
        Something out of date?{" "}
        <ReportLink show={show}>Report a wrong fact</ReportLink>
      </p>
    </main>
  );
}
