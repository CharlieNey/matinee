"use client";

import { Fragment, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { Poster } from "@/components/Poster";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { ListingStatus, UserListing, useApp } from "@/lib/store";

const STEPS: { key: ListingStatus; label: string }[] = [
  { key: "listed", label: "Listed" },
  { key: "sold", label: "Sold" },
  { key: "paid", label: "Paid" },
];

function statusHelp(listing: UserListing): string {
  switch (listing.status) {
    case "listed":
      return "We'll notify you when it sells.";
    case "sold":
      return "Sold — payout lands in your Wallet after the show.";
    case "paid":
      return `Paid — $${listing.price * listing.qty} is in your Wallet.`;
  }
}

/** Listed → Sold → Paid rail. State lives in color: completed steps are
 *  espresso-filled, future steps hollow ink-faint (DESIGN.md §6). */
function StatusPipeline({
  status,
  large = false,
}: {
  status: ListingStatus;
  large?: boolean;
}) {
  const activeIdx = STEPS.findIndex((s) => s.key === status);
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Status: ${STEPS[activeIdx].label}`}
    >
      {STEPS.map((step, i) => {
        const done = i <= activeIdx;
        return (
          <Fragment key={step.key}>
            {i > 0 && (
              <span
                aria-hidden
                className={`h-[1.5px] min-w-3 flex-1 rounded-full transition-colors duration-200 ease-out ${
                  done ? "bg-espresso" : "bg-line"
                }`}
              />
            )}
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={`rounded-full transition-[background-color,border-color] duration-200 ease-out ${
                  large ? "size-3" : "size-2.5"
                } ${done ? "bg-espresso" : "border-[1.5px] border-ink-faint"}`}
              />
              <span
                className={`font-medium transition-colors duration-200 ease-out ${
                  large ? "text-body" : "text-caption"
                } ${done ? "text-ink" : "text-ink-faint"}`}
              >
                {step.label}
              </span>
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}

/** Seller listing card: row content on top, pipeline + helper below.
 *  Tapping opens the status sheet. */
function ListingStatusCard({
  listing,
  onOpen,
}: {
  listing: UserListing;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-card bg-paper p-3.5 text-left transition-transform duration-150 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3.5">
        <Poster show={listing.show} className="w-14 rounded-thumb" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold">
            {listing.show.title}
          </p>
          <p className="mt-0.5 text-caption text-ink-soft">
            {listing.seat} · {listing.qty} ticket{listing.qty > 1 ? "s" : ""}
          </p>
        </div>
        <p className="text-body font-semibold">${listing.price}</p>
      </div>
      <div className="mt-3.5 border-t border-line pt-3.5">
        <StatusPipeline status={listing.status} />
        <p className="mt-2.5 text-caption text-ink-soft">
          {statusHelp(listing)}
        </p>
      </div>
    </button>
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
  const [sheetId, setSheetId] = useState<string | null>(null);
  const { userListings, advanceListing } = useApp();
  const toast = useToast();

  const inProgress = userListings.filter((l) => l.status !== "paid");
  const completed = userListings.filter((l) => l.status === "paid");
  const activeListing = userListings.find((l) => l.id === sheetId) ?? null;

  const advance = () => {
    if (!activeListing || activeListing.status === "paid") return;
    advanceListing(activeListing.id);
    toast({
      message:
        activeListing.status === "listed"
          ? "Your tickets sold — nice."
          : "Payout sent to your Wallet",
    });
  };

  return (
    <main className="px-5 pt-8 web:mx-auto web:max-w-[560px]">
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
                {inProgress.length === 0 ? (
                  EMPTY
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {inProgress.map((listing) => (
                      <ListingStatusCard
                        key={listing.id}
                        listing={listing}
                        onOpen={() => setSheetId(listing.id)}
                      />
                    ))}
                  </div>
                )}
              </AccordionSection>
              <AccordionSection label="Completed">
                {completed.length === 0 ? (
                  EMPTY
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {completed.map((listing) => (
                      <ListingStatusCard
                        key={listing.id}
                        listing={listing}
                        onOpen={() => setSheetId(listing.id)}
                      />
                    ))}
                  </div>
                )}
              </AccordionSection>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Status sheet — the demo's stand-in for the buyer side */}
      <Sheet
        open={activeListing !== null}
        onClose={() => setSheetId(null)}
        title={activeListing?.show.title}
      >
        {activeListing && (
          <>
            <div className="mt-6 rounded-card bg-paper p-5">
              <StatusPipeline status={activeListing.status} large />
              <p className="mt-3.5 text-body text-ink-soft">
                {statusHelp(activeListing)}
              </p>
            </div>
            {activeListing.status === "paid" ? (
              <p className="mt-6 text-center text-body text-ink-soft">
                All settled — this listing is complete.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={advance}
                  className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-espresso text-body font-semibold text-white transition-transform duration-150 active:scale-[0.98]"
                >
                  {activeListing.status === "listed"
                    ? "Simulate sale"
                    : "Simulate payout"}
                </button>
                <p className="mt-2.5 text-center text-caption text-ink-faint">
                  Prototype control — simulates the buyer side.
                </p>
              </>
            )}
          </>
        )}
      </Sheet>
    </main>
  );
}
