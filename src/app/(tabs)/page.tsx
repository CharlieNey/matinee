"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarRange,
  ChevronRight,
  CircleDollarSign,
  Map as MapIcon,
  Search,
  Theater,
  TicketPercent,
  X,
  Zap,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { FilterChip } from "@/components/FilterChip";
import { OptionRow } from "@/components/OptionRow";
import { Poster } from "@/components/Poster";
import { RushBanner } from "@/components/RushBanner";
import { Sheet } from "@/components/Sheet";
import { ShowCard } from "@/components/ShowCard";
import { cheapestProgram } from "@/lib/programs";
import { useApp } from "@/lib/store";
import { allShows, Show } from "@/lib/shows";
import { boardIsToday } from "@/lib/tkts";
import { useTkts } from "@/lib/useTkts";

const CIRCUIT_OPTIONS = ["All shows", "Broadway", "Off-Broadway"] as const;
type CircuitFilter = (typeof CIRCUIT_OPTIONS)[number];

/** Sort key for the Cheapest toggle — the cheapest verified way in. */
function wayInPrice(show: Show): number {
  const program = cheapestProgram(show.slug);
  if (program) return program.price;
  return show.faceValue > 0 ? show.faceValue : 0;
}

function PosterShelf({
  shows,
  claimName,
}: {
  shows: Show[];
  claimName: (slug: string) => string | undefined;
}) {
  return (
    <div className="-mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {shows.map((show, i) => (
        <Link
          key={show.slug}
          href={`/shows/${show.slug}`}
          className="card-enter w-[104px] shrink-0 transition-transform duration-150 active:scale-[0.96]"
          style={{ "--stagger": `${Math.min(i * 30, 240)}ms` } as React.CSSProperties}
          aria-label={show.title}
        >
          <Poster
            show={show}
            className="w-full rounded-thumb"
            name={claimName(show.slug)}
          />
          <p className="mt-1.5 truncate text-caption font-medium text-ink">
            {show.title}
          </p>
        </Link>
      ))}
    </div>
  );
}

/** Utility destination: an iOS-style list row, not a dashboard tile. */
function QuickLink({
  href,
  icon,
  title,
  sub,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 border-t border-line py-3.5 transition-opacity duration-150 first:border-t-0 active:opacity-70"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold">{title}</span>
        <span className="mt-0.5 block truncate text-caption text-ink-soft">
          {sub}
        </span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-ink-faint"
        strokeWidth={1.8}
      />
    </Link>
  );
}

function SectionHead({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mt-8 flex items-baseline justify-between">
      <h2 className="eyebrow">{title}</h2>
      {detail && <span className="text-caption text-ink-soft">{detail}</span>}
    </div>
  );
}

/**
 * Discover, now the home page (Phase 14): the whole catalog and the cheapest
 * way into each show — the browse grid the Marketplace tab used to fake with
 * seed listings, now answered from the curated programs dataset.
 */
