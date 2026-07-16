-- Push-notification persistence for Phase 3 (Notify made real).
-- Run via the Supabase SQL editor or `supabase db push`.

create table public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  -- Show slugs this subscriber follows (mirrors their Notify alerts).
  slugs text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per (subscriber, event) so the cron never re-sends a notification.
create table public.notification_log (
  endpoint text not null
    references public.push_subscriptions (endpoint) on delete cascade,
  event_key text not null,
  sent_at timestamptz not null default now(),
  primary key (endpoint, event_key)
);

-- RLS on, no policies: these tables are only reachable through the app's
-- route handlers, which use the secret (service-role) key and bypass RLS.
alter table public.push_subscriptions enable row level security;
alter table public.notification_log enable row level security;

-- Since April 2026 new tables are not automatically exposed to the Data API;
-- grant explicitly so the server client keeps working regardless of project
-- settings. anon/authenticated intentionally get nothing.
grant all on table public.push_subscriptions to service_role;
grant all on table public.notification_log to service_role;
