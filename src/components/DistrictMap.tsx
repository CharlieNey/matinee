"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import { Poster } from "@/components/Poster";
import { Sheet } from "@/components/Sheet";
import { officialTicketsForShow } from "@/lib/officialTickets";
import {
  getProgramStatus,
  ProgramStatus,
  programKindLabel,
  programsForShow,
} from "@/lib/programs";
import { Show } from "@/lib/shows";
import {
  allTheaters,
  currentShowAt,
  Theater,
  Ticketer,
  TICKETER_LABELS,
} from "@/lib/theaters";
import { useNow } from "@/lib/useNow";

/*
 * Hand-drawn SVG of the theater district — a stylized diagram, not geography
 * (DESIGN.md ethos: a hand-drawn map of hand-curated data). Grid: W 41st–54th
 * as rows, 8th/7th/6th Avenues as columns, Broadway cutting the diagonal.
 */

const VIEW_W = 1000;
const VIEW_H = 1150;
const Y_TOP = 60;
const ROW = 76;
const AVE_8 = 110;
const AVE_7 = 560;
const AVE_6 = 920;

function streetY(street: number): number {
  return Y_TOP + (54 - street) * ROW;
}

/** Broadway's diagonal, fitted through the on-Broadway houses. */
function broadwayX(y: number): number {
  return 630 - (280 * (streetY(41) - y)) / (streetY(41) - streetY(54));
}

const TICKETER_COLORS: Record<Ticketer, string> = {
  telecharge: "var(--color-espresso)",
  "broadway-direct": "var(--color-vermilion)",
  atg: "var(--color-gold)",
  own: "var(--color-sage-ink)",
};

const LEGEND: { ticketer: Ticketer; label: string }[] = [
  { ticketer: "telecharge", label: "Shubert → Telecharge" },
  { ticketer: "broadway-direct", label: "Nederlander & Disney → Broadway Direct" },
  { ticketer: "atg", label: "ATG → ATG Tickets" },
  { ticketer: "own", label: "Nonprofits → own box office" },
];

const INSET = { x: 700, y: 952, w: 250, h: 128 };

function statusLine(status: ProgramStatus): string {
  const minutes =
    status.countdownMs !== null
      ? Math.max(1, Math.round(status.countdownMs / 60_000))
      : null;
  const countdown =
    minutes === null
      ? null
      : minutes >= 60
        ? `${Math.floor(minutes / 60)} hr ${minutes % 60} min`
        : `${minutes} min`;

  switch (status.state) {
    case "open":
      return status.whileSuppliesLast
        ? "Open · while supplies last"
        : `Open · ${countdown} left`;
    case "closes-soon":
      return `Closes in ${countdown}`;
    case "opens-later-today":
      return `Opens in ${countdown}`;
    case "closed-today":
      return "Closed today";
    case "next-open-day":
      return "Opens later this week";
  }
}

type Entry = {
  theater: Theater;
  show: Show | undefined;
  statuses: { kind: string; price: number; line: string; live: boolean }[];
  hasOpen: boolean;
};

