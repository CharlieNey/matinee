import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** White pill on cream — separation is the fill alone, no border.
 *  Applied filters flip to espresso (state lives in color, DESIGN.md §6). */
export function FilterChip({
  icon,
  label,
  chevron = true,
  active = false,
  plain = false,
  onClick,
}: {
  /** Words only, no pill: the board's printed-program controls. */
  plain?: boolean;
  /** Optional; the board's chips carry words only. */
  icon?: ReactNode;
  label: string;
  chevron?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  if (plain) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`flex h-11 shrink-0 items-center gap-1 whitespace-nowrap text-body transition-opacity active:opacity-60 ${
          active
            ? "font-semibold text-ink underline decoration-2 underline-offset-[6px]"
            : "text-ink"
        }`}
      >
        {label}
        {chevron && <ChevronDown className="size-4" strokeWidth={2} aria-hidden />}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-12 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-body font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.98] ${
        active ? "bg-espresso text-white" : "bg-paper text-ink"
      }`}
    >
      {icon}
      {label}
      {chevron && <ChevronDown className="size-4" strokeWidth={2.2} />}
    </button>
  );
}
