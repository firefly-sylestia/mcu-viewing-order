-- MCU Viewing Order — Supabase database setup
-- Run the whole file once in Supabase Dashboard → SQL Editor → New query.
-- Safe to re-run: policies, trigger and table are created idempotently.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_data_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_data_set_updated_at on public.user_data;
create trigger user_data_set_updated_at
before update on public.user_data
for each row execute function public.set_user_data_updated_at();

alter table public.user_data enable row level security;

drop policy if exists "Users can read their own viewing data" on public.user_data;
create policy "Users can read their own viewing data"
on public.user_data for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own viewing data" on public.user_data;
create policy "Users can create their own viewing data"
on public.user_data for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own viewing data" on public.user_data;
create policy "Users can update their own viewing data"
on public.user_data for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on public.user_data to authenticated;
revoke all on public.user_data from anon;
