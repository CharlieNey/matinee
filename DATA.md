# Public data inventory — Broadway

*Researched 2026-07-16 (three parallel passes: structured/reference datasets, live feeds, community sources). Companion to RESEARCH.md (ticketing APIs) and MARKET.md (sentiment). Verdicts are for a small non-commercial app.*

## Headline finds

1. **TKTS live board is usable** — resolves PLAN.md open question 3. `tdf.org/discount-ticket-programs/tkts-by-tdf/tkts-live/` server-renders the full board into HTML (no JS needed): per show — title, TDF show URL, % off, price range, curtain time, plus a per-board `Updated:` stamp. robots.txt is permissive; no ToS found; TDF is a nonprofit publishing this exactly for "what's on the board" purposes. Caveat observed: upstream data was 3 days stale at fetch (stalled cron on their side) — **always display their `Updated:` stamp, never fetch time**. Poll gently (15–60 min, descriptive User-Agent). Cheap freshness beacon: `GET /wp-json/wp/v2/tkts_booth` (public) exposes booth `modified` timestamps. A JSON route exists (`/wp-json/tkts/v1/booth?location=…`) but rejects all guessable keys — could email TDF for the keys.
2. **The theaters dataset + SVG map data problem is solved, legally clean**:
   - **Wikidata (CC0 — no attribution needed)**: every Broadway house has an item with coordinates, capacity, owner, address, and — the gem — **IBDB venue ID (P1217) and Playbill venue ID (P6113)** as join keys. SPARQL-queryable. Known errors to hand-audit: Gershwin capacity listed as 15,408 (actual ~1,933); duplicate capacities; owners stale (still "Jujamcyn" on the ATG houses).
   - **Wikipedia "List of Broadway theatres" (CC BY-SA)**: one table of exactly the 41 active houses — address, opened, capacity, owner, **current production**. Best canonical cross-check; extract facts, credit on the colophon.
   - **OpenStreetMap (ODbL)**: 43 theatre building footprints in the district bbox via Overpass, almost all carrying `wikidata=Q…` tags. Tracing a stylized hand-drawn SVG from OSM = a "Produced Work": credit "© OpenStreetMap contributors," no share-alike on the artwork.
   - **NYC Open Data**: the official Theater Subdistrict boundary lives in DCP's Zoning GIS geodatabase if the map wants the real district outline. (No useful city theaters point-dataset exists; DCLA covers nonprofits only.)
   - Together: `theaters.ts` rows can carry OSM↔Wikidata↔IBDB↔Playbill IDs, giving stable deep links to IBDB/Playbill *without scraping them*.
3. **Official show sites sometimes publish rush/lottery data as schema.org JSON-LD.** ohmaryplay.com embeds a complete `TheaterEvent` with `offers[]` including **In-person Rush ($43, box-office description) and Digital Lottery (entry window + draw times)**. Heterogeneous (Six and Gatsby sites have none) and hand-maintained (stale endDate observed) — but where present it's publisher-intended structured data. Prime input for the curation copilot.

## Live feeds

| Source | What | Verdict |
|---|---|---|
| **TKTS live board** (tdf.org) | Full discount board, both NYC booths, Broadway + Off-Broadway, server-rendered HTML with `Updated:` stamps | **Usable-with-care** (see headline 1) |
| **Playbill RSS** (`playbill.com/rss/news`, `/rss/features`, combined, video) | News items: title/link/teaser/categories/date. robots.txt allows generic crawlers (403s are UA-based; descriptive UA gets 200); AI-crawler UAs and `ai-train` disallowed | **Usable-with-care** — news only, attribute + link back; don't train on it |
| **Show-site JSON-LD** | Per-show `TheaterEvent`/offers where the producer bothered | **Usable per-site** — copilot input, never sole source |
| **TDF show-finder API** (`POST /wp-json/tdf/v1/show-finder/query`) | Structured show catalog incl. `isTKTSFrequently`, run dates | **Ask first** — email TDF; not exercised |
| **Telecharge** | Akamai 403s everything incl. robots.txt | **Do-not-use** (unverifiable permission) |
| **Broadway Direct / lottery.broadwaydirect.com** | Cloudflare JS challenge on everything; ToS bans automated methods | **Do-not-use** — link out only (already our stance) |

## TKTS board — alternative sources (researched 2026-07-16, during a live TDF sync outage)

