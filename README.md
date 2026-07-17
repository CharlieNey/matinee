# Matinee (web prototype)

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

Presents as a phone product: a centered 430px column on cream. The UI is
client-side with mock data and `localStorage` persistence; the one real
backend piece is deadline push notifications (see **Notifications** below).

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (all show/log pages prerendered)
npx tsc --noEmit   # typecheck
npx eslint src     # lint
```

To reset all prototype state (watches, bookmarks, diary, profile edits),
clear the `matinee-state-v1` key in localStorage (plus the legacy
`theatr-state-v1` key, which is still read as a migration fallback).

## Screens

| Route | Screen |
|---|---|
| `/` | Discover, the home — rush banner, the full catalog as a browse grid where every card answers "cheapest way in" ("Digital lottery **$40**"), circuit / rush & lottery / on-TKTS-today / cheapest filters with faceted counts, plus Interested / Attended / For you shelves |
| `/shows/[slug]` | The show as an answer sheet — official-ticketer card with all-in fee estimate, "Ways to save" (rush/lottery programs, claim windows, platform tips, TKTS row), and a **Watch this show** push CTA |
| `/notify` | Your Watches — deadline-push opt-in and the shows you follow, each with what its windows are doing next ("Digital lottery opens 12:01 AM") |
| `/rush` | Rush & Lottery — curated program feed grouped by Open now / Later today / Coming up, live countdowns, deep links to entry pages |
| `/district` | The district map — every Broadway house colored by owner→ticketer, live program halos, TKTS booth landmark |
| `/trip` | Trip mode — day-by-day rush/lottery/TKTS plan for a visit window |
| `/profile` | Espresso identity header (edit profile, settings, share), Activity / Record / Collection tabs; Record is the lottery log as stats — entries, wins, streak, saved vs face |
| `/wrapped` | Season Wrapped — shareable recap generated from the diary and lottery log |
| `/log/[slug]` | Log a show — sentiment (Recommend / Mixed / Didn't like), thoughts, tags, photo upload, Public/Private visibility, private note; publishes to the profile timeline |

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
  rush/lottery dataset and its status engine. **`src/lib/data.ts`** — watch
  seeds, activity feed, collection.
- **`src/lib/store.tsx`** — client context store: watches, bookmarks, diary
  entries, profile edits. Persists to `localStorage` (`matinee-state-v1`);
  shows serialize as slugs and rehydrate via `getShow` so stale saved data
  can never render broken. Marketplace-era blobs (listings, purchases,
  alert prices) load fine and shed those fields on the next write.
- **`src/components/`** — the component kit: `Sheet` (bottom sheet), `Toast`
  (with undo actions), `Poster`, `TabBar` (raised Log button), `ShowCard`
  (catalog card with the cheapest-way-in line), `LogScreen`, `Toggle`,
  `ShowPicker`, etc.
- **Motion** is deliberately iOS-quiet (DESIGN.md §7): 200–300ms ease-out
  sheets and page transitions, staggered card reveals, one-shot count-ups.
  `prefers-reduced-motion` is respected globally.

## Notifications (deadline pushes)

The "Deadline pushes" card on `/notify` subscribes the browser to web push:
when a rush/lottery program for a show you watch opens, or enters its final
hour, you get a notification that deep-links to the entry page. Moving
parts:

- `src/app/manifest.ts` + `public/sw.js` — PWA manifest and service worker
  (iOS delivers push only after Add to Home Screen, 16.4+).
- `src/app/api/push` — subscription storage (Supabase, server-side secret
  key only; RLS on with no public policies).
- `src/app/api/notify/run` — the evaluator: computes due events from the
  program status engine (`src/lib/pushEvents.ts`), dedupes per occurrence
  via `notification_log`, sends via `web-push`, prunes dead endpoints.
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
4. Smoke test: toggle on at `/notify`, then
   `curl -X POST -H "Authorization: Bearer $CRON_SECRET" <origin>/api/notify/run`
   — the JSON summary reports events, sends, dedupes, and pruned endpoints.

## Poster art

`public/posters/` holds real key art fetched from the shows' official sites
and Playbill covers (`src/lib/posters.json` maps slug → file; provenance in
the git history). The `Poster` component falls back to a generated
typographic tile for any show without an image.

> ⚠️ The poster images are copyrighted marketing material, included here as
> non-commercial portfolio reference with attribution — they are **not**
> covered by this repo's MIT license (see LICENSE). Replace or license them
> before any commercial use, and takedown requests are honored immediately.

## Prototype controls

- **Diary**: the Log tab (or `/log/[slug]`) → Publish → rich card on the
  profile Activity timeline. Photos are downscaled client-side (≤900px JPEG
  data URL) so they survive localStorage.
- **Lottery record**: tap "I entered" on any program card on `/rush`, "I
  won" on an entered one → the profile Record tab and Season Wrapped fill
  in; wins generate shareable cards.
- **Demo time machine**: the clock pill (bottom-left) scrubs the app's
  `now` so the rush board, show pages, and district map re-derive — TKTS
  stays on real time and says so.

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
