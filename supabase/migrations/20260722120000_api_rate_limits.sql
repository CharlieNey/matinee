-- Durable, race-safe limits for unauthenticated public API actions.

create table public.api_rate_limits (
  key text primary key,
  window_started timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0)
);

alter table public.api_rate_limits enable row level security;
grant all on table public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allowed boolean;
begin
  if p_window_seconds < 1 or p_limit < 1 or length(p_key) > 160 then
    return false;
  end if;

  insert into public.api_rate_limits as limits (
    key,
    window_started,
    request_count
  ) values (
    p_key,
    now(),
    1
  )
  on conflict (key) do update set
    window_started = case
      when limits.window_started <= now() - make_interval(secs => p_window_seconds)
        then now()
      else limits.window_started
    end,
    request_count = case
      when limits.window_started <= now() - make_interval(secs => p_window_seconds)
        then 1
      else limits.request_count + 1
    end
  returning request_count <= p_limit into allowed;

  -- Opportunistic cleanup keeps the table bounded without another scheduler.
  if random() < 0.01 then
    delete from public.api_rate_limits
    where window_started < now() - interval '2 days';
  end if;

  return allowed;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer)
  to service_role;
