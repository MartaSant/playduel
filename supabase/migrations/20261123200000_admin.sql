-- Admin access is separate from anonymous players.
-- A password session is not enough: the JWT must be aal2 and the user must be listed in public.admins.
-- The first admin is inserted by hand after the email user exists:
--   insert into public.admins (user_id) values ('the-auth-user-id');
-- TOTP must be enabled in Authentication → Multi-factor. This migration does not store IP addresses.

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.players (id) on delete cascade,
  target_id uuid not null references public.players (id) on delete cascade,
  match_id uuid references public.matches (id) on delete set null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint reports_reason_length check (char_length(reason) between 10 and 500),
  constraint reports_not_self check (reporter_id <> target_id),
  constraint reports_status check (status in ('open', 'dismissed', 'sanctioned'))
);

create table public.sanctions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  report_id uuid references public.reports (id) on delete set null,
  reason text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sanctions_reason_length check (char_length(reason) between 3 and 500)
);

create index sanctions_active_idx
  on public.sanctions (player_id)
  where revoked_at is null;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null,
  target_type text not null,
  target_id uuid,
  summary text not null,
  created_at timestamptz not null default now()
);

create function public.audit_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_immutable' using errcode = 'P0001';
end;
$$;

create trigger audit_log_no_change
  before update or delete on public.audit_log
  for each row execute function public.audit_immutable();

create function public.is_player_banned(target_player uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sanctions
    where player_id = target_player
      and revoked_at is null
      and expires_at > now()
  );
$$;

create function public.banned_result()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and public.is_player_banned(auth.uid()) then
    return jsonb_build_object('ok', false, 'reason', 'banned');
  end if;
  return null;
end;
$$;

create function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and coalesce(auth.jwt()->>'is_anonymous', '') <> 'true'
    and coalesce(auth.jwt()->>'aal', '') = 'aal2'
    and exists (
      select 1 from public.admins where user_id = auth.uid()
    );
$$;

alter function public.enqueue(text) rename to enqueue_unchecked;
alter function public.play_move(uuid, jsonb) rename to play_move_unchecked;
alter function public.create_room(text) rename to create_room_unchecked;
alter function public.join_room(text) rename to join_room_unchecked;
alter function public.request_rematch(uuid) rename to request_rematch_unchecked;

create function public.enqueue(p_game_slug text)
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
  return public.enqueue_unchecked(p_game_slug);
end;
$$;

create function public.play_move(p_match uuid, p_intent jsonb)
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
  return public.play_move_unchecked(p_match, p_intent);
end;
$$;

create function public.create_room(p_game_slug text)
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
  return public.create_room_unchecked(p_game_slug);
end;
$$;

create function public.join_room(p_code text)
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
  return public.join_room_unchecked(p_code);
end;
$$;

create function public.request_rematch(p_match uuid)
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
  return public.request_rematch_unchecked(p_match);
end;
$$;

create function public.admin_gate()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if coalesce(auth.jwt()->>'is_anonymous', '') = 'true' then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if not exists (select 1 from public.admins where user_id = uid) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if coalesce(auth.jwt()->>'aal', '') = 'aal2' then
    return jsonb_build_object('ok', true, 'stage', 'ready');
  end if;
  return jsonb_build_object('ok', true, 'stage', 'mfa');
end;
$$;

