# Go-live: shipping the rest of `get-users-1`

Rewritten 2026-11-27, afternoon. It replaces the earlier versions. Do the
steps in order; each has the command or click, what to check, and how to
undo it. Steps marked **Charlie** change the production database, hold a
secret, or send notifications to real people, so only Charlie does them or
OKs them.

## Where things stand (2026-11-27)

**Live on matinee.nyc** (`main`; each step deployed and checked green):

- The Nov 27 data re-check: 59 rows, 42 checked against the show's own
  site, 17 unverified with the reason.
- Every row shows "Checked <date> · <source> · Report a wrong fact". There
  is an "Unverified" section on `/rush`, and the header quotes the oldest
  check date.
- A show page per show, built for search, with sitemap and robots.
- `/today`, "Enter today's lotteries".
- The honest first run (no demo persona).
- /about's AI sentence and takedown address.
- Reports go to Charlie's own address, because `hello@matinee.nyc` has no
  MX record.

**Still only on `get-users-1`:**

- **The push rebuild:** a delivery ledger, Supabase Cron as the scheduler,
  honest device states, and app-wide subscription sync.
- **The stricter `/api/health`:** it also checks the rate limiter and the
  scheduler.
- **PostHog wiring,** off until a key is set.
- **Two proposals, built and waiting for Charlie's yes:**
  - the calendar feed for followed shows (`d116cd8`);
  - the device-only "By show" lottery record (`8531ff7`).

  To ship the branch without one, `git revert <sha>` it first.
- **Polish:** posters replaced, the profile split, the season recap hidden
  until there is something to recap, a titled 404, TKTS booth hours,
  About's numbers computed from the catalog, and more. `git log origin/main..get-users-1`
  lists it all.

**Push in production today:**

- Nothing has been sent since 2026-09-15, when GitHub switched off
  `notify-cron.yml` for inactivity.
- The old code still saves subscriptions into `push_subscriptions`. The
  ledger migration keeps that table, so those devices carry over.

**Why the rest waits:** the rebuilt code needs the two migrations. Without
them, subscribing fails, and `/api/health` reads 503 (rate limiter missing,
scheduler never run). So steps 2–5 go together, in one sitting, before :17
past the hour (when the hourly check runs).

**Next data re-check:** by noon ET on Friday Dec 11 (step 10).

## Steps

### 1. Pre-flight (anyone, 10 minutes)

```bash
cd ~/personal_projects/matinee && git switch get-users-1 && git pull --ff-only
npm ci && npm run check && npx playwright test
git log --oneline origin/main..get-users-1 | wc -l     # what ships
```

**Check:**
- `npm run check` passes (144+ unit tests, clean build).
- Playwright passes in Chromium and WebKit.
- `curl -s https://matinee.nyc/api/health | jq .ok` is `true`.

**Undo:** nothing to undo.

### 2. Agree the cron secret (Charlie)

`CRON_SECRET` must be one value in three places:
- Vercel production (set 2026-11-27 13:58 UTC);
- the GitHub repo secret (set 14:04 UTC);
- the Supabase vault, set in step 5.

Vercel won't show a sensitive value. If you don't have it, rotate it. Use the
personal Vercel login (`--global-config ~/.vercel-personal`); the default
login is the work account.

```bash
NEW=$(openssl rand -hex 32)          # keep it for step 5; don't paste it anywhere public
vercel --global-config ~/.vercel-personal env rm CRON_SECRET production --yes
printf %s "$NEW" | vercel --global-config ~/.vercel-personal env add CRON_SECRET production
gh secret set CRON_SECRET --body "$NEW"
```

**Check:** `vercel --global-config ~/.vercel-personal env ls production`
lists `CRON_SECRET`. It takes effect on the next deploy (step 4).

**Undo:** set the previous value back the same way.

### 3. Apply both migrations (Charlie)

In the Supabase dashboard, open project "Theater", then the SQL Editor.
Paste and run each file, in this order:

1. `supabase/migrations/20260722120000_api_rate_limits.sql`
   - **Check:** `select public.consume_api_rate_limit('probe', 60, 1);`
     returns `true`.
2. `supabase/migrations/20261120120000_push_delivery_ledger.sql`
   - **Check:** `select * from public.push_pipeline_status();` returns one
     row, with null run columns and the current subscription count.

Both are additive: the code live today keeps working after them. Its plain
inserts into `notification_log` read as sent rows, and a CI test covers
that.

