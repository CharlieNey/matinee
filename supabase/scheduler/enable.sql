-- Turn on Supabase Cron as the push scheduler (docs/NOTIFICATIONS.md).
--
-- Run once in the Supabase SQL editor, AFTER migration
-- 20261120120000_push_delivery_ledger.sql is applied and the code that
-- contains it is deployed. Undo with disable.sql.
--
-- Replace REPLACE_WITH_CRON_SECRET first: it must equal the CRON_SECRET
-- environment variable of the Vercel production deployment.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select vault.create_secret(
  'https://matinee.nyc',
  'matinee_app_url',
  'Base URL the push scheduler calls'
);
select vault.create_secret(
  'REPLACE_WITH_CRON_SECRET',
  'matinee_cron_secret',
  'Bearer secret for /api/notify/run; same value as Vercel CRON_SECRET'
);

-- Every minute. Runs are idempotent, so overlapping with the GitHub Actions
-- backup is safe. Re-running cron.schedule with the same name updates it.
select cron.schedule(
  'matinee-notify',
  '* * * * *',
  $$select public.matinee_notify_tick()$$
);

-- Check the job exists:
select jobid, jobname, schedule, active
  from cron.job
 where jobname = 'matinee-notify';

-- A minute later, check the calls came back 200 with a run summary:
--   select id, status_code, left(content::text, 160) as body, created
--     from net._http_response order by created desc limit 5;
--
-- To rotate the secret later (then update Vercel's CRON_SECRET to match):
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'matinee_cron_secret'),
--     'NEW_SECRET');
