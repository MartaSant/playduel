-- Three more two-player games: Reversi, Punti e quadrati, Le tre pile.
-- The public wrappers stay in place. These replacements update the unchecked bodies and the shared checks.

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
    'tre-pile'
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

create or replace function public.opposite_seat(seat text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case seat
    when 'X' then 'O'
    when 'O' then 'X'
    when 'red' then 'yellow'
    when 'yellow' then 'red'
    when 'black' then 'white'
    when 'white' then 'black'
    when 'A' then 'B'
    else 'A'
  end;
$$;

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

create or replace function public.reversi_flips(board jsonb, seat text, cell int)
returns int[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  opponent text := case seat when 'black' then 'white' else 'black' end;
  row_index int := cell / 8;
  column_index int := cell % 8;
  delta_row int;
  delta_column int;
  next_row int;
  next_column int;
  line int[];
  found int[] := '{}';
begin
  if cell < 0 or cell > 63 or board->>cell is not null then
    return found;
  end if;
  for delta_row in -1..1 loop
    for delta_column in -1..1 loop
      if delta_row = 0 and delta_column = 0 then
        continue;
      end if;
      line := '{}';
      next_row := row_index + delta_row;
      next_column := column_index + delta_column;
      while next_row between 0 and 7
        and next_column between 0 and 7
        and board->>(next_row * 8 + next_column) = opponent
      loop
        line := line || array[next_row * 8 + next_column];
        next_row := next_row + delta_row;
        next_column := next_column + delta_column;
      end loop;
      if coalesce(cardinality(line), 0) > 0
        and next_row between 0 and 7
        and next_column between 0 and 7
        and board->>(next_row * 8 + next_column) = seat
      then
        found := found || line;
      end if;
    end loop;
  end loop;
  return found;
end;
$$;

create or replace function public.reversi_can_move(board jsonb, seat text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  cell int;
begin
  for cell in 0..63 loop
    if coalesce(cardinality(public.reversi_flips(board, seat, cell)), 0) > 0 then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

create or replace function public.apply_reversi(state jsonb, seat text, cell int)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  board jsonb := state->'board';
  flipped int;
  opponent text := case seat when 'black' then 'white' else 'black' end;
  next_turn text;
  black_count int;
  white_count int;
  winner text;
begin
  if state->>'status' <> 'playing' then
    return jsonb_build_object('ok', false, 'reason', 'finished');
  end if;
  if seat <> state->>'turn' then
    return jsonb_build_object('ok', false, 'reason', 'out-of-turn');
  end if;
  if cell is null or cell < 0 or cell > 63 then
    return jsonb_build_object('ok', false, 'reason', 'invalid-cell');
  end if;
  if coalesce(cardinality(public.reversi_flips(board, seat, cell)), 0) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'no-flip');
  end if;
  board := jsonb_set(board, array[cell::text], to_jsonb(seat), false);
  foreach flipped in array public.reversi_flips(state->'board', seat, cell) loop
    board := jsonb_set(board, array[flipped::text], to_jsonb(seat), false);
  end loop;
  if public.reversi_can_move(board, opponent) then
    next_turn := opponent;
  elsif public.reversi_can_move(board, seat) then
    next_turn := seat;
  else
    select
      count(*) filter (where value = 'black'),
      count(*) filter (where value = 'white')
    into black_count, white_count
    from jsonb_array_elements_text(board) as value;
    winner := case
      when black_count = white_count then null
      when black_count > white_count then 'black'
      else 'white'
    end;
    return jsonb_build_object(
      'ok', true,
      'state', jsonb_build_object(
        'board', board,
        'turn', opponent,
        'status', case when winner is null then 'draw' else 'won' end,
        'winner', winner
      ),
      'matchStatus', 'finished',
      'result', case when winner is null then 'draw' else 'won' end,
      'winnerSeat', winner,
      'refreshDeadline', false
    );
  end if;
  return jsonb_build_object(
    'ok', true,
    'state', jsonb_build_object('board', board, 'turn', next_turn, 'status', 'playing', 'winner', null),
    'matchStatus', 'playing',
    'result', 'playing',
    'winnerSeat', null,
    'refreshDeadline', true
  );
end;
$$;

create or replace function public.apply_dots(state jsonb, seat text, edge text)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  kind text;
  edge_index int;
  horizontal jsonb := state->'horizontal';
  vertical jsonb := state->'vertical';
  boxes jsonb := state->'boxes';
  box_index int;
  row_index int;
  column_index int;
  claimed int := 0;
  filled boolean;
  score_a int;
  score_b int;
  next_turn text;
begin
  if state->>'status' <> 'playing' then
    return jsonb_build_object('ok', false, 'reason', 'finished');
  end if;
  if seat <> state->>'turn' then
    return jsonb_build_object('ok', false, 'reason', 'out-of-turn');
  end if;
  if edge is null or edge !~ '^[hv](?:1[01]|[0-9])$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid-edge');
  end if;
  kind := left(edge, 1);
  edge_index := substr(edge, 2)::int;
  if kind = 'h' and horizontal->>edge_index = 'true' then
    return jsonb_build_object('ok', false, 'reason', 'edge-taken');
  end if;
  if kind = 'v' and vertical->>edge_index = 'true' then
    return jsonb_build_object('ok', false, 'reason', 'edge-taken');
  end if;
  if kind = 'h' then
    horizontal := jsonb_set(horizontal, array[edge_index::text], 'true'::jsonb, false);
  else
    vertical := jsonb_set(vertical, array[edge_index::text], 'true'::jsonb, false);
  end if;
  for box_index in 0..8 loop
    if boxes->>box_index is not null then
      continue;
    end if;
    row_index := box_index / 3;
    column_index := box_index % 3;
    if horizontal->>(row_index * 3 + column_index) = 'true'
      and horizontal->>((row_index + 1) * 3 + column_index) = 'true'
      and vertical->>(row_index * 4 + column_index) = 'true'
      and vertical->>(row_index * 4 + column_index + 1) = 'true'
    then
      boxes := jsonb_set(boxes, array[box_index::text], to_jsonb(seat), false);
      claimed := claimed + 1;
    end if;
  end loop;
  filled := true;
  for edge_index in 0..11 loop
    if horizontal->>edge_index <> 'true' or vertical->>edge_index <> 'true' then
      filled := false;
    end if;
  end loop;
  if filled then
    select
      count(*) filter (where value = 'A'),
      count(*) filter (where value = 'B')
    into score_a, score_b
    from jsonb_array_elements_text(boxes) as value;
    return jsonb_build_object(
      'ok', true,
      'state', jsonb_build_object(
        'horizontal', horizontal,
        'vertical', vertical,
        'boxes', boxes,
        'turn', seat,
        'status', 'won',
        'winner', case when score_a >= score_b then 'A' else 'B' end
      ),
      'matchStatus', 'finished',
      'result', 'won',
      'winnerSeat', case when score_a >= score_b then 'A' else 'B' end,
      'refreshDeadline', false
    );
  end if;
  next_turn := case
    when claimed > 0 then seat
    when seat = 'A' then 'B'
    else 'A'
  end;
  return jsonb_build_object(
    'ok', true,
    'state', jsonb_build_object(
      'horizontal', horizontal,
      'vertical', vertical,
      'boxes', boxes,
      'turn', next_turn,
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

create or replace function public.apply_nim(state jsonb, seat text, pile int, take int)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  piles jsonb := state->'piles';
  size int;
  remaining int := 0;
  index int;
begin
  if state->>'status' <> 'playing' then
    return jsonb_build_object('ok', false, 'reason', 'finished');
  end if;
  if seat <> state->>'turn' then
    return jsonb_build_object('ok', false, 'reason', 'out-of-turn');
  end if;
  if pile is null or pile < 0 or pile > 2 then
    return jsonb_build_object('ok', false, 'reason', 'invalid-pile');
  end if;
  size := (piles->>pile)::int;
  if take is null or take < 1 or take > 3 or take > size then
    return jsonb_build_object('ok', false, 'reason', 'invalid-take');
  end if;
  piles := jsonb_set(piles, array[pile::text], to_jsonb(size - take), false);
  for index in 0..2 loop
    remaining := remaining + (piles->>index)::int;
  end loop;
  if remaining = 0 then
    return jsonb_build_object(
      'ok', true,
      'state', jsonb_build_object('piles', piles, 'turn', seat, 'status', 'won', 'winner', seat),
      'matchStatus', 'finished',
      'result', 'won',
      'winnerSeat', seat,
      'refreshDeadline', false
    );
  end if;
  return jsonb_build_object(
    'ok', true,
    'state', jsonb_build_object(
      'piles', piles,
      'turn', public.opposite_seat(seat),
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
revoke all on function public.reversi_flips(jsonb, text, int) from public, anon, authenticated;
revoke all on function public.reversi_can_move(jsonb, text) from public, anon, authenticated;
revoke all on function public.apply_reversi(jsonb, text, int) from public, anon, authenticated;
revoke all on function public.apply_dots(jsonb, text, text) from public, anon, authenticated;
revoke all on function public.apply_nim(jsonb, text, int, int) from public, anon, authenticated;
