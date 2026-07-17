/**
 * TKTS live board (Phase 13): parse tdf.org's server-rendered TKTS Live page
 * into normalized board data. Dependency-free and side-effect-free so the
 * parser can be exercised standalone; fetching lives in /api/tkts.
 *
 * Honesty rules (PLAN.md): we surface TDF's own per-board `Updated:` stamp,
 * never our fetch time — upstream has been observed days stale, and a Saturday
 * board presented as "now" is exactly the trust-breaking failure to avoid.
 */

export const TKTS_LIVE_URL =
  "https://www.tdf.org/discount-ticket-programs/tkts-by-tdf/tkts-live/";

/**
 * Duffy Dashboard's public Community API (TDF's official data partner; their
 * About page offers this endpoint for public use). Real-time booth status +
 * board aggregates — the freshness complement to TDF's per-show page, which
 * can lag days behind.
 */
export const DUFFY_SUMMARY_URL =
  "https://api.duffydashboard.com/v1/live-summary";

export const DUFFY_URL = "https://duffydashboard.com";

export type TktsLiveSummary = {
  live: boolean;
  showQuantity: number;
  averagePrice: number;
  averageDiscount: number;
};

export function parseLiveSummary(json: unknown): TktsLiveSummary | null {
  if (typeof json !== "object" || json === null) return null;
  const record = json as Record<string, unknown>;
  if (typeof record.live !== "boolean") return null;
  return {
    live: record.live,
    showQuantity: typeof record.showQuantity === "number" ? record.showQuantity : 0,
    averagePrice: typeof record.averagePrice === "number" ? record.averagePrice : 0,
    averageDiscount:
      typeof record.averageDiscount === "number" ? record.averageDiscount : 0,
  };
}

export type TktsBoothKey = "times-square" | "lincoln-center";

export type TktsCircuit = "broadway" | "off-broadway";

export type TktsRow = {
  title: string;
  /** tdf.org show page. */
  url: string;
  /** Catalog slug when the board title matches a show we know. */
  showSlug: string | null;
  /** e.g. 50 for "50%"; null when unparseable. */
  pctOff: number | null;
  /** Raw discounted-price text, e.g. "$71-101". */
  price: string;
  /** Curtain time as printed, e.g. "7:00 PM". */
  curtain: string;
};

export type TktsBoard = {
  circuit: TktsCircuit;
  /** TDF's own stamp, ISO. Null if the stamp was missing/unparseable. */
  updatedAt: string | null;
  /** The stamp as printed, e.g. "Monday, 13 July 2026 03:02 PM". */
  updatedLabel: string | null;
  rows: TktsRow[];
};

export type TktsBooth = {
  key: TktsBoothKey;
  name: string;
  /** Booth notice sentence, e.g. "open and closes at 8:00 PM". */
  notice: string | null;
  /** Parsed from the notice; null when the notice is missing. */
  open: boolean | null;
  boards: TktsBoard[];
};

export type TktsData = {
  ok: boolean;
  sourceUrl: string;
  fetchedAt: string;
  booths: TktsBooth[];
  /** Real-time Duffy Dashboard aggregate; null when their API is unreachable. */
  summary: TktsLiveSummary | null;
};

const BOOTH_NAMES: Record<TktsBoothKey, string> = {
  "times-square": "Times Square",
  "lincoln-center": "Lincoln Center",
};

/** Board titles that don't normalize onto catalog titles (normalized keys). */
const TITLE_ALIASES: Record<string, string> = {
  // TDF prints the short title; the catalog carries the full one.
  "spelling bee": "spelling-bee",
};