**Undo:** roll the code back first if step 4 is done (the new code needs
these). Then:
```sql
drop function if exists public.matinee_notify_tick(), public.push_pipeline_status(),
  public.push_expire(timestamptz,integer,integer), public.push_finish_run(uuid,boolean,jsonb,text,timestamptz),
  public.push_start_run(uuid,text,timestamptz), public.push_settle_deliveries(uuid,jsonb,jsonb,jsonb,timestamptz),
  public.push_claim_deliveries(uuid,jsonb,integer,timestamptz), public.push_prune_subscriptions(text[]),
  public.push_list_subscriptions(text[],text[]), public.push_get_subscription(text),
  public.push_delete_subscription(text), public.push_save_subscription(text,text,text,text[],jsonb,text,timestamptz);
drop table if exists public.push_runs;
delete from public.notification_log where sent_at is null;
alter table public.notification_log drop column status, drop column claimed_at, drop column claimed_by,
  alter column sent_at set not null;
-- rate limiter:
drop function if exists public.consume_api_rate_limit(text,integer,integer);
drop table if exists public.api_rate_limits;
```

### 4. Merge and deploy (anyone, once step 3 is done)

```bash
git switch main && git pull --ff-only
git merge --no-ff get-users-1 -m "Ship get-users-1: push rebuild, stricter health, polish"
git push origin main          # .github/workflows/deploy-vercel.yml deploys production
gh run watch "$(gh run list --workflow deploy-vercel.yml --limit 1 --json databaseId -q '.[0].databaseId')"
curl -s https://matinee.nyc/api/health | jq '{ok, catalog, services}'
```

**Check:**
- `services.database` and `services.rateLimit` are `"ok"`.
- `services.scheduler` is `"never-run"`, and `ok` is `false` until step 5.
  That is expected, so do step 5 right away.
- On a phone, `/shows/wicked` still shows "Checked Nov 27 · …".

**Undo:** revert the merge and push:
`git revert -m 1 HEAD && git push origin main`. Or, in the Vercel
dashboard (personal account): Deployments, then the previous production
deploy, then Instant Rollback.

### 5. Switch on the scheduler (Charlie)

This is the step that starts sending notifications to real people.

1. In `supabase/scheduler/enable.sql`, replace `REPLACE_WITH_CRON_SECRET`
   with the secret from step 2.
2. Run it in the SQL Editor.
3. Don't commit the edited copy.

**Check:** two minutes later, run:
```sql
select id, status_code, left(content::text, 160) as body, created
  from net._http_response order by created desc limit 5;   -- 200s with a run summary
```
```bash
curl -s https://matinee.nyc/api/health | jq '{ok, services, push}'
# ok: true, scheduler: "ok", lastRunSource: "supabase-cron"
gh workflow run production-health.yml && gh run list --workflow production-health.yml --limit 1
```

**Undo (the off switch, effective within a minute):** run
`supabase/scheduler/disable.sql`. Use it the moment a push goes out for a
window that was wrong.

### 6. Optional backup caller (Charlie's call)

```bash
gh workflow enable notify-cron.yml   # calls the same route every 15 minutes
```
Running both is safe: deliveries are claimed before they're sent.

**Undo:** `gh workflow disable notify-cron.yml`.

### 7. Test pushes on real devices (Charlie)

Only production can prove Apple's push service.

1. On iPhone, open matinee.nyc in Safari, then Share, then Add to Home
   Screen.
2. Open it from the icon and go to `/shows/wicked` (every Wicked row is
   checked).
3. Tap Follow, then Allow.
4. On `/notify`, tap "Send a test push".
5. Repeat on desktop Safari or Chrome.

**Check:**
- The page says "Delivered to this device: 'Test: Wicked …'", and a banner
  appears.
- Tapping the banner opens Wicked's ways to save.
- The first real alert is Wicked's lottery heads-up at 8:55 AM, Monday to
  Saturday.

**Undo:** switch alerts off on `/notify`. That deletes the subscription.

### 8. Watch for a day

```bash
gh run list --workflow production-health.yml --limit 24      # all green
curl -s https://matinee.nyc/api/health | jq '.push'          # lastOkRunAt within ~1 min, lastRunError null
```
```sql
select source, count(*) runs, count(*) filter (where not ok) failed,
       sum((summary->>'sent')::int) sent, sum((summary->>'released')::int) released
  from push_runs where started_at > now() - interval '1 day' group by source;   -- ~1,440 supabase-cron runs, 0 failed
select count(*) from notification_log
 where status = 'claimed' and claimed_at < now() - interval '10 minutes';      -- 0
```

**Check:**
- Everything is green.
- The first query shows 0 failed runs; the second returns 0.
- Every push sent matches a checked row: unverified rows never alert, by
  construction and by test.

