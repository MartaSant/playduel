-- Private rooms. The link carries only the code.
-- Mutations go through these functions, which use auth.uid() and ignore any player id from the client.
-- Nickname history is still not stored.

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  game_slug text not null,
  host_id uuid not null references public.players (id) on delete cascade,
  status text not null default 'waiting',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint rooms_game_slug check (
    game_slug in ('tris', 'forza-4', 'morra-cinese')
  ),
  constraint rooms_status check (
    status in ('waiting', 'full', 'expired', 'closed')
  ),
  constraint rooms_code check (
    code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'
  )
);

create index rooms_host_created_idx on public.rooms (host_id, created_at);

create table public.room_players (
  room_id uuid not null references public.rooms (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (room_id, player_id)
);

create function public.generate_room_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  result text := '';
  index integer;
begin
  for index in 0..7 loop
    result := result || substr(alphabet, (get_byte(bytes, index) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;

create function public.is_room_member(target_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_players
    where room_id = target_room
      and player_id = (select auth.uid())
      and left_at is null
  );
$$;

create function public.expire_room(target_room uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.rooms
  set status = 'expired'
  where id = target_room
    and status in ('waiting', 'full')
    and expires_at <= now();
$$;

create function public.room_payload(target_room uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'ok', true,
    'access', 'member',
    'code', rooms.code,
    'gameSlug', rooms.game_slug,
    'status', rooms.status,
    'expiresAt', rooms.expires_at,
    'roomId', rooms.id,
    'players', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'nickname', players.nickname,
          'isHost', players.id = rooms.host_id,
          'isYou', players.id = (select auth.uid())
        )
        order by room_players.joined_at
      )
      from public.room_players
      join public.players on players.id = room_players.player_id
      where room_players.room_id = rooms.id
        and room_players.left_at is null
    ), '[]'::jsonb)
  )
  from public.rooms
  where rooms.id = target_room;
$$;

create function public.room_preview(target_room uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'ok', true,
    'access', 'guest',
    'code', rooms.code,
    'gameSlug', rooms.game_slug,
    'status', rooms.status,
    'seats', (
      select count(*)
      from public.room_players
      where room_players.room_id = rooms.id
        and room_players.left_at is null
    )
  )
  from public.rooms
  where rooms.id = target_room;
$$;

create function public.room_state(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  found_id uuid;
  member boolean;
begin
  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  select id into found_id
  from public.rooms
  where code = p_code;

  if found_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  perform public.expire_room(found_id);
  member := uid is not null and public.is_room_member(found_id);
  if member then
    return public.room_payload(found_id);
  end if;
  return public.room_preview(found_id);
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
  uid uuid := auth.uid();
  recent integer;
  new_code text;
  new_id uuid;
  tries integer := 0;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if p_game_slug not in ('tris', 'forza-4', 'morra-cinese') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_game');
  end if;
  if not exists (select 1 from public.players where id = uid) then
    return jsonb_build_object('ok', false, 'reason', 'profile_required');
  end if;

  select count(*) into recent
  from public.rooms
  where host_id = uid
    and created_at > now() - interval '1 hour';
  if recent >= 8 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  loop
    new_code := public.generate_room_code();
    exit when not exists (select 1 from public.rooms where code = new_code);
    tries := tries + 1;
    if tries > 5 then
      return jsonb_build_object('ok', false, 'reason', 'unavailable');
    end if;
  end loop;

  insert into public.rooms (code, game_slug, host_id, status, expires_at)
  values (new_code, p_game_slug, uid, 'waiting', now() + interval '2 hours')
  returning id into new_id;

  insert into public.room_players (room_id, player_id)
  values (new_id, uid);

  return public.room_payload(new_id);
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
  uid uuid := auth.uid();
  found_id uuid;
  found_status text;
  found_host uuid;
  active_count integer;
  existing_left timestamptz;
  existing_found boolean := false;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;
  if not exists (select 1 from public.players where id = uid) then
    return jsonb_build_object('ok', false, 'reason', 'profile_required');
  end if;

  select id, status, host_id
  into found_id, found_status, found_host
  from public.rooms
  where code = p_code
  for update;

  if found_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  perform public.expire_room(found_id);
  select status into found_status from public.rooms where id = found_id;
  if found_status = 'expired' then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if found_status = 'closed' then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  select count(*) into active_count
  from public.room_players
  where room_id = found_id
    and left_at is null;

  select left_at into existing_left
  from public.room_players
  where room_id = found_id
    and player_id = uid;
  existing_found := found;

  if existing_found and existing_left is null then
    return public.room_payload(found_id);
  end if;
  if active_count >= 2 then
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  if existing_found then
    update public.room_players
    set left_at = null, joined_at = now()
    where room_id = found_id
      and player_id = uid;
  else
    insert into public.room_players (room_id, player_id)
    values (found_id, uid);
  end if;

  update public.rooms
  set status = case when active_count + 1 >= 2 then 'full' else 'waiting' end
  where id = found_id;

  return public.room_payload(found_id);
end;
$$;

create function public.leave_room(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  found_id uuid;
  found_host uuid;
  remaining integer;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  select id, host_id into found_id, found_host
  from public.rooms
  where code = p_code
  for update;

  if found_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if found_host = uid then
    update public.room_players
    set left_at = now()
    where room_id = found_id
      and left_at is null;
    update public.rooms
    set status = 'closed'
    where id = found_id;
    return public.room_preview(found_id);
  end if;

  update public.room_players
  set left_at = now()
  where room_id = found_id
    and player_id = uid
    and left_at is null;

  select count(*) into remaining
  from public.room_players
  where room_id = found_id
    and left_at is null;

  update public.rooms
  set status = case when remaining = 0 then 'closed' else 'waiting' end
  where id = found_id
    and status <> 'expired';

  return public.room_preview(found_id);
end;
$$;

revoke all on table public.rooms from public, anon, authenticated;
revoke all on table public.room_players from public, anon, authenticated;
grant select on table public.rooms to authenticated;
grant select on table public.room_players to authenticated;

alter table public.rooms enable row level security;
alter table public.rooms force row level security;
alter table public.room_players enable row level security;
alter table public.room_players force row level security;

create policy rooms_select_member
  on public.rooms
  for select
  to authenticated
  using (public.is_room_member(id));

create policy room_players_select_member
  on public.room_players
  for select
  to authenticated
  using (public.is_room_member(room_id));

revoke all on function public.generate_room_code() from public, anon, authenticated;
revoke all on function public.is_room_member(uuid) from public, anon, authenticated;
revoke all on function public.expire_room(uuid) from public, anon, authenticated;
revoke all on function public.room_payload(uuid) from public, anon, authenticated;
revoke all on function public.room_preview(uuid) from public, anon, authenticated;
revoke all on function public.room_state(text) from public;
revoke all on function public.create_room(text) from public;
revoke all on function public.join_room(text) from public;
revoke all on function public.leave_room(text) from public;

grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.room_state(text) to anon, authenticated;
grant execute on function public.create_room(text) to authenticated;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.leave_room(text) to authenticated;

alter table public.rooms replica identity full;
alter table public.room_players replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'rooms'
    ) then
      alter publication supabase_realtime add table public.rooms;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'room_players'
    ) then
      alter publication supabase_realtime add table public.room_players;
    end if;
  end if;
end $$;
