-- Push delivery ledger and scheduler heartbeat (2026-11-20).
-- Design: docs/NOTIFICATIONS.md. Every operation the app performs on push
-- state is a function below; src/lib/push/store.contract.test.ts runs them in
-- PGlite on every CI run.
--
-- Additive and backward compatible: the route deployed before this migration
-- (a plain upsert into notification_log) keeps working after it, so the
-- migration can be applied before the new code ships.

-- 1. notification_log becomes a claim ledger. A run inserts a 'claimed' row
--    BEFORE sending; the (endpoint, event_key) primary key lets one run win.
alter table public.notification_log
  add column status text not null default 'sent'
    check (status in ('claimed', 'sent', 'failed')),
  add column claimed_at timestamptz,
  add column claimed_by uuid;

update public.notification_log set claimed_at = sent_at where claimed_at is null;

alter table public.notification_log
  alter column claimed_at set default now(),
  alter column claimed_at set not null,
  -- Claimed rows have no send time yet. The default stays for the old path.
  alter column sent_at drop not null;

create index notification_log_sent_at_idx
  on public.notification_log (sent_at desc) where status = 'sent';
create index notification_log_claimed_at_idx
  on public.notification_log (claimed_at);

-- 2. One row per scheduler run: the health check's evidence that it is alive.
create table public.push_runs (
  id uuid primary key,
  source text not null check (length(source) <= 40),
  started_at timestamptz not null,
  finished_at timestamptz,
  ok boolean,
  summary jsonb,
  error text check (length(error) <= 500)
);

create index push_runs_started_at_idx on public.push_runs (started_at desc);
create index push_runs_ok_idx on public.push_runs (finished_at desc) where ok;

alter table public.push_runs enable row level security;
grant all on table public.push_runs to service_role;

-- 3. Subscriptions.

