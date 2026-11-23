create or replace function public.apply_connect_four(state jsonb, seat text, target_column int)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  columns jsonb := state->'columns';
  found_row int := null;
  scan int;
  point_column int;
  point_row int;
  step int;
  chain jsonb;
  direction int;
  dx int;
  dy int;
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

  for scan in 0..5 loop
    if columns->target_column->>scan is null then
      found_row := scan;
      exit;
    end if;
  end loop;
  if found_row is null then
    return jsonb_build_object('ok', false, 'reason', 'column-full');
  end if;

  columns := jsonb_set(
    columns,
    array[target_column::text, found_row::text],
    to_jsonb(seat),
    false
  );

  for direction in 1..4 loop
    dx := case direction when 1 then 1 when 2 then 0 when 3 then 1 else 1 end;
    dy := case direction when 1 then 0 when 2 then 1 when 3 then 1 else -1 end;
    chain := jsonb_build_array(jsonb_build_object('column', target_column, 'row', found_row));
    for step in 1..3 loop
      point_column := target_column + (dx * step);
      point_row := found_row + (dy * step);
      exit when point_column < 0 or point_column > 6 or point_row < 0 or point_row > 5;
      exit when columns->point_column->>point_row is distinct from seat;
      chain := chain || jsonb_build_array(jsonb_build_object('column', point_column, 'row', point_row));
    end loop;
    for step in 1..3 loop
      point_column := target_column - (dx * step);
      point_row := found_row - (dy * step);
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

create or replace function public.settle_match(p_match uuid)
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
  next_state := current_state || jsonb_build_object(
    'turn', public.opposite_seat(turn_seat),
    'status', 'playing',
    'winner', null
  );
  if current_state ? 'mustFrom' then
    next_state := next_state || jsonb_build_object('mustFrom', null);
  end if;

  update public.match_state
  set state = next_state
  where match_id = p_match;

  update public.matches
  set deadline_at = now() + interval '45 seconds',
      version = version + 1
  where id = p_match;
end;
$$;

revoke all on function public.apply_connect_four(jsonb, text, int) from public, anon, authenticated;
revoke all on function public.settle_match(uuid) from public, anon, authenticated;
