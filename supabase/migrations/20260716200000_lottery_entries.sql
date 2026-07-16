-- Phase 8: claim-window watches. Subscribers sync their local "I entered"
-- log so the cron can push "watch for winners" only to people who entered.
-- Shape per element: { "key": "<showSlug/kind/platform>", "day": "YYYY-MM-DD" }.

alter table public.push_subscriptions
  add column entries jsonb not null default '[]'::jsonb;
