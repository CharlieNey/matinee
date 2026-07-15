"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  BellPlus,
  Calendar,
  Check,
  CircleDollarSign,
  Plus,
  Ticket,
} from "lucide-react";
import { Listing } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Show } from "@/lib/shows";
import { EmptyState } from "./EmptyState";
import { FilterChip } from "./FilterChip";
import { ListingCard } from "./ListingCard";
import { Sheet } from "./Sheet";
import { ShowCard } from "./ShowCard";
import { Stepper } from "./Stepper";
import { useToast } from "./Toast";

const DATE_OPTIONS = ["Anytime", "Tonight", "This week", "This weekend"] as const;
type DateFilter = (typeof DATE_OPTIONS)[number];

const QTY_OPTIONS = [
  { value: 0, label: "Any quantity" },
  { value: 1, label: "1 ticket" },
  { value: 2, label: "2 tickets" },
  { value: 3, label: "3+ tickets" },
] as const;
type QtyFilter = (typeof QTY_OPTIONS)[number]["value"];

function OptionRow({
  label,
  count,
  selected,
  onSelect,
}: {
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex h-13 w-full items-center justify-between rounded-full px-5 text-body font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.98] ${
        selected ? "bg-espresso text-white" : "bg-paper text-ink"
      }`}
    >
      {label}
      {selected ? (
        <Check className="size-5" strokeWidth={2.4} />
      ) : (
        <span
          className={`text-caption font-medium ${
            count === 0 ? "text-ink-faint" : "text-ink-soft"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** Empty show page = the moment of unmet demand: capture it with Notify. */
function NotifyCapture({ show }: { show: Show }) {
  const { alerts, addAlert } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(
    Math.max(20, Math.round((show.faceValue * 0.6) / 5) * 5),
  );

  const existing = alerts.find((a) => a.show.slug === show.slug);

  return (
    <div className="pt-6">
      <EmptyState text="Nothing here yet…" />
      {existing ? (
        <Link
          href="/notify"
          className="mx-auto -mt-2 flex w-fit items-center gap-2 rounded-full bg-sage px-4 py-2.5 text-caption font-semibold text-sage-ink transition-transform duration-150 active:scale-[0.98]"
        >
          <BellPlus className="size-4" strokeWidth={2} />
          Notify is on — under ${existing.maxPrice}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mx-auto -mt-2 flex h-14 w-full max-w-[340px] items-center justify-center gap-2.5 rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform] duration-150 active:scale-[0.98] active:bg-vermilion-pressed"
        >
          <Plus className="size-6" strokeWidth={2.2} />
          Add Notify Alert
        </button>
      )}
      <p className="mt-5 text-center">
        <Link
          href="/"
          className="text-body text-ink underline underline-offset-4 transition-opacity active:opacity-60"
        >
          See all tickets on Marketplace
        </Link>
      </p>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Notify me about ${show.title}`}
      >
        <p className="mt-1 text-body text-ink-soft">
          We&apos;ll watch the Marketplace and ping you when tickets match.
        </p>
        <p className="mb-2.5 mt-6 text-caption font-medium text-ink-soft">
          Alert me under
        </p>
        <Stepper
          value={price}
          onChange={setPrice}
          min={20}
          max={250}
          step={5}
          label="alert price"
          format={(v) => `$${v}`}
        />
        <button
          type="button"
          onClick={() => {
            addAlert(show, price);
            setOpen(false);
            toast({ message: `We'll watch for ${show.title} tickets` });
          }}
          className="mt-8 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform] duration-150 active:scale-[0.98] active:bg-vermilion-pressed"
        >
          <Plus className="size-6" strokeWidth={2.2} />
          Alert me under ${price}
        </button>
      </Sheet>
    </div>
  );
}