export default function DiscoverPage() {
  const { savedShows, attended, follows } = useApp();
  const tkts = useTkts();

  const [query, setQuery] = useState("");
  const [circuit, setCircuit] = useState<CircuitFilter>("Broadway");
  const [rushOnly, setRushOnly] = useState(false);
  const [tktsOnly, setTktsOnly] = useState(false);
  const [cheapest, setCheapest] = useState(false);
  const [sheet, setSheet] = useState<null | "circuit">(null);

  // Shows on today's TKTS board — live external data, never demo time.
  const tktsToday = useMemo(() => {
    const slugs = new Set<string>();
    if (!tkts) return slugs;
    const realNow = new Date();
    for (const booth of tkts.booths) {
      for (const board of booth.boards) {
        if (!boardIsToday(board.updatedAt, realNow)) continue;
        for (const row of board.rows) {
          if (row.showSlug) slugs.add(row.showSlug);
        }
      }
    }
    return slugs;
  }, [tkts]);

  const catalog = allShows();

  // Search spans the whole catalog (any circuit), independent of the chips.
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const searchResults = useMemo(
    () =>
      q
        ? catalog.filter((s) =>
            [s.title, s.venue, s.genre, s.tier].some((v) =>
              v.toLowerCase().includes(q),
            ),
          )
        : [],
    [catalog, q],
  );

  const filtered = useMemo(() => {
    let result = catalog;
    if (circuit !== "All shows")
      result = result.filter((s) => s.tier === circuit);
    if (rushOnly)
      result = result.filter((s) => cheapestProgram(s.slug) !== null);
    if (tktsOnly) result = result.filter((s) => tktsToday.has(s.slug));
    if (cheapest)
      result = [...result].sort((a, b) => wayInPrice(a) - wayInPrice(b));
    return result;
  }, [catalog, circuit, rushOnly, tktsOnly, cheapest, tktsToday]);

  // Faceted counts: the circuit sheet shows results with the other filters on.
  const circuitCounts = useMemo(() => {
    let pool = catalog;
    if (rushOnly) pool = pool.filter((s) => cheapestProgram(s.slug) !== null);
    if (tktsOnly) pool = pool.filter((s) => tktsToday.has(s.slug));
    return Object.fromEntries(
      CIRCUIT_OPTIONS.map((c) => [
        c,
        c === "All shows"
          ? pool.length
          : pool.filter((s) => s.tier === c).length,
      ]),
    );
  }, [catalog, rushOnly, tktsOnly, tktsToday]);

  const forYou = useMemo(() => {
    const taken = new Set([
      ...savedShows.map((s) => s.slug),
      ...attended.map((s) => s.slug),
      ...follows.map((f) => f.show.slug),
    ]);
    return catalog.filter((s) => !taken.has(s.slug)).slice(0, 6);
  }, [catalog, savedShows, attended, follows]);

  const reason = savedShows[0] ?? attended[0];

  // A show can sit in the grid and a shelf, but a shared-element name may
  // appear only once per page — the first surface listing a slug owns it.
  const nameOwners = useMemo(() => {
    const owners = new Map<string, number>();
    [savedShows, filtered, attended, forYou].forEach((shows, surface) => {
      for (const s of shows) {
        if (!owners.has(s.slug)) owners.set(s.slug, surface);
      }
    });
    return owners;
  }, [savedShows, filtered, attended, forYou]);

  const claimFor = (surface: number) => (slug: string) =>
    nameOwners.get(slug) === surface ? `poster-${slug}` : undefined;

  const cardTransition = (i: number) => ({
    duration: 0.25,
    ease: "easeOut" as const,
    delay: Math.min(i * 0.04, 0.3),
  });

  return (
    <main className="px-4 pt-6 web:mx-auto web:max-w-[1160px] web:px-6">
      <h1 className="text-display">Discover</h1>

      <div className="mt-4 flex h-12 items-center gap-2.5 rounded-full bg-paper px-4 focus-within:ring-2 focus-within:ring-espresso/15">
        <Search className="size-5 shrink-0 text-ink-soft" strokeWidth={1.9} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search shows"
          placeholder="Search shows, venues, genres"
          className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-faint"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="-mr-2 grid size-9 shrink-0 place-items-center text-ink-soft"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {searching ? (
        searchResults.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 items-start gap-3 web:md:grid-cols-3 web:lg:grid-cols-4">
            {searchResults.map((show) => (
              <ShowCard
                key={show.slug}
                show={show}
                posterName={`poster-${show.slug}`}
                onTktsToday={tktsToday.has(show.slug)}
              />
            ))}
          </div>
        ) : (
          <div className="pt-10">
            <EmptyState
              text={`No shows match “${query.trim()}”.`}
              actionLabel="Clear search"
              onAction={() => setQuery("")}
            />
          </div>
        )
      ) : (
        <>
          <RushBanner />

          <div className="mt-3 rounded-card bg-paper px-4">
            <QuickLink
              href="/district"
              icon={<MapIcon className="size-5 text-ink" strokeWidth={1.8} />}
              title="The District"
              sub="Every Broadway house, one live map"
            />
            <QuickLink
              href="/trip"
              icon={
                <CalendarRange className="size-5 text-ink" strokeWidth={1.8} />
              }
              title="Trip mode"
              sub="Day-by-day windows for your visit"
            />
          </div>

          {savedShows.length > 0 && (
            <>
              <SectionHead
                title="Interested"
                detail={`${savedShows.length} show${savedShows.length === 1 ? "" : "s"}`}
              />
              <PosterShelf shows={savedShows} claimName={claimFor(0)} />
            </>
          )}

          <SectionHead title="Now playing" detail={`${filtered.length} shows`} />
          <div className="-mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            <FilterChip
              icon={<Theater className="size-5" strokeWidth={1.8} />}
              label={circuit}
              active={circuit !== "All shows"}
              onClick={() => setSheet("circuit")}
            />
            <FilterChip
              icon={<Zap className="size-5" strokeWidth={1.8} />}
              label="Rush & lottery"
              chevron={false}
              active={rushOnly}
              onClick={() => setRushOnly((v) => !v)}
            />
            {tktsToday.size > 0 && (
              <FilterChip
                icon={<TicketPercent className="size-5" strokeWidth={1.8} />}
                label="On TKTS today"
                chevron={false}
                active={tktsOnly}
                onClick={() => setTktsOnly((v) => !v)}
              />
            )}
            <FilterChip
              icon={<CircleDollarSign className="size-5" strokeWidth={1.8} />}
              label="Cheapest"
              chevron={false}
              active={cheapest}
              onClick={() => setCheapest((v) => !v)}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="pt-6">
              <EmptyState
                text="Nothing matches your filters…"
                actionLabel="Clear filters"
                onAction={() => {
                  setCircuit("Broadway");
                  setRushOnly(false);
                  setTktsOnly(false);
                }}
              />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 items-start gap-3 web:md:grid-cols-3 web:lg:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((show, i) => (
                  <motion.div
                    key={show.slug}
                    layout
                    initial={{ y: 10 }}
                    animate={{ y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={cardTransition(i)}
                  >
                    <ShowCard
                      show={show}
                      posterName={claimFor(1)(show.slug)}
                      onTktsToday={tktsToday.has(show.slug)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          <SectionHead
            title="Attended"
            detail={`${attended.length} logged`}
          />
          <PosterShelf shows={attended} claimName={claimFor(2)} />

          <SectionHead title="For you" />
          {reason && (
            <p className="mt-1 text-caption text-ink-soft">
              Because you {savedShows[0] ? "saved" : "attended"} {reason.title}
            </p>
          )}
          <PosterShelf shows={forYou} claimName={claimFor(3)} />
        </>
      )}

      <Sheet
        open={sheet === "circuit"}
        onClose={() => setSheet(null)}
        title="Circuit"
      >
        <div className="mt-4 flex flex-col gap-2.5">
          {CIRCUIT_OPTIONS.map((option) => (
            <OptionRow
              key={option}
              label={option}
              count={circuitCounts[option]}
              selected={circuit === option}
              onSelect={() => {
                setCircuit(option);
                setSheet(null);
              }}
            />
          ))}
        </div>
      </Sheet>
    </main>
  );
}
