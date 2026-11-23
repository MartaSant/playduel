-- host_id was both a variable and a column, so Postgres rejected the room
-- match lookup (42702) before the second player arrived.

create or replace function public.ensure_room_match(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  found_room uuid;
  found_game text;
  found_status text;
  room_host uuid;
  guest_id uuid;
  existing uuid;
  created uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  select rooms.id, rooms.game_slug, rooms.status, rooms.host_id
  into found_room, found_game, found_status, room_host
  from public.rooms
  where rooms.code = p_code
  for update;

  if found_room is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if not public.is_room_member(found_room) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(found_room::text, 0));

  select matches.id into existing
  from public.matches
  where matches.room_id = found_room
    and matches.status = 'playing'
  limit 1;
  if existing is not null then
    return public.match_payload(existing);
  end if;

  select matches.id into existing
  from public.matches
  where matches.room_id = found_room
  order by matches.created_at desc
  limit 1;

  if found_status = 'full' and existing is null then
    select room_players.player_id into guest_id
    from public.room_players
    where room_players.room_id = found_room
      and room_players.player_id <> room_host
      and room_players.left_at is null
    limit 1;
    if guest_id is null then
      return jsonb_build_object('ok', false, 'reason', 'not_ready');
    end if;
    begin
      created := public.create_match(found_game, found_room, room_host, guest_id);
    exception
      when unique_violation then
        select matches.id into created
        from public.matches
        where matches.room_id = found_room
          and matches.status = 'playing'
        limit 1;
    end;
    return public.match_payload(created);
  end if;

  if existing is not null then
    return public.match_payload(existing);
  end if;
  return jsonb_build_object('ok', false, 'reason', 'not_ready');
end;
$$;
