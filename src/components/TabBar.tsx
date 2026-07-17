"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { Sheet } from "./Sheet";
import { ShowPicker } from "./ShowPicker";
import { allShows } from "@/lib/shows";

/* Filled tab glyphs (reference app uses solid icons; lucide strokes fill badly) */
function PinGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
      <path
        d="M12 2.5a7 7 0 0 0-7 7c0 4.9 5.35 10.6 6.6 11.85a.56.56 0 0 0 .8 0C13.65 20.1 19 14.4 19 9.5a7 7 0 0 0-7-7Z"
        fill="currentColor"
      />
      <circle cx="12" cy="9.5" r="2.6" fill="var(--color-paper)" />
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

function BoltGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
      <path
        d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
        fill="currentColor"
      />
    </svg>
  );
}

type Tab = { href: string; label: string; Icon: () => React.JSX.Element };

/* Four flat tabs, 2+2 around the dead-center Log FAB — what, where, when,
   you. The Marketplace slot went to District when the marketplace was
   retired (Phase 14, 2026-07-17). */
const TABS_LEFT: Tab[] = [
  { href: "/", label: "Discover", Icon: CompassGlyph },
  { href: "/district", label: "District", Icon: PinGlyph },
];
const TABS_RIGHT: Tab[] = [
  { href: "/rush", label: "Rush", Icon: BoltGlyph },
  { href: "/profile", label: "Profile", Icon: ProfileGlyph },
];

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link
      href={tab.href}
      className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-[color,transform] duration-200 active:scale-95 ${
        active ? "text-ink" : "text-ink-faint"
      }`}
    >
      <tab.Icon />
      <span className={`truncate text-label ${active ? "font-semibold" : ""}`}>
        {tab.label}
      </span>
    </Link>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [logOpen, setLogOpen] = useState(false);

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 web:hidden"
      style={{ viewTransitionName: "tab-bar" }}
    >
      <div className="relative border-t border-line bg-paper pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-float">
        <div className="flex">
          <div className="flex min-w-0 flex-1">
            {TABS_LEFT.map((tab) => (
              <TabLink key={tab.href} tab={tab} active={pathname === tab.href} />
            ))}
          </div>
          <div className="relative w-16 shrink-0">
            {/* The bar's paper swells around the FAB (profile-overview.png):
                a 42px collar arc easing into the flat edge through 10px
                concave fillets — one silhouette, so the curve meets the bar
                tangentially instead of a circle overlapping it. Painted above
                the bar, swallowing the top hairline across its base. */}
            <svg
              aria-hidden
              viewBox="0 0 160 64"
              className="pointer-events-none absolute -top-[58px] left-1/2 h-16 w-40 -translate-x-1/2"
              style={{ filter: "drop-shadow(0 1px 3px rgb(43 29 22 / 0.06))" }}
            >
              <path
                d="M28 58 A10 10 0 0 0 38 47.6 A42 42 0 1 1 122 47.6 A10 10 0 0 0 132 58 L132 60 L28 60 Z"
                fill="var(--color-paper)"
              />
            </svg>
            {/* The FAB is the diary's front door — logging a show is the
                app's recurring personal action. */}
            <button
              type="button"
              aria-label="Log a show"
              onClick={() => setLogOpen(true)}
              className="absolute -top-11 left-1/2 flex size-16 -translate-x-1/2 flex-col items-center justify-center gap-0.5 rounded-full bg-vermilion text-white shadow-float transition-transform duration-150 active:scale-[0.94]"
            >
              <NotebookPen className="size-6" strokeWidth={2} aria-hidden />
              <span className="text-label font-semibold">Log</span>
            </button>
          </div>
          <div className="flex min-w-0 flex-1">
            {TABS_RIGHT.map((tab) => (
              <TabLink key={tab.href} tab={tab} active={pathname === tab.href} />
            ))}
          </div>
        </div>
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
    </nav>
  );
}
