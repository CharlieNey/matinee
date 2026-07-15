import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** White pill on cream — separation is the fill alone, no border.
 *  Applied filters flip to espresso (state lives in color, DESIGN.md §6). */
export function FilterChip({
  icon,
  label,
  chevron = true,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  chevron?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
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