-- Create or update a subscription. Null slugs/entries keep what is stored.
-- p_previous_endpoint carries a rotated subscription's follows over
-- (the service worker's pushsubscriptionchange knows no slugs).
create or replace function public.push_save_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_slugs text[],
  p_entries jsonb,
  p_previous_endpoint text,
  p_now timestamptz
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  carried_slugs text[];
  carried_entries jsonb;
begin
  if p_previous_endpoint is not null and p_previous_endpoint <> p_endpoint then
    select s.slugs, s.entries into carried_slugs, carried_entries
      from public.push_subscriptions s
     where s.endpoint = p_previous_endpoint;
    delete from public.push_subscriptions where endpoint = p_previous_endpoint;
  end if;

  insert into public.push_subscriptions as s
    (endpoint, p256dh, auth, slugs, entries, created_at, updated_at)
  values (
    p_endpoint,
    p_p256dh,
    p_auth,
    coalesce(p_slugs, carried_slugs, '{}'),
    coalesce(p_entries, carried_entries, '[]'::jsonb),
    p_now,
    p_now
  )
  on conflict (endpoint) do update set
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    slugs = coalesce(p_slugs, carried_slugs, s.slugs),
    entries = coalesce(p_entries, carried_entries, s.entries),
    updated_at = p_now;
end;
$$;

create or replace function public.push_delete_subscription(p_endpoint text)
returns boolean
language sql
set search_path = public, pg_temp
as $$
  with deleted as (
    delete from public.push_subscriptions where endpoint = p_endpoint
    returning 1
  )
  select exists (select 1 from deleted);
$$;

create or replace function public.push_get_subscription(p_endpoint text)
returns table (
  endpoint text,
  p256dh text,
  auth text,
  slugs text[],
  entries jsonb
)
language sql
stable
set search_path = public, pg_temp
as $$
  select s.endpoint, s.p256dh, s.auth, s.slugs, s.entries
    from public.push_subscriptions s
   where s.endpoint = p_endpoint;
$$;

-- Subscriptions that could receive one of this run's alerts: they follow one
-- of the shows, or logged an entry for one of the programs.
create or replace function public.push_list_subscriptions(
  p_slugs text[],
  p_entry_keys text[]
)
returns table (
  endpoint text,
  p256dh text,
  auth text,
  slugs text[],
  entries jsonb
)
language sql
stable
set search_path = public, pg_temp
as $$
  select s.endpoint, s.p256dh, s.auth, s.slugs, s.entries
    from public.push_subscriptions s
   where s.slugs && p_slugs
      or exists (
        select 1
          from jsonb_array_elements(s.entries) as entry
         where entry ->> 'key' = any (p_entry_keys)
      );
$$;

create or replace function public.push_prune_subscriptions(p_endpoints text[])
returns integer
language sql
set search_path = public, pg_temp
as $$
  with deleted as (
    delete from public.push_subscriptions where endpoint = any (p_endpoints)
    returning 1
  )
  select count(*)::integer from deleted;
$$;

-- 4. The ledger.

-- Claim (endpoint, event_key) pairs for one run. Returns only the pairs this
-- run won: new rows, plus 'claimed' rows whose lease expired (a run that died
-- mid-send). Pairs that are sent, failed, or freshly held by another run come
-- back empty, so overlapping runs never double-send. Pairs for subscriptions
-- deleted meanwhile are skipped.
create or replace function public.push_claim_deliveries(
  p_run_id uuid,
  p_pairs jsonb,
  p_lease_seconds integer,
  p_now timestamptz
)
returns table (endpoint text, event_key text)
language sql
set search_path = public, pg_temp
as $$
  insert into public.notification_log as log
    (endpoint, event_key, status, claimed_at, claimed_by, sent_at)
  select distinct pair.endpoint, pair.event_key, 'claimed', p_now, p_run_id,
         null::timestamptz
    from jsonb_to_recordset(p_pairs) as pair (endpoint text, event_key text)
    join public.push_subscriptions s on s.endpoint = pair.endpoint
  on conflict on constraint notification_log_pkey do update set
    claimed_at = excluded.claimed_at,
    claimed_by = excluded.claimed_by
  where log.status = 'claimed'
    and log.claimed_at <= p_now - make_interval(secs => p_lease_seconds)
  returning log.endpoint, log.event_key;
$$;

-- Record what happened to a run's claims: sent, failed (not retried), or
-- released (deleted, so the next run may retry). Only rows this run still
-- holds are touched; a claim taken over after lease expiry is left alone.
create or replace function public.push_settle_deliveries(
  p_run_id uuid,
  p_sent jsonb,
  p_failed jsonb,
  p_released jsonb,
  p_now timestamptz
)
returns void
language sql
set search_path = public, pg_temp
as $$
  update public.notification_log as log
     set status = 'sent', sent_at = p_now
    from jsonb_to_recordset(p_sent) as pair (endpoint text, event_key text)
   where log.endpoint = pair.endpoint
     and log.event_key = pair.event_key
     and log.claimed_by = p_run_id
     and log.status = 'claimed';

  update public.notification_log as log
     set status = 'failed'
    from jsonb_to_recordset(p_failed) as pair (endpoint text, event_key text)
   where log.endpoint = pair.endpoint
     and log.event_key = pair.event_key
     and log.claimed_by = p_run_id
     and log.status = 'claimed';

  delete from public.notification_log as log
   using jsonb_to_recordset(p_released) as pair (endpoint text, event_key text)
   where log.endpoint = pair.endpoint
     and log.event_key = pair.event_key
     and log.claimed_by = p_run_id
     and log.status = 'claimed';
$$;

-- 5. Runs.

create or replace function public.push_start_run(
  p_run_id uuid,
  p_source text,
  p_now timestamptz
)
returns void
language sql
set search_path = public, pg_temp
as $$
  insert into public.push_runs (id, source, started_at)
  values (p_run_id, left(p_source, 40), p_now);
$$;

create or replace function public.push_finish_run(
  p_run_id uuid,
  p_ok boolean,
  p_summary jsonb,
  p_error text,
  p_now timestamptz
)
returns void
language sql
set search_path = public, pg_temp
as $$
  update public.push_runs
     set finished_at = p_now,
         ok = p_ok,
         summary = p_summary,
         error = left(p_error, 500)
   where id = p_run_id;
$$;

-- Retention: ledger rows outlive every alert's send window by weeks; runs
-- only need to cover the health check's look-back.
create or replace function public.push_expire(
  p_now timestamptz,
  p_log_days integer,
  p_run_days integer
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  logs integer;
  runs integer;
begin
  delete from public.notification_log
   where claimed_at < p_now - make_interval(days => p_log_days);
  get diagnostics logs = row_count;
  delete from public.push_runs
   where started_at < p_now - make_interval(days => p_run_days);
  get diagnostics runs = row_count;
  return jsonb_build_object('logs', logs, 'runs', runs);
end;
$$;

-- What /api/health reports.
create or replace function public.push_pipeline_status()
returns table (
  last_run_at timestamptz,
  last_run_source text,
  last_run_error text,
  last_ok_run_at timestamptz,
  last_sent_at timestamptz,
  subscriptions bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  select latest.started_at,
         latest.source,
         latest.error,
         (select max(r.finished_at) from public.push_runs r where r.ok),
         (select max(l.sent_at) from public.notification_log l
           where l.status = 'sent'),
         (select count(*) from public.push_subscriptions)
    from (select null) as anchor
    left join lateral (
      select r.started_at, r.source, r.error
        from public.push_runs r
       order by r.started_at desc
       limit 1
    ) as latest on true;
$$;

-- 6. The scheduler tick, called by pg_cron once supabase/scheduler/enable.sql
--    has been run. Defined here so it is versioned and tested; inert until
--    scheduled. Reads the app URL and bearer secret from Supabase Vault.
create or replace function public.matinee_notify_tick()
returns bigint
language plpgsql
set search_path = public, pg_temp
as $$
declare
  app_url text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret into app_url
    from vault.decrypted_secrets where name = 'matinee_app_url';
  select decrypted_secret into cron_secret
    from vault.decrypted_secrets where name = 'matinee_cron_secret';
  if app_url is null or cron_secret is null then
    raise warning 'matinee_notify_tick: vault secrets matinee_app_url and matinee_cron_secret must be set';
    return null;
  end if;

  select net.http_post(
    url := rtrim(app_url, '/') || '/api/notify/run',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret,
      'X-Matinee-Scheduler', 'supabase-cron'
    ),
    timeout_milliseconds := 55000
  ) into request_id;
  return request_id;
end;
$$;

-- Server key only. Functions in public are otherwise callable through the
-- Data API by anon and authenticated.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.push_save_subscription(text, text, text, text[], jsonb, text, timestamptz)',
    'public.push_delete_subscription(text)',
    'public.push_get_subscription(text)',
    'public.push_list_subscriptions(text[], text[])',
    'public.push_prune_subscriptions(text[])',
    'public.push_claim_deliveries(uuid, jsonb, integer, timestamptz)',
    'public.push_settle_deliveries(uuid, jsonb, jsonb, jsonb, timestamptz)',
    'public.push_start_run(uuid, text, timestamptz)',
    'public.push_finish_run(uuid, boolean, jsonb, text, timestamptz)',
    'public.push_expire(timestamptz, integer, integer)',
    'public.push_pipeline_status()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
  -- The tick is for pg_cron (runs as postgres) only.
  revoke all on function public.matinee_notify_tick()
    from public, anon, authenticated, service_role;
end;
$$;
