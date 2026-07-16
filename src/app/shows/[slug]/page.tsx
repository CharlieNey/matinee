import { notFound } from "next/navigation";
import { Flame } from "lucide-react";
import { BackHeader } from "@/components/BackHeader";
import { ListingBrowser } from "@/components/ListingBrowser";
import { ListingCard } from "@/components/ListingCard";
import { OfficialTicketsCard } from "@/components/OfficialTicketsCard";
import { ShowPrograms } from "@/components/ShowPrograms";
import { Listing, marketplaceListings, soldListings } from "@/lib/data";
import { officialTicketsForShow } from "@/lib/officialTickets";
import { allShows, getShow } from "@/lib/shows";

export function generateStaticParams() {
  return allShows().map((show) => ({ slug: show.slug }));
}

function UrgencyStrip({ sold }: { sold: Listing[] }) {
  if (sold.length === 0) return null;
  const prices = sold.map((l) => l.price).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  return (
    <div className="mb-4 flex items-center gap-2.5 rounded-card bg-paper px-4 py-3">
      <Flame className="size-5 shrink-0 text-vermilion" strokeWidth={2} />
      <p className="text-caption text-ink-soft">
        <b className="font-semibold text-ink">
          {sold.length} sold today
        </b>{" "}
        · median ${median} · fastest in{" "}
        {Math.min(...sold.map((l) => l.sold?.minutes ?? 99))} minutes
      </p>
    </div>
  );
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
    <main className="pb-10">
      <div className="px-4">
        <BackHeader title={show.title} />
        <div className="mt-2">
          <UrgencyStrip sold={soldForShow} />
        </div>
        {officialTickets && (
          <OfficialTicketsCard show={show} ticketLink={officialTickets} />
        )}
        <div className="min-h-[48dvh]">
          <ListingBrowser listings={active} show={show} />
        </div>
      </div>

      <ShowPrograms show={show} />

      <section className="mt-6 border-t border-line px-4 pt-7">
        <h2 className="text-center text-[20px] font-semibold text-ink-soft">
          Sold Listings
        </h2>
        <div className="mt-5 grid grid-cols-2 items-start gap-3">
          {soldListings.map((listing, i) => (
            <div
              key={listing.id}
              className="card-enter"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <ListingCard listing={listing} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