create function public.file_report(p_match uuid, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  target uuid;
  clean text := trim(p_reason);
  recent integer;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if not exists (
    select 1 from public.match_players
    where match_id = p_match and player_id = uid
  ) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if char_length(clean) < 10 or char_length(clean) > 500 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select player_id into target
  from public.match_players
  where match_id = p_match
    and player_id <> uid
  limit 1;
  if target is null or target = uid then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select count(*) into recent
  from public.reports
  where reporter_id = uid
    and created_at > now() - interval '1 hour';
  if recent >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  insert into public.reports (reporter_id, target_id, match_id, reason)
  values (uid, target, p_match, clean);
  return jsonb_build_object('ok', true);
end;
$$;

create function public.admin_overview()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_active_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  return jsonb_build_object(
    'ok', true,
    'players', (select count(*) from public.players),
    'playingMatches', (select count(*) from public.matches where status = 'playing'),
    'openRooms', (select count(*) from public.rooms where status in ('waiting', 'full')),
    'openReports', (select count(*) from public.reports where status = 'open'),
    'activeSanctions', (select count(*) from public.sanctions where revoked_at is null and expires_at > now()),
    'sanctions', coalesce((
      select jsonb_agg(row_to_json(item))
      from (
        select sanctions.id,
               players.nickname,
               sanctions.expires_at as "expiresAt",
               sanctions.reason
        from public.sanctions
        join public.players on players.id = sanctions.player_id
        where sanctions.revoked_at is null
          and sanctions.expires_at > now()
        order by sanctions.expires_at
        limit 20
      ) as item
    ), '[]'::jsonb)
  );
end;
$$;

create function public.admin_search(p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  raw text := left(trim(coalesce(p_query, '')), 40);
  needle text;
  match_id uuid := null;
begin
  if not public.is_active_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  needle := replace(replace(replace(raw, '\', '\\'), '%', '\%'), '_', '\_');
  if raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    match_id := raw::uuid;
  end if;
  return jsonb_build_object(
    'ok', true,
    'query', raw,
    'players', coalesce((
      select jsonb_agg(row_to_json(item))
      from (
        select players.id,
               players.nickname,
               (
                 select sanctions.expires_at
                 from public.sanctions
                 where sanctions.player_id = players.id
                   and sanctions.revoked_at is null
                   and sanctions.expires_at > now()
                 order by sanctions.expires_at desc
                 limit 1
               ) as "bannedUntil"
        from public.players
        where raw <> ''
          and players.nickname ilike '%' || needle || '%' escape '\'
        order by players.nickname
        limit 20
      ) as item
    ), '[]'::jsonb),
    'rooms', coalesce((
      select jsonb_agg(row_to_json(item))
      from (
        select rooms.code, rooms.status, rooms.game_slug as "gameSlug"
        from public.rooms
        where raw ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'
          and rooms.code = raw
        limit 5
      ) as item
    ), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(row_to_json(item))
      from (
        select matches.id, matches.game_slug as "gameSlug", matches.status, matches.result
        from public.matches
        where match_id is not null
          and matches.id = match_id
        limit 5
      ) as item
    ), '[]'::jsonb)
  );
end;
$$;

create function public.admin_reports()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_active_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  return jsonb_build_object(
    'ok', true,
    'reports', coalesce((
      select jsonb_agg(row_to_json(item))
      from (
        select reports.id,
               reports.reason,
               reports.created_at as "createdAt",
               reports.match_id as "matchId",
               reporter.nickname as "reporterNickname",
               target.nickname as "targetNickname",
               target.id as "targetId"
        from public.reports
        join public.players as reporter on reporter.id = reports.reporter_id
        join public.players as target on target.id = reports.target_id
        where reports.status = 'open'
        order by reports.created_at
        limit 50
      ) as item
    ), '[]'::jsonb)
  );
end;
$$;

create function public.admin_audit()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_active_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  return jsonb_build_object(
    'ok', true,
    'entries', coalesce((
      select jsonb_agg(row_to_json(item))
      from (
        select audit_log.id,
               audit_log.action,
               audit_log.target_type as "targetType",
               audit_log.target_id as "targetId",
               audit_log.summary,
               audit_log.created_at as "createdAt"
        from public.audit_log
        order by audit_log.created_at desc
        limit 50
      ) as item
    ), '[]'::jsonb)
  );
end;
$$;

create function public.admin_decide_report(
  p_report uuid,
  p_decision text,
  p_note text,
  p_confirmed boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  target uuid;
  nickname text;
  clean text := left(trim(coalesce(p_note, '')), 500);
begin
  if not public.is_active_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if p_confirmed is not true then
    return jsonb_build_object('ok', false, 'reason', 'confirmation_required');
  end if;
  if p_decision not in ('dismiss', 'ban_24h', 'ban_7d') then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if char_length(clean) < 3 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select reports.target_id, players.nickname
  into target, nickname
  from public.reports
  join public.players on players.id = reports.target_id
  where reports.id = p_report
    and reports.status = 'open'
  for update;

  if target is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if p_decision = 'dismiss' then
    update public.reports
    set status = 'dismissed', decided_at = now()
    where id = p_report;
  else
    insert into public.sanctions (player_id, report_id, reason, expires_at)
    values (
      target,
      p_report,
      clean,
      now() + case when p_decision = 'ban_24h' then interval '24 hours' else interval '7 days' end
    );
    update public.reports
    set status = 'sanctioned', decided_at = now()
    where id = p_report;
  end if;

  insert into public.audit_log (admin_id, action, target_type, target_id, summary)
  values (
    uid,
    'report.' || p_decision,
    'report',
    p_report,
    p_decision || ' per ' || nickname || '. ' || clean
  );
  return jsonb_build_object('ok', true);
end;
$$;

create function public.admin_revoke_sanction(
  p_sanction uuid,
  p_note text,
  p_confirmed boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  nickname text;
  clean text := left(trim(coalesce(p_note, '')), 500);
begin
  if not public.is_active_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if p_confirmed is not true then
    return jsonb_build_object('ok', false, 'reason', 'confirmation_required');
  end if;
  if char_length(clean) < 3 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select players.nickname into nickname
  from public.sanctions
  join public.players on players.id = sanctions.player_id
  where sanctions.id = p_sanction
    and sanctions.revoked_at is null
    and sanctions.expires_at > now()
  for update of sanctions;

  if nickname is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  update public.sanctions
  set revoked_at = now()
  where id = p_sanction;

  insert into public.audit_log (admin_id, action, target_type, target_id, summary)
  values (uid, 'sanction.revoke', 'sanction', p_sanction, 'Revoca per ' || nickname || '. ' || clean);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on table public.admins from public, anon, authenticated;
revoke all on table public.reports from public, anon, authenticated;
revoke all on table public.sanctions from public, anon, authenticated;
revoke all on table public.audit_log from public, anon, authenticated;

alter table public.admins enable row level security;
alter table public.admins force row level security;
alter table public.reports enable row level security;
alter table public.reports force row level security;
alter table public.sanctions enable row level security;
alter table public.sanctions force row level security;
alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;

revoke all on function public.audit_immutable() from public, anon, authenticated;
revoke all on function public.is_player_banned(uuid) from public, anon, authenticated;
revoke all on function public.banned_result() from public, anon, authenticated;
revoke all on function public.is_active_admin() from public, anon, authenticated;
revoke all on function public.enqueue_unchecked(text) from public, anon, authenticated;
revoke all on function public.play_move_unchecked(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.create_room_unchecked(text) from public, anon, authenticated;
revoke all on function public.join_room_unchecked(text) from public, anon, authenticated;
revoke all on function public.request_rematch_unchecked(uuid) from public, anon, authenticated;

revoke all on function public.enqueue(text) from public;
revoke all on function public.play_move(uuid, jsonb) from public;
revoke all on function public.create_room(text) from public;
revoke all on function public.join_room(text) from public;
revoke all on function public.request_rematch(uuid) from public;
revoke all on function public.admin_gate() from public;
revoke all on function public.file_report(uuid, text) from public;
revoke all on function public.admin_overview() from public;
revoke all on function public.admin_search(text) from public;
revoke all on function public.admin_reports() from public;
revoke all on function public.admin_audit() from public;
revoke all on function public.admin_decide_report(uuid, text, text, boolean) from public;
revoke all on function public.admin_revoke_sanction(uuid, text, boolean) from public;

grant execute on function public.enqueue(text) to authenticated;
grant execute on function public.play_move(uuid, jsonb) to authenticated;
grant execute on function public.create_room(text) to authenticated;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.request_rematch(uuid) to authenticated;
grant execute on function public.admin_gate() to authenticated;
grant execute on function public.file_report(uuid, text) to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_search(text) to authenticated;
grant execute on function public.admin_reports() to authenticated;
grant execute on function public.admin_audit() to authenticated;
grant execute on function public.admin_decide_report(uuid, text, text, boolean) to authenticated;
grant execute on function public.admin_revoke_sanction(uuid, text, boolean) to authenticated;
