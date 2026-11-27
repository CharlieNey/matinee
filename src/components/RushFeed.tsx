"use client";

import { useMemo, useState } from "react";
import {
  Clock3,
  Search,
  X,
} from "lucide-react";
import { FilterChip } from "@/components/FilterChip";
import { OptionRow } from "@/components/OptionRow";
import { ProgramHead } from "@/components/ProgramHead";
import { PlatformTips } from "@/components/PlatformTips";
import { RushShowCard } from "@/components/RushShowCard";
import { Sheet } from "@/components/Sheet";
import { TktsRushSection } from "@/components/TktsBoard";
import {
  allPrograms,
  getProgramStatus,
  isProgramTrusted,
  Program,
  ProgramKind,
  ProgramPlatform,
  programPlatformLabel,
  ProgramStatus,
  ProgramStatusState,
} from "@/lib/programs";
import { getShow, Show } from "@/lib/shows";
import { useNow } from "@/lib/useNow";

type Entry = {
  program: Program;
  show: Show;
  status: ProgramStatus;
  /** Checked recently and confirmed by its source (isProgramTrusted). */
  trusted: boolean;
};

/** One rush-feed card: a show with every program it currently matches. */
type ShowGroup = {
  show: Show;
  entries: Entry[];
  sortKey: number;
};

type Bucket = "open" | "later" | "coming" | "unverified";

const BUCKET_RANK: Record<Bucket, number> = {
  open: 0,
  later: 1,
  coming: 2,
  unverified: 3,
};

/**
 * A row the app can't vouch for never counts as open: it files under
 * "Unverified", so "Open now" only ever lists windows we stand behind.
 */
function bucketOf(entry: Entry): Bucket {
  if (!entry.trusted) return "unverified";
  const state: ProgramStatusState = entry.status.state;
  if (state === "open" || state === "closes-soon") return "open";
  return state === "opens-later-today" ? "later" : "coming";
}

/** Within-bucket order: soonest deadline first, no-deadline windows last. */
function entrySortKey(entry: Entry): number {
  if (bucketOf(entry) === "open") {
    return entry.status.countdownMs ?? Number.MAX_SAFE_INTEGER;
  }
  return entry.status.nextOpenAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

type KindGroup = "all" | "lottery" | "rush" | "sro" | "student";

const KIND_GROUPS: Record<Exclude<KindGroup, "all">, ProgramKind[]> = {
  lottery: ["digital-lottery", "in-person-lottery"],
  rush: ["rush", "digital-rush"],
  sro: ["sro"],
  student: ["student-rush"],
};

const KIND_OPTIONS: { value: KindGroup; label: string }[] = [
  { value: "all", label: "All programs" },
  { value: "lottery", label: "Lotteries" },
  { value: "rush", label: "Rush" },
  { value: "sro", label: "Standing room" },
  { value: "student", label: "Student" },
];

const PLATFORMS: ProgramPlatform[] = [
  "broadway-direct",
  "lucky-seat",
  "telecharge",
  "todaytix",
  "official-site",
  "box-office",
];

/** Phase 12: the catalog spans both circuits; tier is the circuit field. */
type Circuit = "all" | "Broadway" | "Off-Broadway";
const CIRCUITS: Exclude<Circuit, "all">[] = ["Broadway", "Off-Broadway"];

function matchesKind(program: Program, kind: KindGroup): boolean {
  return kind === "all" || KIND_GROUPS[kind].includes(program.kind);
}

/** Estimated card height — header block + one line per program row. */
function cardWeight(group: ShowGroup): number {
  return 44 + 50 * group.entries.length;
}

/**
 * Order-preserving split into two web columns, balanced by estimated height.
 * Cards vary in height (1–4 program rows), so a shared grid leaves ragged
 * holes under short cards — each row as tall as its tallest card. Stacking
 * two independent columns keeps every vertical gap at exactly gap-3, and an
 * expanding row only pushes down its own column. Reading order is down the
 * left column then the right, which matches DOM (and mobile) order.
 */
function splitColumns(groups: ShowGroup[]): ShowGroup[][] {
  const total = groups.reduce((sum, group) => sum + cardWeight(group), 0);
  let best = groups.length;
  let bestDiff = Infinity;
  let prefix = 0;
  for (let k = 1; k <= groups.length; k++) {
    prefix += cardWeight(groups[k - 1]);
    const diff = Math.abs(total - 2 * prefix);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = k;
    }
  }
  return [groups.slice(0, best), groups.slice(best)].filter(
    (column) => column.length > 0,
  );
}

