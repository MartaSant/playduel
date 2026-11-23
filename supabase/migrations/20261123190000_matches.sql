-- Matches and the public queue. The browser sends a move, never a board.
-- Pairing takes one lock per game so two searches cannot create two matches.

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  game_slug text not null,
  room_id uuid references public.rooms (id) on delete cascade,
  status text not null default 'playing',
  result text not null default 'playing',
  version integer not null default 0,
  winner_seat text,
  successor_id uuid,
  deadline_at timestamptz,
  move_window timestamptz not null default now(),
  moves_in_window integer not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint matches_game_slug check (
    game_slug in ('tris', 'forza-4', 'morra-cinese')
  ),
  constraint matches_status check (status in ('playing', 'finished')),
  constraint matches_result check (
    result in ('playing', 'won', 'draw', 'timeout', 'abandoned')
  )
);

create unique index matches_one_playing_room
  on public.matches (room_id)
  where status = 'playing' and room_id is not null;

create table public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  seat text not null,
  seat_order smallint not null,
  primary key (match_id, player_id)
);

create table public.match_state (
  match_id uuid primary key references public.matches (id) on delete cascade,
  state jsonb not null
);

create table public.rematch_requests (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  primary key (match_id, player_id)
);

create table public.queue_entries (
  player_id uuid primary key references public.players (id) on delete cascade,
  game_slug text not null,
  created_at timestamptz not null default now(),
  constraint queue_game_slug check (
    game_slug in ('tris', 'forza-4', 'morra-cinese')
  )
);

create function public.opposite_seat(seat text)
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
    when 'A' then 'B'
    else 'A'
  end;
$$;

create function public.initial_match_state(p_game text)
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

