-- Operational limits and cleanup. This does not collect IP addresses.
-- purge_operational_data is not granted to the API. Run it from the SQL editor
-- or from a scheduled job on the database. It does not delete audit_log,
-- reports, sanctions, admins or players, and it does not touch backups or host logs.

create table public.attempt_windows (
  player_id uuid not null references public.players (id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  attempts integer not null,
  primary key (player_id, action),
  constraint attempt_windows_action check (
    action in ('join_room', 'enqueue', 'nickname')
  ),
  constraint attempt_windows_attempts check (attempts >= 0)
);

revoke all on table public.attempt_windows from public, anon, authenticated;
alter table public.attempt_windows enable row level security;
alter table public.attempt_windows force row level security;

create function public.consume_attempt(p_action text, p_limit integer, p_window interval)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  current_start timestamptz;
  current_attempts integer;
begin
  if uid is null or p_limit < 1 then
    return false;
  end if;
  if p_action not in ('join_room', 'enqueue', 'nickname') then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('playduel-attempt-' || uid::text || '-' || p_action, 0));

  select window_start, attempts
  into current_start, current_attempts
  from public.attempt_windows
  where player_id = uid
    and action = p_action
  for update;

  if current_start is null or current_start <= now() - p_window then
    insert into public.attempt_windows (player_id, action, window_start, attempts)
    values (uid, p_action, now(), 1)
    on conflict (player_id, action) do update
      set window_start = excluded.window_start,
          attempts = 1;
    return true;
  end if;

  if current_attempts >= p_limit then
    return false;
  end if;

  update public.attempt_windows
  set attempts = attempts + 1
  where player_id = uid
    and action = p_action;
  return true;
end;
$$;

revoke all on function public.consume_attempt(text, integer, interval) from public, anon, authenticated;

create or replace function public.join_room(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  blocked jsonb := public.banned_result();
begin
  if blocked is not null then
    return blocked;
  end if;
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if not exists (select 1 from public.players where id = auth.uid()) then
    return jsonb_build_object('ok', false, 'reason', 'profile_required');
  end if;
  if not public.consume_attempt('join_room', 30, interval '10 minutes') then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;
  return public.join_room_unchecked(p_code);
end;
$$;

create or replace function public.enqueue(p_game_slug text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  blocked jsonb := public.banned_result();
begin
  if blocked is not null then
    return blocked;
  end if;
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if not exists (select 1 from public.players where id = auth.uid()) then
    return jsonb_build_object('ok', false, 'reason', 'profile_required');
  end if;
  if not public.consume_attempt('enqueue', 20, interval '1 hour') then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;
  return public.enqueue_unchecked(p_game_slug);
end;
$$;

create function public.limit_nickname_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return null;
  end if;
  if not public.consume_attempt('nickname', 20, interval '1 hour') then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return null;
end;
$$;

revoke all on function public.limit_nickname_writes() from public, anon, authenticated;

create trigger players_limit_nickname
  after insert or update of nickname on public.players
  for each row
  execute function public.limit_nickname_writes();

create function public.purge_operational_data()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  removed_queue integer;
  removed_matches integer;
  removed_rooms integer;
begin
  delete from public.queue_entries
  where created_at <= now() - interval '2 minutes';
  get diagnostics removed_queue = row_count;

  delete from public.matches
  where status = 'finished'
    and finished_at <= now() - interval '30 days'
    and not exists (
      select 1 from public.reports where reports.match_id = matches.id
    );
  get diagnostics removed_matches = row_count;

  delete from public.rooms
  where expires_at <= now() - interval '30 days'
    and not exists (
      select 1 from public.matches where matches.room_id = rooms.id
    );
  get diagnostics removed_rooms = row_count;

  return jsonb_build_object(
    'queueEntries', removed_queue,
    'finishedMatches', removed_matches,
    'expiredRooms', removed_rooms
  );
end;
$$;

revoke all on function public.purge_operational_data() from public, anon, authenticated;
