-- Dama. White moves first. Men step forward, jump in any diagonal,
-- and must capture. A continued capture stays with the same piece.
-- Reaching the last row promotes and ends the turn.

create or replace function public.allowed_game(p_game text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_game in (
    'tris',
    'forza-4',
    'morra-cinese',
    'reversi',
    'punti-quadrati',
    'tre-pile',
    'dama'
  );
$$;

alter table public.rooms drop constraint rooms_game_slug;
alter table public.rooms add constraint rooms_game_slug check (public.allowed_game(game_slug));

alter table public.matches drop constraint matches_game_slug;
alter table public.matches add constraint matches_game_slug check (public.allowed_game(game_slug));

alter table public.queue_entries drop constraint queue_game_slug;
alter table public.queue_entries add constraint queue_game_slug check (public.allowed_game(game_slug));

alter table public.access_events drop constraint access_events_game;
alter table public.access_events add constraint access_events_game check (
  game_slug is null or public.allowed_game(game_slug)
);

create or replace function public.initial_match_state(p_game text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case p_game
    when 'tris' then jsonb_build_object(
      'board', jsonb_build_array(null, null, null, null, null, null, null, null, null),
      'turn', 'X',
      'status', 'playing',
      'winner', null,
      'winningLine', null
    )
    when 'forza-4' then jsonb_build_object(
      'columns', (
        select jsonb_agg(
          jsonb_build_array(null, null, null, null, null, null)
          order by series
        )
        from generate_series(0, 6) as series
      ),
      'turn', 'red',
      'status', 'playing',
      'winner', null,
      'winningCells', null
    )
    when 'reversi' then jsonb_build_object(
      'board', (
        select jsonb_agg(
          case series
            when 27 then to_jsonb('white'::text)
            when 28 then to_jsonb('black'::text)
            when 35 then to_jsonb('black'::text)
            when 36 then to_jsonb('white'::text)
            else 'null'::jsonb
          end
          order by series
        )
        from generate_series(0, 63) as series
      ),
      'turn', 'black',
      'status', 'playing',
      'winner', null
    )
    when 'punti-quadrati' then jsonb_build_object(
      'horizontal', (select jsonb_agg(false) from generate_series(1, 12)),
      'vertical', (select jsonb_agg(false) from generate_series(1, 12)),
      'boxes', (select jsonb_agg('null'::jsonb) from generate_series(1, 9)),
      'turn', 'A',
      'status', 'playing',
      'winner', null
    )
    when 'tre-pile' then jsonb_build_object(
      'piles', jsonb_build_array(3, 5, 7),
      'turn', 'A',
      'status', 'playing',
      'winner', null
    )
    when 'dama' then jsonb_build_object(
      'board', (
        select jsonb_agg(
          case
            when ((series / 8) + (series % 8)) % 2 = 0 then 'null'::jsonb
            when series / 8 <= 2 then to_jsonb('black'::text)
            when series / 8 >= 5 then to_jsonb('white'::text)
            else 'null'::jsonb
          end
          order by series
        )
        from generate_series(0, 63) as series
      ),
      'turn', 'white',
      'mustFrom', null,
      'status', 'playing',
      'winner', null
    )
    else jsonb_build_object(
      'scores', jsonb_build_object('A', 0, 'B', 0),
      'roundsPlayed', 0,
      'choices', jsonb_build_object('A', null, 'B', null),
      'status', 'choosing',
      'winner', null,
      'lastRound', null
    )
  end;
$$;

create or replace function public.create_match(
  p_game text,
  p_room uuid,
  p_first uuid,
  p_second uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  first_seat text;
  second_seat text;
  deadline interval;
begin
  if p_first = p_second then
    return null;
  end if;
  first_seat := case p_game
    when 'tris' then 'X'
    when 'forza-4' then 'red'
    when 'reversi' then 'black'
    when 'dama' then 'white'
    else 'A'
  end;
  second_seat := public.opposite_seat(first_seat);
  deadline := case when p_game = 'morra-cinese' then interval '30 seconds' else interval '45 seconds' end;

  insert into public.matches (game_slug, room_id, deadline_at)
  values (p_game, p_room, now() + deadline)
  returning id into new_id;

  insert into public.match_players (match_id, player_id, seat, seat_order)
  values
    (new_id, p_first, first_seat, 1),
    (new_id, p_second, second_seat, 2);

  insert into public.match_state (match_id, state)
  values (new_id, public.initial_match_state(p_game));

  delete from public.queue_entries
  where player_id in (p_first, p_second);

  return new_id;
end;
$$;

create or replace function public.dama_owner(piece text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when piece in ('white', 'white-king') then 'white'
    when piece in ('black', 'black-king') then 'black'
    else null
  end;
$$;

create or replace function public.dama_jump_over(board jsonb, from_cell int, to_cell int)
returns int
language plpgsql
immutable
set search_path = ''
as $$
declare
  from_row int := from_cell / 8;
  from_col int := from_cell % 8;
  to_row int := to_cell / 8;
  to_col int := to_cell % 8;
  row_delta int := to_row - from_row;
  col_delta int := to_col - from_col;
  mid int;
  piece text := board->>from_cell;
  jumped text;
begin
  if from_cell < 0 or from_cell > 63 or to_cell < 0 or to_cell > 63 then
    return null;
  end if;
  if abs(row_delta) <> 2 or abs(col_delta) <> 2 then
    return null;
  end if;
  if board->>to_cell is not null then
    return null;
  end if;
  mid := ((from_row + to_row) / 2) * 8 + ((from_col + to_col) / 2);
  jumped := board->>mid;
  if jumped is null
    or public.dama_owner(jumped) is null
    or public.dama_owner(jumped) = public.dama_owner(piece) then
    return null;
  end if;
  return mid;
end;
$$;

create or replace function public.dama_can_capture(board jsonb, seat text, only_from int)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  origin int;
  dir_row int;
  dir_col int;
  next_row int;
  next_col int;
  landing int;
begin
  for origin in 0..63 loop
    if only_from is not null and origin <> only_from then
      continue;
    end if;
    if public.dama_owner(board->>origin) is distinct from seat then
      continue;
    end if;
    for dir_row in -1..1 loop
      if dir_row = 0 then
        continue;
      end if;
      for dir_col in -1..1 loop
        if dir_col = 0 then
          continue;
        end if;
        next_row := origin / 8 + dir_row * 2;
        next_col := origin % 8 + dir_col * 2;
        if next_row between 0 and 7 and next_col between 0 and 7 then
          landing := next_row * 8 + next_col;
          if public.dama_jump_over(board, origin, landing) is not null then
            return true;
          end if;
        end if;
      end loop;
    end loop;
  end loop;
  return false;
end;
$$;

create or replace function public.dama_can_move(board jsonb, seat text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  origin int;
  piece text;
  king boolean;
  dir_row int;
  dir_col int;
  next_row int;
  next_col int;
begin
  if public.dama_can_capture(board, seat, null) then
    return true;
  end if;
  for origin in 0..63 loop
    piece := board->>origin;
    if public.dama_owner(piece) is distinct from seat then
      continue;
    end if;
    king := piece in ('white-king', 'black-king');
    for dir_row in -1..1 loop
      if dir_row = 0 then
        continue;
      end if;
      if not king and seat = 'white' and dir_row <> -1 then
        continue;
      end if;
      if not king and seat = 'black' and dir_row <> 1 then
        continue;
      end if;
      for dir_col in -1..1 loop
        if dir_col = 0 then
          continue;
        end if;
        next_row := origin / 8 + dir_row;
        next_col := origin % 8 + dir_col;
        if next_row between 0 and 7 and next_col between 0 and 7
          and board->>(next_row * 8 + next_col) is null then
          return true;
        end if;
      end loop;
    end loop;
  end loop;
  return false;
end;
$$;

create or replace function public.apply_dama(state jsonb, seat text, from_cell int, to_cell int)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  board jsonb := state->'board';
  piece text;
  from_row int;
  from_col int;
  to_row int;
  to_col int;
  row_delta int;
  col_delta int;
  quiet boolean := false;
  jumped int;
  forced boolean;
  promoted boolean;
  moved text;
  next_turn text;
begin
  if state->>'status' <> 'playing' then
    return jsonb_build_object('ok', false, 'reason', 'finished');
  end if;
  if seat <> state->>'turn' then
    return jsonb_build_object('ok', false, 'reason', 'out-of-turn');
  end if;
  if from_cell is null or to_cell is null
    or from_cell < 0 or from_cell > 63
    or to_cell < 0 or to_cell > 63
    or ((from_cell / 8) + (from_cell % 8)) % 2 = 0
    or ((to_cell / 8) + (to_cell % 8)) % 2 = 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid-square');
  end if;
  piece := board->>from_cell;
  if piece is null then
    return jsonb_build_object('ok', false, 'reason', 'empty-from');
  end if;
  if public.dama_owner(piece) is distinct from seat then
    return jsonb_build_object('ok', false, 'reason', 'not-your-piece');
  end if;
  if state->>'mustFrom' is not null and from_cell <> (state->>'mustFrom')::int then
    return jsonb_build_object('ok', false, 'reason', 'must-continue');
  end if;
  if board->>to_cell is not null then
    return jsonb_build_object('ok', false, 'reason', 'occupied');
  end if;

  from_row := from_cell / 8;
  from_col := from_cell % 8;
  to_row := to_cell / 8;
  to_col := to_cell % 8;
  row_delta := to_row - from_row;
  col_delta := to_col - from_col;
  if abs(row_delta) = 1 and abs(col_delta) = 1 then
    quiet := piece in ('white-king', 'black-king')
      or (piece = 'white' and row_delta = -1)
      or (piece = 'black' and row_delta = 1);
  end if;
  jumped := public.dama_jump_over(board, from_cell, to_cell);
  forced := state->>'mustFrom' is not null or public.dama_can_capture(board, seat, null);
  if forced and jumped is null then
    return jsonb_build_object(
      'ok', false,
      'reason', case when state->>'mustFrom' is not null then 'must-continue' else 'must-capture' end
    );
  end if;
  if not forced and not quiet then
    return jsonb_build_object('ok', false, 'reason', 'invalid-move');
  end if;

  board := jsonb_set(board, array[from_cell::text], 'null'::jsonb, false);
  if jumped is not null then
    board := jsonb_set(board, array[jumped::text], 'null'::jsonb, false);
  end if;
  promoted := piece in ('white', 'black') and (
    (seat = 'white' and to_row = 0) or (seat = 'black' and to_row = 7)
  );
  moved := case
    when promoted and seat = 'white' then 'white-king'
    when promoted and seat = 'black' then 'black-king'
    else piece
  end;
  board := jsonb_set(board, array[to_cell::text], to_jsonb(moved), false);

  if jumped is not null and not promoted and public.dama_can_capture(board, seat, to_cell) then
    return jsonb_build_object(
      'ok', true,
      'state', jsonb_build_object(
        'board', board,
        'turn', seat,
        'mustFrom', to_cell,
        'status', 'playing',
        'winner', null
      ),
      'matchStatus', 'playing',
      'result', 'playing',
      'winnerSeat', null,
      'refreshDeadline', true
    );
  end if;

  next_turn := public.opposite_seat(seat);
  if not public.dama_can_move(board, next_turn) then
    return jsonb_build_object(
      'ok', true,
      'state', jsonb_build_object(
        'board', board,
        'turn', next_turn,
        'mustFrom', null,
        'status', 'won',
        'winner', seat
      ),
      'matchStatus', 'finished',
      'result', 'won',
      'winnerSeat', seat,
      'refreshDeadline', false
    );
  end if;
  return jsonb_build_object(
    'ok', true,
    'state', jsonb_build_object(
      'board', board,
      'turn', next_turn,
      'mustFrom', null,
      'status', 'playing',
      'winner', null
    ),
    'matchStatus', 'playing',
    'result', 'playing',
    'winnerSeat', null,
    'refreshDeadline', true
  );
end;
$$;

create or replace function public.queue_state(p_game_slug text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  active uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if not public.allowed_game(p_game_slug) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_game');
  end if;
  if not exists (select 1 from public.players where id = uid) then
    return jsonb_build_object('ok', false, 'reason', 'profile_required');
  end if;

  delete from public.queue_entries
  where player_id = uid
    and created_at <= now() - interval '2 minutes';

  active := public.active_match_id(uid);
  if active is not null then
    return jsonb_build_object(
      'ok', true,
      'access', 'matched',
      'gameSlug', (select game_slug from public.matches where id = active),
      'matchId', active
    );
  end if;

  if exists (select 1 from public.queue_entries where player_id = uid and game_slug = p_game_slug) then
    return jsonb_build_object('ok', true, 'access', 'waiting', 'gameSlug', p_game_slug);
  end if;
  return jsonb_build_object('ok', true, 'access', 'idle', 'gameSlug', p_game_slug);
end;
$$;

create or replace function public.enqueue_unchecked(p_game_slug text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  active uuid;
  opponent uuid;
  new_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if not public.allowed_game(p_game_slug) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_game');
  end if;
  if not exists (select 1 from public.players where id = uid) then
    return jsonb_build_object('ok', false, 'reason', 'profile_required');
  end if;

  active := public.active_match_id(uid);
  if active is not null then
    return public.match_payload(active);
  end if;

  perform pg_advisory_xact_lock(hashtextextended('playduel-queue-' || p_game_slug, 0));

  delete from public.queue_entries
  where game_slug = p_game_slug
    and created_at <= now() - interval '2 minutes';

  select player_id into opponent
  from public.queue_entries
  where game_slug = p_game_slug
    and player_id <> uid
  order by created_at
  for update skip locked
  limit 1;

  if opponent is not null then
    new_id := public.create_match(p_game_slug, null, opponent, uid);
    return public.match_payload(new_id);
  end if;

  insert into public.queue_entries (player_id, game_slug)
  values (uid, p_game_slug)
  on conflict (player_id) do update
  set game_slug = excluded.game_slug,
      created_at = now();

  return jsonb_build_object('ok', true, 'access', 'waiting', 'gameSlug', p_game_slug);
end;
$$;

create or replace function public.create_room_unchecked(p_game_slug text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  recent int;
  new_code text;
  new_id uuid;
  tries int := 0;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if not public.allowed_game(p_game_slug) then
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

create or replace function public.log_access(
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

  if game is not null and not public.allowed_game(game) then
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

create or replace function public.play_move_unchecked(p_match uuid, p_intent jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  game text;
  current_status text;
  window_start timestamptz;
  window_count int;
  your_seat text;
  current_state jsonb;
  applied jsonb;
  cell int;
  target_column int;
  hand text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if not exists (select 1 from public.players where id = uid) then
    return jsonb_build_object('ok', false, 'reason', 'profile_required');
  end if;

  select game_slug, status, move_window, moves_in_window
  into game, current_status, window_start, window_count
  from public.matches
  where id = p_match
  for update;

  if game is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select seat into your_seat
  from public.match_players
  where match_id = p_match
    and player_id = uid;
  if your_seat is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  perform public.settle_match(p_match);
  select status into current_status from public.matches where id = p_match;
  if current_status <> 'playing' then
    return public.match_payload(p_match);
  end if;

  if window_start < now() - interval '1 minute' then
    window_start := now();
    window_count := 0;
  end if;
  if window_count >= 40 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  select state into current_state
  from public.match_state
  where match_id = p_match
  for update;

  if game = 'tris' then
    if coalesce(p_intent->>'cell', '') !~ '^[0-8]$' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_move', 'detail', 'invalid-cell');
    end if;
    cell := (p_intent->>'cell')::int;
    applied := public.apply_tris(current_state, your_seat, cell);
  elsif game = 'forza-4' then
    if coalesce(p_intent->>'column', '') !~ '^[0-6]$' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_move', 'detail', 'invalid-column');
    end if;
    target_column := (p_intent->>'column')::int;
    applied := public.apply_connect_four(current_state, your_seat, target_column);
  elsif game = 'reversi' then
    if coalesce(p_intent->>'cell', '') !~ '^(?:[0-9]|[1-5][0-9]|6[0-3])$' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_move', 'detail', 'invalid-cell');
    end if;
    applied := public.apply_reversi(current_state, your_seat, (p_intent->>'cell')::int);
  elsif game = 'punti-quadrati' then
    applied := public.apply_dots(current_state, your_seat, p_intent->>'edge');
  elsif game = 'tre-pile' then
    if coalesce(p_intent->>'pile', '') !~ '^[0-2]$' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_move', 'detail', 'invalid-pile');
    end if;
    if coalesce(p_intent->>'take', '') !~ '^[1-3]$' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_move', 'detail', 'invalid-take');
    end if;
    applied := public.apply_nim(
      current_state,
      your_seat,
      (p_intent->>'pile')::int,
      (p_intent->>'take')::int
    );
  elsif game = 'dama' then
    if coalesce(p_intent->>'from', '') !~ '^(?:[0-9]|[1-5][0-9]|6[0-3])$'
      or coalesce(p_intent->>'to', '') !~ '^(?:[0-9]|[1-5][0-9]|6[0-3])$' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_move', 'detail', 'invalid-square');
    end if;
    applied := public.apply_dama(
      current_state,
      your_seat,
      (p_intent->>'from')::int,
      (p_intent->>'to')::int
    );
  else
    hand := p_intent->>'hand';
    applied := public.apply_rps(current_state, your_seat, hand);
  end if;

  if coalesce((applied->>'ok')::boolean, false) is not true then
    return jsonb_build_object(
      'ok', false,
      'reason', 'invalid_move',
      'detail', coalesce(applied->>'reason', 'invalid_move')
    );
  end if;

  update public.match_state
  set state = applied->'state'
  where match_id = p_match;

  update public.matches
  set status = applied->>'matchStatus',
      result = applied->>'result',
      winner_seat = applied->>'winnerSeat',
      deadline_at = case
        when (applied->>'refreshDeadline')::boolean and game = 'morra-cinese'
          then now() + interval '30 seconds'
        when (applied->>'refreshDeadline')::boolean
          then now() + interval '45 seconds'
        else deadline_at
      end,
      finished_at = case when applied->>'matchStatus' = 'finished' then now() else null end,
      move_window = window_start,
      moves_in_window = window_count + 1,
      version = version + 1
  where id = p_match;

  if applied->>'matchStatus' = 'finished' then
    update public.matches
    set deadline_at = null
    where id = p_match;
  end if;

  return public.match_payload(p_match);
end;
$$;

revoke all on function public.allowed_game(text) from public, anon, authenticated;
revoke all on function public.dama_owner(text) from public, anon, authenticated;
revoke all on function public.dama_jump_over(jsonb, int, int) from public, anon, authenticated;
revoke all on function public.dama_can_capture(jsonb, text, int) from public, anon, authenticated;
revoke all on function public.dama_can_move(jsonb, text) from public, anon, authenticated;
revoke all on function public.apply_dama(jsonb, text, int, int) from public, anon, authenticated;
