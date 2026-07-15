"use client";

import { Minus, Plus } from "lucide-react";

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v: number) => String(v),
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  label: string;
}) {
  const btn =
    "flex size-11 items-center justify-center rounded-full bg-paper text-ink shadow-float transition-transform duration-150 active:scale-[0.94] disabled:opacity-35 disabled:active:scale-100";

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        className={btn}
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        <Minus className="size-5" strokeWidth={2.2} />
      </button>
      <span className="text-[26px] font-bold tabular-nums tracking-tight">
        {format(value)}
      </span>
      <button
        type="button"
        className={btn}
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        <Plus className="size-5" strokeWidth={2.2} />
      </button>
    </div>
  );
}
