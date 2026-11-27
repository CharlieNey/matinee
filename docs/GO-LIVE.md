# Go-live: shipping `showcase/polish`

Written 2026-11-21. This replaces the earlier go-live checklist and
`docs/HANDOFF.md`. Do the steps in order. Each has the command or click,
what to check, and how to undo it.

## Freshness: production has been stale since noon ET, Wednesday Nov 25

A program row goes stale 14 days after noon ET on its `lastVerified` date.
Stale rows read "Unverified", send no alerts, and make `/api/health` return
503, so the hourly `production-health.yml` run goes red.

- **Production today (checked 2026-11-27):** all 57 rows are dated
  2026-11-11, so every row has read as unverified since noon ET on Nov 25 and
  health has been red since. Shipping this branch fixes that.
- **On `get-users-1`:** every row was re-checked on 2026-11-27 against the
  show's official site, and each row names that page. 17 of 59 rows couldn't
  be confirmed there; they are marked unverified with the reason, show in
  their own section on `/rush`, and send no alerts. Health doesn't fail on
  them (it reports `unverifiedPrograms`). Step 2 lists them.
- **Next due date:** noon ET on Friday Dec 11. Step 11 covers that.

`get-users-1` is cut from `showcase/polish` plus `origin/main`, so shipping it
ships everything below too. Where this file says `showcase/polish`, read
`get-users-1`.

## What is on the branch

The commits on top of `main` are listed by `git log --oneline main..showcase/polish`;
each message says what changed and why. In short:

- **Push rebuilt.** A delivery ledger, Supabase Cron as the scheduler, and
  honest device states. Details are in `docs/NOTIFICATIONS.md`.
- **Data.** The Nov 20 refresh, plus the Nov 21 re-check of the seven rows
  that refresh couldn't verify.
- **Report links.** Each program row shows "Checked {date}" and a "Report a
  problem" mailto. Each show page has a footer link.
- **Usage analytics.** It is off until a PostHog key is set (step 5).
- **Cuts and fixes.** The cut-list decisions, the two Playbill-cover posters
  replaced, the origin wording, the About copy, and the profile and catalog
  splits.
- **Tests.** Fixes for two flaky tests, and new browser journeys.

Nothing on the branch has been pushed, deployed or applied to any hosted
service.

## Steps

### 1. Review the branch

```bash
cd ~/personal_projects/matinee
git log --oneline main..showcase/polish
git diff main..showcase/polish --stat
npm ci && npm run check && npx playwright test
```

**Check:**
- `npm run check` reports 126 unit tests passing and a clean build.
- Playwright reports 14 passed (Chromium and WebKit).
- Read `src/lib/push/delivery.ts` and
  `supabase/migrations/20261120120000_push_delivery_ledger.sql`.

Two commits can be dropped on their own:
- **`4b2d2a7`**, the origin wording in the README, DESIGN.md and About. To drop it:
  `git revert 4b2d2a7`.
- **`453fc69`**, analytics. It does nothing until step 5, but to drop it:
  `git revert 453fc69`.

**Undo:** nothing to undo.

### 2. Hand-check the unverified rows (optional, about 20 minutes)

These 17 rows couldn't be confirmed on the show's own site on 2026-11-27,
nor on a second pass the same day in a real browser (the pages that refuse
automated readers included),
usually because only a seller's page (which the checker doesn't read) or TDF
states the fact. Each row's comment in `src/lib/programCatalog.ts` quotes
what the sources say. A person can settle most of them in a normal browser:

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

To confirm a row, fix any fact that differs, then change its
`unverified(source, why, draft)` to `checked(source, draft)`, with the page
that confirmed it as `source`.

```bash
npx vitest run src/lib/catalog.test.ts src/lib/programs.test.ts src/lib/push
git commit -am "data: confirm <show> by hand"
```

**Check:** the tests pass, and `/rush` lists the row outside "Unverified".

**Undo:** `git revert HEAD`.

### 3. Make the report links reach someone

Every "Report a wrong fact" link goes where `REPORT_TO` in
`src/lib/contact.ts` says: a prefilled email to `CONTACT_EMAIL`. Since
2026-11-27 that is Charlie's own address, his call, because
`hello@matinee.nyc` had no MX record on 2026-11-21 or 2026-11-27, so mail to
it bounced. To move reports to the matinee.nyc address (its DNS is on
Vercel), or elsewhere, pick one:

- **Send reports to GitHub issues instead.** Set `REPORT_TO` to
  `{ kind: "github", repo: "CharlieNey/matinee" }`. Free, but reporters need
  a GitHub account and the report is public.