create function public.rps_winner(left_hand text, right_hand text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when left_hand = right_hand then 'draw'
    when (left_hand = 'rock' and right_hand = 'scissors')
      or (left_hand = 'scissors' and right_hand = 'paper')
      or (left_hand = 'paper' and right_hand = 'rock') then 'A'
    else 'B'
  end;
$$;

create function public.rps_after_round(state jsonb, hands jsonb, forced text)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  round_winner text := coalesce(forced, public.rps_winner(hands->>'A', hands->>'B'));
  score_a integer := (state->'scores'->>'A')::integer + case when round_winner = 'A' then 1 else 0 end;
  score_b integer := (state->'scores'->>'B')::integer + case when round_winner = 'B' then 1 else 0 end;
  played integer := (state->>'roundsPlayed')::integer + 1;
  next_state jsonb;
begin
  next_state := jsonb_build_object(
    'scores', jsonb_build_object('A', score_a, 'B', score_b),
    'roundsPlayed', played,
    'choices', jsonb_build_object('A', null, 'B', null),
    'lastRound', jsonb_build_object('hands', hands, 'winner', round_winner),
    'winner', null,
    'status', 'choosing'
  );
  if score_a >= 2 or score_b >= 2 or played >= 3 then
    if score_a = score_b then
      return next_state || jsonb_build_object('status', 'draw', 'winner', null);
    end if;
    return next_state || jsonb_build_object(
      'status', 'won',
      'winner', case when score_a > score_b then 'A' else 'B' end
    );
  end if;
  return next_state;
end;
$$;

create function public.apply_tris(state jsonb, seat text, cell integer)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  board jsonb := state->'board';
  line jsonb;
begin
  if state->>'status' <> 'playing' then
    return jsonb_build_object('ok', false, 'reason', 'finished');
  end if;
  if seat <> state->>'turn' then
    return jsonb_build_object('ok', false, 'reason', 'out-of-turn');
  end if;
  if cell is null or cell < 0 or cell > 8 then
    return jsonb_build_object('ok', false, 'reason', 'invalid-cell');
  end if;
  if board->>cell is not null then
    return jsonb_build_object('ok', false, 'reason', 'occupied');
  end if;

  board := jsonb_set(board, array[cell::text], to_jsonb(seat), false);
  line := case
    when board->>0 = seat and board->>1 = seat and board->>2 = seat then '[0,1,2]'::jsonb
    when board->>3 = seat and board->>4 = seat and board->>5 = seat then '[3,4,5]'::jsonb
    when board->>6 = seat and board->>7 = seat and board->>8 = seat then '[6,7,8]'::jsonb
    when board->>0 = seat and board->>3 = seat and board->>6 = seat then '[0,3,6]'::jsonb
    when board->>1 = seat and board->>4 = seat and board->>7 = seat then '[1,4,7]'::jsonb
    when board->>2 = seat and board->>5 = seat and board->>8 = seat then '[2,5,8]'::jsonb
    when board->>0 = seat and board->>4 = seat and board->>8 = seat then '[0,4,8]'::jsonb
    when board->>2 = seat and board->>4 = seat and board->>6 = seat then '[2,4,6]'::jsonb
    else null
  end;

  if line is not null then
    return jsonb_build_object(
      'ok', true,
      'state', jsonb_build_object(
        'board', board, 'turn', seat, 'status', 'won', 'winner', seat, 'winningLine', line
      ),
      'matchStatus', 'finished',
      'result', 'won',
      'winnerSeat', seat,
      'refreshDeadline', false
    );
  end if;

  if board->>0 is not null and board->>1 is not null and board->>2 is not null
    and board->>3 is not null and board->>4 is not null and board->>5 is not null
    and board->>6 is not null and board->>7 is not null and board->>8 is not null then
    return jsonb_build_object(
      'ok', true,
      'state', jsonb_build_object(
        'board', board, 'turn', seat, 'status', 'draw', 'winner', null, 'winningLine', null
      ),
      'matchStatus', 'finished',
      'result', 'draw',
      'winnerSeat', null,
      'refreshDeadline', false
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'state', jsonb_build_object(
      'board', board,
      'turn', public.opposite_seat(seat),
      'status', 'playing',
      'winner', null,
      'winningLine', null
    ),
    'matchStatus', 'playing',
    'result', 'playing',
    'winnerSeat', null,
    'refreshDeadline', true
  );
end;
$$;

create function public.apply_connect_four(state jsonb, seat text, target_column integer)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  columns jsonb := state->'columns';
  row_index integer := null;
  point_column integer;
  point_row integer;
  step integer;
  chain jsonb;
  direction integer;
  dx integer;
  dy integer;
  full_board boolean := true;
begin
  if state->>'status' <> 'playing' then
    return jsonb_build_object('ok', false, 'reason', 'finished');
  end if;
  if seat <> state->>'turn' then
    return jsonb_build_object('ok', false, 'reason', 'out-of-turn');
  end if;
  if target_column is null or target_column < 0 or target_column > 6 then
    return jsonb_build_object('ok', false, 'reason', 'invalid-column');
  end if;

  for row_index in 0..5 loop
    exit when columns->target_column->>row_index is null;
  end loop;
  if row_index is null or columns->target_column->>row_index is not null then
    return jsonb_build_object('ok', false, 'reason', 'column-full');
  end if;

  columns := jsonb_set(
    columns,
    array[target_column::text, row_index::text],
    to_jsonb(seat),
    false
  );

  for direction in 1..4 loop
    dx := case direction when 1 then 1 when 2 then 0 when 3 then 1 else 1 end;
    dy := case direction when 1 then 0 when 2 then 1 when 3 then 1 else -1 end;
    chain := jsonb_build_array(jsonb_build_object('column', target_column, 'row', row_index));
    for step in 1..3 loop
      point_column := target_column + (dx * step);
      point_row := row_index + (dy * step);
      exit when point_column < 0 or point_column > 6 or point_row < 0 or point_row > 5;
      exit when columns->point_column->>point_row is distinct from seat;
      chain := chain || jsonb_build_array(jsonb_build_object('column', point_column, 'row', point_row));
    end loop;
    for step in 1..3 loop
      point_column := target_column - (dx * step);
      point_row := row_index - (dy * step);
      exit when point_column < 0 or point_column > 6 or point_row < 0 or point_row > 5;
      exit when columns->point_column->>point_row is distinct from seat;
      chain := chain || jsonb_build_array(jsonb_build_object('column', point_column, 'row', point_row));
    end loop;
    if jsonb_array_length(chain) >= 4 then
      return jsonb_build_object(
        'ok', true,
        'state', jsonb_build_object(
          'columns', columns, 'turn', seat, 'status', 'won', 'winner', seat, 'winningCells', chain
        ),
        'matchStatus', 'finished',
        'result', 'won',
        'winnerSeat', seat,
        'refreshDeadline', false
      );
    end if;
  end loop;

  for point_column in 0..6 loop
    if columns->point_column->>5 is null then
      full_board := false;
    end if;
  end loop;
  if full_board then
    return jsonb_build_object(
      'ok', true,
      'state', jsonb_build_object(
        'columns', columns, 'turn', seat, 'status', 'draw', 'winner', null, 'winningCells', null
      ),
      'matchStatus', 'finished',
      'result', 'draw',
      'winnerSeat', null,
      'refreshDeadline', false
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'state', jsonb_build_object(
      'columns', columns,
      'turn', public.opposite_seat(seat),
      'status', 'playing',
      'winner', null,
      'winningCells', null
    ),
    'matchStatus', 'playing',
    'result', 'playing',
    'winnerSeat', null,
    'refreshDeadline', true
  );
end;
$$;

create function public.apply_rps(state jsonb, seat text, hand text)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  choices jsonb := state->'choices';
  other text := public.opposite_seat(seat);
  hands jsonb;
  next_state jsonb;
begin
  if state->>'status' in ('won', 'draw') then
    return jsonb_build_object('ok', false, 'reason', 'finished');
  end if;
  if state->>'status' <> 'choosing' then
    return jsonb_build_object('ok', false, 'reason', 'not-choosing');
  end if;
  if hand not in ('rock', 'paper', 'scissors') then
    return jsonb_build_object('ok', false, 'reason', 'invalid-hand');
  end if;
  if choices->>seat is not null then
    return jsonb_build_object('ok', false, 'reason', 'already-chosen');
  end if;

  choices := jsonb_set(choices, array[seat], to_jsonb(hand), false);
  if choices->>other is null then
    return jsonb_build_object(
      'ok', true,
      'state', state || jsonb_build_object('choices', choices),
      'matchStatus', 'playing',
      'result', 'playing',
      'winnerSeat', null,
      'refreshDeadline', false
    );
  end if;

  hands := jsonb_build_object('A', choices->>'A', 'B', choices->>'B');
  next_state := public.rps_after_round(state, hands, null);
  return jsonb_build_object(
    'ok', true,
    'state', next_state,
    'matchStatus', case when next_state->>'status' = 'choosing' then 'playing' else 'finished' end,
    'result', case
      when next_state->>'status' = 'won' then 'won'
      when next_state->>'status' = 'draw' then 'draw'
      else 'playing'
    end,
    'winnerSeat', next_state->>'winner',
    'refreshDeadline', next_state->>'status' = 'choosing'
  );
end;
$$;

create function public.create_match(
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
  first_seat := case p_game when 'tris' then 'X' when 'forza-4' then 'red' else 'A' end;
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

create function public.finish_abandoned(p_match uuid, p_leaver uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  winner text;
begin
  select seat into winner
  from public.match_players
  where match_id = p_match
    and player_id <> p_leaver;

  if winner is null then
    return;
  end if;

  update public.match_state
  set state = state || jsonb_build_object('status', 'won', 'winner', winner)
  where match_id = p_match;

  update public.matches
  set status = 'finished',
      result = 'abandoned',
      winner_seat = winner,
      deadline_at = null,
      finished_at = now(),
      version = version + 1
  where id = p_match
    and status = 'playing';
end;
$$;

create function public.settle_match(p_match uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  game text;
  current_status text;
  deadline timestamptz;
  current_state jsonb;
  turn_seat text;
  hand_a text;
  hand_b text;
  next_state jsonb;
  forced text;
begin
  select game_slug, status, deadline_at
  into game, current_status, deadline
  from public.matches
  where id = p_match
  for update;

  if current_status is distinct from 'playing' or deadline is null or deadline > now() then
    return;
  end if;

  select state into current_state
  from public.match_state
  where match_id = p_match
  for update;

  if game = 'morra-cinese' then
    if current_state->>'status' <> 'choosing' then
      return;
    end if;
    hand_a := current_state->'choices'->>'A';
    hand_b := current_state->'choices'->>'B';
    if hand_a is null and hand_b is null then
      update public.matches
      set deadline_at = now() + interval '30 seconds',
          version = version + 1
      where id = p_match;
      return;
    end if;
    forced := case when hand_a is not null then 'A' else 'B' end;
    next_state := public.rps_after_round(
      current_state,
      jsonb_build_object('A', hand_a, 'B', hand_b),
      forced
    );
    update public.match_state set state = next_state where match_id = p_match;
    update public.matches
    set status = case when next_state->>'status' = 'choosing' then 'playing' else 'finished' end,
        result = case
          when next_state->>'status' = 'won' then 'timeout'
          when next_state->>'status' = 'draw' then 'draw'
          else 'playing'
        end,
        winner_seat = next_state->>'winner',
        deadline_at = case
          when next_state->>'status' = 'choosing' then now() + interval '30 seconds'
          else null
        end,
        finished_at = case when next_state->>'status' = 'choosing' then null else now() end,
        version = version + 1
    where id = p_match;
    return;
  end if;

  turn_seat := current_state->>'turn';
  update public.match_state
  set state = current_state || jsonb_build_object(
    'status', 'won',
    'winner', public.opposite_seat(turn_seat)
  )
  where match_id = p_match;

  update public.matches
  set status = 'finished',
      result = 'timeout',
      winner_seat = public.opposite_seat(turn_seat),
      deadline_at = null,
      finished_at = now(),
      version = version + 1
  where id = p_match;
end;
$$;

create function public.match_payload(p_match uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  your_seat text;
  other_seat text;
  snapshot jsonb;
  hidden jsonb;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  perform public.settle_match(p_match);

  select seat into your_seat
  from public.match_players
  where match_id = p_match
    and player_id = uid;

  if your_seat is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select seat into other_seat
  from public.match_players
  where match_id = p_match
    and player_id <> uid;

  select state into hidden
  from public.match_state
  where match_id = p_match;

  if hidden->>'status' = 'choosing' and other_seat is not null then
    hidden := jsonb_set(hidden, array['choices', other_seat], 'null'::jsonb, true);
  end if;

  select jsonb_build_object(
    'ok', true,
    'matchId', matches.id,
    'gameSlug', matches.game_slug,
    'status', matches.status,
    'result', matches.result,
    'version', matches.version,
    'deadlineAt', matches.deadline_at,
    'yourSeat', your_seat,
    'winnerSeat', matches.winner_seat,
    'successorId', matches.successor_id,
    'roomCode', rooms.code,
    'youRequested', exists (
      select 1 from public.rematch_requests
      where match_id = matches.id and player_id = uid
    ),
    'opponentRequested', exists (
      select 1 from public.rematch_requests
      where match_id = matches.id and player_id <> uid
    ),
    'players', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'nickname', players.nickname,
          'seat', match_players.seat,
          'isYou', match_players.player_id = uid
        )
        order by match_players.seat_order
      )
      from public.match_players
      join public.players on players.id = match_players.player_id
      where match_players.match_id = matches.id
    ), '[]'::jsonb),
    'state', hidden
  )
  into snapshot
  from public.matches
  left join public.rooms on rooms.id = matches.room_id
  where matches.id = p_match;

  if snapshot is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  return snapshot;
end;
$$;

create function public.active_match_id(p_player uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select matches.id
  from public.matches
  join public.match_players on match_players.match_id = matches.id
  where match_players.player_id = p_player
    and matches.status = 'playing'
  order by matches.created_at desc
  limit 1;
$$;

create function public.queue_state(p_game_slug text)
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
  if p_game_slug not in ('tris', 'forza-4', 'morra-cinese') then
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

create function public.enqueue(p_game_slug text)
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
  if p_game_slug not in ('tris', 'forza-4', 'morra-cinese') then
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

create function public.cancel_queue(p_game_slug text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  delete from public.queue_entries
  where player_id = uid
    and game_slug = p_game_slug;
  return jsonb_build_object('ok', true, 'access', 'idle', 'gameSlug', p_game_slug);
end;
$$;

create function public.ensure_room_match(p_code text)
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
  host_id uuid;
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

  select id, game_slug, status, host_id
  into found_room, found_game, found_status, host_id
  from public.rooms
  where code = p_code
  for update;

  if found_room is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if not public.is_room_member(found_room) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(found_room::text, 0));

  select id into existing
  from public.matches
  where room_id = found_room
    and status = 'playing'
  limit 1;
  if existing is not null then
    return public.match_payload(existing);
  end if;

  select id into existing
  from public.matches
  where room_id = found_room
  order by created_at desc
  limit 1;

  if found_status = 'full' and existing is null then
    select player_id into guest_id
    from public.room_players
    where room_id = found_room
      and player_id <> host_id
      and left_at is null
    limit 1;
    if guest_id is null then
      return jsonb_build_object('ok', false, 'reason', 'not_ready');
    end if;
    begin
      created := public.create_match(found_game, found_room, host_id, guest_id);
    exception
      when unique_violation then
        select id into created
        from public.matches
        where room_id = found_room
          and status = 'playing'
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

create function public.match_state(p_match uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.matches where id = p_match) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  return public.match_payload(p_match);
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
  uid uuid := auth.uid();
  game text;
  current_status text;
  window_start timestamptz;
  window_count integer;
  your_seat text;
  current_state jsonb;
  applied jsonb;
  cell integer;
  target_column integer;
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
    cell := (p_intent->>'cell')::integer;
    applied := public.apply_tris(current_state, your_seat, cell);
  elsif game = 'forza-4' then
    if coalesce(p_intent->>'column', '') !~ '^[0-6]$' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_move', 'detail', 'invalid-column');
    end if;
    target_column := (p_intent->>'column')::integer;
    applied := public.apply_connect_four(current_state, your_seat, target_column);
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

create function public.abandon_match(p_match uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
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

  perform 1 from public.matches where id = p_match for update;
  perform public.finish_abandoned(p_match, uid);
  return public.match_payload(p_match);
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
  uid uuid := auth.uid();
  game text;
  room uuid;
  current_status text;
  successor uuid;
  first_player uuid;
  second_player uuid;
  created uuid;
  requests integer;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  select game_slug, room_id, status, successor_id
  into game, room, current_status, successor
  from public.matches
  where id = p_match
  for update;

  if game is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if not exists (
    select 1 from public.match_players
    where match_id = p_match and player_id = uid
  ) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if successor is not null then
    return public.match_payload(successor);
  end if;
  if current_status <> 'finished' then
    return jsonb_build_object('ok', false, 'reason', 'not_ready');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_match::text, 1));

  insert into public.rematch_requests (match_id, player_id)
  values (p_match, uid)
  on conflict do nothing;

  select count(*) into requests
  from public.rematch_requests
  where match_id = p_match;

  if requests < 2 then
    return public.match_payload(p_match);
  end if;

  select player_id into first_player
  from public.match_players
  where match_id = p_match
  order by seat_order
  limit 1;
  select player_id into second_player
  from public.match_players
  where match_id = p_match
  order by seat_order desc
  limit 1;

  created := public.create_match(game, room, first_player, second_player);
  update public.matches set successor_id = created where id = p_match;
  delete from public.rematch_requests where match_id = p_match;
  return public.match_payload(created);
end;
$$;

create or replace function public.leave_room(p_code text)
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
  open_match uuid;
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

  select matches.id into open_match
  from public.matches
  join public.match_players on match_players.match_id = matches.id
  where matches.room_id = found_id
    and matches.status = 'playing'
    and match_players.player_id = uid
  limit 1;
  if open_match is not null then
    perform public.finish_abandoned(open_match, uid);
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

revoke all on table public.matches from public, anon, authenticated;
revoke all on table public.match_players from public, anon, authenticated;
revoke all on table public.match_state from public, anon, authenticated;
revoke all on table public.rematch_requests from public, anon, authenticated;
revoke all on table public.queue_entries from public, anon, authenticated;

grant select on table public.matches to authenticated;
grant select on table public.match_players to authenticated;
grant select on table public.queue_entries to authenticated;

alter table public.matches enable row level security;
alter table public.matches force row level security;
alter table public.match_players enable row level security;
alter table public.match_players force row level security;
alter table public.match_state enable row level security;
alter table public.match_state force row level security;
alter table public.rematch_requests enable row level security;
alter table public.rematch_requests force row level security;
alter table public.queue_entries enable row level security;
alter table public.queue_entries force row level security;

create function public.is_match_player(target_match uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.match_players
    where match_id = target_match
      and player_id = (select auth.uid())
  );
$$;

create policy matches_select_player
  on public.matches
  for select
  to authenticated
  using (public.is_match_player(id));

create policy match_players_select_player
  on public.match_players
  for select
  to authenticated
  using (public.is_match_player(match_id));

create policy queue_select_self
  on public.queue_entries
  for select
  to authenticated
  using (player_id = (select auth.uid()));

revoke all on function public.opposite_seat(text) from public, anon, authenticated;
revoke all on function public.initial_match_state(text) from public, anon, authenticated;
revoke all on function public.rps_winner(text, text) from public, anon, authenticated;
revoke all on function public.rps_after_round(jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.apply_tris(jsonb, text, integer) from public, anon, authenticated;
revoke all on function public.apply_connect_four(jsonb, text, integer) from public, anon, authenticated;
revoke all on function public.apply_rps(jsonb, text, text) from public, anon, authenticated;
revoke all on function public.create_match(text, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_abandoned(uuid, uuid) from public, anon, authenticated;
revoke all on function public.settle_match(uuid) from public, anon, authenticated;
revoke all on function public.match_payload(uuid) from public, anon, authenticated;
revoke all on function public.active_match_id(uuid) from public, anon, authenticated;
revoke all on function public.is_match_player(uuid) from public, anon, authenticated;
grant execute on function public.is_match_player(uuid) to authenticated;
revoke all on function public.queue_state(text) from public;
revoke all on function public.enqueue(text) from public;
revoke all on function public.cancel_queue(text) from public;
revoke all on function public.ensure_room_match(text) from public;
revoke all on function public.match_state(uuid) from public;
revoke all on function public.play_move(uuid, jsonb) from public;
revoke all on function public.abandon_match(uuid) from public;
revoke all on function public.request_rematch(uuid) from public;

grant execute on function public.queue_state(text) to authenticated;
grant execute on function public.enqueue(text) to authenticated;
grant execute on function public.cancel_queue(text) to authenticated;
grant execute on function public.ensure_room_match(text) to authenticated;
grant execute on function public.match_state(uuid) to authenticated;
grant execute on function public.play_move(uuid, jsonb) to authenticated;
grant execute on function public.abandon_match(uuid) to authenticated;
grant execute on function public.request_rematch(uuid) to authenticated;

alter table public.matches replica identity full;
alter table public.match_players replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'matches'
    ) then
      alter publication supabase_realtime add table public.matches;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'match_players'
    ) then
      alter publication supabase_realtime add table public.match_players;
    end if;
  end if;
end;
$$;
