"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Info, NotebookPen } from "lucide-react";
import { Sheet } from "./Sheet";
import { ShowPicker } from "./ShowPicker";
import { allShows } from "@/lib/shows";

/* Top-level only — keep it at five: seven links overflowed the bar at
   ~1024px, kicking it into sideways-scroll mode (clipped labels + Chrome's
   scroll-region focus ring). Trip took the slot the Marketplace freed. */
const LINKS = [
  { href: "/", label: "Discover" },
  { href: "/rush", label: "Rush & Lottery" },
  { href: "/district", label: "District" },
  { href: "/trip", label: "Trip" },
  { href: "/profile", label: "Profile" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/shows");
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

/** Web-mode top bar — the tab bar's destinations plus the Log CTA. */
export function WebNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [logOpen, setLogOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 hidden border-b border-line bg-cream/95 backdrop-blur web:block"
      style={{ viewTransitionName: "site-nav" }}
    >
      <div className="mx-auto flex h-16 max-w-[1160px] items-center gap-5 px-6 xl:gap-9">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="Matinee home"
        >
          <TicketMark />
          <span className="text-title tracking-tight">Matinee</span>
        </Link>
        {/* Labels never break ("Rush & Lottery" stays one line); when the bar
            runs out of room the nav scrolls sideways instead of wrapping. */}
        <nav className="flex h-full min-w-0 items-stretch gap-4 overflow-x-auto pr-6 [mask-image:linear-gradient(to_right,black_calc(100%_-_16px),transparent)] [scrollbar-width:none] xl:gap-7">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center whitespace-nowrap border-b-2 pt-0.5 text-body font-semibold transition-colors duration-200 ${
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
        <Link
          href="/about"
          aria-label="About Matinee"
          title="About"
          className={`mr-1 flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 xl:mr-4 ${
            pathname === "/about"
              ? "text-ink"
              : "text-ink-soft hover:bg-ink/5 hover:text-ink"
          }`}
        >
          <Info className="size-5" strokeWidth={2} aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => setLogOpen(true)}
          className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-vermilion px-5 text-body font-semibold text-white transition-[background-color,transform] duration-150 active:scale-[0.97] active:bg-vermilion-pressed"
        >
          <NotebookPen className="size-5" strokeWidth={2} aria-hidden />
          Log a show
        </button>
      </div>
      <Sheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="Which show did you see?"
      >
        <div className="mt-5">
          <ShowPicker
            shows={allShows()}
            selected={null}
            onSelect={(show) => {
              setLogOpen(false);
              router.push(`/log/${show.slug}`);
            }}
          />
        </div>
      </Sheet>
    </header>
  );
}
