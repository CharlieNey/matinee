"use client";

import { motion } from "motion/react";
import { Bookmark } from "lucide-react";
import { Show } from "@/lib/shows";
import { useApp } from "@/lib/store";

/** THE Interested control — the app's one save affordance. Bookmark glyph,
 *  the word "Interested" wherever there's room, same aria language
 *  everywhere. Two anatomies (DESIGN.md §5/§9): `pill` for page-level
 *  placement (show page), `icon` for card action corners (inset rows).
 *  Idle invites in espresso, active settles into quiet inset — the follow
 *  button's grammar; never vermilion, state lives in color. */
export function InterestedButton({
  show,
  variant = "pill",
}: {
  show: Show;
  variant?: "pill" | "icon";
}) {
  const { isSaved, toggleSaved } = useApp();
  const active = isSaved(show.slug);
  const aria = active
    ? `Remove ${show.title} from Interested`
    : `Mark ${show.title} interested`;

  if (variant === "icon") {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.8 }}
        onClick={() => toggleSaved(show.slug)}
        aria-pressed={active}
        aria-label={aria}
        className="relative z-10 -m-2 p-2 text-ink-soft"
      >
        <Bookmark
          className="size-6 transition-[fill] duration-150"
          strokeWidth={1.8}
          fill={active ? "currentColor" : "none"}
        />
      </motion.button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggleSaved(show.slug)}
      aria-pressed={active}
      aria-label={aria}
      className={`flex h-10 items-center gap-1.5 rounded-full px-4 text-caption font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.97] ${
        active ? "bg-inset text-ink" : "bg-paper text-ink"
      }`}
    >
      <Bookmark
        className="size-4 transition-[fill] duration-150"
        strokeWidth={1.8}
        fill={active ? "currentColor" : "none"}
      />
      Interested
    </button>
  );
}