- **Send reports to a form.** Set `REPORT_TO` to `{ kind: "form", url: "…" }`
  for any form that reads `subject` and `details` from the query string.
  That needs an account with a form service.

- **Forward the address.** Sign up with an email-forwarding service. It
  gives you MX values (and usually an SPF TXT record). Add them:
  ```bash
  vercel dns add matinee.nyc @ MX <mail-host-from-the-service> <priority>
  vercel dns add matinee.nyc @ TXT "<spf-value-from-the-service>"
  ```
- **Use an address you already read.** Edit `CONTACT_EMAIL` in
  `src/lib/contact.ts` and commit. Don't use your work or GitHub noreply
  address; the address will be public in the page source.

**Check:**
- `dig +short MX matinee.nyc` prints your records.
- Mail `hello@matinee.nyc` from another account; it arrives.

**Undo:** `vercel dns ls matinee.nyc`, then `vercel dns rm <record-id>`.
Or revert the `CONTACT_EMAIL` commit.

### 4. Check the push secrets

Environment changes only take effect on the next deploy, so do this before
step 7.

```bash
vercel env ls production   # need: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SUPABASE_URL, SUPABASE_SECRET_KEY, CRON_SECRET
gh secret list             # backup scheduler: APP_URL, CRON_SECRET
```

- **`VAPID_SUBJECT`:** set it to `https://matinee.nyc` or a `mailto:` address
  that works. The code's fallback, `mailto:hello@example.com`, may be
  rejected by Apple.
  ```bash
  printf %s "https://matinee.nyc" | vercel env add VAPID_SUBJECT production
  ```
- **`CRON_SECRET`:** step 8 needs its value. Vercel won't show sensitive
  values, so if you don't have it, rotate it:
  ```bash
  NEW=$(openssl rand -hex 32); echo "$NEW"   # keep it for step 8
  vercel env rm CRON_SECRET production --yes && printf %s "$NEW" | vercel env add CRON_SECRET production
  gh secret set CRON_SECRET --body "$NEW"
  ```

**Check:** `vercel env ls production` lists all six variables.

**Undo:** set the old value back the same way.

### 5. Decide on analytics (optional; before step 7)

To keep analytics off, skip this step. With no key, the PostHog SDK is never
loaded, the CSP stays `connect-src 'self'`, and About says nothing about it.

To turn it on:
1. Create a PostHog project (US cloud), named Matinee.
2. In Project settings, turn on **Enable cookieless tracking**. Without it,
   PostHog discards every event this app sends.
3. Optionally, turn on **Discard IP data**.
4. Copy the project API key (`phc_…`) and add it to Vercel:
   ```bash
   printf %s "phc_..." | vercel env add NEXT_PUBLIC_POSTHOG_KEY production
   # Only for EU cloud or a reverse proxy; the default is https://us.i.posthog.com
   printf %s "https://eu.i.posthog.com" | vercel env add NEXT_PUBLIC_POSTHOG_HOST production
   ```

The key is read at build time, both by the bundle and by the CSP in
`next.config.ts`. It takes effect on the next deploy, which is step 7.
The events are listed in `docs/ARCHITECTURE.md` under "Usage analytics".

**Check:** after step 7:
- `curl -sI https://matinee.nyc | grep -i content-security` shows the PostHog
  host in `connect-src`.
- `/about` has a "What we count" section.
- Tap an entry link on `/rush`. PostHog → Activity shows a `seller_click`
  within a minute. PostHog drops events from headless browsers as bots, so
  use a real one.

**Undo:** `vercel env rm NEXT_PUBLIC_POSTHOG_KEY production --yes`, then
redeploy (Vercel dashboard → Deployments → latest production → Redeploy,
or push any commit).

### 6. Apply both migrations (before step 7)

Open the Supabase dashboard → project "Theater" → SQL Editor. Paste and run
each file, in this order:

1. `supabase/migrations/20260722120000_api_rate_limits.sql`
   **Check:** `select public.consume_api_rate_limit('probe', 60, 1);` returns `true`.
2. `supabase/migrations/20261120120000_push_delivery_ledger.sql`
   **Check:** `select * from public.push_pipeline_status();` returns one row,
   with null run columns and the current subscription count.

Both are additive. The code live today keeps working after them.

**Undo:** roll the code back first, because the new code needs these. Then:
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

### 7. Push, merge and deploy

Do steps 7 and 8 in one sitting, before :17 past the hour. Health reports
503 until the first scheduler run.

```bash
git push -u origin showcase/polish
gh pr create --base main --head showcase/polish \
  --title "Push rebuilt, data re-checked, report links, final polish" \
  --body "Go-live steps: docs/GO-LIVE.md. Push design: docs/NOTIFICATIONS.md."
gh pr checks --watch && gh pr merge --merge   # Vercel deploys main
curl -s https://matinee.nyc/api/health | jq '{ok, catalog, services}'
```

