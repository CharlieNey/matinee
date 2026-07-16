"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SellSheet } from "./SellSheet";

const LINKS = [
  { href: "/", label: "Marketplace" },
  { href: "/discover", label: "Discover" },
  { href: "/rush", label: "Rush & Lottery" },
  { href: "/orders", label: "Orders" },
  { href: "/profile", label: "Profile" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return (
      pathname === "/" ||
      pathname.startsWith("/shows") ||
      pathname.startsWith("/tickets")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TicketMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 text-vermilion" aria-hidden>
      <path
        d="M5.5 5.5h13A2.5 2.5 0 0 1 21 8v1.55a2.6 2.6 0 0 0 0 4.9V16a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16v-1.55a2.6 2.6 0 0 0 0-4.9V8a2.5 2.5 0 0 1 2.5-2.5Z"
        fill="currentColor"
      />
      <path
        d="M15.5 7v2M15.5 11v2M15.5 15v2"
        stroke="var(--color-cream)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Web-mode top bar — the tab bar's five destinations plus the Sell CTA. */
export function WebNav() {
  const pathname = usePathname();
  const [sellOpen, setSellOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 hidden border-b border-line bg-cream/95 backdrop-blur web:block">
      <div className="mx-auto flex h-16 max-w-[1160px] items-center gap-9 px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Theatr home">
          <TicketMark />
          <span className="text-title tracking-tight">Theatr</span>
        </Link>
        <nav className="flex h-full items-stretch gap-7">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center border-b-2 pt-0.5 text-body font-semibold transition-colors duration-200 ${
                  active
                    ? "border-ink text-ink"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setSellOpen(true)}
          className="flex h-11 items-center gap-2 rounded-full bg-vermilion px-5 text-body font-semibold text-white transition-[background-color,transform] duration-150 active:scale-[0.97] active:bg-vermilion-pressed"
        >
          Sell tickets
        </button>
      </div>
      <SellSheet open={sellOpen} onClose={() => setSellOpen(false)} />
    </header>
  );
}
