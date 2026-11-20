-- Turn off Supabase Cron as the push scheduler. Undoes enable.sql.
-- /api/health goes 503 ("scheduler": "overdue") 20 minutes later unless
-- another scheduler (the GitHub Actions backup) is still calling.

select cron.unschedule('matinee-notify');

-- Optional, to remove the stored URL and secret as well:
--   delete from vault.secrets
--    where name in ('matinee_app_url', 'matinee_cron_secret');
