"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { allShows, Show } from "@/lib/shows";
import { Sheet } from "./Sheet";
import { ShowPicker } from "./ShowPicker";
import { Stepper } from "./Stepper";
import { useToast } from "./Toast";

const SECTIONS = ["Center ORCH", "Left MEZZ", "Right MEZZ", "Balcony"];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 mt-6 text-caption font-medium text-ink-soft">
      {children}
    </p>
  );
}

export function SellSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addUserListing } = useApp();
  const toast = useToast();
  const router = useRouter();

  const [show, setShow] = useState<Show | null>(null);
  const [section, setSection] = useState(SECTIONS[0]);
  const [qty, setQty] = useState(2);
  const [price, setPrice] = useState(65);

  const reset = () => {
    setShow(null);
    setSection(SECTIONS[0]);
    setQty(2);
    setPrice(65);
  };

  const submit = () => {
    if (!show) return;
    addUserListing({
      show,
      seat: `${section} / Row C`,
      price,
      qty,
      when: "This week",
      postedAgo: "Just now",
    });
    onClose();
    reset();
    toast({
      message: "You're live on the Marketplace",
      action: { label: "View", onClick: () => router.push("/") },
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Sell your tickets">
      <FieldLabel>Show</FieldLabel>
      <ShowPicker shows={allShows()} selected={show} onSelect={setShow} />

      <FieldLabel>Section</FieldLabel>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            aria-pressed={section === s}
            className={`h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-body font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.98] ${
              section === s ? "bg-espresso text-white" : "bg-paper text-ink"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <FieldLabel>Tickets</FieldLabel>
      <Stepper
        value={qty}
        onChange={setQty}
        min={1}
        max={4}
        label="ticket quantity"
        format={(v) => `${v} ticket${v > 1 ? "s" : ""}`}
      />

      <FieldLabel>Price each</FieldLabel>
      <Stepper
        value={price}
        onChange={setPrice}
        min={10}
        max={300}
        step={5}
        label="price"
        format={(v) => `$${v}`}
      />

      <button
        type="button"
        disabled={!show}
        onClick={submit}
        className="mt-8 flex h-14 w-full items-center justify-center rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform,opacity] duration-150 active:scale-[0.98] active:bg-vermilion-pressed disabled:opacity-40 disabled:active:scale-100"
      >
        {show
          ? `List ${qty} ticket${qty > 1 ? "s" : ""} · $${price} each`
          : "Pick a show to list"}
      </button>
    </Sheet>
  );
}
