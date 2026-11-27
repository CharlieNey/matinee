# Launch plan: getting Matinee its first returning users

Written 2026-11-27. Built on the market research of 2026-11-20
(`~/personal_projects/market-research/matinee.md`), with every time-sensitive
fact re-checked on 2026-11-27 (marked "re-checked"). Facts and outlines only:
**Charlie writes every post and message himself.** Nothing here has been sent
or posted.

## What Matinee is for, in facts

- **Who it's for:** people who enter lotteries and rush several times a week
  across sellers: locals, students, superfans. Tourists are a nice-to-have.
  TodayTix-only users already get alerts from TodayTix.
- **What only Matinee does:**
  - A push before each window opens, for the shows you follow, across every
    seller.
  - A live "open now" board.
  - `/today`, a checklist of every lottery and rush open or opening today.
  - Once Charlie says yes: a calendar feed.
- **Trust facts (2026-11-27):**
  - 59 programs; 42 checked against the show's own site, each with its date
    and source.
  - 17 marked "Unverified" with the reason; they send no alerts.
  - "Report a wrong fact" on every row.
  - No ads, no accounts, no affiliate links. The code is public.
- **The field, re-checked 2026-11-27:**
  - TodayTix: "we'll alert you when each Lottery opens" (its own shows only).
  - Born in the City: "Every open lottery, once each morning" by email.
  - BroadwayCheapSeats now has browser push: "One morning heads-up on days a
    show you follow has a rush line and enough reports to say when people
    arrive". Whether that page is new since Nov 20 is unknown. It still has
    no per-window lottery alerts.
  - No new per-window, cross-seller alert tool was found.
  - The research's positioning still holds: Matinee is the clock, not
    another list.

## The gate: true before telling anyone

1. **Push is live in production and works on a real iPhone.**
   `docs/GO-LIVE.md` steps 2–7 (secret, migrations, deploy, scheduler, test
   push). Until then, posts don't mention alerts.
2. **The most-searched shows are confirmed, not "Unverified".**
   - Of the 17 unverified rows, five shows matter most for search and for
     first impressions: The Lion King, Aladdin, Hadestown, Chicago and The
     Book of Mormon.
   - Confirm them by hand on the sellers' pages (`docs/GO-LIVE.md` step 9,
     about 20 minutes), or accept that they read "Unverified" at launch.
3. **Reports reach Charlie.** Today "Report a wrong fact" mails his personal
   address, which is public in the page source. He either accepts that, or
   sets up forwarding for `hello@matinee.nyc` (the domain has no MX record).
4. **Counting is on**, so the two weeks can be measured: one click in the
   Vercel dashboard, then merge `ship/5-counting`
   (`docs/proposals/cookieless-counting.md`). Note the baseline: the push
   subscription count in `/api/health` on the day push goes live.
5. **The data is fresh for the launch weeks.**
   - The next re-check is due by noon ET on Friday Dec 11.
   - During the two launch weeks, re-check the shows people actually follow,
     weekly.
6. **Already done:**
   - Playbill-cover posters gone (Nov 21).
   - AI sentence and takedown address on /about (Nov 27).
   - Demo profile removed (Nov 27).
   - The calendar feed and "By show" record are built; Charlie decides
     whether they ship.

## The calendar: holiday weeks and hooks

| Dates | What happens | What it means for launch |
|---|---|---|
| Nov 26–29 | Thanksgiving week; Two Strangers' final performance Nov 29 | Too soon: the gate isn't met |
| Dec 1 | Inter Alia opens (re-checked: Broadway News itinerary, Nov 23) | A natural example row, with a $45 lottery and rush, both checked |
| Dec 6 | Galileo opens (same source) | Another; its lottery and rush are checked |
| Dec 7 | Dolly previews begin at the St. James; opening night Jan 19 (re-checked: Broadway News, the show's site) | Its lottery policy isn't published yet: add it only from the official page |
| **Dec 7–18** | **Best window:** after the openings, before the holidays | r/Broadway and the guide emails, if the gate is met |
| Dec 11, noon ET | Data re-check due | Do it before any post that week |
| Dec 21–Jan 3 | Christmas and New Year | Tourist peak, locals away; holiday schedules vary by show. Avoid launch posts. Answering questions is fine |
| Jan 3 | & Juliet, SIX and Stranger Things give their final performances (their sites) | Rows come out; check pages say "closed" |
| Jan 6, 10 AM ET | Broadway Week booking opens; the 2-for-1 runs Jan 19–Feb 11 (re-checked: nyctourism.com) | Second wave: guide maintainers again, a Secret NYC tip |
| Jan 10–18 | A Few Good Men, Much Ado (Jan 10), Buena Vista, Other Desert Cities (Jan 17) and Gazillion Bubble Show (Jan 18) close | More rows out |

## Channels, in order

### 1. r/Broadway

- **Why:** the fan hub; the research's top channel.
- **Rules:** couldn't be read by automation on Nov 20 or Nov 27 (Reddit
  blocks it). **Charlie reads `/about/rules` and the wiki by hand, then
  messages the moderators before posting anything.**
- **What to say** (outline for his own words):
  - Why he built it: one honest line. Only he can write it.
  - What it does: open now and later today across every seller; a push
    before the windows of shows you follow; the `/today` checklist.
  - How it stays honest: each row says when it was checked and against
    which page; unconfirmed rows say "Unverified"; one tap to report a wrong
    fact.
  - What it isn't: it doesn't sell tickets, has no ads or accounts, and
    never enters anything for anyone.
  - Credit bwayrush and the Rush Reports. It's for the clock part, not a
    replacement.
  - One plain sentence on building it with AI, matching /about.
  - Ask for corrections.
