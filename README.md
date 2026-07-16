# Theatr (web prototype)

A mobile-web clone of the **Theatr** iOS app — a poster-forward theatre ticket
marketplace with a built-in show diary. Built as a personal prototype from
screenshots of the live app (see `reference/theatr-screens/`), then extended
with flows the app doesn't have yet.

Presents as a phone product: a centered 430px column on cream. Everything is
client-side with mock data; state persists to `localStorage`.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (all show/log pages prerendered)
npx tsc --noEmit   # typecheck
npx eslint src     # lint
```

To reset all prototype state (listings, alerts, diary, profile edits), clear
the `theatr-state-v1` key in localStorage.

## Screens

| Route | Screen |
|---|---|
| `/` | Marketplace — "Selling fast" shelf, show-grouped grid ("from $42 · 3 listings"), working Date/Quantity/Cheapest filters with faceted result counts |
| `/shows/[slug]` | Show listings — urgency strip ("3 sold today · median $55"), listing grid, sold-listings social proof; empty pages capture demand with a pre-filled Notify alert CTA |
| `/notify` | Your Notify — matches banner (count-up), alert cards with toggles, add/edit/delete with undo |
| `/orders` | Orders — Buy/Sell toggle, accordions; sell listings carry a **Listed → Sold → Paid** pipeline with a prototype control to simulate the buyer side |
| `/profile` | Espresso identity header (edit profile, settings, wallet, share), Activity / Listing / Collection tabs; diary entries render as rich ticket-stub cards |
| `/discover` | The diary home — My Top 10, live Interested shelf (bookmarks), Attended, "For you" recommendations, and the **Log a show** entry point |
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
  (`theatr-state-v1`); shows serialize as slugs and rehydrate via `getShow`
  so stale saved data can never render broken.
- **`src/components/`** — the component kit: `Sheet` (bottom sheet), `Toast`
  (with undo actions), `Poster`, `TabBar` (notched raised Sell button),
  `ListingBrowser` (filters + grid, listing- or show-grouped),
  `LogScreen`, `Toggle`, `Stepper`, `ShowPicker`, etc.
- **Motion** is deliberately iOS-quiet (DESIGN.md §7): 200–300ms ease-out
  sheets and page transitions, staggered card reveals, one-shot count-ups.
  `prefers-reduced-motion` is respected globally.

## Poster art

`public/posters/` holds real key art fetched from the shows' official sites
and Playbill covers (`src/lib/posters.json` maps slug → file; provenance in
the git history). The `Poster` component falls back to a generated
typographic tile for any show without an image.

> ⚠️ The poster images are copyrighted marketing material — fine for a
> private prototype, but replace or license them before making this repo or
> a deployment public.

## Prototype controls

- **Sell flow**: tab-bar Sell button → listing appears in Marketplace and
  Orders → Sell.
- **Pipeline**: tap a sell-side order card → "Simulate sale" / "Simulate
  payout" advance Listed → Sold → Paid; paid listings move to Completed,
  leave the Marketplace, and land in the profile Wallet balance.
- **Diary**: Discover → "Log a show" (or `/log/[slug]`) → Publish → rich
  card on the profile Activity timeline. Photos are downscaled client-side
  (≤900px JPEG data URL) so they survive localStorage.

## Reference material

- `reference/theatr-screens/` — screenshots of the live iOS app (the clone
  baseline).
- `DESIGN.md` — the derived design language.
- `PLAN.md` — working product plan for evolving the prototype beyond a clone.
