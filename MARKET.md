# Market & sentiment research — Broadway ticketing

*Compiled 2026-07-16 from four parallel research passes: the real Theatr app, TodayTix sentiment, the wider buying landscape + how lottery/rush hunters track programs today, and Broadway market context. Complements RESEARCH.md (API/feasibility). Source URLs inline; Reddit quotes via pullpush archive (dates approximate, permalinks exact).*

## Headline conclusions

1. **The rush/lottery aggregation gap is real and documented.** No app or alert service covers the 4–5 lottery/rush platforms. The community's default tool, bwayrush.com, is a volunteer static site whose own disclaimer says "I cannot guarantee these are always up to date" — and it still gets recommended constantly on r/Broadway. Even TodayTix's official guidance tells users to "note what time Rush opens, set an alert" themselves. No funded startup occupies this space (only new 2024–26 consumer entrant found: prioriTIX, a $90/mo subscription timing-arbitrage play, July 2026).
2. **The sharpest pain is *time*, not discovery.** Entry windows differ per platform (Broadway Direct opens 12:01am; LuckySeat entries close 9:30am the day *before*; Telecharge runs per-show micro-sites). Winners get ~60-minute claim windows that start when the text/email is *sent*, not read. Documented misses: "Finally won a Hamilton lottery yesterday and had no idea my app notification was off… the confirmation email arrived nine hours late" (r/Broadway, score 33); "I won Lion King lottery tickets years ago and missed the deadline and never won again."
3. **"Which site is even official?" confusion is validated.** Same show listed by two official sellers at different prices (Mamma Mia: $89 Telecharge presale vs $84.75 Broadway Direct, buyer questioned BD's legitimacy); box-office-worker scam PSAs; Rolling Stone's own guide miscategorizes TodayTix as resale. The district map / official-ticketer layer addresses a real, documented problem.
4. **The affordability narrative writes itself.** Record season ($1.91B gross 2025–26, avg paid admission ~$131, celebrity plays at $300–900) coexists with 30 of 32 shows offering sub-$50 rush/lottery. The cheap seats exist; the interface to them doesn't. That's the colophon's thesis, with League numbers to back it.

## The market (Broadway League + trade press)

- **2024–25**: $1.89B gross (record at the time), 14.66M attendance, 91.2% capacity. **2025–26**: $1.91B (new record), 14.58M, 90.8%. Grosses now exceed pre-pandemic; attendance ~1% below the 2018–19 peak — recovery is price-led. ([League 24–25](https://www.broadwayleague.com/press/press-releases/broadways-2024-2025-season-wraps-with-147-million-attendances-and-grosses-of-189-billion/), [League 25–26](https://www.broadwayleague.com/press/press-releases/broadways-20252026-season-wraps-with-146-million-attendances-and-grosses-of-191-billion/))
- **Audience is getting younger and more online**: average age 41 (down from 44 three years ago); Instagram is now the **#1 cited source of theater information**; BIPOC share 34% (30-year high); international at a record 3.0M admissions. ([2024–25 demographics report coverage](https://www.broadwaynews.com/broadway-league-releases-audience-demographic-report-for-2024-2025/))
- **Super-fans are the leverage point**: attendees seeing 15+ shows/year are **8% of the audience but 40% of ticket purchases** (up from 4.9%/30.2% the prior season). The daily-lottery-grinder persona sits inside this cohort.
- **Discount channels are small but structural**: TKTS ~630K tickets/yr (~4% of admissions incl. Off-Broadway); TDF ~575K to 120K+ eligibility-gated members; lottery/rush ≈ 2.3–5.8% of admissions by segment (2022–23 report). Lottery/rush skews NYC-resident (5.8% NYC vs 2.3% domestic tourists).
- **Gen-Z demand is proven**: Romeo + Juliet (2024–25) had the youngest ticket-buying audience in recorded history (14% of purchasers 18–24 vs ~3% industry norm) and recouped $7M in 20 weeks. TikTok/#theatretok drives discovery (Oh, Mary!, John Proctor Is the Villain).
- **Pricing discourse**: spring 2025 celebrity plays (Othello $216–921, Good Night and Good Luck first $4M non-musical week) fueled an affordability backlash — but >70% of shows kept average paid admission under $150 in those same weeks. Both sides of that argument are useful context.
- **Consolidation**: TodayTix Group (TodayTix, Show-Score, Goldstar, Secret Cinema, LondonTheatre, New York Theatre Guide) was acquired by Ari Emanuel's MARI, Oct 2025. The FTC Junk Fees Rule (effective May 2025) now forces all-in upfront pricing across ticketing.

## Sentiment: TodayTix (the incumbent to learn from)

4.9★/59K App Store ratings vs Trustpilot ~4.0, BBB 27 unanswered complaints, PissedConsumer 2.0 — happy checkout flow, unhappy edge cases. Recurring themes:

- **Rush mechanics rage**: "Every time I go to get rush tickets as soon as the rush seats open, it always says being held" (1★, Jul 2026). Community folk knowledge: held carts time out — "Keep trying!… they haven't completed their purchases yet."
- **"Best available" seat anxiety**: "TodayTix will buy the best available option when they get to the box office. Don't use them if you want a specific seat"; undisclosed partial-view complaints recur.
- **Support/refunds**: voucher-first policy, no phone support, "Ticket Protection" disputes.
- **Praise**: real discounts, flash-sale alerts, lottery/rush without lining up; refundability add-on drives loyalty.
- **The tracking gap in their own words**: users juggle "Todaytix, broadway direct, lucky seats and telecharge… around 10+ lotteries and more Rush options" daily; alarm-setting is universal folk practice ("don't make me set an alarm to look at my phone at exactly 9am and then give myself RSI speed-tapping").

## Sentiment: Theatr (the app this project cloned)

- Bootstrapped (founder Eva Wang, ex-@stooping_theatre Instagram; launched Mar 2023; rejected investment offers; run break-even), NYC-only, ~10K registered users by year two, 4.9★/~4.5K ratings, ~39K Instagram followers, TikTok ambassador program. **Expansion "to major cities in the US and UK" announced for 2026.**
- Loved for: speed ("sold 5 sets… all within 5 minutes"), face-value-or-less anti-gouging with escrow, price alerts, and "window shopping" price-watching.
- Complaints: **fees crept up** from processing-only (Jan 2024) to ~15% effective ("Theatr's ticket fees are NUTS"), scalper gaming (list at cost, cancel if a better offer appears elsewhere), door fraud attempts (support generally makes users whole), opaque account restrictions, BBB F.
- Diary/community layer is real but secondary to the marketplace ("earn Karma as you buy, sell, and contribute").
- **Implication for this project**: the real Theatr is alive, growing, press-covered, and expanding in 2026 — shipping a public portfolio piece under their name is untenable. Rename before deploy (PLAN.md open question 4) should be treated as decided-yes.

## Sentiment: the rest of the landscape

- **Telecharge**: ~$13.25/ticket + $3/order fees; rush site outages ("Telecharge Rush site down again… Why can't they manage to get this site working"); lottery now requires US phone verification (hurts international tourists); per-show lottery micro-sites.
- **Ticketmaster**: junk-fee class action (2025, motion to dismiss denied); no-exchange rigidity.
- **Broadway Direct**: claim window "too short"; Disney lottery prices rose (Lion King $35→$60); promo-code bugs.
- **LuckySeat**: 60-minute claim clock starts on send; occasional box-office-pickup-only fulfillment; seat-quality roulette both ways (Row BB front-row wins and "worse than any obstructed view" losses).
- **TKTS/TDF**: TKTS = best *discount* on good seats, not lowest price; discounts shrinking on hits; recurring mechanics confusion. TDF beloved but eligibility-gated.
- **Resale**: wheelchair-seat surprises, fake-ticket anxiety, scam PSAs — trust is the resale problem, which is exactly the real Theatr's wedge.

## How hunters track programs today (the competitive set)

| Tool | What it is | Gap |
|---|---|---|
| bwayrush.com | Volunteer static grid, the community default | Self-declared staleness; no alerts; intermittently down (522 during research) |
| broadwayrushreport.com + r/Broadway daily threads | Crowdsourced in-person rush line intel (arrival times, sellouts) | Physical lines only; no digital lotteries; no alerts |
| Playbill roundup / NYTG guide / nytix.com | Static editorial lists | No update stamps; no alerts |
| borninthecity.com guides | Actively maintained editorial (July 2026 updates) | Guides, not a live tool |
| Personal spreadsheets / Notion templates / phone alarms | The actual workflow | Evidence the product is missing |

No cross-platform tracker app exists on iOS/Android (App Store search surfaces only TodayTix and Broadway Direct's own apps). Demand evidence is indirect but strong: constant recommendations of a stale hobby site, published personal win-rate spreadsheets, universal alarm-setting advice.

## Odds culture (expectation-setting, not a data source)

Persistent despair ("entered the Hamilton lottery everyday… never won, never even got standby") next to grinder success ("If you enter all of them each day, you win every two to three weeks"). Real odds are unknowable from outside — do not fabricate them; do set expectations editorially and let users track their own record.
