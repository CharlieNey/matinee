# Unifying Broadway ticket sources: feasibility research

*Researched 2026-07-15 via a multi-agent deep-research run: 5 search angles, 24 sources fetched, 117 claims extracted, top 25 adversarially verified (3-vote refutation panel) → 21 confirmed, 4 refuted. Access-gating findings are live probes from 2026-07-15 and may drift.*

## Question

Can a solo-developer web app unify Broadway ticket discount/availability sources — TDF, TodayTix (incl. Rush/lotteries), Theatr, official box-office channels (Telecharge, Ticketmaster, Broadway Direct), TKTS, LuckySeat, StubHub, SeatGeek — into one interface, plus a rush/lottery aggregator? What's programmatically accessible, what do the ToS allow, who already does this, and what should actually be built?

## TL;DR

A **unified live marketplace** (real listings from every source in one grid) is not realistically buildable solo: every transactional API is partner-gated, and the scrapeable surfaces are bot-blocked or ToS-prohibited. A **unified discovery layer** is very buildable:

1. **Ticketmaster Discovery API** — the only sanctioned, self-serve API in the space — for live show/event data.
2. **A hand-curated rush/lottery/discount dataset** — small (~40 programs, ~4 platforms), slow-moving, and exactly the data no API provides. This is the differentiator.
3. **Deep links out** to every purchase flow. Be the index, never the checkout.

## Per-source access

| Source | Programmatic access | Verdict |
|---|---|---|
| **Ticketmaster** | Discovery API v2: free instant API key (query-param auth), 5,000 calls/day, ~5 req/s. Event/venue/date search, on-sale status, coarse `priceRanges` (optional, often absent), purchase URLs, 230K+ events incl. TM Resale. Seat-level availability & checkout are Partner-API-only (no public signup). The nominally open Commerce API is effectively dead (docs 404). | ✅ Integrate |
| **SeatGeek** | Documented public REST API (`api.seatgeek.com/2`) with event-level price stats (avg/lowest/median, listing count). But: anonymous requests 403 ("Client is required"), developer portal is approval-gated (RBAC, empty anonymous catalog), and seatgeek.com is hard-blocked by DataDome. API ToS forbid displaying other sellers' listings alongside SeatGeek data and require logo attribution; exception contact: hi@seatgeek.com. | ⚠️ Apply & see |
| **TodayTix** | Real B2B partner API (documented publicly at developers.todaytixgroup.com) with full inventory/availability/booking endpoints — but framed exclusively for transactional resale partners; credentials come from an account manager. The complete machine-readable doc index contains **zero rush/lottery endpoints**. Refuted: "Rush/lottery is app-exclusive" failed verification 0-3 — web deep-links may work. | ❌ Link out |
| **StubHub** | Official API (`api.stubhub.net`) covering search, purchase, and listing — but no self-serve signup exists; access requires emailing affiliates@stubhub.com (buyer/affiliate) or api.support@stubhub.com (seller). | ❌ Link out |
| **Telecharge, Broadway Direct, TKTS, TDF, LuckySeat, Theatr** | No verified API or feed found — a research gap, not a confirmed "no". TKTS's daily board is the most promising to probe manually. | Curate + deep-link |

## Rush & lottery: curate, don't scrape

- No rush/lottery program has ever been API-accessible. Every known automation (hobbyist GitHub bots, 2018–2024) drives a full browser or an Android emulator with personal login credentials, and every one rotted within weeks to months. The one maintained bot targets only Broadway Direct and still hand-curates its show list in source.
- The dataset is small and stable: Broadway Direct's lottery hub listed exactly 8 NY productions ($35–$55) as of 2026-07-12; New York Theatre Guide's curated page covers ~42 programs total; the whole ecosystem runs on ~4 platforms (Broadway Direct, LuckySeat, Telecharge rush, TodayTix app) with non-overlapping show coverage.
- The canonical references — Playbill's policy roundup (hand-updated 2026-07-13), NYTG, BroadwayWorld, bwayrush.com — are all **manually curated editorial pages**. Existing competition has the data but weak product: no personalization, no deadline alerts, no "what can I still enter tonight" view.

**Conclusion:** maintain programs as curated structured data (show × program type × platform × price × schedule/deadline × entry link × last-verified date). Minutes per week of upkeep; differentiate on UX and notifications.

## Legal notes (not legal advice)

- Ticketmaster's ToU prohibits any automated (or even manual-tool) retrieval/indexing/data-mining outside a revocable search-engine exception, and frames violations as copyright infringement — a theory a federal court accepted in *Ticketmaster v. RMG Technologies* (2007). Don't build on scraping TM, even non-commercially.
- Refuted while verifying (do not repeat): the "1,000 pages/day" numeric ToS limits and the "$0.25/page liquidated damages" clause are **not** in the current ToU (0-3 votes); "StubHub has no anonymous endpoints whatsoever" also failed (0-3).
- *hiQ v. LinkedIn* limits CFAA exposure for public-data scraping but not contract/copyright theories. Realistic enforcement risk against a private portfolio project is likely low; a public scraping-based product is a different calculus.
- SeatGeek's API terms permit free and commercial apps but prohibit cross-seller listing display and API content redistribution.

## Recommended build order

1. **Curated rush/lottery dataset + UX**: "tonight's opportunities" feed, deadline countdowns, per-show program cards; wire the Notify feature to it (web push / email later).
2. **Ticketmaster Discovery API**: live "what's running", dates, on-sale status, price ranges for Discover and show pages.
3. **Deep links everywhere** for purchase.
4. Optional: **request SeatGeek API access** for a SeatGeek-attributed resale-price signal ("lowest resale: $54").
5. **Don't build**: TM/SeatGeek scrapers, lottery-entry automation, cross-seller live listing display.

## Open questions

- Do TDF's member offers, the TKTS board, LuckySeat, Broadway Direct, Telecharge web, or Theatr expose any friendly undocumented JSON endpoints? (Unresearched — no surviving claims either way.)
- Would SeatGeek/TodayTix/StubHub grant credentials to an explicitly non-commercial portfolio project if asked directly?
- How much churn does the rush/lottery program set see per season? (Sizes the curation burden.)

## Key sources

- https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/ · https://developer.ticketmaster.com/products-and-docs/apis/getting-started/
- https://legal.ticketmaster.com/ (Terms of Use)
- https://developer.stubhub.com/docs/overview/introduction/
- https://support.seatgeek.com/hc/en-us/articles/4409765051283 · https://seatgeek.com/api-terms
- https://developers.todaytixgroup.com/ (incl. /llms.txt full index)
- https://playbill.com/article/broadway-rush-lottery-and-standing-room-only-policies-com-116003
- https://www.newyorktheatreguide.com/theatre-news/news/broadway-and-off-broadway-rush-and-lottery-theatre-ticket-guide
- https://lottery.broadwaydirect.com/ · https://bwayrush.com/
- https://github.com/qibinlou/broadway-lottery-bots · https://github.com/alexmerm/BroadwayLottoBot · https://github.com/5l4vm0/TodayTixLotteryBot
