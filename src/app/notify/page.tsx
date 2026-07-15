"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { BackHeader } from "@/components/BackHeader";
import { Poster } from "@/components/Poster";
import { Sheet } from "@/components/Sheet";
import { ShowPicker } from "@/components/ShowPicker";
import { Stepper } from "@/components/Stepper";
import { Toggle } from "@/components/Toggle";
import { useToast } from "@/components/Toast";
import { alertCriteria, NotifyAlert } from "@/lib/data";
import { useApp } from "@/lib/store";
import { allShows, Show } from "@/lib/shows";
import { useCountUp } from "@/lib/useCountUp";

function AlertCard({
  alert,
  onDelete,
  onEdit,
}: {
  alert: NotifyAlert;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-card bg-paper p-4">
      <div className="flex gap-4">
        <Poster show={alert.show} className="w-[72px] rounded-thumb" />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-[20px] font-bold leading-tight tracking-tight">
            {alert.show.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-body text-ink-soft">
            {alertCriteria(alert)}
          </p>
        </div>
        <Toggle
          defaultOn={alert.enabled}
          label={`Alerts for ${alert.show.title}`}
        />
      </div>
      <div className="mt-4 flex justify-end gap-4 border-t border-line pt-2 text-ink-soft">
        <button
          type="button"
          aria-label={`Delete ${alert.show.title} alert`}
          onClick={onDelete}
          className="p-2.5 transition-transform duration-150 active:scale-90"
        >
          <Trash2 className="size-6" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          aria-label={`Edit ${alert.show.title} alert`}
          onClick={onEdit}
          className="p-2.5 transition-transform duration-150 active:scale-90"
        >
          <Pencil className="size-6" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

export default function NotifyPage() {
  const {
    alerts,
    matches,
    addAlert,
    updateAlert,
    removeAlert,
    restoreAlert,
  } = useApp();
  const toast = useToast();
  const shownMatches = useCountUp(matches);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<NotifyAlert | null>(null);

  const [pickedShow, setPickedShow] = useState<Show | null>(null);
  const [pickedPrice, setPickedPrice] = useState(50);
  const [editPrice, setEditPrice] = useState(50);

  const alertedSlugs = new Set(alerts.map((a) => a.show.slug));
  const pickableShows = allShows().filter((s) => !alertedSlugs.has(s.slug));

  const handleDelete = (alert: NotifyAlert) => {
    const index = alerts.findIndex((a) => a.id === alert.id);
    removeAlert(alert.id);
    toast({
      message: `${alert.show.title} alert deleted`,
      action: { label: "Undo", onClick: () => restoreAlert(alert, index) },
    });
  };

  const handleAdd = () => {
    if (!pickedShow) return;
    addAlert(pickedShow, pickedPrice);
    setAddOpen(false);
    setPickedShow(null);
    toast({ message: `We'll watch for ${pickedShow.title} tickets` });
  };

  const handleEditSave = () => {
    if (!editing) return;
    updateAlert(editing.id, editPrice);
    setEditing(null);
    toast({ message: "Alert updated" });
  };

  return (
    <main className="px-4 pb-10">
      <BackHeader title="Your Notify" />

      <Link
        href="/"
        className="mt-4 block rounded-card bg-blush p-5 transition-transform duration-150 active:scale-[0.99]"
      >
        <h2 className="text-title">Your Notify Matches</h2>
        <p className="mt-1 text-body text-ink-soft">
          {shownMatches} match{shownMatches === 1 ? "" : "es"}
        </p>
      </Link>

      <h2 className="mt-9 text-heading">Notify Alerts</h2>
      <div className="mt-4 flex flex-col gap-3.5">
        <AnimatePresence initial={false} mode="popLayout">
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -48 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <AlertCard
                alert={alert}
                onDelete={() => handleDelete(alert)}
                onEdit={() => {
                  setEditing(alert);
                  setEditPrice(alert.maxPrice);
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {alerts.length === 0 && (
          <p className="py-6 text-center text-body text-ink-faint">
            No alerts yet — add one and we&apos;ll watch the Marketplace for
            you.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="mt-7 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform] duration-150 active:scale-[0.98] active:bg-vermilion-pressed"
      >
        <Plus className="size-6" strokeWidth={2.2} />
        Add Notify Alert
      </button>

      {/* Add alert */}
      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Notify Alert"
      >
        <p className="mb-2.5 mt-6 text-caption font-medium text-ink-soft">
          Show
        </p>
        <ShowPicker
          shows={pickableShows}
          selected={pickedShow}
          onSelect={setPickedShow}
        />
        <p className="mb-2.5 mt-6 text-caption font-medium text-ink-soft">
          Alert me under
        </p>
        <Stepper
          value={pickedPrice}
          onChange={setPickedPrice}
          min={20}
          max={250}
          step={5}
          label="alert price"
          format={(v) => `$${v}`}
        />
        <button
          type="button"
          disabled={!pickedShow}
          onClick={handleAdd}
          className="mt-8 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform,opacity] duration-150 active:scale-[0.98] active:bg-vermilion-pressed disabled:opacity-40 disabled:active:scale-100"
        >
          <Plus className="size-6" strokeWidth={2.2} />
          {pickedShow ? `Alert me under $${pickedPrice}` : "Pick a show"}
        </button>
      </Sheet>

      {/* Edit alert */}
      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.show.title} alert` : "Edit alert"}
      >
        <p className="mb-2.5 mt-6 text-caption font-medium text-ink-soft">
          Alert me under
        </p>
        <Stepper
          value={editPrice}
          onChange={setEditPrice}
          min={20}
          max={250}
          step={5}
          label="alert price"
          format={(v) => `$${v}`}
        />
        <button
          type="button"
          onClick={handleEditSave}
          className="mt-8 flex h-14 w-full items-center justify-center rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform] duration-150 active:scale-[0.98] active:bg-vermilion-pressed"
        >
          Save changes
        </button>
      </Sheet>
    </main>
  );
}