**No third party mirrors the live intraday NYC board** — TDF is the sole origin; everything else is downstream or static. Ranked findings:

| Source | What | Verdict |
|---|---|---|
| **Duffy Dashboard** (duffydashboard.com) | TDF's self-described **official data & analytics partner** ("data comes directly from TKTS itself"). Public homepage (server-rendered): live booth status, today's running average, **yesterday's complete Duffy Square board** — fresher than tdf.org itself during the observed outage. Paid intra-day reports ($249/mo listing, $249/mo crowd, $425 both); About page **explicitly invites collaboration, especially nonprofit/audience-facing projects**. **Has a small public Community API**: `api.duffydashboard.com/v1/live-summary` (booth live/closed, show count, avg price, avg discount — "this API endpoint is for you") + free daily "On The Boards" email | **Community API usable today** (summary level); per-show board = ask-first. Contact via duffydashboard.com/contact or info@duffydashboard.com |
| **TDF "At TKTS Frequently" flag** | TDF's own public product surface: show-finder filter `tdf.org/on-stage/show-finder/?tkts=1` (~39 shows) + per-show badge ("Listed at TKTS Frequently"). Client-side rendered | **Usable now** — as a curated static `tktsFrequently` signal per show; the honest fallback when the live board is stale |
| Official TKTS app | Real-time ("directly linked to the display boards") but consumer-only; **no documented API** | Doesn't exist as a source |
| nytix.com/tkts | **Re-stamps TDF's stale board with today's date** — byte-identical rows to the July 13 board under an "Updated: July 16" header | **Do-not-use** — and a perfect cautionary tale for the colophon: this is exactly what our trust-their-stamp rule prevents |
| BroadwayBox | Static "frequently listed at TKTS" copy per show (same signal as TDF's flag); ToS bans robots | Do-not-use (and redundant) |
| TKTS socials (@tkts), Broadway Crew "TKTS Live" page, Playbill/BWW | Promo content / dead page / editorial guides — no board data | Doesn't exist |
| London contrast | SOLT runs a true official live board (tktsboard.officiallondontheatre.com) | Notable for the deferred London idea |

**Duffy Dashboard — people & history (researched 2026-07-16, all public sources).** Founder/operator: **Ben Van Buren** (About page signs "-Ben"; their sample report PDF is a forwarded email to ben@dragonflyerworks.com). Day job: **TDF Chief of Staff** (tdf.org staff page; LinkedIn headline still shows prior title "Strategy & Analytics Manager, TDF") — which explains the "official data partner" status; no public announcement of the partnership ever existed. Background: **DragonFlyer Works** (dragonflyerworks.com, 1650 Broadway) — TKTS street-team company repping 200+ shows *since 2010*; a theater-industry insider who taught himself to code, not an outside dev. Timeline: domain registered Feb 2023; launched mid-2023 as B2B "Data for a Modern Broadway" (producer-facing); repositioned 2026 as "**Data in Service of the Audience**" (audience/nonprofit-first, Community API, free daily board email). **Zero press or community footprint** — no Playbill/BWW coverage, no r/Broadway mentions, no social accounts; outreach will be one of very few they've received. Tone: warm, emoji-friendly, mission = "increase the brand recognition and customer base of TKTS"; they staff Duffy Square daily ("Come by and visit us at the booth anytime!"). Outreach cautions: paid nightly reports carry a strict no-redistribution footer (frame asks around the Community API, not the reports); and since Ben is TDF's Chief of Staff, **a note to Duffy Dashboard is effectively read by TDF leadership** — write accordingly. Do not confuse with Benjamin van Buren (New School psychology professor — different person).

## Reference / structured datasets

| Source | What | License | Verdict |
|---|---|---|---|
| Wikidata | Coords, capacity, owner, IBDB/Playbill IDs per theater | CC0 | **Seed for `theaters.ts`** — hand-audit (known errors above) |
| Wikipedia List of Broadway theatres | The canonical 41: owner, capacity, address, current show | CC BY-SA | **Primary cross-check**; facts extractable, credit it |
| OSM / Overpass | Building footprints + wikidata joins | ODbL | **SVG map geometry**; attribute |
| NYC Open Data (DCP zoning GDB) | Theater Subdistrict boundary | Open | Optional map underlay |
| **tidytuesday Broadway grosses** ([csv](https://raw.githubusercontent.com/rfordatascience/tidytuesday/main/data/2020/2020-04-28/grosses.csv)) | 47,524 weekly rows, 1985-06-09 → 2020-03-01: gross, avg/top ticket, seats, capacity %, per show/theater (+ synopses.csv, cpi.csv) | Public repo, sourced from Playbill | **The friction-free grosses corpus** for any historical viz; credit "Playbill/The Broadway League" |
| Broadway League grosses page | Live weekly per-show table back to 1979-80, public, no login | ToS: "personal viewing and reading only" | **View/link only** — no republication |
| Playbill `/grosses`, BroadwayWorld `/grosses.php` | Live weekly mirrors (BWW has Excel export, back to 1984) | Standard copyright; JS-rendered / Cloudflare | View/link only; no clean automation |
| IBDB | Authoritative production history | 403s everything; "personal viewing" ToS | **Deep-link targets only** (via Wikidata IDs) |
| Show-Score | Audience scores in `AggregateRating` JSON-LD on show pages | Restrictive ToS; robots allows show pages | Legally gray for ingestion — **link out** |
| Broadway Scorecard | Critic aggregation (Metacritic-style, 725 shows) | No API | Link out |

Gap: **no public bulk grosses data post-March-2020** — current numbers exist only on ToS-encumbered pages.

## Community / crowdsourced

- **r/Broadway daily Rush Report** — human-run by **u/BroadwayRushReport** (same anonymous, donation-supported operation as broadwayrushreport.com; active as of today). OP is a template; **the data is in the comments**: per-show line counts with timestamps, first-arrival times, sellouts, outcomes. Semi-structured at best (show-name nicknames, ranges) — regex won't survive; LLM extraction would, and volume is tiny (5–30 comments/day).
  - Access reality (tested): public `.json` endpoints **blocked** (403); **RSS works unauthenticated** (`…/user/BroadwayRushReport/submitted/.rss`, per-thread comment feeds) but is aggressively rate-limited — a few fetches/day is the ceiling; official Reddit Data API has a free non-commercial tier (100 QPM) but since Nov 2025 requires pre-approval for all developers; pullpush archive is **dead for this author after May 2025** (backfill only, Nov 2023–May 2025).
  - Reddit Data API terms if ever ingesting: display-only license, no modifying content beyond formatting, delete content when deleted upstream, attribute, revocable.
  - **Respectful play: link out to today's thread from in-person-rush cards + attribute; partner outreach via @broadwayrushreport socials is the high-leverage move** (their PDF archive — 107 weekly reports back to Nov 2023 — is the negotiation prize).
- **bwayrush.com** — static prerendered SvelteKit; all policy data (programs, prices, eligibility notes, 7-day performance grids) baked into the served HTML; sitemap shows daily rebuilds. Anonymous maintainer, contactable via on-site feedback form. Verdict: **cross-check for our curation + outreach candidate**; don't scrape someone's labor of love without asking.
- **TikTok @bryantheba** — a second independent rush reporter (Tue/Wed/Sat-ish); captions are near-structured (`Show-$price-count at time`, digital-rush section with platform+price). No API, TikTok ToS bans scraping → **outreach or link-out only**.
- **Community spreadsheets/Notion** — nothing maintained or public; personal win-stat posts (2018 Mean Girls/Book of Mormon) usable as cited color only. Broadway for Broke People is defunct.

## What this changes for the app (recommendations)

1. **TKTS becomes the app's second automated feed** (after TM Discovery): a "TKTS board now" module — genuinely live discount data, the perfect fallback row in trip mode and the concierge ("lost the lottery → Six is 50% off at TKTS right now").
2. **Phase 6 map data is de-risked**: seed `theaters.ts` from Wikidata+Wikipedia, trace the SVG from OSM footprints, hand-audit owners/capacity (Wikidata is provably wrong in places — which itself is a nice colophon anecdote for why the dataset is hand-curated).
3. **Curation copilot gets concrete inputs**: show-site JSON-LD offers (where present) + bwayrush.com HTML + Playbill roundup as cross-check sources for PR-proposing diffs.
4. **In-person rush cards can link to today's Rush Report thread** (zero ingestion, pure attribution) — and the partner-outreach card (BroadwayRushReport, bwayrush) is worth playing before building anything heavier.
5. **Historical grosses viz is possible but optional** (1985–2020 only): e.g., a theater's gross history as texture on district-map theater cards. Post-2020 data has no clean public source — don't promise "current grosses."
