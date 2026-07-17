# Matinee (web prototype)

**Matinee** — a poster-forward theatre ticket marketplace with a built-in
show diary. Live at **[matinee.nyc](https://matinee.nyc)**.

Started as a mobile-web clone of the Theatr iOS app, rebuilt from screenshots
of that app, then rebranded and extended with flows the original doesn't
have. (The reference screenshots are the original app's copyrighted material
and are deliberately not distributed with this repo.)

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

To reset all prototype state (listings, alerts, diary, profile edits), clear
the `matinee-state-v1` key in localStorage (plus the legacy `theatr-state-v1`
key, which is still read as a migration fallback).

## Screens

| Route | Screen |
|---|---|
| `/` | Marketplace — "Selling fast" shelf, show-grouped grid ("from $42 · 3 listings"), working Date/Quantity/Cheapest filters with faceted result counts |
| `/shows/[slug]` | Show listings — urgency strip ("3 sold today · median $55"), listing grid, sold-listings social proof; empty pages capture demand with a pre-filled Notify alert CTA |
| `/notify` | Your Notify — matches banner (count-up), deadline-push opt-in, alert cards with toggles, add/edit/delete with undo |
| `/rush` | Rush & Lottery — curated program feed grouped by Open now / Later today / Coming up, live countdowns, deep links to entry pages |
| `/listings` | Your listings — the seller console; listings carry a **Listed → Sold → Paid** pipeline with a prototype control to simulate the buyer side |
| `/profile` | Espresso identity header (edit profile, settings, wallet, share), Activity / History / Collection tabs; diary entries render as rich ticket-stub cards, History records what you bought and sold |
| `/discover` | The diary home — live Interested shelf (bookmarks), Attended, "For you" recommendations, and the **Log a show** entry point |
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
  value, poster palette). **`src/lib/data.ts`** — mock listings, alerts,
  activity feed, collection.
- **`src/lib/store.tsx`** — client context store: notify alerts, your
  listings (with pipeline status), bookmarks, diary entries, profile edits,
  wallet balance (sum of paid listings). Persists to `localStorage`
  (`matinee-state-v1`); shows serialize as slugs and rehydrate via `getShow`
  so stale saved data can never render broken.
- **`src/components/`** — the component kit: `Sheet` (bottom sheet), `Toast`
  (with undo actions), `Poster`, `TabBar` (notched raised Sell button),
  `ListingBrowser` (filters + grid, listing- or show-grouped),
  `LogScreen`, `Toggle`, `Stepper`, `ShowPicker`, etc.
- **Motion** is deliberately iOS-quiet (DESIGN.md §7): 200–300ms ease-out
  sheets and page transitions, staggered card reveals, one-shot count-ups.
  `prefers-reduced-motion` is respected globally.

## Notifications (deadline pushes)

The "Deadline pushes" card on `/notify` subscribes the browser to web push:
when a rush/lottery program for a show you have an alert on opens, or enters
its final hour, you get a notification that deep-links to the entry page.
Moving parts:

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

- **Sell flow**: Profile → Listings (or `/listings`) → "List tickets" → the
  listing appears in the Marketplace and on Your listings.
- **Pipeline**: tap a listing card on Your listings → "Simulate sale" /
  "Simulate payout" advance Listed → Sold → Paid; paid listings move to
  Completed, leave the Marketplace, land in the profile Wallet balance, and
  show up under Profile → History alongside purchases.
- **Diary**: Discover → "Log a show" (or `/log/[slug]`) → Publish → rich
  card on the profile Activity timeline. Photos are downscaled client-side
  (≤900px JPEG data URL) so they survive localStorage.

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
