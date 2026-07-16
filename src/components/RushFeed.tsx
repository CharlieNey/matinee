"use client";

import { useMemo, useState } from "react";
import { Clock3, Search, X } from "lucide-react";
import { PlatformTips } from "@/components/PlatformTips";
import { ProgramCard } from "@/components/ProgramCard";
import {
  allPrograms,
  getProgramStatus,
  Program,
  ProgramKind,
  ProgramPlatform,
  programPlatformLabel,
  ProgramStatus,
} from "@/lib/programs";
import { getShow, Show } from "@/lib/shows";
import { useNow } from "@/lib/useNow";

type Entry = {
  program: Program;
  show: Show;
  status: ProgramStatus;
};

type KindGroup = "all" | "lottery" | "rush" | "sro" | "student";

const KIND_GROUPS: Record<Exclude<KindGroup, "all">, ProgramKind[]> = {
  lottery: ["digital-lottery", "in-person-lottery"],
  rush: ["rush", "digital-rush"],
  sro: ["sro"],
  student: ["student-rush"],
};

const KIND_CHIPS: { value: KindGroup; label: string }[] = [
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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 shrink-0 rounded-full px-3.5 text-caption font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
        active ? "bg-espresso text-white" : "bg-paper text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

function FeedSection({
  title,
  entries,
  empty,
  now,
}: {
  title: string;
  entries: Entry[];
  empty: string;
  now: Date;
}) {
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-heading">{title}</h2>
        <span className="text-caption text-ink-soft">{entries.length}</span>
      </div>
      {entries.length > 0 ? (
        <div className="mt-3 space-y-3 web:grid web:grid-cols-2 web:gap-3 web:space-y-0">
          {entries.map((entry, index) => (
            <div
              key={`${entry.program.showSlug}-${entry.program.kind}-${entry.program.platform}`}
              className="card-enter"
              style={{ animationDelay: `${Math.min(index * 35, 210)}ms` }}
            >
              <ProgramCard {...entry} now={now} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-card bg-paper px-4 py-5 text-body text-ink-soft">
          {empty}
        </p>
      )}
    </section>
  );
}

export function RushFeed() {
  const now = useNow();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindGroup>("all");
  const [platform, setPlatform] = useState<ProgramPlatform | "all">("all");
  const [underFifty, setUnderFifty] = useState(false);

  const hasFilters =
    query.trim() !== "" || kind !== "all" || platform !== "all" || underFifty;

  const clearFilters = () => {
    setQuery("");
    setKind("all");
    setPlatform("all");
    setUnderFifty(false);
  };

  const result = useMemo(() => {
    if (!now) return null;

    const entries = allPrograms()
      .map((program): Entry | null => {
        const show = getShow(program.showSlug);
        if (!show) return null;
        return { program, show, status: getProgramStatus(now, program) };
      })
      .filter((entry): entry is Entry => entry !== null);

    const q = query.trim().toLowerCase();
    const matches = entries.filter(
      ({ program, show }) =>
        (kind === "all" || KIND_GROUPS[kind].includes(program.kind)) &&
        (platform === "all" || program.platform === platform) &&
        (!underFifty || program.price < 50) &&
        (q === "" ||
          show.title.toLowerCase().includes(q) ||
          programPlatformLabel(program.platform).toLowerCase().includes(q)),
    );

    const open = matches
      .filter(({ status }) => ["open", "closes-soon"].includes(status.state))
      .sort((a, b) => {
        if (a.status.countdownMs === null) return 1;
        if (b.status.countdownMs === null) return -1;
        return a.status.countdownMs - b.status.countdownMs;
      });
    const later = matches
      .filter(({ status }) => status.state === "opens-later-today")
      .sort(
        (a, b) =>
          (a.status.nextOpenAt?.getTime() ?? 0) -
          (b.status.nextOpenAt?.getTime() ?? 0),
      );
    const coming = matches
      .filter(({ status }) =>
        ["closed-today", "next-open-day"].includes(status.state),
      )
      .sort(
        (a, b) =>
          (a.status.nextOpenAt?.getTime() ?? Infinity) -
          (b.status.nextOpenAt?.getTime() ?? Infinity),
      );

    return {
      total: entries.length,
      matched: matches.length,
      programs: matches.map((entry) => entry.program),
      open,
      later,
      coming,
    };
  }, [now, query, kind, platform, underFifty]);

  if (!now || !result) {
    return (
      <div className="mt-8" aria-live="polite">
        <div className="flex items-center gap-2 text-body text-ink-soft">
          <Clock3 className="size-5" strokeWidth={1.8} />
          Checking today&apos;s entry windows…
        </div>
        <div className="mt-4 space-y-3" aria-hidden>
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-[190px] animate-pulse rounded-card bg-paper" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="mt-5 flex h-12 items-center gap-2.5 rounded-full bg-paper px-4 web:max-w-[420px]">
        <Search className="size-5 shrink-0 text-ink-soft" strokeWidth={1.8} />
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

      {/* Program-kind chips */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] web:mx-0 web:flex-wrap web:overflow-visible web:px-0">
        {KIND_CHIPS.map((chip) => (
          <Chip
            key={chip.value}
            active={kind === chip.value}
            onClick={() => setKind(chip.value)}
          >
            {chip.label}
          </Chip>
        ))}
      </div>

      {/* Platform + price chips */}
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] web:mx-0 web:flex-wrap web:overflow-visible web:px-0">
        <Chip active={underFifty} onClick={() => setUnderFifty((v) => !v)}>
          Under $50
        </Chip>
        {PLATFORMS.map((p) => (
          <Chip
            key={p}
            active={platform === p}
            onClick={() => setPlatform(platform === p ? "all" : p)}
          >
            {programPlatformLabel(p)}
          </Chip>
        ))}
      </div>

      {/* Platform folk knowledge, deduped — reacts to the active filters */}
      <PlatformTips programs={result.programs} />

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
            entries={result.open}
            empty="Nothing is open right now. Check what starts later today."
            now={now}
          />
          <FeedSection
            title="Later today"
            entries={result.later}
            empty="No more entry windows open later today."
            now={now}
          />
          <FeedSection
            title="Coming up"
            entries={result.coming}
            empty="No upcoming programs found."
            now={now}
          />
        </>
      )}
    </div>
  );
}
