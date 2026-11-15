-- MCU Viewing Order — MASTER SUPABASE SETUP
-- This is the ONE canonical SQL setup file for this repository.
-- Safe to re-run: creates missing objects and updates functions/policies.
-- It does NOT drop tables, truncate tables, or delete existing user/room data.
-- Read supabase/SETUP.md before running this in the Supabase SQL Editor.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Account viewing data (existing application sync)
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- 2. Watch Together: rooms, guests, participants, chat and playback sync
-- ---------------------------------------------------------------------------

create table if not exists public.watch_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  host_participant_id uuid,
  media jsonb not null default '{}'::jsonb,
  playback jsonb not null default '{"position":0,"paused":true,"season":1,"episode":1}'::jsonb,
  state_version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '8 hours',
  closed_at timestamptz,
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_token_hash text
);

alter table public.watch_rooms add column if not exists owner_user_id uuid references auth.users(id) on delete set null;
alter table public.watch_rooms add column if not exists owner_token_hash text;

create table if not exists public.watch_room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  token_hash text not null,
  display_name text not null check (char_length(display_name) between 1 and 32),
  avatar_url text not null default '',
  is_host boolean not null default false,
  role text not null default 'viewer' check (role in ('host','operator','viewer')),
  user_id uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(room_id, token_hash)
);

do $watch_room_host_fk$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'watch_rooms_host_participant_id_fkey'
      and conrelid = 'public.watch_rooms'::regclass
  ) then
    alter table public.watch_rooms
      add constraint watch_rooms_host_participant_id_fkey
      foreign key (host_participant_id)
      references public.watch_room_participants(id)
      on delete set null;
  end if;
end
$watch_room_host_fk$;

alter table public.watch_room_participants add column if not exists role text not null default 'viewer';
alter table public.watch_room_participants add column if not exists user_id uuid references auth.users(id) on delete set null;
do $watch_role_constraint$ begin
  if not exists (select 1 from pg_constraint where conname='watch_room_participants_role_check' and conrelid='public.watch_room_participants'::regclass) then
    alter table public.watch_room_participants add constraint watch_room_participants_role_check check (role in ('host','operator','viewer'));
  end if;
end $watch_role_constraint$;
update public.watch_room_participants set role='host' where is_host and role <> 'host';

-- Preserve discoverability/deletion for rooms created before owner tracking existed.
update public.watch_rooms wr set owner_token_hash=wp.token_hash, owner_user_id=coalesce(wr.owner_user_id,wp.user_id)
from public.watch_room_participants wp
where wp.id=wr.host_participant_id and wr.owner_token_hash is null;