**Check:**
- `catalog.oldestVerified` is `2026-11-27` or later, and
  `catalog.stalePrograms` is `0`.
- `services.scheduler` is `"never-run"` until step 8.
- On `/rush`, the header reads "oldest check November 27". Expand a row: it
  shows "Checked Nov 27 · <the source's site> · Report a wrong fact".

**Undo:** Vercel dashboard → Deployments → the previous production deploy
→ Instant Rollback (or `vercel rollback`).

### 8. Switch on the scheduler

In `supabase/scheduler/enable.sql`, replace `REPLACE_WITH_CRON_SECRET` with
the Vercel `CRON_SECRET`. Run the file in the SQL Editor. Don't commit the
edited copy.

**Check:** two minutes later, run:
```sql
select id, status_code, left(content::text, 160) as body, created
  from net._http_response order by created desc limit 5;   -- 200s with a run summary
```
```bash
curl -s https://matinee.nyc/api/health | jq '{ok, services, push}'   # ok: true, scheduler: "ok", lastRunSource: "supabase-cron"
gh workflow run production-health.yml && gh run list --workflow production-health.yml --limit 1
```

**Optional backup:** `gh workflow enable notify-cron.yml`. Running both is
safe; deliveries are claimed before they're sent.

**Undo:**
- Run `supabase/scheduler/disable.sql`.
- If you enabled the backup: `gh workflow disable notify-cron.yml`.

### 9. Send a production test push

1. On iPhone, open matinee.nyc in Safari → Share → Add to Home Screen.
2. Open it from the icon and go to `/shows/chicago`.
3. Tap Follow, then Allow.
4. On `/notify`, tap Send a test push.
5. Repeat on desktop Safari or Chrome.

**Check:**
- The page says "Delivered to this device: 'Test: Chicago rush opens at
  10:00 AM'", and a banner appears.
- Tapping the banner lands on Chicago's ways to save.
- The first real alert is Chicago's rush heads-up at 9:55 AM, Monday to
  Saturday (11:55 AM on Sunday).
- If analytics is on, PostHog shows `push_opt_in`, then `push_opened` after
  the tap.

**Undo:** switch alerts off on `/notify`. That deletes the subscription.

### 10. Watch for a day

```bash
gh run list --workflow production-health.yml --limit 24      # all green
curl -s https://matinee.nyc/api/health | jq '.push'          # lastOkRunAt within ~1 min, lastRunError null
vercel logs matinee.nyc | grep -E "push rejected|will retry|notify run failed|rate limit storage failed"
```
```sql
select source, count(*) runs, count(*) filter (where not ok) failed,
       sum((summary->>'sent')::int) sent, sum((summary->>'released')::int) released
  from push_runs where started_at > now() - interval '1 day' group by source;   -- ~1,440 supabase-cron runs, 0 failed
select count(*) from notification_log
 where status = 'claimed' and claimed_at < now() - interval '10 minutes';      -- 0
```

**Check:** everything is green, the grep finds nothing, the first query
shows 0 failed runs and the second returns 0.

**Undo:** nothing to undo. If something fails, use the undo in step 7 or 8.

**Optional:** an uptime monitor from another vendor on
`https://matinee.nyc/api/health`, alerting on any non-200. It still works if
`production-health.yml` is switched off (see step 11).

### 11. Dated follow-ups

- **After Sunday Nov 29: mark Two Strangers closed.** Its last performance is
  Nov 29, and it has no program rows. In `src/lib/shows.ts`, add
  `closedOn: "2026-11-29",` to the `two-strangers` entry. Then commit,
  push and deploy.
  **Check:** `/shows/two-strangers` reads "Closed November 29, 2026".
  **Undo:** revert the commit.
- **By noon ET on Friday Dec 11: re-check the catalog.** Re-check every row
  in `src/lib/programCatalog.ts` against its `source` and move
  `LAST_VERIFIED`. A row you can't confirm becomes `unverified(...)` with the
  reason; it stays listed but sends no alerts.
  **Check:** `curl -s https://matinee.nyc/api/health | jq .catalog`.
- **Every 60 days: commit to `main`.** GitHub switches off scheduled
  workflows after 60 days without a commit. That is how `notify-cron.yml`
  died on 2026-09-15, and `production-health.yml` will go the same way.
  **Check:** `gh workflow list` shows both as active.
  **Undo:** `gh workflow enable <file>`.
- **In 2027: remove the `theatr-*` storage fallbacks.** They only help
  visitors from before July 17 who never came back. Removing them also
  means deleting the migration path and its tests.
