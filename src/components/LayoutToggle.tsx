"use client";

import { useEffect, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";

type Mode = "mobile" | "web";

const STORAGE_KEY = "theatr-layout-v1";

/**
 * Floating Phone/Web switch (desktop viewports only). Flips
 * html[data-layout] — all mode styling reacts via the `web:`/`mobile:`
 * variants, so the swap is instant and pure CSS.
 */
export function LayoutToggle() {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-layout");
    setMode(current === "web" ? "web" : "mobile");
  }, []);

  const apply = (next: Mode) => {
    document.documentElement.setAttribute("data-layout", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing — the choice just won't stick.
    }
    setMode(next);
  };

  const segment = (target: Mode, label: string, Icon: typeof Monitor) => (
    <button
      type="button"
      aria-pressed={mode === target}
      onClick={() => apply(target)}
      className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-caption font-semibold transition-colors duration-150 ${
        mode === target ? "bg-espresso text-white" : "text-ink-soft"
      }`}
    >
      <Icon className="size-4" strokeWidth={2} />
      {label}
    </button>
  );

  return (
    <div
      role="group"
      aria-label="Layout mode"
      className="fixed bottom-5 right-5 z-50 hidden items-center gap-0.5 rounded-full border border-line bg-paper p-1 shadow-float lg:flex"
    >
      {segment("mobile", "Phone", Smartphone)}
      {segment("web", "Web", Monitor)}
    </div>
  );
}