create table if not exists public.watch_room_requests (
  id bigserial primary key,
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  participant_id uuid not null references public.watch_room_participants(id) on delete cascade,
  request_type text not null check (request_type in ('operator','skip_forward','skip_back','seek')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.watch_together_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_code text not null,
  title text not null,
  media jsonb not null default '{}'::jsonb,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  started_at timestamptz not null default now(),
  last_watched_at timestamptz not null default now(),
  unique(user_id,room_code)
);

create table if not exists public.watch_room_messages (
  id bigserial primary key,
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  participant_id uuid not null references public.watch_room_participants(id) on delete cascade,
  display_name text not null,
  avatar_url text not null default '',
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists watch_rooms_expiry_idx on public.watch_rooms(expires_at);
create index if not exists watch_rooms_owner_idx on public.watch_rooms(owner_user_id, created_at desc);
create index if not exists watch_rooms_owner_token_idx on public.watch_rooms(owner_token_hash, created_at desc);
create index if not exists watch_room_participants_presence_idx on public.watch_room_participants(room_id, last_seen_at desc);
create index if not exists watch_room_messages_room_idx on public.watch_room_messages(room_id, id desc);
create index if not exists watch_together_history_user_idx on public.watch_together_history(user_id,last_watched_at desc);
create index if not exists watch_room_requests_room_idx on public.watch_room_requests(room_id, status, created_at desc);

alter table public.watch_rooms enable row level security;
alter table public.watch_room_participants enable row level security;
alter table public.watch_room_messages enable row level security;
alter table public.watch_room_requests enable row level security;
alter table public.watch_together_history enable row level security;

revoke all on public.watch_rooms from anon, authenticated;
revoke all on public.watch_room_participants from anon, authenticated;
revoke all on public.watch_room_messages from anon, authenticated;
revoke all on public.watch_room_requests from anon, authenticated;
revoke all on public.watch_together_history from anon, authenticated;
revoke all on sequence public.watch_room_messages_id_seq from anon, authenticated;


create or replace function public.cleanup_expired_watch_rooms()
returns bigint language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare removed bigint;
begin
  delete from public.watch_rooms where closed_at is not null or expires_at <= now();
  get diagnostics removed = row_count;
  return removed;
end $$;

create or replace function public.create_watch_room(
  p_code text, p_token text, p_name text, p_avatar text, p_media jsonb
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants;
begin
  perform public.cleanup_expired_watch_rooms();
  if p_code !~ '^[A-HJ-NP-Z2-9]{8}$' or length(p_token) < 32 then raise exception 'Invalid room credentials.'; end if;
  if coalesce(length(trim(p_name)),0) not between 1 and 32 then raise exception 'Display name must be 1–32 characters.'; end if;
  if coalesce((p_media->>'tmdbId')::bigint,0) <= 0 then raise exception 'This title cannot be screened because its TMDB ID is missing.'; end if;
  if (length(p_media::text) > 12000) then raise exception 'Room media details are too large.'; end if;
  -- A creator keeps only one live room. Remove all inactive/closed rooms
  -- belonging to this identity before creating a fresh room ID.
  delete from public.watch_rooms wr
  where wr.owner_token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')
    and (wr.closed_at is not null or wr.expires_at <= now() or not exists (
      select 1 from public.watch_room_participants wp
      where wp.room_id=wr.id and wp.last_seen_at > now()-interval '45 seconds'
    ));
  if exists (select 1 from public.watch_rooms wr where wr.owner_token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and wr.closed_at is null and wr.expires_at>now()) then
    raise exception 'You already have an active screening room. End or delete it before creating another.';
  end if;
  insert into public.watch_rooms(code, media, playback, owner_user_id, owner_token_hash, expires_at)
  values (p_code, p_media, jsonb_build_object('position',0,'paused',true,'season',greatest(1,coalesce((p_media->>'season')::integer,1)),'episode',greatest(1,coalesce((p_media->>'episode')::integer,1)),'updated_at',now()), auth.uid(), encode(sha256(convert_to(p_token,'UTF8')),'hex'), now()+interval '30 minutes')
  returning * into r;
  insert into public.watch_room_participants(room_id, token_hash, display_name, avatar_url, is_host, role, user_id)
  values (r.id, encode(sha256(convert_to(p_token,'UTF8')),'hex'), trim(p_name), left(coalesce(p_avatar,''),1000), true, 'host', auth.uid())
  returning * into p;
  update public.watch_rooms set host_participant_id=p.id where id=r.id returning * into r;
  return jsonb_build_object(
    'room', to_jsonb(r),
    'participant', jsonb_build_object('id',p.id,'token',p_token,'display_name',p.display_name,'avatar_url',p.avatar_url,'is_host',p.is_host,'role',p.role),
    'participants', jsonb_build_array(jsonb_build_object('id',p.id,'display_name',p.display_name,'avatar_url',p.avatar_url,'is_host',p.is_host,'role',p.role)),
    'messages', '[]'::jsonb
  );
end $$;

create or replace function public.list_watch_rooms(p_token text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $
declare result jsonb;
begin
  perform public.cleanup_expired_watch_rooms();
  if length(coalesce(p_token,'')) < 32 then raise exception 'Invalid room credentials.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',wr.id,'code',wr.code,'media',wr.media,'created_at',wr.created_at,'updated_at',wr.updated_at,'expires_at',wr.expires_at,
    'is_active',exists(select 1 from public.watch_room_participants wp where wp.room_id=wr.id and wp.last_seen_at>now()-interval '45 seconds'),
    'viewer_count',(select count(*) from public.watch_room_participants wp where wp.room_id=wr.id and wp.last_seen_at>now()-interval '45 seconds')
  ) order by wr.created_at desc),'[]'::jsonb) into result
  from public.watch_rooms wr
  where wr.owner_token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')
    and wr.closed_at is null and wr.expires_at>now();
  return result;
end $;

create or replace function public.delete_watch_room(p_code text,p_token text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $
declare removed integer;
begin
  delete from public.watch_rooms wr where wr.code=upper(trim(p_code))
    and wr.owner_token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  get diagnostics removed = row_count;
  if removed=0 then raise exception 'Room not found or you are not its creator.'; end if;
  return true;
end $;

create or replace function public.join_watch_room(
  p_code text, p_token text, p_name text, p_avatar text
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants; parts jsonb; msgs jsonb; reqs jsonb;
begin
  perform public.cleanup_expired_watch_rooms();
  if length(p_token) < 32 then raise exception 'Invalid guest token.'; end if;
  select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at > now();
  if not found then raise exception 'Room not found or expired.'; end if;
  if (select count(*) from public.watch_room_participants where room_id=r.id and last_seen_at > now()-interval '45 seconds') >= 12
     and not exists (select 1 from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex'))
  then raise exception 'This room is full (12 viewers maximum).'; end if;
  insert into public.watch_room_participants(room_id, token_hash, display_name, avatar_url, user_id)
  values (r.id, encode(sha256(convert_to(p_token,'UTF8')),'hex'), left(trim(p_name),32), left(coalesce(p_avatar,''),1000), auth.uid())
  on conflict(room_id,token_hash) do update set display_name=excluded.display_name, avatar_url=excluded.avatar_url, last_seen_at=now(), user_id=coalesce(public.watch_room_participants.user_id,excluded.user_id)
  returning * into p;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'display_name',display_name,'avatar_url',avatar_url,'is_host',is_host,'role',role) order by joined_at),'[]'::jsonb)
  into parts from public.watch_room_participants where room_id=r.id and last_seen_at > now()-interval '45 seconds';
  select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]'::jsonb) into msgs
  from (select id,participant_id,display_name,avatar_url,body,created_at from public.watch_room_messages where room_id=r.id order by id desc limit 60) m;
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'participant_id',q.participant_id,'display_name',q.display_name,'request_type',q.request_type,'payload',q.payload,'created_at',q.created_at) order by q.id desc),'[]'::jsonb) into reqs
  from (select wrq.*,wp.display_name from public.watch_room_requests wrq join public.watch_room_participants wp on wp.id=wrq.participant_id where wrq.room_id=r.id and wrq.status='pending' order by wrq.id desc limit 20) q;
  return jsonb_build_object('room',to_jsonb(r),'participant',jsonb_build_object('id',p.id,'token',p_token,'display_name',p.display_name,'avatar_url',p.avatar_url,'is_host',p.is_host,'role',p.role),'participants',parts,'messages',msgs,'requests',reqs);
