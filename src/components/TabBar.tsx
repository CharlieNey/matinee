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

/* Four flat, evenly spaced tabs — Discover, Log, Rush, Profile. Log opens the
   diary sheet instead of navigating; it sits flush (no raised FAB) and is
   styled like the other tabs. District was pulled from the bar to
   de-emphasize it — it lives as a quick-link on Discover now. */
const TABS: Tab[] = [
  { href: "/", label: "Discover", Icon: CompassGlyph },
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

/* Log is an action, not a destination — a flush tab that opens the diary
   sheet, styled to match the other tabs' resting state. */
function LogTab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Log a show"
      className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-ink-faint transition-[color,transform] duration-200 active:scale-95"
    >
      <NotebookPen className="size-7" strokeWidth={1.9} aria-hidden />
      <span className="truncate text-label">Log</span>
    </button>
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
          <TabLink tab={TABS[0]} active={pathname === TABS[0].href} />
          <LogTab onClick={() => setLogOpen(true)} />
          <TabLink tab={TABS[1]} active={pathname === TABS[1].href} />
          <TabLink tab={TABS[2]} active={pathname === TABS[2].href} />
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
