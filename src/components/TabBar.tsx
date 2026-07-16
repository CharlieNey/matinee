"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SellSheet } from "./SellSheet";

/* Filled tab glyphs (reference app uses solid icons; lucide strokes fill badly) */
function SofaGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden>
      <path d="M6.5 5.5h11A2.5 2.5 0 0 1 20 8v3h-2.5a2 2 0 0 0-2 2H8.5a2 2 0 0 0-2-2H4V8a2.5 2.5 0 0 1 2.5-2.5Z" />
      <path d="M3.5 12.5H6a1 1 0 0 1 1 1V15h10v-1.5a1 1 0 0 1 1-1h2.5a1.5 1.5 0 0 1 1.5 1.5v3a2 2 0 0 1-2 2v.5a1 1 0 1 1-2 0V19H6v.5a1 1 0 1 1-2 0V19a2 2 0 0 1-2-2v-3a1.5 1.5 0 0 1 1.5-1.5Z" />
    </svg>
  );
}

function CompassGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="currentColor" />
      <path
        d="m15.5 8.5-2 5-5 2 2-5Z"
        fill="var(--color-paper)"
      />
    </svg>
  );
}

function TicketGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
      <path
        d="M5.5 5.5h13A2.5 2.5 0 0 1 21 8v1.55a2.6 2.6 0 0 0 0 4.9V16a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16v-1.55a2.6 2.6 0 0 0 0-4.9V8a2.5 2.5 0 0 1 2.5-2.5Z"
        fill="currentColor"
      />
      <path
        d="M15.5 7v2M15.5 11v2M15.5 15v2"
        stroke="var(--color-paper)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProfileGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="currentColor" />
      <path
        d="M8 13.5a5.5 5.5 0 0 0 9.2 1.6"
        stroke="var(--color-paper)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

const TABS = [
  { href: "/", label: "Marketplace", Icon: SofaGlyph },
  { href: "/discover", label: "Discover", Icon: CompassGlyph },
  { href: "/orders", label: "Orders", Icon: TicketGlyph },
  { href: "/profile", label: "Profile", Icon: ProfileGlyph },
];

function SellGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" fill="#fff" />
      <circle cx="3.5" cy="12" r="2" fill="var(--color-vermilion)" />
      <circle cx="20.5" cy="12" r="2" fill="var(--color-vermilion)" />
      <path
        d="M12 15.5v-6M9.2 12 12 9.2 14.8 12"
        stroke="var(--color-vermilion)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const [sellOpen, setSellOpen] = useState(false);

  const slots = [TABS[0], TABS[1], null, TABS[2], TABS[3]];

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 web:hidden">
      {/* cream disc carves the notch under the raised Sell button */}
      <div className="absolute -top-[26px] left-1/2 size-[88px] -translate-x-1/2 rounded-full bg-cream" />

      <div className="relative border-t border-line bg-paper pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-float">
        <div className="grid grid-cols-5">
          {slots.map((tab) => {
            if (!tab) {
              return (
                <div key="sell" className="relative">
                  <button
                    type="button"
                    aria-label="Sell tickets"
                    onClick={() => setSellOpen(true)}
                    className="absolute -top-11 left-1/2 flex size-16 -translate-x-1/2 flex-col items-center justify-center gap-0 rounded-full bg-vermilion text-white shadow-float transition-transform duration-150 active:scale-[0.94]"
                  >
                    <SellGlyph />
                    <span className="text-label font-semibold">Sell</span>
                  </button>
                </div>
              );
            }
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 transition-[color,transform] duration-200 active:scale-95 ${
                  active ? "text-ink" : "text-ink-faint"
                }`}
              >
                <tab.Icon />
                <span
                  className={`text-label ${active ? "font-semibold" : ""}`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <SellSheet open={sellOpen} onClose={() => setSellOpen(false)} />
    </nav>
  );
}
