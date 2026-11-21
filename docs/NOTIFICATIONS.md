# Notifications

Written 2026-11-20, before the build. It is the spec the code is held to.
Going live needs the hosted steps in `docs/GO-LIVE.md` (rate-limit and
ledger migrations, scheduler switch-on); until then production still runs the
old path, whose GitHub cron has been disabled since 2026-09-15.

## What it promises

Follow a show and this device gets a push when one of its rush or lottery
windows is about to open. Lotteries also get a last call. If you tapped
"I entered", you hear when the drawing closes and how long winners have.

- **One push per alert per device.** This holds when the scheduler runs twice,
  runs late, or overlaps itself.
- **On time or not at all.** An alert that would land after its moment is
  dropped by the sender and, if the phone is offline, by the push service.
- **Quiet hours, 10 PM to 8 AM New York time.** A lottery that opens at
  midnight is announced at 8 AM if it is still open.
- **A tap opens the show**, scrolled to its ways to save.
- **Standing room gets no alerts.** It is sold only when a performance sells
  out, so there is no clock to alert on.

Not promised: to-the-minute timing (the scheduler ticks every minute and push
services add their own delay), alerts on iPhone without Add to Home Screen, or
alerts in a browser the user has blocked.

## The alerts

| Alert | Sent | To | Example |
|---|---|---|---|
| Opening, rush | 5 min before it opens | followers | **Hadestown rush opens at 10:00 AM** · $45 at the box office, first come, first served. |
| Opening, lottery | 5 min before it opens, or 8 AM if it opened overnight | followers | **Oh, Mary! lottery is open until 3:00 PM** · $49 on Telecharge. |
| Last call | 60 min before a lottery closes | followers who haven't marked it entered | **Wicked lottery closes at 3:00 PM** · Last hour to enter. $59 on Broadway Direct. |
| Claim watch | when a lottery closes | people who marked it entered | **Wicked lottery has closed. Watch your email.** · Winners usually hear shortly after the window closes and have 60 min to buy. |

Copy rules:
- The show comes first. The OS already prints "Matinee".
- Clock times, never "in 5 minutes". Pushes arrive late and get read later.
- Say the price and where to go: "on Telecharge", "in the TodayTix app",
  "at the box office".
- Alerts for one show that fall in the same minute are combined:
  **The Great Gatsby rush and student rush open at 10:00 AM**.
- A catch-up send switches to the past tense: "rush opened at 10:00 AM".
- Last call is skipped when the opening alert went out less than 3 hours
  before the close, so an 8 AM alert for a 9:30 AM close is the only one.

A show with a daily lottery and a box-office rush sends up to three alerts a
day. Per-alert preferences are listed under "Not built".

## How it works

```
Follow ─▶ permission ─▶ PushManager.subscribe ─▶ POST /api/push ─▶ push_subscriptions
                                                                         │
Supabase Cron ─ every minute ─▶ POST /api/notify/run ◀──────────────────┘
GitHub Actions (backup) ──────▶      │
                                     ├─ duePushEvents(now)         pure: catalog + clock
                                     ├─ claim (subscription, alert) pairs   notification_log
                                     ├─ web-push  (TTL, Urgency, Topic)
                                     ├─ settle: sent / failed / released / pruned
                                     └─ push_runs heartbeat ─▶ /api/health
```

1. **Subscribe.** Tapping Follow asks for permission right then, and only if
   the browser has never asked. `/notify` holds the switch and the test push.
   `/api/push` stores the endpoint, its keys, the followed slugs and the
   lottery-log days. Nothing names a person. The endpoint must belong to a
   known push service (Google, Mozilla, Apple, Microsoft), so the server
   cannot be aimed at an arbitrary URL. The app re-syncs while subscribed on
   every load and on every follow change, from any page.
2. **Schedule.** A scheduler POSTs `/api/notify/run` with a bearer secret,
   checked in constant time. Vercel Cron's GET is accepted too.
3. **Decide.** `duePushEvents(now)` is a pure function of the clock and the
   catalog. Each alert has a send window `[from, until)`, and a run sends what
   is inside its window. Catch-up follows: if the 9:55 run never happened,
   the 10:03 run still sends. So does the staleness bound: after `until`, an
   alert is never sent. Times are New York wall-clock through the schedule
   engine's `zonedDate`, so DST days keep 10 AM at 10 AM.
4. **Claim, then send.** Before sending, the run inserts a
   `(endpoint, event_key)` row in `notification_log` with status `claimed`.
   The primary key lets exactly one run win each pair. An overlapping run gets
   nothing back for pairs someone else holds. After the send:
   - delivered: `sent`
   - 404 or 410: the subscription is deleted (its log rows cascade)
   - other 4xx: `failed`, not retried
   - 429, 5xx or a network error: the claim is released, and the next run
     retries while the alert is still inside its window
5. **Crashes.** A run that dies mid-send leaves claims behind. After a
   5-minute lease, longer than the route's 60-second limit, another run may
   take them over. That run may re-send a push the dead one delivered but never
   recorded. The device absorbs it: every push carries `tag = event key`, so a
   repeat replaces the first notification instead of stacking, and the
   `Topic` header lets the push service replace an undelivered copy. Strict
   exactly-once delivery over a network does not exist. This is at-most-once
   in the ledger, a bounded retry, and an idempotent display.