export function DistrictMap() {
  const now = useNow();
  const [filter, setFilter] = useState<Ticketer | null>(null);
  const [selected, setSelected] = useState<Theater | null>(null);

  const entries = useMemo<Entry[]>(
    () =>
      allTheaters().map((theater) => {
        const show = currentShowAt(theater);
        const statuses = (show && now ? programsForShow(show.slug) : []).map(
          (program) => {
            const status = getProgramStatus(now!, program);
            const live =
              status.state === "open" || status.state === "closes-soon";
            return {
              kind: programKindLabel(program.kind),
              price: program.price,
              line: statusLine(status),
              live,
            };
          },
        );
        return {
          theater,
          show,
          statuses,
          hasOpen: statuses.some((s) => s.live),
        };
      }),
    [now],
  );

  const openCount = entries.filter((e) => e.hasOpen).length;
  const selectedEntry = selected
    ? entries.find((e) => e.theater === selected)
    : null;

  const dimmed = (t: Theater) => filter !== null && t.ticketer !== filter;

  return (
    <div>
      {/* Legend — doubles as the who-sells-what explainer */}
      <div className="flex flex-wrap gap-2">
        {LEGEND.map(({ ticketer, label }) => {
          const active = filter === ticketer;
          return (
            <button
              key={ticketer}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(active ? null : ticketer)}
              className={`flex h-9 items-center gap-2 rounded-full bg-paper px-3.5 text-caption font-semibold transition-[opacity,transform] duration-150 active:scale-[0.97] ${
                filter !== null && !active ? "opacity-40" : ""
              }`}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: TICKETER_COLORS[ticketer] }}
              />
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-caption text-ink-soft">
        <b className="font-semibold text-ink">{openCount}</b> theater
        {openCount === 1 ? "" : "s"} with an entry window open right now ·
        hollow dots are dark theaters
      </p>

      <div className="mt-4 rounded-card bg-paper p-3 web:p-5">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="group"
          aria-label="Map of Broadway theaters, W 41st to W 54th Street"
          className="w-full"
        >
          {/* Streets */}
          {Array.from({ length: 14 }, (_, i) => 41 + i).map((street) => (
            <g key={street}>
              <line
                x1={64}
                y1={streetY(street)}
                x2={950}
                y2={streetY(street)}
                stroke="var(--color-line)"
                strokeWidth={1.5}
              />
              <text
                x={10}
                y={streetY(street) + 4}
                fontSize={13}
                fontWeight={500}
                fill="var(--color-ink-faint)"
              >
                W {street}
              </text>
            </g>
          ))}

          {/* Avenues */}
          {[
            { x: AVE_8, label: "8th Ave" },
            { x: AVE_7, label: "7th Ave" },
            { x: AVE_6, label: "6th Ave" },
          ].map(({ x, label }) => (
            <g key={label}>
              <line
                x1={x}
                y1={30}
                x2={x}
                y2={1085}
                stroke="var(--color-line)"
                strokeWidth={2.5}
              />
              <text
                x={x}
                y={20}
                fontSize={13}
                fontWeight={600}
                fill="var(--color-ink-soft)"
                textAnchor="middle"
              >
                {label}
              </text>
            </g>
          ))}

          {/* Broadway */}
          <line
            x1={broadwayX(1085)}
            y1={1085}
            x2={broadwayX(30)}
            y2={30}
            stroke="var(--color-ink-faint)"
            strokeWidth={2.5}
          />
          <text
            fontSize={13}
            fontWeight={600}
            fill="var(--color-ink-soft)"
            transform={`translate(${broadwayX(210) + 14} 210) rotate(74)`}
          >
            Broadway
          </text>
          <text
            x={AVE_7 + 14}
            y={streetY(45) - 30}
            fontSize={12}
            fill="var(--color-ink-faint)"
          >
            Times Sq
          </text>

          {/* Lincoln Center inset */}
          <g>
            <rect
              x={INSET.x}
              y={INSET.y}
              width={INSET.w}
              height={INSET.h}
              rx={16}
              fill="var(--color-cream)"
              stroke="var(--color-line)"
              strokeWidth={1.5}
            />
            <text
              x={INSET.x + 18}
              y={INSET.y + 30}
              fontSize={13}
              fontWeight={600}
              fill="var(--color-ink-soft)"
            >
              Lincoln Center
            </text>
            <text
              x={INSET.x + 18}
              y={INSET.y + 50}
              fontSize={12}
              fill="var(--color-ink-faint)"
            >
              W 65th St · off-grid
            </text>
          </g>

          {/* Theaters */}
          {entries.map(({ theater, show, hasOpen }) => {
            const cx = theater.inset ? INSET.x + 40 : theater.x;
            const cy = theater.inset ? INSET.y + 88 : streetY(theater.street);
            const color = TICKETER_COLORS[theater.ticketer];
            const dark = !show;
            const isSelected = selected === theater;
            return (
              <g
                key={theater.name}
                role="button"
                tabIndex={0}
                aria-label={`${theater.name}${show ? ` — ${show.title}` : " — dark"}`}
                onClick={() => setSelected(theater)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(theater);
                  }
                }}
                style={{
                  cursor: "pointer",
                  opacity: dimmed(theater) ? 0.18 : 1,
                  transition: "opacity 150ms ease-out",
                }}
              >
                <title>
                  {theater.name}
                  {show ? ` · ${show.title}` : " · dark"}
                </title>
                {/* generous hit area */}
                <circle cx={cx} cy={cy} r={22} fill="transparent" />
                {hasOpen && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={16}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.5}
                    opacity={0.45}
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={9}
                  fill={dark ? "var(--color-inset)" : color}
                  stroke={
                    isSelected
                      ? "var(--color-ink)"
                      : dark
                        ? "var(--color-ink-faint)"
                        : "var(--color-paper)"
                  }
                  strokeWidth={isSelected ? 3 : 2}
                />
                {theater.inset && (
                  <text
                    x={cx + 22}
                    y={cy + 5}
                    fontSize={13}
                    fontWeight={600}
                    fill="var(--color-ink)"
                  >
                    Vivian Beaumont
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Theater card */}
      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
      >
        {selectedEntry && (
          <div className="mt-5">
            <p className="flex items-center gap-2 text-caption text-ink-soft">
              <MapPin className="size-4 shrink-0" strokeWidth={1.8} />
              {selectedEntry.theater.address} ·{" "}
              {selectedEntry.theater.owner}
            </p>

            {selectedEntry.show ? (
              <>
                <div className="mt-4 flex items-center gap-4">
                  <Poster
                    show={selectedEntry.show}
                    className="w-[72px] rounded-thumb"
                  />
                  <div className="min-w-0">
                    <h3 className="text-title">{selectedEntry.show.title}</h3>
                    <p className="mt-1 text-body text-ink-soft">
                      {selectedEntry.show.tier} · {selectedEntry.show.genre}
                    </p>
                  </div>
                </div>

                {(() => {
                  const official = officialTicketsForShow(
                    selectedEntry.show.slug,
                  );
                  return official ? (
                    <a
                      href={official.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex h-12 items-center justify-between rounded-full bg-cream px-4 text-body font-semibold transition-transform duration-150 active:scale-[0.98]"
                    >
                      Buy at {official.provider}
                      <ExternalLink
                        className="size-4 text-ink-soft"
                        strokeWidth={2}
                      />
                    </a>
                  ) : (
                    <p className="mt-4 text-caption text-ink-soft">
                      Tickets at the {TICKETER_LABELS[
                        selectedEntry.theater.ticketer
                      ].toLowerCase()}
                      .
                    </p>
                  );
                })()}

                {selectedEntry.statuses.length > 0 && (
                  <div className="mt-4 divide-y divide-line rounded-card bg-inset px-4">
                    {selectedEntry.statuses.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-baseline justify-between py-3"
                      >
                        <span className="text-body">
                          {s.kind} ·{" "}
                          <b className="font-semibold">${s.price}</b>
                        </span>
                        <span
                          className={`text-caption ${
                            s.live
                              ? "font-semibold text-sage-ink"
                              : "text-ink-soft"
                          }`}
                        >
                          {s.line}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <Link
                  href={`/shows/${selectedEntry.show.slug}`}
                  className="mt-5 flex h-14 w-full items-center justify-center rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform] duration-150 active:scale-[0.98] active:bg-vermilion-pressed"
                >
                  View show page
                </Link>
              </>
            ) : (
              <p className="mt-5 text-body text-ink-faint">
                Dark — no production currently listed. Tickets here sell
                through {TICKETER_LABELS[selectedEntry.theater.ticketer]}{" "}
                when one opens.
              </p>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
