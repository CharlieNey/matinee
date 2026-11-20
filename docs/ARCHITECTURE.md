# Architecture

Matinee is a live board of Broadway rush, lottery and standing-room programs,
plus a personal show diary. It is a Next.js 16 app on Vercel with almost no
backend: the catalog is curated data compiled into the build, personal data
stays in the browser, and a small Supabase database exists only for web push.

```
                 build time                              runtime
  ┌────────────────────────────────┐   ┌───────────────────────────────────────┐
  │ src/lib/shows.ts     (58 shows) │   │ Browser                               │
  │ src/lib/programs.ts  (programs) │──▶│  static pages + client components     │
  │ src/lib/theaters.ts  (41 houses)│   │  localStorage: diary, follows, log    │
  └────────────────────────────────┘   │  IndexedDB: diary photos              │
                                        │  service worker: push display         │
  tdf.org TKTS Live ──▶ /api/tkts ─────▶│                                       │
  (fetched, cached 30 min)              └───────────────┬───────────────────────┘
                                                        │ subscribe / sync
  GitHub Actions ─ every 15 min ─▶ /api/notify/run ──▶ Supabase ──▶ web push
  GitHub Actions ─ hourly ───────▶ /api/health
```

## Data model

**Show** (`src/lib/shows.ts`): slug, title, tier (Broadway or Off-Broadway),
genre, venue, face value, poster palette, and `closedOn` once a production
closes. Closed shows stay in the catalog so diary entries and shared links
keep resolving, but they leave the browse grid and lose their programs.

**Program** (`src/lib/programs.ts`): one way in to one show.

```ts
type Program = {
  showSlug: string;
  kind: "digital-lottery" | "in-person-lottery" | "rush"
      | "digital-rush" | "student-rush" | "sro";
  platform: "broadway-direct" | "lucky-seat" | "telecharge"
          | "todaytix" | "official-site" | "box-office";
  price: number;
  maxTickets: number;
  entryUrl: string;           // always the official seller
  schedule: ProgramSchedule;  // weekly windows in America/New_York
  lastVerified: string;       // YYYY-MM-DD, per row
  claimWindow?: ClaimWindow;  // how long winners have, and how they hear
  notes?: string;
  tips?: readonly string[];
};
```

`(showSlug, kind, platform)` is the identity (`programKey`). Rows are built
with small helpers per platform (`telechargeLottery`, `broadwayDirectLottery`,
`boxOfficeProgram`…) so a platform's shared rules live in one place.

**Theater** (`src/lib/theaters.ts`): the 41 Broadway houses with owner,
ticketing platform, capacity, address, map position and Wikidata/IBDB IDs.
"Now playing" is derived from the show catalog's venue strings, not stored.

There is no API to source any of this from. Ticketing splits by theater
owner, most of it has no public API, and the sellers that do have one are
partner-only. The catalog is curated by hand from the shows' own sites, TDF and
the editorial roundups (`RESEARCH.md`, `DATA.md`), and published back out at
`/api/programs.json` and `/api/theaters.json`.

## How program windows are computed

A schedule is a list of weekly windows:

```ts
type ScheduleWindow = {
  days: Weekday[];          // 0 = Sunday
  opensAt: "HH:MM";         // New York wall-clock time
  closesAt: "HH:MM";
  closesDayOffset?: number; // close N days after opening (weekly lotteries)
  whileSuppliesLast?: boolean;
};
```

`getProgramStatus(now, program)` is a pure function. It expands the windows
into concrete occurrences for the 7 days either side of `now` (the lookback is
what lets Hamilton's Friday-to-Thursday lottery be open on a Tuesday), then
classifies `now`:

| State | Meaning |
|---|---|
| `open` | inside a window; countdown to close unless while-supplies-last |
| `closes-soon` | inside the final hour of a timed window |
| `opens-later-today` | a window opens later on the same New York day |
| `closed-today` | today's window has passed; points at the next one |
| `next-open-day` | no window today |

Two details carry the correctness:

- **Wall-clock time in New York, not UTC.** `zonedDate` turns "09:00 on
  2026-11-01 in New York" into an instant with a two-pass offset lookup through
  `Intl.DateTimeFormat`, so windows stay at 9 AM local across daylight-saving
  changes. No date library.
- **Overnight and multi-day windows.** A window whose close is earlier than its
  open rolls to the next day (a 5 PM to 9 AM lottery);
  `closesDayOffset` handles week-long ones.

The rush feed, the Discover banner, the District map's live halos, Trip mode
and the push evaluator all call the same function, so they cannot disagree.
Client surfaces get `now` from `useNow`, which is null during server render and
first paint, then ticks every 30 seconds. That keeps static HTML free of
time-dependent markup and avoids hydration mismatches.

`src/lib/schedule.test.ts` pins the edge cases with hand-built programs: DST on
both sides, overnight windows, the weekly window, the final-hour state and
while-supplies-last.

## Freshness contract

Every program row carries `lastVerified`. `isProgramStale` marks a row stale
once noon New York time on that date is more than `STALE_AFTER_DAYS` (14) old.
Stale rows render as unverified in the UI. `/api/health` returns 503 if any
row is stale, if Supabase is unreachable, or if the TKTS fetch fails, and the
hourly `production-health.yml` workflow turns red. A refresh that cannot
confirm a fact keeps that row's older date, with a comment saying why, rather
than bumping it.

`src/lib/catalog.test.ts` checks the data's integrity on every CI run: no
program on a closed or unknown show, unique keys, valid times, prices and https
links, and every running Broadway show seated in a known house.

## TKTS

`/api/tkts` fetches TDF's server-rendered TKTS Live page (robots.txt permits
it), parses it with `parseTktsHtml`, and caches for 30 minutes; Duffy
Dashboard's public summary endpoint fills in when TDF's board lags. Every
surface shows TDF's own "Updated" stamp, never Matinee's fetch time, so a
stale upstream board reads as stale.

