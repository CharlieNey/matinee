"use client";

import { useState } from "react";

/** iOS-style switch. On = espresso track — never vermilion (DESIGN.md §5). */
export function Toggle({
  defaultOn = false,
  label,
}: {
  defaultOn?: boolean;
  label: string;
}) {
  const [on, setOn] = useState(defaultOn);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => setOn((v) => !v)}
      className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-150 after:absolute after:-inset-2 after:content-[''] ${
        on ? "bg-espresso" : "bg-toggle-off"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 size-7 rounded-full bg-paper shadow-float transition-transform duration-150 ${
          on ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}