function FeedSection({
  title,
  groups,
  empty,
  note,
  now,
}: {
  title: string;
  groups: ShowGroup[];
  empty: string;
  /** One line under the header, for a section that needs explaining. */
  note?: string;
  now: Date;
}) {
  return (
    <section className="mt-10">
      {/* A program's section break: a serif head over a strong rule. */}
      <ProgramHead title={title} detail={groups.length} />
      {note && <p className="mt-2 text-caption text-ink-soft">{note}</p>}
      {groups.length > 0 ? (
        <div className="flex flex-col web:grid web:grid-cols-2 web:items-start web:gap-x-12">
          {splitColumns(groups).map((column, columnIndex, columns) => {
            const offset = columnIndex === 0 ? 0 : columns[0].length;
            return (
              // Mobile: `contents` dissolves the wrapper so cards stack as
              // one list. Web: each wrapper is an independent column.
              <div
                key={columnIndex}
                className="contents web:flex web:flex-col"
              >
                {column.map((group, index) => (
                  <div
                    key={group.show.slug}
                    className="card-enter"
                    style={
                      {
                        "--stagger": `${Math.min((offset + index) * 35, 210)}ms`,
                      } as React.CSSProperties
                    }
                  >
                    <RushShowCard
                      show={group.show}
                      entries={group.entries}
                      now={now}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-body text-ink-soft">{empty}</p>
      )}
    </section>
  );
}

export function RushFeed() {
  const now = useNow();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindGroup>("all");
  const [platform, setPlatform] = useState<ProgramPlatform | "all">("all");
  const [circuit, setCircuit] = useState<Circuit>("all");
  const [underFifty, setUnderFifty] = useState(false);
  const [sheet, setSheet] = useState<null | "kind" | "platform" | "circuit">(
    null,
  );

  const hasFilters =
    query.trim() !== "" ||
    kind !== "all" ||
    platform !== "all" ||
    circuit !== "all" ||
    underFifty;

  const clearFilters = () => {
    setQuery("");
    setKind("all");
    setPlatform("all");
    setCircuit("all");
    setUnderFifty(false);
  };

  const result = useMemo(() => {
    if (!now) return null;

    const entries = allPrograms()
      .map((program): Entry | null => {
        const show = getShow(program.showSlug);
        if (!show) return null;
        return {
          program,
          show,
          status: getProgramStatus(now, program),
          trusted: isProgramTrusted(program, now),
        };
      })
      .filter((entry): entry is Entry => entry !== null);

    const q = query.trim().toLowerCase();
    const matchesRest = ({ program, show }: Entry) =>
      (!underFifty || program.price < 50) &&
      (q === "" ||
        show.title.toLowerCase().includes(q) ||
        programPlatformLabel(program.platform).toLowerCase().includes(q));

    const matchesCircuit = (entry: Entry) =>
      circuit === "all" || entry.show.tier === circuit;

    const matches = entries.filter(
      (entry) =>
        matchesKind(entry.program, kind) &&
        (platform === "all" || entry.program.platform === platform) &&
        matchesCircuit(entry) &&
        matchesRest(entry),
    );

    // Faceted counts (the app's filter idiom): each sheet's numbers reflect
    // the *other* active filters, so they read as live inventory.
    const kindPool = entries.filter(
      (e) =>
        (platform === "all" || e.program.platform === platform) &&
        matchesCircuit(e) &&
        matchesRest(e),
    );
    const kindCounts = Object.fromEntries(
      KIND_OPTIONS.map(({ value }) => [
        value,
        value === "all"
          ? kindPool.length
          : kindPool.filter((e) => matchesKind(e.program, value)).length,
      ]),
    ) as Record<KindGroup, number>;

    const platformPool = entries.filter(
      (e) => matchesKind(e.program, kind) && matchesCircuit(e) && matchesRest(e),
    );
    const platformCounts = Object.fromEntries([
      ["all", platformPool.length],
      ...PLATFORMS.map((p) => [
        p,
        platformPool.filter((e) => e.program.platform === p).length,
      ]),
    ]) as Record<ProgramPlatform | "all", number>;

    const circuitPool = entries.filter(
      (e) =>
        matchesKind(e.program, kind) &&
        (platform === "all" || e.program.platform === platform) &&
        matchesRest(e),
    );
    const circuitCounts = Object.fromEntries([
      ["all", circuitPool.length],
      ...CIRCUITS.map((c) => [
        c,
        circuitPool.filter((e) => e.show.tier === c).length,
      ]),
    ]) as Record<Circuit, number>;

    // One card per show: rows sorted most-actionable first, the card filed
    // under its best program's bucket so a show never appears twice.
    const byShow = new Map<string, Entry[]>();
    for (const entry of matches) {
      const list = byShow.get(entry.program.showSlug);
      if (list) list.push(entry);
      else byShow.set(entry.program.showSlug, [entry]);
    }

    const sections: Record<Bucket, ShowGroup[]> = {
      open: [],
      later: [],
      coming: [],
      unverified: [],
    };
    for (const list of byShow.values()) {
      list.sort(
        (a, b) =>
          BUCKET_RANK[bucketOf(a)] - BUCKET_RANK[bucketOf(b)] ||
          entrySortKey(a) - entrySortKey(b) ||
          a.program.price - b.program.price,
      );
      const best = list[0];
      sections[bucketOf(best)].push({
        show: best.show,
        entries: list,
        sortKey: entrySortKey(best),
      });
    }
    for (const groups of Object.values(sections)) {
      groups.sort((a, b) => a.sortKey - b.sortKey);
    }

    return {
      total: entries.length,
      matched: matches.length,
      programs: matches.map((entry) => entry.program),
      kindCounts,
      platformCounts,
      circuitCounts,
      open: sections.open,
      later: sections.later,
      coming: sections.coming,
      unverified: sections.unverified,
    };
  }, [now, query, kind, platform, circuit, underFifty]);

  if (!now || !result) {
    return (
      <div className="mt-8" aria-live="polite">
        <div className="flex items-center gap-2 text-body text-ink-soft">
          <Clock3 className="size-5" strokeWidth={1.8} />
          Checking today&apos;s entry windows…
        </div>
        <div
          className="mt-4 space-y-3 web:grid web:grid-cols-2 web:items-start web:gap-3 web:space-y-0"
          aria-hidden
        >
          {[190, 150, 150, 190].map((height, item) => (
            <div
              key={item}
              className="animate-pulse rounded-card bg-paper"
              style={{ height }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search; the platform tips sit at the end of the chip row. */}
      <div className="mt-5 flex items-center gap-2.5">
        <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 border-b border-ink/25 web:max-w-[420px]">
          <Search className="size-4 shrink-0 text-ink-soft" strokeWidth={1.8} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shows or platforms"
            aria-label="Search programs by show or platform"
            className="h-full w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
          />
          {query !== "" && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="p-1 text-ink-soft transition-transform duration-150 active:scale-90"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Filters — the app's filter idiom: a few chips, sheets carry the
          options with live faceted counts (DESIGN.md §5). */}
      <div className="-mx-4 mt-2 flex gap-5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] web:mx-0 web:px-0">
        <FilterChip
          plain
          label={
            kind === "all"
              ? "Program"
              : KIND_OPTIONS.find((o) => o.value === kind)!.label
          }
          active={kind !== "all"}
          onClick={() => setSheet("kind")}
        />
        <FilterChip
          plain
          label={platform === "all" ? "Platform" : programPlatformLabel(platform)}
          active={platform !== "all"}
          onClick={() => setSheet("platform")}
        />
        <FilterChip
          plain
          label={circuit === "all" ? "Circuit" : circuit}
          active={circuit !== "all"}
          onClick={() => setSheet("circuit")}
        />
        <FilterChip
          plain
          label="Under $50"
          chevron={false}
          active={underFifty}
          onClick={() => setUnderFifty((v) => !v)}
        />
        <PlatformTips programs={result.programs} chip plain />
      </div>

      {hasFilters && (
        <p className="mt-3 text-caption text-ink-soft">
          <b className="font-semibold text-ink">{result.matched}</b> of{" "}
          {result.total} programs ·{" "}
          <button
            type="button"
            onClick={clearFilters}
            className="font-semibold text-ink underline underline-offset-2"
          >
            Clear filters
          </button>
        </p>
      )}

      {hasFilters && result.matched === 0 ? (
        <p className="mt-6 rounded-card bg-paper px-4 py-6 text-center text-body text-ink-faint">
          Nothing matches. Try widening a filter.
        </p>
      ) : (
        <>
          <FeedSection
            title="Open now"
            groups={result.open}
            empty={
              result.later.length > 0
                ? "Nothing is open right now. Below: what opens later today."
                : "Nothing is open right now."
            }
            now={now}
          />
          {/* A section with nothing in it isn't drawn: two empty boxes in a
              row said nothing twice. */}
          {result.later.length > 0 && (
            <FeedSection
              title="Later today"
              groups={result.later}
              empty=""
              now={now}
            />
          )}
          {result.coming.length > 0 && (
            <FeedSection
              title="Coming up"
              groups={result.coming}
              empty=""
              now={now}
            />
          )}
          {result.unverified.length > 0 && (
            <FeedSection
              title="Unverified"
              groups={result.unverified}
              empty=""
              note="We couldn't confirm these with the official source, so they send no alerts. Check the entry site before you go."
              now={now}
            />
          )}

          {/* Walk-up inventory, not an entry window — its own section */}
          <TktsRushSection />
        </>
      )}

      <Sheet
        open={sheet === "kind"}
        onClose={() => setSheet(null)}
        title="Program"
      >
        <div className="mt-4 flex flex-col gap-2.5">
          {KIND_OPTIONS.map((option) => (
            <OptionRow
              key={option.value}
              label={option.label}
              count={result.kindCounts[option.value]}
              selected={kind === option.value}
              onSelect={() => {
                setKind(option.value);
                setSheet(null);
              }}
            />
          ))}
        </div>
      </Sheet>

      <Sheet
        open={sheet === "circuit"}
        onClose={() => setSheet(null)}
        title="Circuit"
      >
        <div className="mt-4 flex flex-col gap-2.5">
          <OptionRow
            label="All circuits"
            count={result.circuitCounts.all}
            selected={circuit === "all"}
            onSelect={() => {
              setCircuit("all");
              setSheet(null);
            }}
          />
          {CIRCUITS.map((c) => (
            <OptionRow
              key={c}
              label={c}
              count={result.circuitCounts[c]}
              selected={circuit === c}
              onSelect={() => {
                setCircuit(c);
                setSheet(null);
              }}
            />
          ))}
        </div>
      </Sheet>

      <Sheet
        open={sheet === "platform"}
        onClose={() => setSheet(null)}
        title="Platform"
      >
        <div className="mt-4 flex flex-col gap-2.5">
          <OptionRow
            label="All platforms"
            count={result.platformCounts.all}
            selected={platform === "all"}
            onSelect={() => {
              setPlatform("all");
              setSheet(null);
            }}
          />
          {PLATFORMS.map((p) => (
            <OptionRow
              key={p}
              label={programPlatformLabel(p)}
              count={result.platformCounts[p]}
              selected={platform === p}
              onSelect={() => {
                setPlatform(p);
                setSheet(null);
              }}
            />
          ))}
        </div>
      </Sheet>
    </div>
  );
}
