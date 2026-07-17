"use client";

import { Forward } from "lucide-react";

/** THE share action — one anatomy everywhere: the Forward glyph plus a
 *  verb-first "Share …" label. Three placements (DESIGN.md §9):
 *  `primary` = the full-width vermilion CTA (Wrapped, win card);
 *  `quiet` = the keepsake-corner text action (diary stub);
 *  `icon` = the top utility row, label becomes the aria-label. */
export function ShareButton({
  label,
  onShare,
  variant = "primary",
  disabled = false,
  className = "",
}: {
  label: string;
  onShare: () => void;
  variant?: "primary" | "quiet" | "icon";
  disabled?: boolean;
  className?: string;
}) {
  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={onShare}
        className={`transition-transform duration-150 active:scale-90 ${className}`}
      >
        <Forward className="size-6" strokeWidth={1.8} />
      </button>
    );
  }

  if (variant === "quiet") {
    return (
      <button
        type="button"
        onClick={onShare}
        className={`flex items-center gap-2 self-start text-caption font-semibold text-ink-soft transition-colors duration-150 hover:text-ink ${className}`}
      >
        <Forward className="size-4" strokeWidth={2} />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onShare}
      className={`flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform,opacity] duration-150 active:scale-[0.98] active:bg-vermilion-pressed disabled:opacity-40 ${className}`}
    >
      <Forward className="size-5" strokeWidth={2} />
      {label}
    </button>
  );
}
