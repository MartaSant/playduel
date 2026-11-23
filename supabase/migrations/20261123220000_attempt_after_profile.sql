-- The applied hardening counted an attempt before checking the nickname.
-- A session without a player then failed on the foreign key. Check the profile first.

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
