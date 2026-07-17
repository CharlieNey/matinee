# Plan: Theatr — from clone to portfolio product

*Working plan, revised 2026-07-16. Grounded in RESEARCH.md (feasibility/APIs), MARKET.md (market & sentiment), and DATA.md (public data inventory). Portfolio piece, web-first.*

## Goal

Keep the design language; make four things real, in this order of importance:

1. A **curated rush/lottery layer** with live open/closed statuses, deadline countdowns, and deep links — the differentiator no competitor does well.
2. **Real show data** — Ticketmaster Discovery API where it has coverage, curated data everywhere else.
3. **Working notifications** for lottery/rush deadlines.
4. **A standout presentation layer** (added 2026-07-16): demo time machine, theater-district map, and colophon — the reframe from "clone with extras" to "the live board for Broadway rush & lotteries, in a design shell I reverse-engineered."

All purchasing happens via deep links out. We are the index, never the checkout.

## Reality constraint: who actually sells Broadway tickets

Broadway ticketing is split by theater owner, so **no single API covers Broadway**:

| Owner | Houses | Platform |
|---|---|---|
| Shubert (largest) | ~17 | Telecharge (Shubert-owned) — no public API |
| Nederlander + Disney | ~10 | **Ticketmaster** ← the Discovery API slice |
| ATG (incl. ex-Jujamcyn) | 6 | ATG Tickets (moved off SeatGeek post-merger) |
| Nonprofits (Roundabout, LCT, MTC, 2ST…) | ~8 | Own systems |

Off-Broadway is even more fragmented. Consequence: **our own show catalog stays the spine**; Ticketmaster is an *enrichment source* for the shows it covers (in the current 15-show catalog, essentially just The Lost Boys at the Palace), not the backbone. The coverage gap becomes a feature: per show, we tell users *where the official box office actually is* — genuinely confusing information the aggregator sites bury.

## Where the data comes from

Nearly everything is **hand-curated by design** — the valuable data is small, stable, and has no API anywhere (the incumbents hand-maintain it too). Automation is reserved for the one real feed.

| Data | Source | Cadence |
|---|---|---|
| Show catalog (~15 → ~35 shows, incl. major Off-Broadway — Phase 12) | Hand-curated (already largely the real July 2026 season) | Per season |
| Rush/lottery programs | Hand-curated from Playbill's roundup, NYTG's guide, Broadway Direct, LuckySeat, TodayTix app, show sites; `lastVerified` per row | Minutes/week |
| Official ticketer + buy link per show | Hand-curated map from theater ownership (Shubert→Telecharge, Nederlander/Disney→Ticketmaster, ATG→ATG Tickets, nonprofits→own) | Rarely changes |
| Performance schedules (weekly grid) | Hand-curated; TM Discovery live for its slice | Monthly-ish |
| On-sale status / price ranges | **TM Discovery API** (automated, daily) for the Nederlander/Disney slice; face value + program prices elsewhere | Automated |
| TKTS daily board | **Probed 2026-07-16 (DATA.md): clean.** Server-rendered HTML at tdf.org's TKTS Live page, robots-permissive, per-board `Updated:` stamps (trust the stamp, not fetch time — upstream observed 3 days stale once) | Automated (gentle poll, 15–60 min) |
| Claim windows, platform tips, fee schedules | Hand-curated from platform sites + community reports (MARKET.md) | With program updates |

Freshness mechanics (portfolio-visible honesty):
- **Staleness flag**: program rows with `lastVerified` > ~14 days render as "unverified" in the UI.
- **Change detector** (optional, later): a script that diffs Playbill's public roundup against our dataset and flags discrepancies for human confirmation — a curation aid, not a scraping pipeline; a human writes all data.

## Phase 1 — Rush & lottery layer

- **Data model** (`src/lib/programs.ts`): `Program = { showSlug, kind: digital-lottery | in-person-lottery | rush | digital-rush | student-rush | sro, platform: broadway-direct | lucky-seat | telecharge | todaytix | box-office, price, maxTickets, entryUrl, schedule, lastVerified, notes }`.
- **Schedule model**: daily windows relative to performance days (`{ days, opensAt, closesAt }`); in-person rush = box-office open until sold out; digital lottery = e.g. 12:00am–10:30am day-of.
- **Status engine**: pure function `(now, program) → { state: open | closes-soon | opens-later-today | closed-today | next-open-day, countdown }`, plus a client `useNow()` ticker. Countdown numbers get the type emphasis per DESIGN.md.
- **UI**:
  - `/rush` feed — sections: *Open now* (close countdowns), *Later today*, *Coming up*. Cards follow DESIGN.md card anatomy; meta line "Digital lottery · Broadway Direct"; tap → external entry link.
  - Show pages — "Ways to save" section with that show's programs.
  - Discover — blush banner: "Rush & Lottery — N open now".
