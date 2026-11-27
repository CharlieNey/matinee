# Switching push alerts on in production

Written 2026-11-27. Nothing here has been done; every step waits for
Charlie's OK. How push works is in `docs/NOTIFICATIONS.md`. The full
go-live, of which this is a part, is `docs/GO-LIVE.md`.

## Where things stand (checked 2026-11-27)

- **No alerts have gone out since 2026-09-15.** GitHub switched off
  `notify-cron.yml` (status `disabled_inactivity`) after 60 days without a
  commit to `main`. Production still runs the old push code. It now skips
  unverified and stale rows, but nothing calls it.
- **Vercel production has every variable push needs.** Checked by name
  through the API; no values were read except the form of `VAPID_SUBJECT`.
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT`: a `mailto:` address, not the example fallback
  - `SUPABASE_URL`
  - `SUPABASE_SECRET_KEY`
  - `CRON_SECRET`

  All six were re-added at 13:58 UTC on Nov 27, when the project moved to
  the personal Vercel account.
- **GitHub repo secrets:** `APP_URL`, `CRON_SECRET` (set at 14:04 UTC on
  Nov 27) and `VERCEL_TOKEN`.
- **Supabase project "Theater":**
  - Per `GO-LIVE.md`, the two migrations were not applied as of Nov 21:
    `20260722120000_api_rate_limits.sql` and
    `20261120120000_push_delivery_ledger.sql`.
  - I couldn't re-check that from here; no Supabase login is set up in this
    session.
  - The live database answers: `/api/health` reports `database: "ok"`.
- **Vercel project:** Hobby plan, Fluid compute on, functions in `iad1`.
- **Tested locally:** `src/app/api/push/journey.test.ts` runs one day
  through the real routes, with only the push service faked:
  - subscribe with `POST /api/push`
  - the scheduler calls `POST /api/notify/run` every minute from 8 AM to
    4 PM
  - **Followers** get a push 5 minutes before each window opens and a last
    call an hour before the lottery closes, each exactly once.
  - **Entrants** skip the last call and get the claim alert.
  - **Overlapping runs** send once.
  - **A dead endpoint** is pruned after the first 410.
  - **Unverified shows** send nothing.
- **Tested earlier in real browsers** (`docs/notifications/`, Nov 20): real
  pushes reached real Chrome through Google's push service.
- **Not tested yet:** three things can only be proven in production.
  - Apple's push service on an installed iPhone.
  - Supabase Cron firing on schedule.
  - The deployed health check.

## What switching on needs, in order

The new code needs the migrations, and the scheduler needs the new code. So
the order is fixed:

1. **Agree the secret.** `CRON_SECRET` must be the same value in three
   places:
   - Vercel production
   - the GitHub repo secret
   - the Supabase vault, set in step 4

   Vercel won't show a sensitive value. If you don't have it, rotate it
   (`GO-LIVE.md` step 4). An environment change takes effect on the next
   deploy.
2. **Apply both migrations** in the Supabase SQL editor, in date order
   (`GO-LIVE.md` step 6). They are additive: the code live today keeps
   working.
3. **Deploy the branch.** Merge `get-users-1` into `main` and push. The
   GitHub Actions workflow deploys it.
   - **Check:** `/api/health` shows `services.rateLimit: "ok"`.
   - **Check:** it also shows `services.scheduler: "never-run"`. Health
     reads 503 until step 4, so do steps 3 and 4 together.
4. **Start the scheduler.**
   - Paste `supabase/scheduler/enable.sql` into the SQL editor.
   - Replace `REPLACE_WITH_CRON_SECRET` with the secret, then run it.
   - Don't commit the edited copy.
   - **Check:** after two minutes, `net._http_response` shows 200s.
   - **Check:** `/api/health` shows `scheduler: "ok"` and
     `lastRunSource: "supabase-cron"`.
5. **Optional backup caller:** `gh workflow enable notify-cron.yml`. It
   calls the same route every 15 minutes; runs are idempotent, so the two
   overlap safely.
6. **Send a test push** from an iPhone and from a desktop browser
   (`GO-LIVE.md` step 9):
   - On the iPhone, add Matinee to the Home Screen first.
   - Follow a show, tap Allow, then on `/notify` tap "Send a test push".
7. **Watch for a day** (`GO-LIVE.md` step 10).

**The off switch** stops every alert within a minute:

- Run `supabase/scheduler/disable.sql`.
- If you enabled the backup: `gh workflow disable notify-cron.yml`.

Use it the moment a push goes out for a window that was wrong. The research
names that as the one thing that would sink a launch.

## What it costs: $0 a month, on free tiers

| Service | What push uses | Free allowance | Headroom |
|---|---|---|---|
| Supabase Free (existing project) | pg_cron and pg_net, the subscription table and the delivery ledger | 2 active projects, 500 MB database | Tiny. Runs are kept 14 days (about 20,000 rows) and ledger rows 45 days. |
| Vercel Hobby (existing project) | 1,440 scheduler calls a day, about 43,200 a month | 1 million invocations and 4 hours of Active CPU a month ([Hobby plan](https://vercel.com/docs/plans/hobby), [Fluid compute pricing](https://vercel.com/docs/functions/usage-and-pricing)) | About 4% of invocations. CPU: a run costs about 12 ms locally (480 runs in 6 s, in-process store), so maybe 10–40 minutes a month on Vercel. That's an estimate: check Vercel's Usage tab after day one. |
| Web push services (Google, Apple, Mozilla, Microsoft) | Delivery | Free, no account; the VAPID keys are self-generated | None needed |
| GitHub Actions | The hourly health check; the optional 15-minute backup | Free on public repos (this repo is public) | None needed |

**Risks to watch:**

- **Pausing.** Supabase pauses a Free project after low database activity
  over 7 days ([project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)).
  Each run writes a heartbeat row through the app's API, which counts as a
  real app request. The docs don't say whether pg_cron alone counts, but the
  app request does.
- **Hobby usage caps.** Going over a Hobby limit can switch the feature off
  until 30 days have passed. The scheduler is a small share; a traffic spike
  from a launch post would weigh more. Watch the Usage tab after a launch.
- **Hobby is for non-commercial use only.** Matinee sells nothing, carries
  no ads and no affiliate links, so that fits.
- **The watchdog can die quietly.** `production-health.yml` is a GitHub
  schedule too, and it stops 60 days after the last commit to `main`. An
  external uptime monitor would cover that. Free tiers exist, but each one
  needs an account, so it's Charlie's call.
