create extension if not exists "pgcrypto";

create type public.user_role as enum ('member', 'admin');
create type public.user_status as enum ('active', 'inactive');
create type public.mission_status as enum ('pending', 'available', 'locked');
create type public.check_status as enum ('completed', 'missed');

create table public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nickname text not null,
  instagram_id text not null,
  role public.user_role not null default 'member',
  status public.user_status not null default 'active',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  mission_date date not null unique,
  hashtag_date date not null,
  hashtag text not null,
  instagram_url text not null,
  status public.mission_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mission_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  mission_date date not null,
  status public.check_status not null default 'completed',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mission_checks_one_per_user unique (user_id, mission_id)
);

create index mission_checks_user_date_idx on public.mission_checks(user_id, mission_date);
create index mission_checks_mission_date_idx on public.mission_checks(mission_date);
create index missions_date_idx on public.missions(mission_date);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_users_profile_updated_at
before update on public.users_profile
for each row execute function public.touch_updated_at();

create trigger touch_missions_updated_at
before update on public.missions
for each row execute function public.touch_updated_at();

create trigger touch_mission_checks_updated_at
before update on public.mission_checks
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users_profile
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create view public.public_member_profiles
as
select id, nickname, instagram_id, joined_at, status
from public.users_profile
where status = 'active';

alter table public.users_profile enable row level security;
alter table public.missions enable row level security;
alter table public.mission_checks enable row level security;

create policy "profile_select_own_or_admin"
on public.users_profile
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profile_insert_own"
on public.users_profile
for insert
to authenticated
with check (id = auth.uid() and role = 'member');

create policy "profile_update_own_or_admin"
on public.users_profile
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "missions_select_authenticated"
on public.missions
for select
to authenticated
using (true);

create policy "missions_upsert_authenticated"
on public.missions
for insert
to authenticated
with check (true);

create policy "missions_update_admin"
on public.missions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "checks_select_authenticated"
on public.mission_checks
for select
to authenticated
using (true);

create policy "checks_insert_own_same_day"
on public.mission_checks
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'completed'
  and mission_date = current_date
);

create policy "checks_update_admin"
on public.mission_checks
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.public_member_profiles to authenticated;
grant select, insert, update on public.users_profile to authenticated;
grant select, insert, update on public.missions to authenticated;
grant select, insert, update on public.mission_checks to authenticated;
