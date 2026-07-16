# Plan: Theatr — from clone to portfolio product

*Working plan, revised 2026-07-16. Grounded in RESEARCH.md. Portfolio piece, web-first.*

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
| Show catalog (~15 → ~35 shows) | Hand-curated (already largely the real July 2026 season) | Per season |
| Rush/lottery programs | Hand-curated from Playbill's roundup, NYTG's guide, Broadway Direct, LuckySeat, TodayTix app, show sites; `lastVerified` per row | Minutes/week |
| Official ticketer + buy link per show | Hand-curated map from theater ownership (Shubert→Telecharge, Nederlander/Disney→Ticketmaster, ATG→ATG Tickets, nonprofits→own) | Rarely changes |
| Performance schedules (weekly grid) | Hand-curated; TM Discovery live for its slice | Monthly-ish |
| On-sale status / price ranges | **TM Discovery API** (automated, daily) for the Nederlander/Disney slice; face value + program prices elsewhere | Automated |
| TKTS daily board | Manual probe of tdf.org's live board for a JSON feed; adopt only if clean | One-time probe |

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

- Web push via service worker + PWA manifest (iOS requires installed PWA): "lottery opens/closes soon" for followed shows.
- Requires minimal persistence for push subscriptions + a cron to evaluate schedules: Vercel KV or Supabase, whichever is less ceremony.
- Optional email fallback (Resend).

Free-tier findings (verified 2026-07-16):
- **Vercel Hobby** works for hosting (100GB bandwidth, 100K invocations/mo, hard caps so no surprise bills; non-commercial use only — fine for a portfolio). BUT its cron jobs are capped at **once per day**, timing guaranteed only within the hour — too coarse for deadline pushes.
- **Scheduler instead**: GitHub Actions schedule (~15-min cadence) or cron-job.org hitting a secret-protected route handler that evaluates program windows and sends pushes (`web-push`, VAPID keys).
- **Supabase free** works for subscription persistence (500MB Postgres, 50K MAU auth, 500K edge-fn invocations). BUT free projects **pause after 7 days without API requests**. Mitigation: the notification cron queries Supabase on every run, doubling as the keepalive.

## Phase 4 — Web/mobile layout toggle

*Decided 2026-07-15: not a one-way web rework — an explicit **layout toggle** so visitors can explore both presentations.*

- **Mobile mode**: the current experience — centered 430px phone column, floating tab bar. Stays pixel-faithful to the reference screenshots.
- **Web mode**: a real responsive web app — nav rail/top bar, multi-column feeds, poster-hero show pages.
- Toggle is a persistent UI control (and remembered per visitor); components and tokens are shared, only layout shells differ.
- Rewrite DESIGN.md's viewport section ("this is a phone product…") to define both modes and the toggle.

## Phase 5 — Demo time machine

*Added 2026-07-16. The rush layer is invisible outside program windows — a visitor landing at 3pm sees a dead board. Fix: let them move the clock.*

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

## Phase 7 — Colophon & open dataset

*Added 2026-07-16. Make the engineering honesty visible — for a technical audience, judgment reads rarer than code.*

- **Colophon page** (`/about`): how it works and why — why hand-curation beats scraping *for this data*, the `lastVerified` staleness mechanics, the fragmented-ticketing reality, and what was deliberately rejected (scraping, lottery automation, resale APIs) with reasons. Material already exists in RESEARCH.md; this is editing, not research.
- **Open dataset**: publish the curated data at `/api/programs.json` and `/api/theaters.json` with `lastVerified` stamps, documented on the colophon. The dataset is the product's spine — let others build on it.

## Stretch goals — AI features (decided 2026-07-15)

*Committed as flex goals after Phases 1–4. Design principle: **AI reasons over curated facts; it never generates facts.** Prices, deadlines, and links always come from the dataset — the model plans, extracts, and explains.*

1. **Curation copilot** (backend; best value-for-effort): scheduled job where an LLM reads the public curation sources (Playbill roundup, NYTG, Broadway Direct), extracts programs into our schema via structured output, diffs against the dataset, and opens a PR with proposed changes + per-field source citations for human merge. Attacks the project's only recurring cost; demonstrates an agentic, human-in-the-loop pipeline.
2. **Tonight concierge** (user-facing headliner): natural-language planning over the local dataset via tool use — "two of us, Thursday, under $60, we loved Hadestown" → a concrete plan with deadlines and fallbacks ("Enter the Six lottery by 10:30am → backup: Mincemeat in-person rush at 10am → else TKTS"). Feasible precisely because the dataset is small and structured.

Considered, not planned: taste recommendations from the diary (cheap embeddings add-on — revisit after stretch goals ship).

Anti-features (won't build): AI-written show synopses or editorial (hallucination risk; curation is cheap), a chatbot for its own sake, AI-composed alert copy (templates suffice).

## Out of scope (decided)

- SeatGeek API (cut 2026-07-15), StubHub/TodayTix partner APIs, scraping Ticketmaster or SeatGeek, lottery-entry automation, cross-seller live listing display.

## Notes

- In-flight seller-pipeline work in `src/lib/store.tsx` (listed→sold→paid, wallet) is untouched by these phases.

## Open questions

1. Phase order — does the web-first layout rework (Phase 4) move before Phases 2–3?
2. Does `/rush` deserve a tab-bar slot (e.g. replacing Orders) or stay a Discover-linked page?
3. TKTS daily board — worth a manual probe for an undocumented feed (research gap)?