**Undo:** nothing to undo. If something fails, use step 5's off switch.

**Optional:** an uptime monitor from another vendor on
`https://matinee.nyc/api/health`. It needs an account, so it's Charlie's
call. It keeps watching if `production-health.yml` stops (step 10).

### 9. Hand-check the unverified rows (optional, about 20 minutes)

These 17 rows couldn't be confirmed on the show's own site on 2026-11-27,
neither by a reader nor on a second pass in a real browser. Usually only a
seller's page (which the checker doesn't open, because of the sellers'
terms) or TDF states the fact. Each row's comment in
`src/lib/programCatalog.ts` quotes what the sources say.

| Row | In doubt | Where to look |
|---|---|---|
| 860: lottery, rush, digital rush | entry times; box-office hours | rush.telecharge.com, the Imperial box office |
| Aladdin lottery | terms (TDF: $35, 9–3 the day before; older guides $45) | lottery.broadwaydirect.com/show/aladdin, where the show's own link goes |
| Book of Mormon Lucky Seat lottery | whether it still runs (TDF: $45, enter by 10:30 AM the day before) | luckyseat.com/shows/thebookofmormon-newyork |
| Book of Mormon digital rush | whether it still runs | the TodayTix app |
| Chicago rush and standing room | not on the show's site (TDF: $49 and $27) | the Ambassador box office |
| Hadestown lottery | entry deadline | luckyseat.com/shows/hadestown-newyork |
| The Lion King lottery | terms (TDF: $35; the row used to say $60) | lottery.broadwaydirect.com/show/the-lion-king, where the show's own link goes |
| Maybe Happy Ending lottery | which performances; when entries open | rush.telecharge.com |
| Operation Mincemeat lottery and rush | whether the lottery is live; box-office hours | operationbroadway.com, the Golden box office |
| Paranormal Activity rush | box-office hours | the August Wilson box office |
| Rocky Horror lottery | entry window | the TodayTix app |
| Wanted lottery | where to enter (TDF: Telecharge) | rush.telecharge.com |
| Perfect Crime digital rush | price and time | the TodayTix app |

To confirm a row:
- Fix any fact that differs.
- Change its `unverified(source, why, draft)` to `checked(source, draft)`,
  with the page that confirmed it as `source`.
- Run `npx vitest run src/lib`, commit, push to `main`, and check
  `/api/health`.

**Undo:** `git revert HEAD`.

### 10. Dated follow-ups

- **After Sunday Nov 29: mark Two Strangers closed.** In `src/lib/shows.ts`,
  add `closedOn: "2026-11-29",` to the `two-strangers` entry.
  - **Check:** `/shows/two-strangers` reads "Two Strangers … (closed)" and
    says it closed.
  - **Undo:** revert the commit.
- **By noon ET on Friday Dec 11: re-check the catalog.**
  - Re-check every row against its `source`, then move `LAST_VERIFIED` in
    `src/lib/programCatalog.ts`.
  - A row you can't confirm becomes `unverified(...)` with the reason.
  - Rows from closed shows come out. On Jan 3 alone, & Juliet, SIX and
    Stranger Things close; the final dates are in `FINAL_PERFORMANCES` in
    `src/lib/shows.ts`.
  - **Check:** `curl -s https://matinee.nyc/api/health | jq .catalog`.
- **When `hello@matinee.nyc` can receive mail:** set `CONTACT_EMAIL` in
  `src/lib/contact.ts` back to it. Until then reports go to Charlie's
  address, which is public in the page source.
  - **Check:** `dig +short MX matinee.nyc` prints records, and a test mail
    arrives.
- **Every 60 days: commit to `main`.** GitHub switches off scheduled
  workflows after 60 days without a commit. That is how `notify-cron.yml`
  died on 2026-09-15.
  - **Check:** `gh workflow list` shows both workflows as active.
  - **Undo:** `gh workflow enable <file>`.
- **The domain:** matinee.nyc's auto-renew is off (expires 2027-07-17).
  Turning it on is a Vercel billing setting only Charlie can change.
- **In 2027: remove the `theatr-*` storage fallbacks.** They only help
  visitors from before July 17 who never came back.

## Whole-branch rollback

If the go-live goes wrong at any point:
1. Run `supabase/scheduler/disable.sql`; no more pushes.
2. Revert the merge on `main` and push (step 4's undo). The live code returns
   to the version before the go-live.
3. Leave the migrations in place. The old code works with them (step 3).
   Drop them (step 3's undo) only if they themselves are the problem.