- **Dataset**: all 15 catalog shows, patterned on real programs (Broadway Direct's verified 2026-07-12 set anchors prices), each row stamped `lastVerified`.

## Phase 2 — Real data enrichment

- **Venue→ticketer map** (curated, ~15 rows): official purchase deep link per show, surfaced on show pages ("Buy at Telecharge").
- **Ticketmaster Discovery v2** for covered shows: `TM_API_KEY` env var; server-side fetch on a daily revalidation (Discovery events by attraction/venue, NYC market); manual TM-attraction↔slug mapping table; render next performances, on-sale status, and priceRanges (often absent — degrade gracefully) with buy links.
- **Curated weekly performance grid** for non-TM shows (stable, low-churn data).

## Phase 3 — Notifications (make Notify real)

**Built 2026-07-16.** Remaining is one-time provisioning only (Supabase project + migration, Vercel env vars, GitHub Actions secrets) — steps in README §Notifications. Email fallback (Resend) not built; still optional.

Success bar (added 2026-07-16): **real users.** Even ~30 theatergoers relying on deadline alerts is what separates "portfolio demo" from "product with users" — no clone has that story. Requires the public-deploy blockers resolved (open questions 4–5).

- Web push via service worker + PWA manifest (iOS requires installed PWA): "lottery opens/closes soon" for followed shows.
- Requires minimal persistence for push subscriptions + a cron to evaluate schedules: Vercel KV or Supabase, whichever is less ceremony.
- Optional email fallback (Resend).

Free-tier findings (verified 2026-07-16):
- **Vercel Hobby** works for hosting (100GB bandwidth, 100K invocations/mo, hard caps so no surprise bills; non-commercial use only — fine for a portfolio). BUT its cron jobs are capped at **once per day**, timing guaranteed only within the hour — too coarse for deadline pushes.
- **Scheduler instead**: GitHub Actions schedule (~15-min cadence) or cron-job.org hitting a secret-protected route handler that evaluates program windows and sends pushes (`web-push`, VAPID keys).
- **Supabase free** works for subscription persistence (500MB Postgres, 50K MAU auth, 500K edge-fn invocations). BUT free projects **pause after 7 days without API requests**. Mitigation: the notification cron queries Supabase on every run, doubling as the keepalive.

## Phase 4 — Web/mobile layout toggle

*Decided 2026-07-15: not a one-way web rework — an explicit **layout toggle** so visitors can explore both presentations.*

**Built 2026-07-16.** Pre-paint `html[data-layout]` script + `web:`/`mobile:` Tailwind variants; WebNav top bar; floating Phone/Web pill (≥1024px); inventory pages wide (1160px, grids 2→4 col), identity pages narrow (560px). DESIGN.md §10 defines both modes. Gotcha for posterity: Turbopack's persistent cache served stale Tailwind output after `@custom-variant` was added — `rm -rf .next` fixed it.

- **Mobile mode**: the current experience — centered 430px phone column, floating tab bar. Stays pixel-faithful to the reference screenshots.
- **Web mode**: a real responsive web app — nav rail/top bar, multi-column feeds, poster-hero show pages.
- Toggle is a persistent UI control (and remembered per visitor); components and tokens are shared, only layout shells differ.
- Rewrite DESIGN.md's viewport section ("this is a phone product…") to define both modes and the toggle.

## Phase 5 — Demo time machine

*Added 2026-07-16. The rush layer is invisible outside program windows — a visitor landing at 3pm sees a dead board. Fix: let them move the clock.*

**Built 2026-07-16.** `DemoTimeProvider` holds one `offsetMs` (sessionStorage, per-tab); `useNow()` carries it, so RushBanner/RushFeed/ShowPrograms re-derive instantly. Floating bottom-left control: live pill (clock + time) → card with 7 day chips + 5-min slider + "Back to live"; simulated state = espresso pill + gold dot + "· demo" label. Verified: 50 open at 12:32 PM → 2 open at 11:55 PM (only the genuinely overnight windows), persistence across reload, reset to live. Server-side push pipeline intentionally unaffected.

- **Global `now` override**: a demo-time control (a draggable "It's 9:47 AM" pill / day scrubber) that feeds `useNow()`. Every status, countdown, and feed section re-derives instantly because the status engine is already a pure function of `now` — this is the payoff of that design.
- Scrubbing across a day flips the whole board open → closes-soon → closed: the demo moment for screen recordings and portfolio visitors.
- Override lives in the client store (sessionStorage); a clear affordance returns to real time. Real time is always the default; simulated time is visibly labeled so it can't be mistaken for live data.
- Consumers: `/rush` feed, show-page "Ways to save", Discover banner, notifications preview, and the district map (Phase 6).
- Smallest phase in the plan — build first; the map depends on it.

## Phase 6 — Theater district map (the hero page)

*Added 2026-07-16. One page that fuses the "who actually sells Broadway tickets" explainer, the live rush/lottery board, and the show catalog into a single artifact: a living map of Broadway.*

- **Stylized SVG map** of the theater district (roughly 41st–54th St, 6th–8th Ave) drawn in the DESIGN.md language — NOT a Mapbox/Leaflet embed. A hand-drawn map of hand-curated data is the project's ethos made visible; no API keys, no tile servers. Inset for outliers (e.g. Vivian Beaumont at Lincoln Center).
- **Ownership layer** (always on): every Broadway house colored by owner→ticketer (Shubert→Telecharge, Nederlander/Disney→Ticketmaster, ATG→ATG Tickets, nonprofits→own). The legend *is* the explainer — tapping a legend entry highlights that owner's houses. This is the genuinely confusing information the aggregator sites bury.
- **Now-playing layer**: current show per house (poster chip + title) from the catalog; dark theaters render as *dark* — itself informative.
- **Live rush/lottery layer**: houses pulse/badge when a program is open or closing soon — same status engine, driven by the Phase 5 time machine. Scrub to 10am and watch the district light up.
- **Tap a theater** → card: show, owner, official ticketer + buy link, program statuses → through to the show page.
- **Data model** (`src/lib/theaters.ts`): all ~41 Broadway houses (not just catalog shows) — `{ name, owner, ticketer, address, coords, currentShowSlug | null }`. Stable, hand-curated facts; the map is the reason to expand the catalog toward ~35 shows.
- Lives at `/district`, linked from Discover; candidate hero page for web mode (Phase 4).

**Built 2026-07-16.** All 41 houses in `theaters.ts` (now-playing derived from catalog venue strings, so dark theaters fall out automatically — e.g. the Imperial after Chess closed); stylized SVG grid W 41st–54th with Broadway fitted through the on-Broadway houses; ownership legend doubles as filter; open-window halos driven by the status engine + time machine (verified: 26 halos at 1 PM → 2 at 11:55 PM); tap → Sheet card with poster, owner→ticketer buy link, live program rows, show-page CTA; Lincoln Center inset. Entry points: Discover card + web-nav "District" link. Polish candidates: keyboard focus ring on markers uses the browser default blue; the dev-overlay badge overlaps the time-machine pill in dev only.

**Refinement (decided 2026-07-16, post-build): OSM-traced geometry + attribution.**
- Re-derive the map's street grid and theater positions (optionally footprint shapes) by tracing from OpenStreetMap via Overpass (query recipe in DATA.md — 43 theatre ways in the district bbox, tagged with Wikidata QIDs). Keep it stylized/hand-drawn: under ODbL a stylized traced map is a "Produced Work" — the artwork isn't share-alike, it just needs credit.
- **Attribution**: "Map data © OpenStreetMap contributors" in the map caption, plus OSM and TDF entries in the colophon's data-sources list.
- While in `theaters.ts`: enrich rows with Wikidata QID + IBDB/Playbill venue IDs (CC0, free deep links) and hand-audit owner/capacity against owner sites — Wikidata has known errors (Gershwin capacity, stale Jujamcyn owners; DATA.md), which the colophon can cite as why the dataset is hand-curated.
- Add the **TKTS booth as a Duffy Square landmark** (the red steps) — tap → the live board sheet (Phase 13); Lincoln Center booth in the inset.

**Refinement built 2026-07-16 — then rolled back same day.** The traced map read as janky in practice (real positions cluster and collide — CitS nearly on top of the Gershwin; footprint shapes added noise), so the map reverted to the hand-placed stylized grid. **Kept:** the `theaters.ts` ID/capacity enrichment, the /api/theaters.json fields, the capacity+IBDB line in the theater sheet, the Wikidata/TDF credits on /about, and the trace pipeline in `scripts/trace-district/` (regenerates `src/lib/districtGeometry.ts`, currently deleted) if the traced look is revisited — it needs a declustering pass (nudge overlapping markers apart) before it earns its place. Original build notes: geometry traced via Overpass → generated `src/lib/districtGeometry.ts` (equirectangular, rotated 28.9° so streets run horizontal, x stretched 1.43× subway-map style; header documents the projection): traced street/avenue lines (slight leans are real), Broadway's genuine Times Square bend (cycleways filtered out of the centerline — they skewed it), 35 true building footprints rendered as soft shapes under the dots (the 6 houses buried inside towers — Palace, Marquis, Minskoff, CitS, Sondheim, Beaumont — stay dot-only), TKTS booth at its real Duffy Square spot + Lincoln Center booth added to the inset. `theaters.ts` enriched with wikidataId/ibdbId/playbillId (4 houses lack Playbill IDs upstream) + approximate capacity — Wikidata's documented Gershwin error (15,408 → ~1,933) corrected and cited on /about as the hand-curation argument; bonus quirk found: the Ambassador's Wikidata label is vandalized ("Chicago The Musical…"), IDs fine. Attribution: ODbL credit under the map, "Sources & credits" section on /about (OSM, Wikidata, TDF), IBDB deep link + capacity in the theater sheet, new fields in /api/theaters.json.

## Phase 7 — Colophon & open dataset

*Added 2026-07-16. Make the engineering honesty visible — for a technical audience, judgment reads rarer than code.*

- **Colophon page** (`/about`): how it works and why — why hand-curation beats scraping *for this data*, the `lastVerified` staleness mechanics, the fragmented-ticketing reality, and what was deliberately rejected (scraping, lottery automation, resale APIs) with reasons. Material already exists in RESEARCH.md; this is editing, not research.
- **Open dataset**: publish the curated data at `/api/programs.json` and `/api/theaters.json` with `lastVerified` stamps, documented on the colophon. The dataset is the product's spine — let others build on it.
- **Narrative ammo from MARKET.md**: the thesis is "the cheap seats exist (30 of 32 shows run sub-$50 programs); the interface to them doesn't" — record $1.91B season + $300–900 celebrity plays on one side, a volunteer static site with a staleness disclaimer as the community's best tool on the other. Quote TodayTix's own "set an alert" guidance as proof of the gap.

**Built 2026-07-16.** `/about` colophon (thesis w/ League numbers, hand-curation rationale, ticketing-split explainer → District link, the three deliberate rejections, open-data section, colophon + non-affiliation note) and force-static `/api/programs.json` + `/api/theaters.json` with per-row `lastVerified` and meta.docs pointing at /about. Entry points: web-nav About link, District-page caption link.

## Phase 8 — Deadline playbook & platform folk knowledge

*Added 2026-07-16, from MARKET.md: the sharpest documented pain is time — entry windows at odd hours per platform, and ~60-minute claim windows that start when the winner text is SENT, not read. Nobody documents what happens after you win. Pure curation; slots into the existing Phase 1 data model.*

- **Schema extensions** (`src/lib/programs.ts`): `claimWindow` (duration + winner-notification channel: email | text | app) and `tips: string[]` — both `lastVerified`-stamped like everything else.
- **"If you win" line** on program cards and show-page "Ways to save": *"Winners texted ~11am · 60 min to claim, clock starts on send."* The single highest-value curated fact per program.
- **Platform folk knowledge** rendered as expandable tips, curated from community reports (sources in MARKET.md): TodayTix rush "all tickets being held" = pending carts that time out (keep trying); Telecharge lottery now requires US phone verification (trips up international visitors); LuckySeat occasionally reverts to box-office pickup; Broadway Direct opens 12:01am.
- **"I entered" button** per program per day (localStorage, no platform integration — schedules are known): arms a **claim-window watch** push ("Winners are usually notified between X–Y — watch your email/texts"), a new notification kind in the existing cron. Entries append to a local log — the substrate for the possible lottery log below.
**Built 2026-07-16** (except the stats go/no-go, still deferred): `claimWindow` + `tips` on the Program schema with curated data per platform; "If you win" trophy line + expandable tips + "I entered" toggle (per NYC day, localStorage log) on program cards; entries sync onto the push subscription (migration `20260716200000`), and the cron now fires entry-conditioned claim-watch pushes when a window closes.

- **Personal lottery log — substrate only, stats view pending go/no-go.** The "I entered" data makes a stats view nearly free later: entries, streak, wins (user taps "I won", which also starts the claim countdown), money saved vs face value, shareable win card (Instagram is the #1 theater info source; users already hand-build win spreadsheets). Caveats that gate the go/no-go: self-reported data quality, and it's a retention feature for real users more than a portfolio demo. Decision deferred until the substrate exists and real usage says whether anyone taps "I entered."

## Phase 9 — Trip mode

*Added 2026-07-16, from MARKET.md: the compressed-trip tourist ("7 shows in 5 days") reads the community Rush Report daily; international visitors over-index at TKTS (12.2% of their admissions). The daily-grinder persona is served by the /rush feed; this serves the visitor.*

- Input: a date range ("In NYC Jul 20–24"), optionally party size/budget later.
- Output: a day-by-day plan for the window — enter-tonight lotteries (for tomorrow's shows), morning digital rushes, in-person rush open times, TKTS as the standing fallback; statuses and countdowns from the same status engine (and the time machine works here too).
- No LLM — this is deterministic calendar math over the dataset, and it becomes the tool the Tonight Concierge stretch goal calls later. Build the logic once, use it twice.

**Built 2026-07-16.** `src/lib/trip.ts` (`buildTripPlan` over `programOccurrencesNear`) + `/trip`: arrive-day chips (10 days out), nights stepper (1–7), day-by-day windows grouped Morning/Afternoon/Evening with prices + deep links, TKTS fallback card per day, "enter tonight for tomorrow" guidance. Entry points: web-nav Trip link, Discover two-up card row (with District). Party size/budget inputs deferred.

## Phase 10 — True-cost fee transparency

*Added 2026-07-16, from MARKET.md: fees are the #1 complaint against every platform (Telecharge ~$13.25/ticket + $3/order; the real Theatr's fee creep is its top user gripe). The FTC Junk Fees Rule (May 2025) made all-in pricing the industry norm — we match it.*

- **Curated fee table** (`src/lib/fees.ts`): per-platform fee schedules as ranges where they vary, `lastVerified`-stamped, always labeled *approximate*.
- **UI**: all-in estimates on official-ticketer cards and program cards — "$49 + ~$16 fees ≈ $65 at Telecharge" — degrading to face value where fee data is unknown. Never present an estimate as a quote.

**Built 2026-07-16.** `src/lib/fees.ts` (per-platform ranges incl. providers, `FEES_LAST_VERIFIED`, box office = null → "No added fees"); "≈ $58–62 all-in with fees (est.)" under program-card prices and "$119 face · ≈ …" on official-ticketer cards.

## Phase 11 — Diary artifacts & sharing

*Added 2026-07-16. The Goodreads/Letterboxd question, answered: **single-player diary + shareable artifacts, zero accounts.** The sharing impulse is real (win screenshots get posted to r/Broadway; Instagram is the #1 theater info source; personal recommendation is the top show-choice factor — MARKET.md), but a follow-graph social network is rejected: the diary niche is crowded (Show-Score, Mezzanine, StagePort, the real Theatr's own community layer), a network at n≈0 demos as a ghost town, and accounts/moderation/persistent user data break the project's near-zero-ops shape.*

- **Win card**: tapping "I won" (Phase 8 substrate) generates a share image — poster tile, "$10 lottery · face value $189", date. The artifact people already screenshot into group chats and stories; the app's only organic growth mechanism.
- **Ticket-stub share images**: the diary's existing stub cards get "share as image."
- **Season Wrapped**: a year-in-review recap generated from the diary — shows seen, money saved, win rate, most-visited theater owner (ties into the district map data). High-visibility design work.
- **Share-a-profile by link, no backend**: serialize the diary (photos excluded) into a compressed URL fragment; recipient's browser renders a read-only profile page (`/p#<data>`) entirely client-side. Friends see your shows and reviews; we run zero user infrastructure. Constraint-driven hack worth a colophon paragraph.
- Implementation notes: images rendered client-side (SVG/canvas → PNG) in the DESIGN.md language; share via Web Share API with download fallback; URL fragments compressed (CompressionStream or lz-string) and versioned so old links keep rendering.
- Priority: after the rush-layer phases (8–10) — high charm, but the differentiator ships first.

**Built 2026-07-16.** "I won" on entered lotteries → win-card sheet with on-device canvas render (poster or typographic fallback tile, price vs face, brand mark) + Web Share/download; diary stubs get "Share as image"; `/wrapped` (season label, shows seen, entries, wins + rate, $ saved vs face, most-visited houses, poster shelf, share render); `/p#<fragment>` read-only profile from a versioned deflate-compressed fragment (`z.`/`j.` plain fallback), photos and private words stripped at encode — profile's share button now builds the link. Discover gains the Season Wrapped card.

## Phase 12 — Off-Broadway expansion

*Added 2026-07-16. The scope decision on expansion: **deepen New York, don't add cities.** Off-Broadway wins over Chicago/LA/London on every axis — same city (dogfoodable), same platforms (TodayTix runs more Off-Broadway draws than any other platform), same curation sources (the Playbill/NYTG guides already cover it), same audience (r/Broadway discusses both) — and it deepens the "live board for New York theater" identity instead of diluting it.*

- **Catalog growth**: the ~35-show target now explicitly includes major Off-Broadway houses and long-runners — the nonprofits (Roundabout, LCT, MTC, 2ST, the Public) plus commercial Off-Broadway. Add `circuit: broadway | off-broadway` to shows and theaters.
- **Programs**: Off-Broadway rush/lottery rows in `programs.ts` — largely TodayTix-run, generally cheaper ($25–45), same schema and `lastVerified` discipline.
- **The official-ticketer feature gets stronger**: many Off-Broadway houses are nonprofits selling through their own systems — "where's the real box office" is even more confusing off the main stem.
- **UI**: `/rush`, show pages, notifications, and trip mode pick the new rows up automatically; add an optional circuit filter chip on `/rush`. The district map (Phase 6) stays Broadway-first — Off-Broadway venues scatter citywide; revisit an inset or toggle later rather than blocking the map.
- **Schema insurance, not commitment**: reserve a `market` field (default `nyc`) so a future London experiment (see Out of scope) needs no migration.
- Sequencing: this is data work, not feature work — it can grow incrementally alongside Phases 6–10 rather than waiting its turn.

**First batch shipped 2026-07-16.** 14 Off-Broadway shows verified against the July 2026 listings (long-runners: Little Shop, Play That Goes Wrong, Perfect Crime, Spelling Bee, Gazillion Bubble Show final months, Gin Game at Housing Works, Drunk Shakespeare, Accomplice; July openings: Shifters, The Whoopi Monologues, Broad Strokes, The Saviors, Giulia, Disruption) → 18 Off-Broadway in catalog, ~46 total. Blue Man Group checked and correctly excluded (closed Feb 2025). Programs added only where verified (Little Shop + PTGW $35 Telecharge lotteries, Perfect Crime $30 student rush; `lastVerified` 2026-07-16) — the rest correctly render "No verified program listed." Circuit filter chip on /rush (faceted sheet); `market` reserve field on Show + Theater; `tier` serves as the show circuit field. Remaining: more Off-Broadway program curation (TodayTix-run rows need per-show verification), nonprofit official-ticketer rows.

## Phase 13 — TKTS live board (the second automated feed)

*Added 2026-07-16, from DATA.md: tdf.org's TKTS Live page server-renders the full board (show, % off, price range, curtain time, per-board `Updated:` stamp, both NYC booths, Broadway + Off-Broadway) and is robots-clean. This is the only live discount inventory the app can legitimately carry — and it's the natural fallback everywhere the answer is "you lost the lottery, now what."*

- **Data flow**: server route fetches + parses the TKTS Live HTML on a 15–60 min revalidation (descriptive User-Agent; `wp/v2/tkts_booth` `modified` stamps as a cheap freshness pre-check). Normalize to `{ booth, circuit, rows: [{ title, showSlug | null, pctOff, priceRange, curtain }], boardUpdatedAt }`. Hand-curated alias map board-title → catalog slug (like the TM mapping table); **unmatched titles are kept as title-only rows** — the board renders complete even where the catalog is thinner.
- **Honesty rules**: always display *their* `Updated:` stamp, never our fetch time (upstream observed 3 days stale once). If the stamp is old or the booth is closed, present as "last board" (e.g. "Board from Sat 4:01 PM"), never as "now". Attribute "Data: TDF TKTS Live" with a link. **Exempt from the demo time machine** — this is real external data; scrubbing the clock can't simulate it, so the module runs on real time and says so when demo time is active.
- **Surfaces, in build order**:
  1. **Show page "Ways to save"**: when the show is on today's board — "On the TKTS board now · 50% off · $65–110 · 7:00 PM (board updated 3:02 PM)". Highest value per effort; completes the per-show answer alongside rush/lottery rows.
  2. **`/rush` board section**: a collapsible "The TKTS board" card — booth open/closed + hours, N shows, best discount, expandable full list with deep links to TDF show pages. Kept visually distinct from program cards (different kind: walk-up purchase, no entry window).
  3. **District map**: the Duffy Square booth landmark (Phase 6 refinement) — tap → board sheet.
  4. **Trip mode**: today's TKTS fallback card goes live (N shows, best discount); future days stay generic (the board is unknowable in advance — say so).
- **Concierge synergy**: the normalized board becomes a tool for the Tonight Concierge stretch goal ("lost the Six lottery → it's 50% off at TKTS right now").

**Built 2026-07-16** (all four surfaces): `src/lib/tkts.ts` (dependency-free regex parser + ET-stamp→ISO conversion with DST round-trip check + title→slug matcher with suffix stripping and alias map — "Spelling Bee"→spelling-bee), `/api/tkts` route (fetch `revalidate: 1800`, descriptive UA, failures return `ok:false` — never throw), `useTkts()` client hook, `TktsBoard.tsx` (RushSection / ShowRow / TripCard / BoardSheet + Duffy Square red-steps marker on the district map). Stale-board rule extended same day: the booth open/closed notice renders from the same TDF sync as the rows, so when the board isn't today's we suppress the booth-state claim too, not just re-frame the stamp.

**Duffy Dashboard Community API integrated 2026-07-16**: their public `live-summary` endpoint (real-time booth open/closed + show count + average price/discount — offered for public use on their About page) is fetched in parallel with the TDF page (`revalidate: 600` vs 1800; `Promise.allSettled`, either source failing never breaks the other). When TDF's board is stale, the UI composes both truths — "Booth closed right now · live" (Duffy) above "Board from Mon 3:02 PM" (TDF) — with dual attribution ("Data: TDF TKTS Live · Live status: Duffy Dashboard"). Trip card upgrades to live booth status when Duffy reports open on a stale-board day.

Follow-ups (researched 2026-07-16, DATA.md §TKTS alternatives — no third party mirrors the live board; TDF is the sole origin):
- **`tktsFrequently` flag** on shows (curated from TDF's own public "At TKTS Frequently" badge, ~39 shows) → show pages render "Frequently on the TKTS board" as the honest fallback when the live board is stale. Pure curation, no new infrastructure.
- **Outreach — one channel, not two** (revised after DATA.md people-research): Duffy Dashboard is run by Ben Van Buren, who is TDF's Chief of Staff — a note to Duffy is effectively read by TDF leadership. Single friendly email (or a booth visit — they invite it): per-show board access with attribution + volunteer-help offer; fold the tdf.org sync-stall observation into a gentle P.S.; anchor all asks to the Community API, never the paid reports. Verified live against the real board: parser handles both booths, open/closed notices, and — conveniently — TDF's upstream was genuinely stale during the build (Monday board on a Thursday), proving the honesty rules end-to-end: `/rush` and the map sheet frame it "Board from Mon 3:02 PM," the show-page row and live trip card correctly suppress themselves (`boardIsToday` gate). Gotcha for posterity: the fetch-level `revalidate` caches the whole route response ~30 min, so code changes to the parser can be masked by a cached response in dev — restart or wait out the window before debugging "stale" matcher behavior.

## Phase 14 — Retire the marketplace (the pivot)

*Added 2026-07-16. The last vestige of the clone era goes: no in-app buying or selling, at all. The Goal section's architecture ("we are the index, never the checkout") already governs everything built since Phase 1 — the P2P marketplace is the one surface that contradicts it, and the only surface that can never run on real data (every listing is seed fiction; every "sale" a simulate button). For the intended audience it's also the weakest exhibit: it re-shows Theatr's founder her own product — including the fee surface her users complain about most (MARKET.md) — instead of the layer her app is missing. With the Matinee rename and House Velvet already shipped, this completes the clone→product arc: Matinee becomes purely the companion — discovery, rush/lottery, official-ticketer clarity, TKTS, diary.*

**A. IA — Discover becomes home**
- The merged Discover page lives at `/` (move `discover/page.tsx` content into `(tabs)/page.tsx`); the Marketplace home and its `SellingFastShelf` are deleted.
- Redirects so no shared link 404s: `/discover` → `/`, `/tickets/:id` → `/`, `/listings` → `/profile` (its only entry point was the Profile pill). Route dirs `(tabs)/listings/` and `tickets/[id]/` are deleted.
- TabBar: `Discover · District | Log FAB | Rush · Profile` — the freed slot goes to the District map (the hero page earns it; Trip stays a Discover-linked card). Rewrite the `:61` comment: *find, explore, enter, you*.
- WebNav: drop Marketplace; `/` = Discover; `/shows/*` becomes a child of Discover in `isActive`; the `/tickets/*` mapping dies.

**B. Discover absorbs the browse layer**
- New anatomy, top to bottom: (1) `RushBanner` (keep), (2) **catalog browse grid** — the real replacement for the Marketplace grid: filter chips (Broadway / Off-Broadway circuit, has-rush/lottery, on-TKTS-today) over a rewritten card per show, (3) District + Trip quick-link cards (keep), (4) Interested / Attended / For you shelves (keep, below the grid — personal follows inventory).
- **`ShowCard` rewrite — the "cheapest way in" line.** The card's meta line changes from marketplace inventory ("from $85 · 3 listings") to answers: *"Lottery $40 · Rush $49 · on TKTS today"*, falling back to *"Face $119"* where no program is verified. Helper in `programs.ts` (min verified program price per show + live TKTS board membership); schedule-agnostic by design — "open now" urgency stays `RushBanner`/`/rush`'s job.
- View-transition care: the same show can now appear in the browse grid *and* a shelf on one page — the existing `poster-{slug}` claim-dedupe on Discover must cover the grid too (DESIGN.md §7 unique-per-page rule).
- `ListingBrowser`, `ListingCard`, `TicketStub`, `UrgencyStrip` are deleted (the browse grid is a fresh, simpler component — the old ones are listing-shaped all the way down).

**C. Show page — from checkout to answer sheet**
- Keep: poster hero + face-value line, `HeroBackdrop`.
- Promote `OfficialTicketsCard` to the primary action slot (it already carries the all-in fee estimate — Phase 10).
- `ShowPrograms` ("Ways to save" + TKTS row + platform tips) moves directly under it — the page's center of gravity.
- Delete: `UrgencyStrip`, the `ListingBrowser`/`TicketStub` listings section, the "Sold Listings" social-proof grid, and `NotifyCapture`.
- New engagement action replacing "buy": a **"Watch this show" card** wired to the existing `alerts` slice → the real push pipeline ("we'll ping you when its rush or lottery opens"). The emotional CTA survives the checkout's death.
- Small charm: venue line links to the show's house on `/district` (map sheet deep link) — ties the pages together.

**D. Notify untangle — price alerts become watches**
- Today `/notify` couples a marketplace price-alert UI ("under $X", fake "16 matches") to a push backend that only knows rush windows. Keep the working half, delete the fiction.
- `/notify` reframes as **Watches**: the shows you follow, each with its next program window, plus `NotifyPushCard` (unchanged). "Alert criteria," price thresholds, and the matches counter are deleted; `notifyAlerts`/`notifyMatches` seed data goes with them.
- Store: `alerts` slims to `{ slug, createdAt }`. The push backend, `sw.js`, and cron are untouched — they already only read slugs + lottery entries.

**E. Profile — seller tools out, the record in**
- Delete: **History tab** (Bought/Sold), **Wallet sheet** (balance/payouts), the **Listings pill**. `SellSheet`, `TicketDetails`, `StatusPipeline`, `ListingStatusCard` die with their pages.
- Header pills become **Watches** (→ `/notify`) and **Season Wrapped** (→ `/wrapped` — currently buried in the Collection tab).
- The freed middle tab becomes **Record** — the Phase 8 lottery-log stats view, un-deferred: entries, wins + win rate, streak, saved vs face value, straight off the existing `entries.ts` log and the Wrapped math. Rationale for resolving the go/no-go now: the pivot vacates exactly one tab slot, the data layer already exists, and it converts the profile from "my transactions" to "my theater life" — diary (Activity) · lottery record (Record) · taste (Collection). Fallback if it's too thin to demo: ship two tabs and leave Record as a fast-follow.
- `FollowSpot` header, points pill, edit/settings/messages sheets, `shareProfile`: untouched (already diary-only).

**F. Data & store cleanup**
- `store.tsx`: delete the Selling slice (`userListings`, `addUserListing`, `advanceListing`, `walletBalance`) and Buying slice (`purchases`, `addPurchase`); slim `alerts`. Keep `STORAGE_KEY` = `matinee-state-v1` — the loader already picks fields explicitly, so old persisted blobs with `listings`/`purchases` load fine and the next write drops them. No key bump, no migration code; verify with a seeded old-shape blob.
- `data.ts`: delete `Listing`, `marketplaceListings`, `soldListings`, `NotifyAlert` seeds. `activityFeed`, `profile`, `collection` stay.
- Components deleted (8): `ListingBrowser`, `ListingCard`, `TicketStub`, `TicketDetails`, `SellSheet`, `UrgencyStrip`, plus in-page `StatusPipeline`/`ListingStatusCard`. `ShowCard` is rewritten, not deleted. `ShowPicker` survives (Log + Notify use it).
- Untouched, verified zero marketplace coupling: Wrapped, Trip, Rush feed, District, `/p`, `/log`, `WinCardSheet`, `shareCards.ts`, `shareProfile.ts`, the entire push/PWA backend.

**G. Copy & metadata sweep**
- `layout.tsx:24` site description: "The theatre ticket marketplace" → the actual thesis, e.g. *"The live board for Broadway rush, lotteries, and cheap seats."*
- Grep-audit `marketplace|seller|sold|bought|wallet|payout|offer|checkout|below face` across `src/` — with eyes, not sed: "sold out" is legitimate rush vocabulary; "face value" is legitimate on rush/win surfaces and only "below face" is marketplace-speak.
- `/about` colophon: the "deliberately didn't build" section gains its fourth rejection — the resale marketplace itself, with one honest line about why the demo dropped it (couldn't be real; the reference app already does it well — attribution stays).

**H. Docs & follow-through**
- README + DESIGN.md: prune marketplace-page references (the espresso reference-screens section in DESIGN.md §1 stays — it documents the starting point, which is now part of the story).
- This file: Notes section's seller-pipeline caveat superseded (done below); open question 2 resolved (Rush has held a tab since the redesign; the *Marketplace* slot is what changes hands).

**Sequencing** (each step leaves the app building and clickable):
1. Show page trim + Watch card (C) — pure removal plus one promotion.
2. `ShowCard` rewrite + Discover merge (B) — Discover still at `/discover` while it grows.
3. IA swap (A) — Discover to `/`, redirects, TabBar/WebNav.
4. Notify reframe (D).
5. Profile rework (E) — Record tab last within this step.
6. Store/data deletion (F) — after nothing renders from those slices.
7. Copy sweep + docs (G, H).

**Verification bar**: type-check + build clean; every tab and redirect click-through in both layout modes; a browser profile carrying an old `matinee-state-v1` blob with listings/purchases loads without error; the marketplace grep returns only legitimate rush vocabulary; view-transition poster morph still fires Discover → show page from both grid and shelf.

**Built 2026-07-17.** All of A–H, verified in-browser (mobile + web modes): `/` is the merged Discover (rush banner → District/Trip quick links → Interested shelf → "Now playing" browse grid → Attended/For you); the grid uses the big Marketplace-style cards (Charlie's call) with the cheapest-way-in answer line — free programs render "Free", not "$0" (Winter's Tale caught this in testing); TabBar = Discover · District | Log | Rush · Profile with a filled pin glyph; redirects 308 (`/discover`→`/`, `/listings`→`/profile`, `/tickets/*`→`/`); Watches page shows live next-window lines off the status engine; profile Record tab built (entries, wins + %, streak, saved vs face, win rows) — the Phase 8 stats go/no-go resolved yes; old marketplace-era localStorage blobs load clean and shed `listings`/`purchases`/`maxPrice` on first write (same storage key, no migration code). Deviations from the letter of the plan: quick links sit *above* the browse grid (two compact rows shouldn't sink under 46 cards), and `useCountUp` was deleted (orphaned once the matches banner and UrgencyStrip died). Deleted: 2 pages, 7 components, the Selling/Buying store slices, the `Listing` seed data. The colophon's rejections section gained the fourth entry: the marketplace itself.

## Stretch goals — AI features (decided 2026-07-15)

*Committed as flex goals after Phases 1–4. Design principle: **AI reasons over curated facts; it never generates facts.** Prices, deadlines, and links always come from the dataset — the model plans, extracts, and explains.*

1. **Curation copilot** (backend; best value-for-effort): scheduled job where an LLM reads the public curation sources — Playbill roundup, NYTG, official show-site schema.org JSON-LD (some publish rush prices and lottery windows in `offers[]`), bwayrush.com as cross-check (sources verified in DATA.md; Broadway Direct is bot-walled — dropped as a read source) — extracts programs into our schema via structured output, diffs against the dataset, and opens a PR with proposed changes + per-field source citations for human merge. Attacks the project's only recurring cost; demonstrates an agentic, human-in-the-loop pipeline.
2. **Tonight concierge** (user-facing headliner): natural-language planning over the local dataset via tool use — "two of us, Thursday, under $60, we loved Hadestown" → a concrete plan with deadlines and fallbacks ("Enter the Six lottery by 10:30am → backup: Mincemeat in-person rush at 10am → else TKTS"). Feasible precisely because the dataset is small and structured.

Considered, not planned: taste recommendations from the diary (cheap embeddings add-on — revisit after stretch goals ship).

Anti-features (won't build): AI-written show synopses or editorial (hallucination risk; curation is cheap), a chatbot for its own sake, AI-composed alert copy (templates suffice).

## Out of scope (decided)

- SeatGeek API (cut 2026-07-15), StubHub/TodayTix partner APIs, scraping Ticketmaster or SeatGeek, lottery-entry automation, cross-seller live listing display.
- **Accounts / follow-graph social network** (cut 2026-07-16): sharing happens via artifacts and links (Phase 11), never via a hosted user graph — rationale in Phase 11 header.
- **Chicago/LA expansion** (cut 2026-07-16): effectively single-platform markets (Broadway in Chicago = Nederlander; Pantages/CTG in LA) — an aggregator adds ~nothing where there's nothing to aggregate. Expansion energy goes to Off-Broadway instead (Phase 12).
- **London** (deferred, not cut, 2026-07-16): the only market where the thesis transfers (real fragmentation across ATG/Delfont Mackintosh/Nimax/LW + day-seat culture + only static trackers). Gated on the curation copilot proving it can keep a second market fresh, and requires its own RESEARCH.md-style verification pass first.

## Notes

- ~~In-flight seller-pipeline work in `src/lib/store.tsx` (listed→sold→paid, wallet) is untouched by these phases.~~ Superseded 2026-07-16: Phase 14 removes the seller pipeline and the marketplace entirely.

## Open questions

1. Phase order — does the web-first layout rework (Phase 4) move before Phases 2–3?
2. Does `/rush` deserve a tab-bar slot (e.g. replacing Orders) or stay a Discover-linked page? **RESOLVED 2026-07-16**: Rush has held a tab since the tab-bar redesign; Phase 14 hands the *Marketplace* slot to District.
3. **TKTS daily board — RESOLVED 2026-07-16 (DATA.md).** The live board is server-rendered HTML (show, % off, price range, curtain time, `Updated:` stamp per board, both booths, Broadway + Off-Broadway), robots-clean, trivially parseable. Adopt as the app's second automated feed. Successor question: where does live TKTS surface first — the trip-day fallback card, a `/rush` section, or the district map?
4. **Rename before public deploy?** Carrying the cloned app's name reads as a clone regardless of what's inside. Theater-slang candidates: *Half Hour*, *Standby*, *Rush*, *Cheap Seats*. *Update 2026-07-16: the real Theatr announced 2026 expansion to major US/UK cities (MARKET.md) — recommendation: treat as decided-yes.*
5. **Poster art for public deploy** — current images are copyrighted marketing material (README warning). Lean into the generated typographic tiles as the visual identity, or replace/license. Decide before Phases 6–7 ship publicly, since it shapes the map and hero pages.