/** Filter chips + listing grid, shared by Marketplace and show pages. */
export function ListingBrowser({
  listings,
  show,
  mode = "listings",
}: {
  listings: Listing[];
  /** When set, only this show's tickets (incl. yours) are browsed. */
  show?: Show;
  /** "shows" groups listings into one card per show (Marketplace). */
  mode?: "listings" | "shows";
}) {
  const { userListings } = useApp();
  const [date, setDate] = useState<DateFilter>("Anytime");
  const [qty, setQty] = useState<QtyFilter>(0);
  const [cheapest, setCheapest] = useState(false);
  const [sheet, setSheet] = useState<null | "date" | "qty">(null);

  const merged = useMemo(() => {
    const mine = show
      ? userListings.filter((l) => l.show.slug === show.slug)
      : userListings;
    return [...mine, ...listings];
  }, [listings, userListings, show]);

  const filtered = useMemo(() => {
    let result = merged;
    if (date !== "Anytime") result = result.filter((l) => l.when === date);
    if (qty !== 0) result = result.filter((l) => l.qty >= qty);
    if (cheapest) result = [...result].sort((a, b) => a.price - b.price);
    return result;
  }, [merged, date, qty, cheapest]);

  // Faceted counts: each sheet shows results with the *other* filter applied.
  const dateCounts = useMemo(() => {
    const pool = qty === 0 ? merged : merged.filter((l) => l.qty >= qty);
    return Object.fromEntries(
      DATE_OPTIONS.map((d) => [
        d,
        d === "Anytime" ? pool.length : pool.filter((l) => l.when === d).length,
      ]),
    );
  }, [merged, qty]);

  const qtyCounts = useMemo(() => {
    const pool =
      date === "Anytime" ? merged : merged.filter((l) => l.when === date);
    return Object.fromEntries(
      QTY_OPTIONS.map((o) => [
        o.value,
        o.value === 0
          ? pool.length
          : pool.filter((l) => l.qty >= o.value).length,
      ]),
    );
  }, [merged, date]);

  const groups = useMemo(() => {
    if (mode !== "shows") return [];
    const bySlug = new Map<
      string,
      { show: Show; count: number; minPrice: number }
    >();
    for (const l of filtered) {
      const g = bySlug.get(l.show.slug);
      if (g) {
        g.count += 1;
        g.minPrice = Math.min(g.minPrice, l.price);
      } else {
        bySlug.set(l.show.slug, {
          show: l.show,
          count: 1,
          minPrice: l.price,
        });
      }
    }
    const list = [...bySlug.values()];
    if (cheapest) list.sort((a, b) => a.minPrice - b.minPrice);
    return list;
  }, [filtered, mode, cheapest]);

  const cardTransition = (i: number) => ({
    duration: 0.25,
    ease: "easeOut" as const,
    delay: Math.min(i * 0.04, 0.3),
  });

  return (
    <>
      <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        <FilterChip
          icon={<Calendar className="size-5" strokeWidth={1.8} />}
          label={date === "Anytime" ? "Date & Time" : date}
          active={date !== "Anytime"}
          onClick={() => setSheet("date")}
        />
        <FilterChip
          icon={<Ticket className="size-5" strokeWidth={1.8} />}
          label={
            qty === 0 ? "Quantity" : QTY_OPTIONS.find((o) => o.value === qty)!.label
          }
          active={qty !== 0}
          onClick={() => setSheet("qty")}
        />
        <FilterChip
          icon={<CircleDollarSign className="size-5" strokeWidth={1.8} />}
          label="Cheapest"
          chevron={false}
          active={cheapest}
          onClick={() => setCheapest((v) => !v)}
        />
      </div>

      {merged.length === 0 && show ? (
        <NotifyCapture show={show} />
      ) : filtered.length === 0 ? (
        <div className="pt-6">
          <EmptyState
            text="Nothing matches your filters…"
            actionLabel="Clear filters"
            onAction={() => {
              setDate("Anytime");
              setQty(0);
            }}
          />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 items-start gap-3">
          <AnimatePresence mode="popLayout">
            {mode === "shows"
              ? groups.map((g, i) => (
                  <motion.div
                    key={g.show.slug}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={cardTransition(i)}
                  >
                    <ShowCard
                      show={g.show}
                      count={g.count}
                      minPrice={g.minPrice}
                    />
                  </motion.div>
                ))
              : filtered.map((listing, i) => (
                  <motion.div
                    key={listing.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={cardTransition(i)}
                  >
                    <ListingCard listing={listing} />
                  </motion.div>
                ))}
          </AnimatePresence>
        </div>
      )}

      <Sheet
        open={sheet === "date"}
        onClose={() => setSheet(null)}
        title="Date & Time"
      >
        <div className="mt-4 flex flex-col gap-2.5">
          {DATE_OPTIONS.map((option) => (
            <OptionRow
              key={option}
              label={option}
              count={dateCounts[option]}
              selected={date === option}
              onSelect={() => {
                setDate(option);
                setSheet(null);
              }}
            />
          ))}
        </div>
      </Sheet>

      <Sheet
        open={sheet === "qty"}
        onClose={() => setSheet(null)}
        title="Quantity"
      >
        <div className="mt-4 flex flex-col gap-2.5">
          {QTY_OPTIONS.map((option) => (
            <OptionRow
              key={option.value}
              label={option.label}
              count={qtyCounts[option.value]}
              selected={qty === option.value}
              onSelect={() => {
                setQty(option.value);
                setSheet(null);
              }}
            />
          ))}
        </div>
      </Sheet>
    </>
  );
}