function normalizeTitle(title: string): string {
  return decodeEntities(title)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^the /, "")
    .replace(/ (the|a new) (musical|play)$/, "")
    .trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;|&rsquo;/g, "'")
    .replace(/&ndash;|&mdash;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

/** Build a board-title → slug resolver from catalog (title, slug) pairs. */
export function makeSlugResolver(
  catalog: ReadonlyArray<{ title: string; slug: string }>,
): (boardTitle: string) => string | null {
  const byNormalized = new Map<string, string>();
  for (const entry of catalog) {
    byNormalized.set(normalizeTitle(entry.title), entry.slug);
  }
  return (boardTitle) => {
    const alias = TITLE_ALIASES[normalizeTitle(boardTitle)];
    return alias ?? byNormalized.get(normalizeTitle(boardTitle)) ?? null;
  };
}

const etVerify = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/**
 * "Monday, 13 July 2026 03:02 PM" (NYC wall time) → ISO instant.
 * Tries both EDT/EST offsets and keeps the one that round-trips.
 */
export function parseEtStamp(label: string): string | null {
  const match = label.match(
    /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  );
  if (!match) return null;
  const [, dayRaw, monthName, yearRaw, hourRaw, minuteRaw, meridiem] = match;
  const month = MONTHS.indexOf(monthName.toLowerCase()) + 1;
  if (month === 0) return null;
  let hour = Number(hourRaw) % 12;
  if (meridiem.toUpperCase() === "PM") hour += 12;
  const pad = (value: number) => String(value).padStart(2, "0");
  const wall = `${yearRaw}-${pad(month)}-${pad(Number(dayRaw))}`;
  for (const offset of ["-04:00", "-05:00"]) {
    const candidate = new Date(
      `${wall}T${pad(hour)}:${minuteRaw}:00${offset}`,
    );
    const parts = Object.fromEntries(
      etVerify
        .formatToParts(candidate)
        .map((part) => [part.type, part.value]),
    );
    if (
      parts.year === yearRaw &&
      Number(parts.day) === Number(dayRaw) &&
      Number(parts.month) === month &&
      Number(parts.hour) === hour &&
      parts.minute === minuteRaw
    ) {
      return candidate.toISOString();
    }
  }
  return null;
}

const BOOTH_CHUNK_RE =
  /<div class="tkts__boards" id="tkts-shows-([a-z-]+)">([\s\S]*?)(?=<div class="tkts__boards"|<footer|$)/g;

const BOARD_CHUNK_RE =
  /<div class="tkts__board tkts__board--(broadway|off[a-z-]*)">([\s\S]*?)(?=<div class="tkts__board |$)/g;

const ROW_RE =
  /<li class="tkts__grid-list-item">[\s\S]*?__title">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?__percent">([\s\S]*?)<\/div>[\s\S]*?__discount">([\s\S]*?)<\/div>[\s\S]*?__time">([\s\S]*?)<\/div>/g;

/**
 * Parse the TKTS Live page. Resilient by design: markup drift yields empty
 * boards (rendered as "board unavailable"), never a throw.
 */
export function parseTktsHtml(
  html: string,
  resolveSlug: (boardTitle: string) => string | null = () => null,
): TktsBooth[] {
  const booths: TktsBooth[] = [];

  for (const boothMatch of html.matchAll(BOOTH_CHUNK_RE)) {
    const key = boothMatch[1] as TktsBoothKey;
    if (!(key in BOOTH_NAMES)) continue;

    const boards: TktsBoard[] = [];
    for (const boardMatch of boothMatch[2].matchAll(BOARD_CHUNK_RE)) {
      const updatedRaw = boardMatch[2].match(
        /<strong>Updated:<\/strong>\s*([^<]+)/,
      );
      const updatedLabel = updatedRaw ? decodeEntities(updatedRaw[1]) : null;
      const rows: TktsRow[] = [];
      for (const row of boardMatch[2].matchAll(ROW_RE)) {
        const title = decodeEntities(row[2]);
        const pct = decodeEntities(row[3]).match(/(\d+)\s*%/);
        rows.push({
          title,
          url: row[1],
          showSlug: resolveSlug(title),
          pctOff: pct ? Number(pct[1]) : null,
          price: decodeEntities(row[4]),
          curtain: decodeEntities(row[5]),
        });
      }
      boards.push({
        circuit: boardMatch[1] === "broadway" ? "broadway" : "off-broadway",
        updatedAt: updatedLabel ? parseEtStamp(updatedLabel) : null,
        updatedLabel,
        rows,
      });
    }

    // Notices live outside the boards div; match by booth name globally.
    const notice = html.match(
      new RegExp(
        `The ${BOOTH_NAMES[key]} booth is currently\\s+([\\s\\S]*?)(?:<a|</p|</div)`,
        "i",
      ),
    );
    const noticeText = notice ? decodeEntities(notice[1]) : null;

    booths.push({
      key,
      name: BOOTH_NAMES[key],
      notice: noticeText,
      open: noticeText === null ? null : /^open/i.test(noticeText),
      boards,
    });
  }

  return booths;
}

const etDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** A board counts as today's only when its stamp falls on the current NYC day. */
export function boardIsToday(updatedAt: string | null, realNow: Date): boolean {
  if (!updatedAt) return false;
  return etDay.format(new Date(updatedAt)) === etDay.format(realNow);
}

const stampClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** "Updated 3:02 PM" today; "Board from Sat 4:01 PM" when older. */
export function boardStampLabel(
  board: Pick<TktsBoard, "updatedAt" | "updatedLabel">,
  realNow: Date,
): string | null {
  if (!board.updatedAt) return board.updatedLabel;
  const printed = stampClock.format(new Date(board.updatedAt));
  return boardIsToday(board.updatedAt, realNow)
    ? `Updated ${printed.replace(/^[A-Za-z]+ /, "")}`
    : `Board from ${printed}`;
}

/** Best (highest) discount on a set of boards. */
export function bestDiscount(boards: TktsBoard[]): number | null {
  let best: number | null = null;
  for (const board of boards) {
    for (const row of board.rows) {
      if (row.pctOff !== null && (best === null || row.pctOff > best)) {
        best = row.pctOff;
      }
    }
  }
  return best;
}