end $$;

create or replace function public.watch_room_snapshot(p_code text, p_token text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants; parts jsonb; msgs jsonb; reqs jsonb;
begin
  select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at > now();
  if not found then raise exception 'Room not found or expired.'; end if;
  select * into p from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'You are not a member of this room.'; end if;
  update public.watch_room_participants set last_seen_at=now() where id=p.id;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'display_name',display_name,'avatar_url',avatar_url,'is_host',is_host,'role',role) order by joined_at),'[]'::jsonb)
  into parts from public.watch_room_participants where room_id=r.id and last_seen_at > now()-interval '45 seconds';
  select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]'::jsonb) into msgs
  from (select id,participant_id,display_name,avatar_url,body,created_at from public.watch_room_messages where room_id=r.id order by id desc limit 60) m;
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'participant_id',q.participant_id,'display_name',q.display_name,'request_type',q.request_type,'payload',q.payload,'created_at',q.created_at) order by q.id desc),'[]'::jsonb) into reqs
  from (select wrq.*,wp.display_name from public.watch_room_requests wrq join public.watch_room_participants wp on wp.id=wrq.participant_id where wrq.room_id=r.id and wrq.status='pending' order by wrq.id desc limit 20) q;
  return jsonb_build_object('room',to_jsonb(r),'participant',jsonb_build_object('id',p.id,'display_name',p.display_name,'avatar_url',p.avatar_url,'is_host',p.is_host,'role',p.role),'participants',parts,'messages',msgs,'requests',reqs);