- **When:** a weekday, 8–9 AM ET (before the 9 AM TodayTix rush and the
  10 AM box offices), in the Dec 7–18 window. Stay in the thread two hours,
  and fix reported errors the same day.

### 2. People who maintain cheap-ticket guides

- **Who:** Time Out's cheap-Broadway guide, Nick Gray, Ware on the Globe and
  Jonathan Mandell (newyorktheater.me), via each one's own contact page.
- **What to ask for:** a link, not a story. Time Out ran BroadwayCheapSeats'
  exclusive in October.
- **What to say** (outline):
  - one line showing he read their guide;
  - what Matinee adds for their readers (the open-now board, the alert, the
    checklist);
  - the trust facts above;
  - "if you spot anything wrong, tell me".
- **When:** the Dec 7–18 window, then again in the first days of January,
  before Broadway Week booking opens on Jan 6.

### 3. Show HN

- **Rules, re-checked 2026-11-27:**
  - [showlim](https://news.ycombinator.com/showlim): "We're temporarily
    restricting Show HNs because of a massive influx, mostly by users who
    aren't yet familiar with the site or its culture." The page doesn't say
    how this is enforced. **Charlie checks whether his account can post.**
  - [showhn](https://news.ycombinator.com/showhn.html): "The project should
    be non-trivial. Don't post quickly-generated one-offs; anybody can do
    that now."
  - [guidelines](https://news.ycombinator.com/newsguidelines.html): "Please
    don't put generated text in HN posts. Write your text yourself" and
    "Don't post generated text or AI-edited text."
  - So the post must be entirely his own words.
- **What to say** (outline):
  - What it is, in one line.
  - What was hard:
    - no API, so the data is hand-checked with a source and a date on each
      row, and unconfirmed rows are labeled;
    - weekly windows in New York time across daylight saving;
    - push delivered exactly once by a scheduler that can fail (a claim
      ledger and lease);
    - the TKTS board shown with TDF's own timestamp.
  - What was deliberately not built: scraping sellers, lottery auto-entry,
    resale.
  - How AI was used and what he checked himself.
  - The public repo, and the open data at `/api/programs.json`.
- **When:** a Sunday at 7 PM ET (the research's timing analysis), outside
  Dec 21–Jan 3. The same week, the build story can go to r/webdev's Showoff
  Saturday.

### Later, after the first two weeks

- A Secret NYC tip in late December, for the Jan 6 Broadway Week on-sale.
- Get to know @bryantheba's rush reports before asking for anything.
- The Bluesky account (`docs/proposals/social-account.md`), if Charlie wants
  it.

### Skip

These follow the research's Nov 20 reading; not re-checked:
- BroadwayWorld's boards: their rules ban advertising sites and apps.
- r/opensource: it bans AI-built projects.
- Discord theater servers.
- The Skint and Brokelyn.

## What to measure in the first two weeks

| Measure | How | Limit |
|---|---|---|
| Alert opt-ins, and shows followed per opt-in | `/api/health` → `push.subscriptions`; the followed slugs in Supabase `push_subscriptions` | Needs push live |
| Daily visitors, weekday mornings | Vercel Web Analytics, once on | **Can't show returning visitors.** Vercel resets its visitor hash daily, so nobody is recognized across days. Opt-ins and follows are the returning signal |
| Taps out to official entry pages | Not counted on the free path | Page views don't include outbound taps. PostHog's `seller_click` is wired but needs an account. Vercel custom events weren't checked for Hobby |
| Wrong-fact reports | Emails to the report address | Count them, time each fix, and note whether the fact was already wrong when checked |
| Alert accuracy | Supabase `notification_log` against the catalog | Audit every push sent in week 1 |
| Reception | Moderator reply, post score, comment tone, guide replies, mentions of `matinee.nyc` | By hand |

## When to stop

These are judgment calls, from the research:
- **A push goes out for a window that was wrong or didn't exist.** Run
  `supabase/scheduler/disable.sql`, fix the process, and pause posting.
- **The moderators say no, or the post is removed.** Don't repost there.
- **Two or more reports in week 1 were already wrong when checked.** The
  checking isn't good enough yet: weekly checks for the top shows before any
  more promotion.
- **A seller, producer or Playbill asks for something to come down.** Do it
  the same day.
- **Fewer than about 25 alert opt-ins within two weeks of the r/Broadway
  post.** The need is narrower than the research thought; keep Matinee as a
  portfolio piece.
- **BroadwayCheapSeats ships per-window lottery alerts first.** As of Nov 27
  it has a morning push on rush-line days only. Then reposition around the
  board, `/today` and TKTS, or step back.

## Sources

- Research: `~/personal_projects/market-research/matinee.md` (2026-11-20).
- Re-checked 2026-11-27:
  - [HN showlim](https://news.ycombinator.com/showlim),
    [Show HN rules](https://news.ycombinator.com/showhn.html),
    [HN guidelines](https://news.ycombinator.com/newsguidelines.html)
  - [NYC Broadway Week](https://www.nyctourism.com/broadway-week/)
  - [TodayTix lottery and rush](https://www.todaytix.com/us/static/lotteryandrush),
    [Born in the City alerts](https://alerts.borninthecity.com/),
    [BroadwayCheapSeats](https://broadwaycheapseats.com/) and its `/alerts` page
  - [Broadway News itinerary, week of Nov 23](https://www.broadwaynews.com/broadway-itinerary-week-of-11-23-2/)
  - [Dolly's dates (Broadway News)](https://www.broadwaynews.com/dolly-a-true-original-musical-will-come-to-broadway-this-winter/),
    [dollymusical.com](https://www.dollymusical.com/)
  - Final performances: `FINAL_PERFORMANCES` in `src/lib/shows.ts`, each with
    its official source.
- Couldn't verify: r/Broadway's rules (blocked to automated readers).
