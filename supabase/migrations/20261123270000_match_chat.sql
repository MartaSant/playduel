-- Chat between the two players of a match. The table is not readable
-- from the API. Both sides go through these functions.

create table public.match_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint match_messages_body check (char_length(body) between 1 and 200)
);

create index match_messages_match_idx
  on public.match_messages (match_id, created_at);

revoke all on table public.match_messages from public, anon, authenticated;
alter table public.match_messages enable row level security;
alter table public.match_messages force row level security;

create or replace function public.list_match_messages(p_match uuid)
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
  if not exists (select 1 from public.players where id = uid) then
    return jsonb_build_object('ok', false, 'reason', 'profile_required');
  end if;
  if not exists (select 1 from public.matches where id = p_match) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if not public.is_match_player(p_match) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  return jsonb_build_object(
    'ok', true,
    'messages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', recent.id,
          'body', recent.body,
          'nickname', players.nickname,
          'isYou', recent.player_id = uid
        )
        order by recent.created_at
      )
      from (
        select id, body, player_id, created_at
        from public.match_messages
        where match_id = p_match
        order by created_at desc
        limit 40
      ) as recent
      join public.players on players.id = recent.player_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.send_match_message(p_match uuid, p_body text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  blocked jsonb := public.banned_result();
  body text := regexp_replace(trim(coalesce(p_body, '')), '[[:space:]]+', ' ', 'g');
  recent int;
begin
  if blocked is not null then
    return blocked;
  end if;
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if not exists (select 1 from public.players where id = uid) then
    return jsonb_build_object('ok', false, 'reason', 'profile_required');
  end if;
  if not exists (select 1 from public.matches where id = p_match) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if not public.is_match_player(p_match) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if body = '' or char_length(body) > 200 or body ~ '[[:cntrl:]]' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_message');
  end if;

  select count(*) into recent
  from public.match_messages
  where player_id = uid
    and created_at > now() - interval '1 minute';
  if recent >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  insert into public.match_messages (match_id, player_id, body)
  values (p_match, uid, body);

  return public.list_match_messages(p_match);
end;
$$;

revoke all on function public.list_match_messages(uuid) from public, anon, authenticated;
revoke all on function public.send_match_message(uuid, text) from public, anon, authenticated;
grant execute on function public.list_match_messages(uuid) to authenticated;
grant execute on function public.send_match_message(uuid, text) to authenticated;
