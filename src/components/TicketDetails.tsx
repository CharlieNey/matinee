"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  HandCoins,
  MoreHorizontal,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { Poster } from "@/components/Poster";
import { Sheet } from "@/components/Sheet";
import { Stepper } from "@/components/Stepper";
import { useToast } from "@/components/Toast";
import { Listing, marketplaceListings, soldListings } from "@/lib/data";
import { useApp } from "@/lib/store";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function localDayNumber(date: Date): number {
  const parts = Object.fromEntries(
    dayFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return Date.UTC(parts.year, parts.month - 1, parts.day) / (24 * 60 * 60 * 1000);
}

function performanceLabel(listing: Listing) {
  if (!listing.performanceAt) {
    return { badge: listing.when, date: listing.when };
  }

  const performance = new Date(listing.performanceAt);
  const now = new Date();
  const date = dateTimeFormatter.format(performance);
  const diff = localDayNumber(performance) - localDayNumber(now);
  if (diff === 0) return { badge: "Tonight", date };
  return {
    badge: diff > 0 && diff < 7 ? `In ${diff} day${diff === 1 ? "" : "s"}` : listing.when,
    date,
  };
}

function FactRow({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-[116px_1fr] gap-3 border-t border-line py-4 ${className}`}>
      <span className="text-body text-ink-soft">{label}</span>
      <div className="min-w-0 text-right text-body text-ink">{children}</div>
    </div>
  );
}

function SellerAvatar({ listing }: { listing: Listing }) {
  return (
    <span
      className="flex size-12 shrink-0 items-center justify-center rounded-full text-body font-bold text-white"
      style={{ background: listing.seller.color }}
      aria-hidden="true"
    >
      {listing.seller.initial}
    </span>
  );
}

function ProofThumbnail({ listing }: { listing: Listing }) {
  return (
    <span
      className="relative block h-[54px] w-[42px] overflow-hidden rounded-md border border-line bg-paper p-1 shadow-float"
      aria-label="Proof of purchase supplied"
    >
      <span className="block h-1.5 rounded-sm bg-ink/15" />
      <span className="mt-1 block h-1 w-3/4 rounded-sm bg-ink/10" />
      <span className="mt-1 block h-1 w-full rounded-sm bg-ink/10" />
      <span className="mt-2 flex items-center gap-1">
        <span
          className="size-2.5 rounded-sm"
          style={{ background: listing.show.poster.bg }}
        />
        <span className="h-1 flex-1 rounded-sm bg-ink/10" />
      </span>
    </span>
  );
}

function RelatedDeals({ listing }: { listing: Listing }) {
  const { alerts, addAlert } = useApp();
  const toast = useToast();
  const alerted = alerts.some((alert) => alert.show.slug === listing.show.slug);
  const offsets = [
    { price: Math.max(20, listing.price + 12), seat: "Right MEZZ / Row G", days: 8 },
    { price: Math.max(20, listing.price + 21), seat: "Center ORCH / Row N", days: 15 },
  ];

  return (
    <section className="rounded-card bg-paper p-4">
      <Link
        href={`/shows/${listing.show.slug}`}
        className="flex min-h-11 items-center justify-between gap-3"
      >
        <h2 className="text-title">More deals for {listing.show.title}</h2>
        <ChevronRight className="size-5 shrink-0 text-ink-soft" strokeWidth={1.8} />
      </Link>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <button
          type="button"
          disabled={alerted}
          onClick={() => {
            addAlert(listing.show, listing.price);
            toast({ message: `Notify is on for ${listing.show.title}` });
          }}
          className="flex w-[96px] shrink-0 flex-col items-center justify-center rounded-thumb bg-blush px-2 py-4 text-vermilion transition-transform active:scale-[0.97] disabled:text-sage-ink"
        >
          <Bell className="size-6" strokeWidth={1.8} />
          <span className="mt-2 text-caption font-semibold">
            {alerted ? "Notify On" : "Notify Me"}
          </span>
        </button>
        {offsets.map((deal) => {
          const base = listing.performanceAt
            ? new Date(listing.performanceAt)
            : new Date("2026-07-15T19:00:00-04:00");
          base.setDate(base.getDate() + deal.days);
          return (
            <Link
              key={deal.days}
              href={`/shows/${listing.show.slug}`}
              className="w-[148px] shrink-0 rounded-thumb bg-cream p-3 transition-transform active:scale-[0.97]"
            >
              <p className="flex items-baseline gap-1">
                <strong className="text-title text-vermilion">${deal.price}</strong>
                <span className="text-caption text-ink-soft">each</span>
              </p>
              <p className="mt-1 truncate text-caption text-ink-soft">{deal.seat}</p>
              <p className="mt-3 truncate text-caption text-ink-soft">
                {dateTimeFormatter.format(base)}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ActionBar({
  listing,
  isMine,
  unavailable,
  onOffer,
  onBuy,
}: {
  listing: Listing;
  isMine: boolean;
  unavailable: boolean;
  onOffer: () => void;
  onBuy: () => void;
}) {
  if (isMine) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] border-t border-line bg-paper p-4 pb-[max(env(safe-area-inset-bottom),16px)]">
        <Link
          href="/orders"
          className="flex h-14 items-center justify-center rounded-full bg-espresso text-body font-semibold text-white"
        >
          Manage your listing
        </Link>
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] border-t border-line bg-paper p-4 pb-[max(env(safe-area-inset-bottom),16px)]">
        <button
          type="button"
          disabled
          className="h-14 w-full rounded-full bg-inset text-body font-semibold text-ink-soft"
        >
          These tickets are sold
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[430px] gap-3 border-t border-line bg-paper p-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <button
        type="button"
        onClick={onOffer}
        disabled={!listing.acceptsOffers}
        className="h-14 w-[132px] shrink-0 rounded-full border-2 border-vermilion text-body font-semibold text-vermilion transition-transform active:scale-[0.98] disabled:border-line disabled:text-ink-faint"
      >
        {listing.acceptsOffers ? "Make Offer" : "Offers Off"}
      </button>
      <button
        type="button"
        onClick={onBuy}
        className="h-14 min-w-0 flex-1 rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform] active:scale-[0.98] active:bg-vermilion-pressed"
      >
        Buy Now
      </button>
    </div>
  );
}

export function TicketDetails({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { userListings } = useApp();
  const [sheet, setSheet] = useState<"offer" | "buy" | "more" | null>(null);

  const listing = useMemo(
    () =>
      [...userListings, ...marketplaceListings, ...soldListings].find(
        (item) => item.id === id,
      ),
    [id, userListings],
  );

  const [offer, setOffer] = useState(20);
  const [quantity, setQuantity] = useState(1);

  if (!listing) {
    return (
      <main className="px-4 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="size-6" />
        </button>
        <div className="mt-20 text-center">
          <h1 className="text-title">This listing is no longer available</h1>
          <Link href="/" className="mt-4 inline-block text-body underline">
            Browse Marketplace
          </Link>
        </div>
      </main>
    );
  }

  const userListing = userListings.find((item) => item.id === listing.id);
  const isMine = Boolean(userListing);
  const unavailable = Boolean(listing.sold || (userListing && userListing.status !== "listed"));
  const sellerName = listing.seller.name ?? `Seller ${listing.seller.initial}`;
  const performance = performanceLabel(listing);
  const offerStart = Math.max(10, Math.round((listing.price * 0.85) / 5) * 5);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${listing.show.title} tickets on Theatr`,
          text: `${listing.qty} ticket${listing.qty === 1 ? "" : "s"} for ${listing.show.title}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ message: "Listing link copied" });
      }
    } catch {
      // A cancelled native share should leave the page unchanged.
    }
  };

  return (
    <main className="min-h-dvh bg-cream pb-32">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-cream/95 px-3 backdrop-blur">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="size-6" strokeWidth={2.1} />
        </button>
        <div className="flex items-center">
          <button
            type="button"
            onClick={share}
            className="flex size-11 items-center justify-center"
            aria-label="Share listing"
          >
            <Share2 className="size-6" strokeWidth={1.9} />
          </button>
          <button
            type="button"
            onClick={() => setSheet("more")}
            className="flex size-11 items-center justify-center"
            aria-label="More listing options"
          >
            <MoreHorizontal className="size-7" strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="space-y-3 px-3">
        <section className="rounded-card bg-paper px-4 pt-4">
          <Link
            href={`/shows/${listing.show.slug}`}
            className="flex min-h-20 items-center gap-3 pb-4"
          >
            <Poster show={listing.show} className="size-16 rounded-thumb" />
            <h1 className="min-w-0 flex-1 text-title">{listing.show.title}</h1>
            <ChevronRight className="size-5 shrink-0 text-ink-soft" strokeWidth={1.8} />
          </Link>

          <FactRow label="Time">
            <span className="inline-flex items-center gap-2">
              <span className="rounded-md bg-sage px-2 py-1 text-caption font-semibold text-sage-ink">
                {performance.badge}
              </span>
              <span>{performance.date}</span>
            </span>
          </FactRow>
          <FactRow label="Venue">
            <span className="inline-flex items-center justify-end gap-1">
              {listing.show.venue}
              <ChevronRight className="size-4 text-ink-soft" strokeWidth={1.8} />
            </span>
          </FactRow>
          <FactRow label="Price">
            <strong className="text-title text-vermilion">${listing.price}</strong>{" "}
            <span className="text-caption text-ink-soft">each incl. fee</span>
          </FactRow>
          <FactRow label="Quantity">
            {listing.qty} ticket{listing.qty === 1 ? "" : "s"}
          </FactRow>
          <FactRow label="Seat Location">
            <span>{listing.seat}</span>
          </FactRow>
          <FactRow label="Proof of Purchase" className="pb-5">
            <span className="flex justify-end">
              <ProofThumbnail listing={listing} />
            </span>
          </FactRow>
        </section>

        <section className="rounded-card bg-paper p-4">
          <div className="flex items-center gap-3">
            <SellerAvatar listing={listing} />
            <p className="text-body">
              Sold by <strong>{sellerName}</strong>
            </p>
          </div>
          {listing.acceptsOffers && (
            <p className="mt-5 flex items-center gap-2 text-body text-ink-soft">
              <HandCoins className="size-5" strokeWidth={1.7} />
              Open to offers
            </p>
          )}
          {listing.seller.note && (
            <p className="mt-3 text-body">{listing.seller.note}</p>
          )}
        </section>

        <section className="rounded-card bg-paper p-4">
          <h2 className="text-body font-semibold">Ticket Handoff</h2>
          <p className="mt-1 text-body text-ink-soft">
            {listing.handoff ?? "Via original platform (Transfer right away)"}
          </p>
        </section>

        <section className="flex items-center gap-3 rounded-card bg-paper p-4 text-body text-ink-soft">
          <ShieldCheck className="size-6 shrink-0 text-sage-ink" strokeWidth={1.8} />
          We protect your payment when you pay on Theatr.
        </section>

        {!unavailable && (
          <div className="pt-7">
            <RelatedDeals listing={listing} />
          </div>
        )}
      </div>

      <ActionBar
        listing={listing}
        isMine={isMine}
        unavailable={unavailable}
        onOffer={() => {
          setOffer(offerStart);
          setSheet("offer");
        }}
        onBuy={() => {
          setQuantity(1);
          setSheet("buy");
        }}
      />

      <Sheet
        open={sheet === "offer"}
        onClose={() => setSheet(null)}
        title={`Make an offer to ${sellerName}`}
      >
        <p className="mt-1 text-body text-ink-soft">
          The listing is ${listing.price} per ticket. Your offer applies to all{" "}
          {listing.qty} ticket{listing.qty === 1 ? "" : "s"}.
        </p>
        <div className="mt-6">
          <Stepper
            value={offer}
            onChange={setOffer}
            min={10}
            max={listing.price}
            step={5}
            label="offer price per ticket"
            format={(value) => `$${value} each`}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setSheet(null);
            toast({ message: `$${offer} offer sent to ${sellerName}` });
          }}
          className="mt-7 h-14 w-full rounded-full bg-vermilion text-body font-semibold text-white active:bg-vermilion-pressed"
        >
          Send ${offer * listing.qty} offer
        </button>
      </Sheet>

      <Sheet
        open={sheet === "buy"}
        onClose={() => setSheet(null)}
        title={`Buy ${listing.show.title} tickets`}
      >
        <p className="mt-1 text-body text-ink-soft">
          Choose how many tickets you want from this listing.
        </p>
        <div className="mt-6">
          <Stepper
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={listing.qty}
            step={1}
            label="ticket quantity"
            format={(value) => `${value} ticket${value === 1 ? "" : "s"}`}
          />
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-line pt-5 text-body">
          <span className="text-ink-soft">Total including fees</span>
          <strong className="text-title">${listing.price * quantity}</strong>
        </div>
        <button
          type="button"
          onClick={() => {
            setSheet(null);
            toast({ message: "Checkout prototype — no payment was taken" });
          }}
          className="mt-7 h-14 w-full rounded-full bg-vermilion text-body font-semibold text-white active:bg-vermilion-pressed"
        >
          Continue to payment
        </button>
      </Sheet>

      <Sheet
        open={sheet === "more"}
        onClose={() => setSheet(null)}
        title="Listing options"
      >
        <button
          type="button"
          onClick={() => {
            setSheet(null);
            void share();
          }}
          className="mt-4 flex h-14 w-full items-center gap-3 rounded-full bg-paper px-5 text-body font-semibold"
        >
          <Share2 className="size-5" strokeWidth={1.8} />
          Share listing
        </button>
        <button
          type="button"
          onClick={() => {
            setSheet(null);
            toast({ message: "Thanks — we’ll review this listing" });
          }}
          className="mt-2 flex h-14 w-full items-center rounded-full bg-paper px-5 text-body text-ink-soft"
        >
          Report listing
        </button>
      </Sheet>
    </main>
  );
}