end $$;

create or replace function public.watch_room_heartbeat(p_code text,p_token text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare rid uuid;
begin
  select id into rid from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at > now();
  if rid is null then return false; end if;
  update public.watch_room_participants set last_seen_at=now()
  where room_id=rid and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if found then update public.watch_rooms set expires_at=now()+interval '30 minutes' where id=rid; end if;
  return found;
end $$;


create or replace function public.watch_room_playback_snapshot(p_code text,p_token text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants;
begin
  select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at > now();
  if not found then raise exception 'Room not found or expired.'; end if;
  select * into p from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'You are not a member of this room.'; end if;
  return jsonb_build_object('playback',r.playback,'state_version',r.state_version,'updated_at',r.updated_at);
end $$;

create or replace function public.set_watch_room_playback(p_code text,p_token text,p_playback jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants; next_state jsonb;
begin
  select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at > now() for update;
  if not found then raise exception 'Room not found or expired.'; end if;
  select * into p from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'You are not a member of this room.'; end if;
  if p.role not in ('host','operator') then raise exception 'Playback control requires Host or Operator access. Request access from the host.'; end if;
  next_state := jsonb_build_object(
    'position', greatest(0,least(86400,coalesce((p_playback->>'position')::double precision,0))),
    'paused', coalesce((p_playback->>'paused')::boolean,true),
    'season', greatest(1,least(99,coalesce((p_playback->>'season')::integer,1))),
    'episode', greatest(1,least(999,coalesce((p_playback->>'episode')::integer,1))),
    'updated_at', now(),
    'actor', p.id
  );
  update public.watch_rooms set playback=next_state,state_version=state_version+1,updated_at=now(),
    expires_at=now()+interval '30 minutes'
  where id=r.id returning * into r;
  update public.watch_room_participants set last_seen_at=now() where id=p.id;
  return jsonb_build_object('state_version',r.state_version,'playback',r.playback);
end $$;

create or replace function public.send_watch_room_message(p_code text,p_token text,p_body text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants; m public.watch_room_messages;
begin
  select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at > now();
  if not found then raise exception 'Room not found or expired.'; end if;
  select * into p from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'You are not a member of this room.'; end if;
  if length(trim(coalesce(p_body,''))) not between 1 and 500 then raise exception 'Messages must be 1–500 characters.'; end if;
  if (select count(*) from public.watch_room_messages where participant_id=p.id and created_at > now()-interval '10 seconds') >= 5 then raise exception 'Please slow down before sending another message.'; end if;
  insert into public.watch_room_messages(room_id,participant_id,display_name,avatar_url,body)
  values(r.id,p.id,p.display_name,p.avatar_url,trim(p_body)) returning * into m;
  update public.watch_room_participants set last_seen_at=now() where id=p.id;
  return to_jsonb(m);
end $$;

create or replace function public.leave_watch_room(p_code text,p_token text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare rid uuid;
begin
  select id into rid from public.watch_rooms where code=upper(trim(p_code));
  if rid is null then return false; end if;
  update public.watch_room_participants set last_seen_at=now()-interval '2 minutes'
  where room_id=rid and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if found then update public.watch_rooms set expires_at=now()-interval '1 second' where id=rid and host_participant_id=(select id from public.watch_room_participants where room_id=rid and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')); end if;
  return found;
end $$;

create or replace function public.close_watch_room(p_code text,p_token text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare rid uuid;
begin
  select r.id into rid from public.watch_rooms r join public.watch_room_participants p on p.id=r.host_participant_id
  where r.code=upper(trim(p_code)) and p.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if rid is null then raise exception 'Only the host can close this room.'; end if;
  delete from public.watch_rooms where id=rid;
  return true;
end $$;


create or replace function public.request_watch_room_access(p_code text,p_token text,p_request_type text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants; q public.watch_room_requests;
begin
  select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at > now();
  if not found then raise exception 'Room not found or expired.'; end if;
  select * into p from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'You are not a member of this room.'; end if;
  if p.role in ('host','operator') then raise exception 'You already have playback access.'; end if;
  if p_request_type not in ('operator','skip_forward','skip_back','seek') then raise exception 'Unknown request.'; end if;
  if (select count(*) from public.watch_room_requests where participant_id=p.id and status='pending') >= 3 then raise exception 'You already have three pending requests.'; end if;
  if exists(select 1 from public.watch_room_requests where participant_id=p.id and created_at > now()-interval '8 seconds') then raise exception 'Please wait before sending another request.'; end if;
  if p_request_type='seek' and coalesce((p_payload->>'position')::double precision,-1) not between 0 and 86400 then raise exception 'Invalid seek position.'; end if;
  insert into public.watch_room_requests(room_id,participant_id,request_type,payload)
  values(r.id,p.id,p_request_type,coalesce(p_payload,'{}'::jsonb)) returning * into q;
  return jsonb_build_object('id',q.id,'request_type',q.request_type,'status',q.status);
end $$;

create or replace function public.resolve_watch_room_request(p_code text,p_token text,p_request_id bigint,p_approve boolean)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants; q public.watch_room_requests; next_state jsonb; pos double precision;
begin
  select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at > now() for update;
  if not found then raise exception 'Room not found or expired.'; end if;
  select * into p from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found or p.role <> 'host' then raise exception 'Only the host can review access requests.'; end if;
  select * into q from public.watch_room_requests where id=p_request_id and room_id=r.id and status='pending' for update;
  if not found then raise exception 'This request is no longer pending.'; end if;
  update public.watch_room_requests set status=case when p_approve then 'approved' else 'denied' end,resolved_at=now() where id=q.id;
  if p_approve then
    if q.request_type='operator' then
      update public.watch_room_participants set role='operator' where id=q.participant_id;
    else
      pos := greatest(0,least(86400,coalesce((r.playback->>'position')::double precision,0) +
        case q.request_type when 'skip_forward' then 10 when 'skip_back' then -10 when 'seek' then coalesce((q.payload->>'position')::double precision,0) else 0 end));
      next_state := jsonb_build_object('position',pos,'paused',coalesce((r.playback->>'paused')::boolean,true),
        'season',greatest(1,coalesce((r.playback->>'season')::integer,1)),
        'episode',greatest(1,coalesce((r.playback->>'episode')::integer,1)),
        'updated_at',now(),'actor',q.participant_id);
      update public.watch_rooms set playback=next_state,state_version=state_version+1,updated_at=now() where id=r.id;
    end if;
  end if;
  return jsonb_build_object('approved',p_approve,'request_id',q.id);
end $$;


create or replace function public.rename_watch_room_participant(p_code text,p_token text,p_name text,p_avatar text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants;
begin
  select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at>now();
  if not found then raise exception 'Room not found or expired.'; end if;
  if coalesce(length(trim(p_name)),0) not between 1 and 32 then raise exception 'Display name must be 1–32 characters.'; end if;
  update public.watch_room_participants set display_name=trim(p_name),avatar_url=left(coalesce(p_avatar,''),1000),last_seen_at=now()
  where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') returning * into p;
  if not found then raise exception 'You are not a member of this room.'; end if;
  update public.watch_room_messages set display_name=p.display_name,avatar_url=p.avatar_url where participant_id=p.id;
  return jsonb_build_object('id',p.id,'display_name',p.display_name,'avatar_url',p.avatar_url,'role',p.role,'is_host',p.is_host);
end $$;

create or replace function public.record_watch_together_history(p_code text,p_token text,p_duration_seconds integer)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants; h public.watch_together_history;
begin
  if auth.uid() is null then raise exception 'Sign in to sync Watch Together history.'; end if;
  select * into r from public.watch_rooms where code=upper(trim(p_code));
  if not found then raise exception 'Screening history is no longer available.'; end if;
  select * into p from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and user_id=auth.uid();
  if not found then raise exception 'This screening does not belong to your account.'; end if;
  insert into public.watch_together_history(user_id,room_code,title,media,duration_seconds,last_watched_at)
  values(auth.uid(),r.code,coalesce(r.media->>'title','Untitled screening'),r.media,greatest(0,least(7200,coalesce(p_duration_seconds,0))),now())
  on conflict(user_id,room_code) do update set
    duration_seconds=least(86400,public.watch_together_history.duration_seconds+excluded.duration_seconds),
    title=excluded.title,media=excluded.media,last_watched_at=now()
  returning * into h;
  return to_jsonb(h);
end $$;

create or replace function public.get_watch_together_history()
returns jsonb language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select coalesce(jsonb_agg(to_jsonb(h) order by h.last_watched_at desc),'[]'::jsonb)
  from (select id,room_code,title,media,duration_seconds,started_at,last_watched_at from public.watch_together_history
        where user_id=auth.uid() order by last_watched_at desc limit 50) h;
$$;

revoke all on function public.cleanup_expired_watch_rooms() from public, anon, authenticated;
revoke all on function public.create_watch_room(text,text,text,text,jsonb) from public;
revoke all on function public.list_watch_rooms(text) from public;
revoke all on function public.delete_watch_room(text,text) from public;
revoke all on function public.join_watch_room(text,text,text,text) from public;
revoke all on function public.watch_room_snapshot(text,text) from public;
revoke all on function public.watch_room_heartbeat(text,text) from public;
revoke all on function public.watch_room_playback_snapshot(text,text) from public;
revoke all on function public.set_watch_room_playback(text,text,jsonb) from public;
revoke all on function public.send_watch_room_message(text,text,text) from public;
revoke all on function public.leave_watch_room(text,text) from public;
revoke all on function public.close_watch_room(text,text) from public;
revoke all on function public.request_watch_room_access(text,text,text,jsonb) from public;
revoke all on function public.resolve_watch_room_request(text,text,bigint,boolean) from public;
revoke all on function public.rename_watch_room_participant(text,text,text,text) from public;
revoke all on function public.record_watch_together_history(text,text,integer) from public;
revoke all on function public.get_watch_together_history() from public;

grant execute on function public.create_watch_room(text,text,text,text,jsonb) to anon, authenticated;
grant execute on function public.list_watch_rooms(text) to anon, authenticated;
grant execute on function public.delete_watch_room(text,text) to anon, authenticated;
grant execute on function public.join_watch_room(text,text,text,text) to anon, authenticated;
grant execute on function public.watch_room_snapshot(text,text) to anon, authenticated;
grant execute on function public.watch_room_heartbeat(text,text) to anon, authenticated;
grant execute on function public.watch_room_playback_snapshot(text,text) to anon, authenticated;
grant execute on function public.set_watch_room_playback(text,text,jsonb) to anon, authenticated;
grant execute on function public.send_watch_room_message(text,text,text) to anon, authenticated;
grant execute on function public.leave_watch_room(text,text) to anon, authenticated;
grant execute on function public.close_watch_room(text,text) to anon, authenticated;
grant execute on function public.request_watch_room_access(text,text,text,jsonb) to anon, authenticated;
grant execute on function public.resolve_watch_room_request(text,text,bigint,boolean) to anon, authenticated;
grant execute on function public.rename_watch_room_participant(text,text,text,text) to anon, authenticated;
grant execute on function public.record_watch_together_history(text,text,integer) to authenticated;
grant execute on function public.get_watch_together_history() to authenticated;

-- Inactive rooms expire 30 minutes after their last heartbeat. Cleanup hard-deletes
-- expired/closed rooms and cascades participants, chat and requests. Watch history
-- is separate and intentionally retained.

-- Schedule daily cleanup when pg_cron is enabled. History is stored separately.
do $watch_room_cleanup_schedule$
declare existing_job bigint; unscheduled boolean;
begin
  if to_regclass('cron.job') is not null then
    execute 'select jobid from cron.job where jobname = $1 limit 1'
      into existing_job using 'cleanup-expired-watch-rooms';
    if existing_job is not null then
      execute 'select cron.unschedule($1)' into unscheduled using existing_job;
    end if;
    execute 'select cron.schedule($1,$2,$3)' into existing_job
      using 'cleanup-expired-watch-rooms','*/5 * * * *','select public.cleanup_expired_watch_rooms();';
  end if;
end
$watch_room_cleanup_schedule$;
