-- Visitor addresses for abuse review. Only an active admin can read them.
-- There is no automatic ban by IP. A shared address can belong to more than one person.
-- Rows older than 30 days are removed by purge_operational_data.

create table public.access_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players (id) on delete set null,
  ip inet not null,
  action text not null,
  game_slug text,
  match_id uuid,
  created_at timestamptz not null default now(),
  constraint access_events_action check (
    action in (
      'visit', 'nickname', 'create_room', 'join_room', 'enqueue', 'play', 'abandon', 'report'
    )
  ),
  constraint access_events_game check (
    game_slug is null or game_slug in ('tris', 'forza-4', 'morra-cinese')
  )
);

create index access_events_ip_idx on public.access_events (ip, created_at desc);

revoke all on table public.access_events from public, anon, authenticated;
alter table public.access_events enable row level security;
alter table public.access_events force row level security;

create function public.log_access(
  p_ip text,
  p_action text,
  p_game text,
  p_match uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  parsed inet;
  game text := nullif(trim(coalesce(p_game, '')), '');
  stored_player uuid;
  stored_match uuid := p_match;
begin
  if p_action not in (
    'visit', 'nickname', 'create_room', 'join_room', 'enqueue', 'play', 'abandon', 'report'
  ) then
    return;
  end if;
  if p_ip is null or p_ip !~ '^[0-9a-fA-F:.]+$' then
    return;
  end if;
  begin
    parsed := trim(p_ip)::inet;
  exception
    when others then
      return;
  end;

  if game is not null and game not in ('tris', 'forza-4', 'morra-cinese') then
    game := null;
  end if;
  if game is null and stored_match is not null then
    select matches.game_slug into game
    from public.matches
    where matches.id = stored_match;
  end if;

  if uid is not null and exists (select 1 from public.players where id = uid) then
    stored_player := uid;
  end if;

  if p_action = 'visit' and exists (
    select 1
    from public.access_events
    where access_events.ip = parsed
      and access_events.action = 'visit'
      and access_events.player_id is not distinct from stored_player
      and access_events.created_at > now() - interval '15 minutes'
  ) then
    return;
  end if;

  if (
    select count(*)
    from public.access_events
    where access_events.ip = parsed
      and access_events.created_at > now() - interval '1 hour'
  ) >= 80 then
    return;
  end if;

  insert into public.access_events (player_id, ip, action, game_slug, match_id)
  values (stored_player, parsed, p_action, game, stored_match);
end;
$$;

revoke all on function public.log_access(text, text, text, uuid) from public;
grant execute on function public.log_access(text, text, text, uuid) to anon, authenticated;

create function public.admin_access(p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  raw text := left(trim(coalesce(p_query, '')), 64);
  pattern text;
begin
  if not public.is_active_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  pattern := replace(replace(replace(raw, '\', '\\'), '%', '\%'), '_', '\_');

  return jsonb_build_object(
    'ok', true,
    'addresses', coalesce((
      select jsonb_agg(row_to_json(item))
      from (
        select
          host(events.ip) as ip,
          count(*)::int as events,
          count(*) filter (where events.action = 'play')::int as plays,
          max(events.created_at) as "lastSeen",
          coalesce((
            select jsonb_agg(distinct players.nickname)
            from public.access_events recent
            join public.players on players.id = recent.player_id
            where recent.ip = events.ip
          ), '[]'::jsonb) as nicknames,
          coalesce((
            select jsonb_agg(distinct recent.game_slug)
            from public.access_events recent
            where recent.ip = events.ip
              and recent.game_slug is not null
          ), '[]'::jsonb) as games,
          exists (
            select 1
            from public.access_events recent
            where recent.ip = events.ip
              and recent.player_id is not null
              and public.is_player_banned(recent.player_id)
          ) as "hasSanction"
        from public.access_events events
        where events.created_at > now() - interval '30 days'
          and (
            raw = ''
            or host(events.ip) = raw
            or exists (
              select 1
              from public.access_events named
              join public.players on players.id = named.player_id
              where named.ip = events.ip
                and players.nickname ilike '%' || pattern || '%' escape '\'
            )
          )
        group by events.ip
        order by max(events.created_at) desc
        limit 40
      ) item
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(row_to_json(item))
      from (
        select
          host(events.ip) as ip,
          events.action,
          events.game_slug as "gameSlug",
          events.match_id as "matchId",
          events.created_at as "createdAt",
          players.nickname,
          case
            when events.player_id is null then false
            else public.is_player_banned(events.player_id)
          end as banned
        from public.access_events events
        left join public.players on players.id = events.player_id
        where raw <> ''
          and events.created_at > now() - interval '30 days'
          and (
            host(events.ip) = raw
            or players.nickname ilike '%' || pattern || '%' escape '\'
          )
        order by events.created_at desc
        limit 50
      ) item
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_access(text) from public, anon;
grant execute on function public.admin_access(text) to authenticated;

create or replace function public.purge_operational_data()
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
  removed_access integer;
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

  delete from public.access_events
  where created_at <= now() - interval '30 days';
  get diagnostics removed_access = row_count;

  return jsonb_build_object(
    'queueEntries', removed_queue,
    'finishedMatches', removed_matches,
    'expiredRooms', removed_rooms,
    'accessEvents', removed_access
  );
end;
$$;

revoke all on function public.purge_operational_data() from public, anon, authenticated;
