-- Temporary player profile for an anonymous Supabase Auth user.
-- Nickname history is not stored: a change overwrites the same row.
-- The service role is not granted here and must not be used in the browser.

create table public.players (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_nickname_length check (char_length(nickname) between 3 and 20),
  constraint players_nickname_chars check (
    nickname ~ '^[A-Za-zÀ-ÖØ-öø-ÿ0-9]+( [A-Za-zÀ-ÖØ-öø-ÿ0-9]+)*$'
  )
);

create function public.set_players_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger players_set_updated_at
  before update on public.players
  for each row
  execute function public.set_players_updated_at();

revoke all on table public.players from public, anon, authenticated;
revoke all on function public.set_players_updated_at() from public, anon, authenticated;
grant select, insert, update on table public.players to authenticated;

alter table public.players enable row level security;
alter table public.players force row level security;

create policy players_select_own
  on public.players
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy players_insert_own
  on public.players
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy players_update_own
  on public.players
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
