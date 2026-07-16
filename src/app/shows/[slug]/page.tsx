import { notFound } from "next/navigation";
import { BackHeader } from "@/components/BackHeader";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { Poster } from "@/components/Poster";
import { ListingBrowser } from "@/components/ListingBrowser";
import { OfficialTicketsCard } from "@/components/OfficialTicketsCard";
import { ShowPrograms } from "@/components/ShowPrograms";
import { TicketStub } from "@/components/TicketStub";
import { UrgencyStrip } from "@/components/UrgencyStrip";
import { marketplaceListings, soldListings } from "@/lib/data";
import { officialTicketsForShow } from "@/lib/officialTickets";
import { allShows, getShow } from "@/lib/shows";

export function generateStaticParams() {
  return allShows().map((show) => ({ slug: show.slug }));
}

export default async function ShowListingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const show = getShow(slug);
  if (!show) notFound();

  const active = marketplaceListings.filter((l) => l.show.slug === slug);
  const soldForShow = soldListings.filter((l) => l.show.slug === slug);
  const officialTickets = officialTicketsForShow(slug);

  return (
    <main className="pb-10 web:mx-auto web:max-w-[1160px]">
      <div className="px-4 web:px-6">
        {/* Mobile: back header carries the title. Web: poster hero does. */}
        <div className="web:hidden">
          <BackHeader title={show.title} />
        </div>
        <div className="relative mt-4 hidden overflow-hidden rounded-card web:block">
          <HeroBackdrop show={show} />
          <div className="relative flex items-end gap-8 p-8">
            <Poster
              show={show}
              className="w-[230px] shrink-0 rounded-card shadow-float"
              name={`poster-${show.slug}`}
            />
            <div className="pb-1">
              <p className="text-caption font-medium text-ink-soft">
                {show.tier} · {show.genre} · {show.venue}
              </p>
              <h1 className="mt-1.5 text-display">{show.title}</h1>
              <p className="mt-3 text-body text-ink-soft">
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
        {soldForShow.length > 0 && (
          <div className="mt-2">
            <UrgencyStrip
              count={soldForShow.length}
              median={
                soldForShow
                  .map((l) => l.price)
                  .sort((a, b) => a - b)[Math.floor(soldForShow.length / 2)]
              }
              fastest={Math.min(...soldForShow.map((l) => l.sold?.minutes ?? 99))}
            />
          </div>
        )}
        {officialTickets && (
          <OfficialTicketsCard show={show} ticketLink={officialTickets} />
        )}
        <div className="min-h-[30dvh]">
          <ListingBrowser listings={active} show={show} />
        </div>
      </div>

      <ShowPrograms show={show} />

      {soldForShow.length > 0 && (
        <section className="mt-6 border-t border-line px-4 pt-7 web:px-6">
          <h2 className="text-center text-[20px] font-semibold text-ink-soft">
            Sold Listings
          </h2>
          <div className="mt-5 grid grid-cols-1 items-start gap-3 web:md:grid-cols-2 web:lg:grid-cols-3">
            {soldForShow.map((listing, i) => (
              <div
                key={listing.id}
                className="card-enter"
                style={{ "--stagger": `${i * 40}ms` } as React.CSSProperties}
              >
                <TicketStub listing={listing} />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