6. **Deliver.** `TTL` lasts until the alert stops being useful (a rush
   opening: 30 minutes after it opens; a lottery: its close), so a phone that
   wakes at noon does not get "rush opens at 10:00 AM". Rush openings and last
   calls go `Urgency: high`.
7. **Observe.** Each run writes a `push_runs` row: source, start, finish,
   counts and error. `/api/health` reports the last successful run, the last
   push sent and the rate limiter's state. It returns 503 if no run has
   succeeded in 20 minutes, so the hourly check catches a dead scheduler.

Every database step is a Postgres function in
`supabase/migrations/20261120120000_push_delivery_ledger.sql`. One contract
test suite runs against the in-memory store and against those functions in
PGlite.

## Choosing the scheduler

Compared on 2026-11-20 from each vendor's docs.

| Option | Cost | Cadence | How it stops | Verdict |
|---|---|---|---|---|
| GitHub Actions `schedule` (today) | free | 15 min at best; GitHub says runs "can be delayed during periods of high loads" and "some queued jobs may be dropped" | disabled after 60 days without repo activity, silently; it happened on 2026-09-15 | keep as a backup caller until switched off |
| Vercel Cron, Hobby | included | once a day, ±59 min | n/a | cannot do this job |
| Vercel Schedules (beta), Hobby | included | every 15 min with a 15-min jitter window | beta; limits may change | too coarse for a 10:00 rush |
| Vercel Cron, Pro | $20 a month per seat | every minute | only while the project is on Pro | works, but money for one feature |
| **Supabase Cron** (`pg_cron` + `pg_net`) | free, in the existing project | every minute | the job is unscheduled, or the project pauses | **recommended** |
| Upstash QStash schedule | free up to 1,000 messages a day; retries count | every minute (1,440 a day, over the free tier) | quota | runner-up at a 2-minute cadence |
| Cloudflare Workers Cron Trigger | free, 5 triggers per account | every minute | rarely | sound, but a new account and deploy pipeline for ten lines |
| cron-job.org | free | every minute | disables a job after repeated failures; holds the secret | the same silent-death problem |

Why Supabase Cron:
- **No new way to fail.** Push already depends on this database for
  subscriptions. When the scheduler is down because Supabase is down, push
  would be down anyway.
- **Not tied to repo activity**, unlike GitHub's 60-day cutoff.
- **It keeps the free project awake.** Supabase pauses a Free project that
  lacks "sufficient user database activity over the past week". Every run
  writes a heartbeat row through the API.
- **It lives in the repo** as reviewable SQL: `supabase/scheduler/enable.sql`
  turns it on, `disable.sql` turns it off.

Costs: `pg_net` fires and forgets, with no retry. The next minute is the
retry, and idempotent runs make that safe. The vault holds a copy of
`CRON_SECRET`, so rotating it means updating two places.

The watchdog has to live somewhere else. `production-health.yml` is a GitHub
schedule too, and it stops 60 days after the last commit to `main`. A second
monitor at a third vendor (any uptime checker that alerts on a non-200 from
`/api/health`) covers that. It is in the checklist as optional.

## Failure modes

| Failure | User sees | We see | Recovery |
|---|---|---|---|
| Scheduler stops | no alerts | health 503 after 20 min; hourly check red | re-enable the scheduler |
| Watchdog stops (GitHub 60-day) | nothing | nothing, unless the external monitor exists | the external monitor |
| Supabase down or paused | Follow works; turning alerts on says the subscription couldn't be saved | runs fail, health 503 | restore the project |
| Push service 429/5xx | alert a minute later | `released` in the run summary | automatic, inside the alert's window |
| Run crashes mid-send | possibly a replaced duplicate | stale `claimed` rows | lease takeover after 5 min |
| Subscription expired or app removed | nothing | 404/410, `pruned` count | automatic |
| VAPID keys rotated | alerts stop until next visit | 403s, `failed` count | the app spots the key mismatch and re-subscribes |
| Device offline past the alert | nothing (by design) | sent, never displayed | TTL |
| Rate-limit table missing | nothing; subscribe stays unthrottled | health 503, `rateLimit: "error"` | apply the migration |
| iPhone, not installed | card explains Add to Home Screen | nothing | user installs |
| Permission denied | card says how to re-allow in settings | nothing | user; the app never re-prompts |
| OS hides the notification (Focus, browser not allowed in system settings) | test push says it was sent but not shown | nothing | the card names the setting |

## Local development

`PUSH_STORE=memory` swaps Supabase for an in-process store (refused on Vercel).
With local VAPID keys from `npx web-push generate-vapid-keys`, a real Chrome
subscription receives real pushes through Google's push service on a
developer machine. `docs/notifications/` holds the recorded proof. Only
production can verify Apple's push service on an installed iPhone, Supabase
Cron firing on schedule, and the deployed health check.

## Not built

- Per-alert preferences ("openings only").
- A daily digest instead of separate alerts.
- Email or SMS fallback.
- Accounts. A device's follows live on that device; a second device follows
  separately.
