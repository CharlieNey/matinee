# Matinee (web prototype)

[![CI](https://github.com/CharlieNey/matinee/actions/workflows/ci.yml/badge.svg)](https://github.com/CharlieNey/matinee/actions/workflows/ci.yml)
[![Production health](https://github.com/CharlieNey/matinee/actions/workflows/production-health.yml/badge.svg)](https://github.com/CharlieNey/matinee/actions/workflows/production-health.yml)

**Matinee** — the live board for Broadway rush, lotteries, and cheap seats,
with a built-in show diary. Live at **[matinee.nyc](https://matinee.nyc)**.

Started as a mobile-web clone of the Theatr iOS app, rebuilt from screenshots
of that app, then rebranded and rebuilt around what that app doesn't do:
curated rush/lottery programs, official-ticketer clarity, and the TKTS
board. The cloned peer-to-peer marketplace was retired outright (PLAN.md
Phase 14) — every purchase deep-links out to the official seller; we are the
index, never the checkout. (The reference screenshots are the original
app's copyrighted material and are deliberately not distributed with this
repo.)

Presents as a centered 430px phone experience by default, with a responsive
web layout available from the desktop layout switch. Catalog and program data
are curated facts; personal follows, diary entries, and collections persist in
versioned browser storage. Diary photos use IndexedDB instead of consuming the
small `localStorage` quota. Deadline push notifications are the hosted backend
feature.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run check      # lint + types + unit tests + production build
npm run test:e2e   # Playwright journeys; run `npm run build` first
```

Diary export, validated import/restore, and reset controls live in Profile →
Settings. To reset all prototype state manually, clear the `matinee-state-v1`
key in localStorage and the `matinee-diary` IndexedDB database (plus the legacy
`theatr-state-v1` key, which is still read as a migration fallback).

## Screens

| Route | Screen |
|---|---|
| `/` | Discover, the home — rush banner, the full catalog as a browse grid where every card answers "cheapest way in" ("Digital lottery **$40**"), circuit / rush & lottery / on-TKTS-today / cheapest filters with faceted counts, plus Interested / Attended / For you shelves |
| `/shows/[slug]` | The show as an answer sheet — official-ticketer card with all-in fee estimate, "Ways to save" (rush/lottery programs, claim windows, platform tips, TKTS row), and a **Follow** push CTA |
| `/notify` | Your Watches — deadline-push opt-in and the shows you follow, each with what its windows are doing next ("Digital lottery opens 12:01 AM") |
| `/rush` | Rush & Lottery — curated program feed grouped by Open now / Later today / Coming up, live countdowns, deep links to entry pages |
| `/district` | The district map — every Broadway house colored by owner→ticketer, live program halos, TKTS booth landmark |
| `/trip` | Trip mode — day-by-day rush/lottery/TKTS plan for a visit window |
| `/profile` | Espresso identity header (edit profile, settings, share), Activity / Record / Collection tabs; Record is the lottery log as stats — entries, wins, streak, saved vs face |
| `/wrapped` | Season Wrapped — shareable recap generated from the diary and lottery log |
| `/log/[slug]` | Create or edit a diary entry — performance date, optional seat, sentiment, thoughts, tags, photo, sharing visibility, and private note |

## Architecture

- **Next.js 16** (App Router, Turbopack) + **React 19** + **Tailwind v4** +
  [`motion`](https://motion.dev) + [`lucide-react`](https://lucide.dev).
- **`DESIGN.md` is the design source of truth** — palette, type scale, radii,
  motion rules, and component specs reverse-engineered from the app
  screenshots. Tokens are wired as Tailwind `@theme` variables in
  `src/app/globals.css` (`bg-vermilion`, `text-ink-soft`, `rounded-card`,
  `text-display`, …). Read it before building any new screen.
- **`src/lib/shows.ts`** — the show catalog (title, tier, genre, venue, face
  value, poster palette). **`src/lib/programs.ts`** — the curated
  rush/lottery dataset and its status engine. **`src/lib/data.ts`** — follow
  seeds, activity feed, and collection seeds.
- **`src/lib/store.tsx`** — client context store: follows, bookmarks, editable
  diary entries, profile edits. Metadata persists as a validated, versioned
  `localStorage` document; photos live in IndexedDB and migrate there from old
  state automatically. Profile settings can export, validate and restore, or
  clear the diary. Shows serialize as slugs and rehydrate via `getShow` so
  stale data cannot render broken. Marketplace-era blobs still migrate.
- **`src/components/`** — the component kit: `Sheet` (bottom sheet), `Toast`
  (with undo actions and live announcements), responsive `Poster`, four-slot
  `TabBar` (Discover · Log · Rush · Profile), `ShowCard`
  (catalog card with the cheapest-way-in line), `LogScreen`, `Toggle`,
  `ShowPicker`, etc.
- **Motion** is deliberately iOS-quiet (DESIGN.md §7): 200–300ms ease-out
  sheets and page transitions, staggered card reveals, one-shot count-ups.
  `prefers-reduced-motion` is respected globally.
- **Production foundation** — a static Content Security Policy and SRI preserve
  static rendering; structured client/server errors land in Vercel Logs;
  `/api/health` checks catalog freshness, Supabase, and TKTS; public mutation
  routes use durable Supabase rate limits.

## Quality and delivery

`.github/workflows/ci.yml` runs lint, TypeScript, Vitest, a production build,
the production dependency audit, Playwright journeys in Chromium/WebKit, and
automated serious/critical accessibility checks. Vercel's Git integration can
attach a preview deployment to every pull request; `main` remains the production
branch. Failed browser runs upload their traces and screenshots.

`production-health.yml` checks `/api/health` hourly. Configure the existing
`APP_URL` Actions secret, and apply every Supabase migration before deploying a
release that depends on it. The endpoint intentionally returns 503 when the
database, TKTS, or the 14-day program-freshness contract is unhealthy.

## Notifications (deadline pushes)

The "Deadline pushes" card on `/notify` subscribes the browser to web push:
when a rush/lottery program for a show you follow opens, or enters its final
hour, you get a notification that deep-links to the entry page. Moving
parts:

- `src/app/manifest.ts` + `public/sw.js` — PWA manifest and service worker
  (iOS delivers push only after Add to Home Screen, 16.4+).
- `src/app/api/push` — subscription storage (Supabase, server-side secret
  key only; RLS on with no public policies) with durable per-IP rate limits.
- `src/app/api/notify/run` — the evaluator: computes due events from the
  program status engine (`src/lib/pushEvents.ts`), dedupes per occurrence
  via `notification_log`, sends via `web-push`, prunes dead endpoints, and
  expires notification logs after 45 days.
- `.github/workflows/notify-cron.yml` — the scheduler (~every 15 min;
  Vercel Hobby cron is daily-only). Each run doubles as the keepalive that
  stops the free-tier Supabase project from pausing.

One-time setup:

1. Create a free Supabase project and run the files in
   `supabase/migrations/` (in filename order) in the SQL editor.
2. Copy `.env.example` → `.env.local` and fill it in (`npx web-push
   generate-vapid-keys` for the key pair). Set the same variables in Vercel.
3. Add `APP_URL` (deployed origin) and `CRON_SECRET` as GitHub Actions
   secrets so the workflow can call the evaluator.
4. Smoke test: toggle on at `/notify`, use **Send a test push** to verify the
   full VAPID → Supabase → service-worker path on that device, then
   `curl -X POST -H "Authorization: Bearer $CRON_SECRET" <origin>/api/notify/run`
   — the JSON summary reports events, sends, dedupes, and pruned endpoints.

The desktop, installed-iPhone, and 10-second backup-recording steps are in
[`docs/notification-demo.md`](docs/notification-demo.md).

## Poster art

`public/posters/` holds real key art fetched from the shows' official sites
and Playbill covers (`src/lib/posters.json` maps slug → file; provenance in
the git history). Next Image serves responsive AVIF/WebP variants; the
`Poster` component falls back to a generated typographic tile for any show
without an image.

> ⚠️ The poster images are copyrighted marketing material, included here as
> non-commercial portfolio reference with attribution — they are **not**
> covered by this repo's MIT license (see LICENSE). Replace or license them
> before any commercial use, and takedown requests are honored immediately.

## Prototype controls

- **Diary**: the Log tab (or `/log/[slug]`) records the actual performance
  date and optional seat; entries can be edited, deleted with Undo, exported,
  imported with merge/replace validation, or cleared from Profile settings.
  Photos are downscaled client-side (≤900px JPEG) and stored in IndexedDB.
- **Lottery record**: tap "I entered" on any program card on `/rush`, "I
  won" on an entered one → the profile Record tab and Season Wrapped fill
  in; wins generate shareable cards.

## Reference material

- `DESIGN.md` — the derived design language.
- `PLAN.md` — working product plan for evolving the prototype beyond a clone.
- The original clone-baseline screenshots live in a local `reference/` folder
  that is gitignored — they're the reference app's copyrighted material.

## License

Code and original documentation are [MIT](LICENSE). Poster artwork and show
marketing assets are **not** — they belong to their productions and are
included only as non-commercial portfolio reference (see the scope note in
LICENSE and the Colophon on [/about](https://matinee.nyc/about)).