## Storage

| Data | Where | Why |
|---|---|---|
| Catalog, programs, theaters | TypeScript modules, compiled in | Small, slow-moving, reviewed in diffs; 58 show pages prerender |
| Diary, follows, Interested, ranking, profile | `localStorage` key `matinee-state-v1` | No accounts. A versioned, validated document (`src/lib/persistence.ts`); unreadable data is backed up, never overwritten |
| Diary photos | IndexedDB `matinee-diary` | Too big for `localStorage`'s quota; downscaled to 900px JPEG first |
| Lottery log ("I entered", "I won") | `localStorage` key `matinee-lottery-log-v1` | Feeds Record stats and Wrapped; synced to the push subscription for claim-window alerts |
| Push subscriptions, send log, rate limits | Supabase Postgres | The only state a server must hold |

Import and restore treat backups as untrusted input and validate every field.
The `theatr-*` keys are read once as a fallback from before the July 2026
rename, so early visitors' diaries migrate instead of vanishing.

## Push notifications

1. On `/notify` the browser subscribes with VAPID keys; `/api/push` stores the
   endpoint and the followed show slugs in `push_subscriptions`. The lottery
   log syncs into the same row.
2. GitHub Actions (`notify-cron.yml`) calls `/api/notify/run` every 15 minutes
   with a bearer secret (checked in constant time). Vercel Hobby cron is
   daily-only, which is why the scheduler lives in Actions.
3. The evaluator runs `duePushEvents(now)` (`src/lib/pushEvents.ts`): for each
   program, a window that just opened, one entering its final hour, and, for
   lotteries with a known claim window, a "watch for winners" alert sent only
   to people whose lottery log shows they entered.
4. Each event has a stable key (`program | kind | occurrence start`).
   `notification_log` has a primary key on `(endpoint, event_key)`, so a late
   or doubled cron run cannot send twice.
5. `web-push` sends; 404 and 410 responses prune dead endpoints; logs expire
   after 45 days.

Tables have row-level security on with no public policies; only the server's
secret key can touch them. Public mutation routes check the origin and use a
Postgres rate limiter (`consume_api_rate_limit`) so limits survive serverless
instance churn. iOS delivers web push only to a Home Screen install (16.4+).

## Security and rendering

A static Content-Security-Policy (`next.config.ts`) with Subresource Integrity
keeps pages statically rendered and cacheable: no per-request nonce, no
third-party origins, `frame-ancestors 'none'`. Uncaught server errors
(`src/instrumentation.ts`) and client errors (posted to `/api/client-errors`)
land in Vercel logs as structured JSON.

## CI and operations

- **`ci.yml`** on every pull request and push to `main`: lint, TypeScript,
  Vitest, `npm audit` for production dependencies, a production build, then
  Playwright journeys in Chromium and WebKit (the diary flow, plus an axe
  scan of Discover that fails on serious or critical violations).
- **`production-health.yml`** hourly: `curl /api/health | jq -e '.ok'`.
- **`notify-cron.yml`** every 15 minutes: the push evaluator, which also keeps
  the free-tier Supabase project from pausing.
- Vercel deploys `main` to production and previews pull requests.

GitHub disables scheduled workflows in a public repository after 60 days
without a commit, so a quiet repo silently stops both crons.

## Deliberately not built

- **A marketplace.** The app began as a UI study of a resale marketplace and
  carried a working replica. It was removed: every listing was seed fiction,
  and it contradicted the product's rule that Matinee is the index, never the
  checkout. Old marketplace URLs redirect.
- **Scraping the ticketing platforms.** Telecharge and Broadway Direct sit
  behind bot protection and their terms forbid automated access. Matinee links
  to their entry pages and never fetches them.
- **Lottery-entry automation.** Every bot we studied drove a real browser
  with someone's login and broke within weeks. Matinee alerts you at the right
  moment and you enter yourself.
- **Accounts.** Personal data stays on the device, with export and restore,
  so there is no auth system to secure or a database of diaries to leak.
- **Resale prices.** The resale APIs are partner-only or forbid showing other
  sellers' listings alongside theirs.
