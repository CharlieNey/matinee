import Link from "next/link";
import { Listing } from "@/lib/data";
import { Poster } from "./Poster";

function SellerAvatar({ initial, color }: { initial: string; color: string }) {
  return (
    <span
      className="flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
      style={{ background: color }}
    >
      {initial}
    </span>
  );
}

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/tickets/${listing.id}`}
      className="block overflow-hidden rounded-card bg-paper shadow-float transition-transform duration-150 active:scale-[0.98]"
      aria-label={`${listing.show.title}, ${listing.seat}, $${listing.price} each`}
    >
      <div className="relative">
        <Poster show={listing.show} className="w-full" />
        {listing.sold && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-espresso/35 text-white">
            <span className="text-title">Sold</span>
            <span className="text-body">in {listing.sold.minutes} minutes</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate text-heading">{listing.show.title}</h3>
        <p className="mt-0.5 truncate text-body text-ink-soft">
          {listing.seat}
        </p>
        <p className="mt-2 flex items-baseline gap-1.5">
          <span className="text-[24px] font-bold leading-none tracking-tight">
            ${listing.price}
          </span>
          <span className="text-caption text-ink-soft">each</span>
          {!listing.sold && listing.price < listing.show.faceValue && (
            <span className="ml-auto self-center rounded-md bg-sage px-1.5 py-0.5 text-label font-semibold text-sage-ink">
              Below face
            </span>
          )}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <SellerAvatar {...listing.seller} />
          <span className="text-caption text-ink-soft">
            {listing.postedAgo}
          </span>
        </div>
      </div>
    </Link>
  );
}
