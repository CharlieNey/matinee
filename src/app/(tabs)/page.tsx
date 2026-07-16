import Link from "next/link";
import { Flame } from "lucide-react";
import { ListingBrowser } from "@/components/ListingBrowser";
import { Poster } from "@/components/Poster";
import { marketplaceListings, soldListings } from "@/lib/data";

function SellingFastShelf() {
  return (
    <section className="mt-6">
      <h2 className="flex items-center gap-2 text-heading">
        <Flame className="size-5 text-vermilion" strokeWidth={2} />
        Selling fast
      </h2>
      <div className="-mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {soldListings.map((listing) => (
          <Link
            key={listing.id}
            href={`/shows/${listing.show.slug}`}
            className="relative w-[124px] shrink-0 overflow-hidden rounded-card transition-transform duration-150 active:scale-[0.97]"
            aria-label={`${listing.show.title} — sold in ${listing.sold?.minutes} minutes`}
          >
            <Poster show={listing.show} className="w-full" />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-espresso/35 text-white">
              <span className="text-body font-bold">Sold</span>
              <span className="text-label">in {listing.sold?.minutes} min</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function MarketplacePage() {
  return (
    <main className="px-4 pt-6 web:mx-auto web:max-w-[1160px] web:px-6">
      <h1 className="text-display">Marketplace</h1>
      <SellingFastShelf />
      <div className="mt-7">
        <ListingBrowser listings={marketplaceListings} mode="shows" />
      </div>
    </main>
  );
}
