"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { Poster } from "@/components/Poster";
import { Listing } from "@/lib/data";
import { useApp } from "@/lib/store";

function OrderRow({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/shows/${listing.show.slug}`}
      className="flex items-center gap-3.5 rounded-card bg-paper p-3.5 transition-transform duration-150 active:scale-[0.99]"
    >
      <Poster show={listing.show} className="w-14 rounded-thumb" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold">{listing.show.title}</p>
        <p className="mt-0.5 text-caption text-ink-soft">
          {listing.seat} · {listing.qty} ticket{listing.qty > 1 ? "s" : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="text-body font-semibold">${listing.price}</p>
        <p className="mt-0.5 text-caption text-ink-soft">Listed just now</p>
      </div>
    </Link>
  );
}

function AccordionSection({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mt-8">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 text-heading transition-opacity active:opacity-60"
      >
        <ChevronDown
          className={`size-5 transition-transform duration-200 ${
            open ? "" : "-rotate-90"
          }`}
          strokeWidth={2.2}
        />
        {label}
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pt-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

const EMPTY = (
  <p className="pl-[30px] text-body text-ink-faint">Nothing here yet.</p>
);

export default function OrdersPage() {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const { userListings } = useApp();

  return (
    <main className="px-5 pt-8">
      <div className="flex items-baseline gap-6">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`font-extrabold tracking-tight transition-[font-size,color] duration-200 ${
              side === s ? "text-ink" : "text-ink-soft"
            }`}
            style={{ fontSize: side === s ? 34 : 26 }}
          >
            {s === "buy" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={side}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {side === "buy" ? (
            <>
              <AccordionSection label="In Progress" defaultOpen>
                {EMPTY}
              </AccordionSection>
              <AccordionSection label="Completed">{EMPTY}</AccordionSection>
            </>
          ) : (
            <>
              <AccordionSection label="In Progress" defaultOpen>
                {userListings.length === 0 ? (
                  EMPTY
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {userListings.map((listing) => (
                      <OrderRow key={listing.id} listing={listing} />
                    ))}
                  </div>
                )}
              </AccordionSection>
              <AccordionSection label="Completed">{EMPTY}</AccordionSection>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
