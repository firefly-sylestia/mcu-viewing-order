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
  owner_token_hash text,
  settings jsonb not null default '{"locked":false,"chat_enabled":true,"reactions_enabled":true,"guests_can_change_episode":false,"voice_enabled":false,"expiry_minutes":30}'::jsonb
);

alter table public.watch_rooms add column if not exists owner_user_id uuid references auth.users(id) on delete set null;
alter table public.watch_rooms add column if not exists owner_token_hash text;
alter table public.watch_rooms add column if not exists settings jsonb not null default '{"locked":false,"chat_enabled":true,"reactions_enabled":true,"guests_can_change_episode":false,"voice_enabled":false,"expiry_minutes":30}'::jsonb;
alter table public.watch_rooms alter column settings set default '{"locked":false,"chat_enabled":true,"reactions_enabled":true,"guests_can_change_episode":false,"voice_enabled":false,"expiry_minutes":30}'::jsonb;
update public.watch_rooms set settings=jsonb_set(coalesce(settings,'{}'::jsonb),'{voice_enabled}','false'::jsonb,true) where not (coalesce(settings,'{}'::jsonb) ? 'voice_enabled');

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
  playback_position double precision not null default 0,
  playback_duration double precision not null default 0,
  playback_updated_at timestamptz not null default now(),
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
alter table public.watch_room_participants add column if not exists playback_position double precision not null default 0;
alter table public.watch_room_participants add column if not exists playback_duration double precision not null default 0;
alter table public.watch_room_participants add column if not exists playback_updated_at timestamptz not null default now();
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
declare r public.watch_rooms; p public.watch_room_participants; existing_count integer; stale_room_id uuid;
begin
  perform public.cleanup_expired_watch_rooms();
  if p_code !~ '^[A-HJ-NP-Z2-9]{8}$' or length(p_token) < 32 then raise exception 'Invalid room credentials.'; end if;
  if coalesce(length(trim(p_name)),0) not between 1 and 32 then raise exception 'Display name must be 1–32 characters.'; end if;
  if coalesce(p_media->>'kind','') <> 'local_file' and coalesce((p_media->>'tmdbId')::bigint,0) <= 0 then raise exception 'This title cannot be screened because its TMDB ID is missing.'; end if;
  if coalesce(p_media->>'kind','') = 'local_file' and (coalesce(length(p_media->>'fileFingerprint'),0) <> 64 or coalesce((p_media->>'fileSize')::bigint,0) <= 0 or coalesce(length(p_media->>'fileName'),0)=0) then raise exception 'A valid local video file is required.'; end if;
  if (length(p_media::text) > 12000) then raise exception 'Room media details are too large.'; end if;
  -- Keep up to three rooms per creator. When full, evict the oldest
  -- inactive room only; never remove a room with a live participant.
  select count(*) into existing_count from public.watch_rooms wr
  where (wr.owner_token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') or (auth.uid() is not null and wr.owner_user_id=auth.uid()))
    and wr.closed_at is null and wr.expires_at>now();
  if existing_count >= 3 then
    select wr.id into stale_room_id from public.watch_rooms wr
    where (wr.owner_token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') or (auth.uid() is not null and wr.owner_user_id=auth.uid()))
      and wr.closed_at is null and wr.expires_at>now()
      and not exists (select 1 from public.watch_room_participants wp where wp.room_id=wr.id and wp.last_seen_at>now()-interval '45 seconds')
    order by wr.created_at asc limit 1;
    if stale_room_id is null then
      raise exception 'You already have three active screening rooms. Close or leave one before creating another.';
    end if;
    delete from public.watch_rooms where id=stale_room_id;
  end if;
  insert into public.watch_rooms(code, media, playback, owner_user_id, owner_token_hash, expires_at)
  values (p_code, p_media, jsonb_build_object('position',0,'paused',true,'season',greatest(1,coalesce((p_media->>'season')::integer,1)),'episode',greatest(1,coalesce((p_media->>'episode')::integer,1)),'updated_at',now()), auth.uid(), encode(sha256(convert_to(p_token,'UTF8')),'hex'), now()+interval '30 minutes')
  returning * into r;
  insert into public.watch_room_participants(room_id, token_hash, display_name, avatar_url, is_host, role, user_id)
  values (r.id, encode(sha256(convert_to(p_token,'UTF8')),'hex'), trim(p_name), left(coalesce(p_avatar,''),1000), true, 'host', auth.uid())
  returning * into p;
  update public.watch_rooms set host_participant_id=p.id where id=r.id returning * into r;
  return jsonb_build_object(
    'room', (to_jsonb(r) - 'owner_token_hash' - 'owner_user_id'),
    'participant', jsonb_build_object('id',p.id,'token',p_token,'display_name',p.display_name,'avatar_url',p.avatar_url,'is_host',p.is_host,'role',p.role),
    'participants', jsonb_build_array(jsonb_build_object('id',p.id,'display_name',p.display_name,'avatar_url',p.avatar_url,'is_host',p.is_host,'role',p.role)),
    'messages', '[]'::jsonb
  );
end $$;


create or replace function public.preview_watch_room(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $preview_watch_room$
declare
  room_media jsonb;
begin
  perform public.cleanup_expired_watch_rooms();

  select jsonb_build_object(
    'media', media,
    'settings', jsonb_build_object(
      'p2p_video_enabled', coalesce((settings->>'p2p_video_enabled')::boolean, false)
    )
  )
  into room_media
  from public.watch_rooms
  where code = upper(trim(p_code))
    and closed_at is null
    and expires_at > now();

  if not found then
    raise exception 'Room not found or expired.';
  end if;

  return room_media;
end;
$preview_watch_room$;
revoke all on function public.preview_watch_room(text) from public;grant execute on function public.preview_watch_room(text) to anon,authenticated;
create or replace function public.list_watch_rooms(p_token text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
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
  where (wr.owner_token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') or (auth.uid() is not null and wr.owner_user_id=auth.uid()))
    and wr.closed_at is null and wr.expires_at>now();
  return result;
end $$;

create or replace function public.delete_watch_room(p_code text,p_token text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare removed integer;
begin
  delete from public.watch_rooms wr where wr.code=upper(trim(p_code))
    and (wr.owner_token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') or (auth.uid() is not null and wr.owner_user_id=auth.uid()));
  get diagnostics removed = row_count;
  if removed=0 then raise exception 'Room not found or you are not its creator.'; end if;
  return true;
end $$;

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
  if coalesce((r.settings->>'locked')::boolean,false) and not exists(select 1 from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')) then raise exception 'This room is locked by the host.'; end if;
  if (select count(*) from public.watch_room_participants where room_id=r.id and last_seen_at > now()-interval '45 seconds') >= 29
     and not exists (select 1 from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex'))
  then raise exception 'This room is full (29 viewers maximum).'; end if;
  insert into public.watch_room_participants(room_id, token_hash, display_name, avatar_url, user_id)
  values (r.id, encode(sha256(convert_to(p_token,'UTF8')),'hex'), left(trim(p_name),32), left(coalesce(p_avatar,''),1000), auth.uid())
  on conflict(room_id,token_hash) do update set display_name=excluded.display_name, avatar_url=excluded.avatar_url, last_seen_at=now(), user_id=coalesce(public.watch_room_participants.user_id,excluded.user_id)
  returning * into p;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'display_name',display_name,'avatar_url',avatar_url,'is_host',is_host,'role',role,'playback_position',playback_position,'playback_duration',playback_duration,'playback_updated_at',playback_updated_at) order by joined_at),'[]'::jsonb)
  into parts from public.watch_room_participants where room_id=r.id and last_seen_at > now()-interval '45 seconds';
  select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]'::jsonb) into msgs
  from (select id,participant_id,display_name,avatar_url,body,created_at from public.watch_room_messages where room_id=r.id order by id desc limit 60) m;
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'participant_id',q.participant_id,'display_name',q.display_name,'request_type',q.request_type,'payload',q.payload,'created_at',q.created_at) order by q.id desc),'[]'::jsonb) into reqs
  from (select wrq.*,wp.display_name from public.watch_room_requests wrq join public.watch_room_participants wp on wp.id=wrq.participant_id where wrq.room_id=r.id and wrq.status='pending' order by wrq.id desc limit 20) q;
  return jsonb_build_object('room',(to_jsonb(r) - 'owner_token_hash' - 'owner_user_id'),'participant',jsonb_build_object('id',p.id,'token',p_token,'display_name',p.display_name,'avatar_url',p.avatar_url,'is_host',p.is_host,'role',p.role),'participants',parts,'messages',msgs,'requests',reqs);
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
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'display_name',display_name,'avatar_url',avatar_url,'is_host',is_host,'role',role,'playback_position',playback_position,'playback_duration',playback_duration,'playback_updated_at',playback_updated_at) order by joined_at),'[]'::jsonb)
  into parts from public.watch_room_participants where room_id=r.id and last_seen_at > now()-interval '45 seconds';
  select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]'::jsonb) into msgs
  from (select id,participant_id,display_name,avatar_url,body,created_at from public.watch_room_messages where room_id=r.id order by id desc limit 60) m;
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'participant_id',q.participant_id,'display_name',q.display_name,'request_type',q.request_type,'payload',q.payload,'created_at',q.created_at) order by q.id desc),'[]'::jsonb) into reqs
  from (select wrq.*,wp.display_name from public.watch_room_requests wrq join public.watch_room_participants wp on wp.id=wrq.participant_id where wrq.room_id=r.id and wrq.status='pending' order by wrq.id desc limit 20) q;
  return jsonb_build_object('room',(to_jsonb(r) - 'owner_token_hash' - 'owner_user_id'),'participant',jsonb_build_object('id',p.id,'display_name',p.display_name,'avatar_url',p.avatar_url,'is_host',p.is_host,'role',p.role),'participants',parts,'messages',msgs,'requests',reqs);
end $$;

drop function if exists public.watch_room_heartbeat(text,text);
create or replace function public.watch_room_heartbeat(p_code text,p_token text,p_position double precision default null,p_duration double precision default null)
returns boolean language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare rid uuid;
begin
  select id into rid from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at > now();
  if rid is null then return false; end if;
  update public.watch_room_participants set last_seen_at=now(),
    playback_position=greatest(0,least(86400,coalesce(p_position,playback_position))),
    playback_duration=greatest(0,least(86400,coalesce(p_duration,playback_duration))),
    playback_updated_at=case when p_position is not null then now() else playback_updated_at end
  where room_id=rid and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if found then update public.watch_rooms set expires_at=now()+make_interval(mins=>coalesce((settings->>'expiry_minutes')::integer,30)) where id=rid; end if;
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
    expires_at=now()+make_interval(mins=>coalesce((r.settings->>'expiry_minutes')::integer,30))
  where id=r.id returning * into r;
  update public.watch_room_participants set last_seen_at=now() where id=p.id;
  return jsonb_build_object('state_version',r.state_version,'playback',r.playback);
end $$;


create or replace function public.grant_watch_room_operator(p_code text,p_token text,p_participant_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare r public.watch_rooms; host public.watch_room_participants; target public.watch_room_participants;
begin
  select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at>now() for update;
  if not found then raise exception 'Room not found or expired.'; end if;
  select * into host from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found or host.role <> 'host' then raise exception 'Only the host can assign Operator access.'; end if;
  select * into target from public.watch_room_participants where id=p_participant_id and room_id=r.id;
  if not found then raise exception 'Participant is no longer in this room.'; end if;
  if target.is_host then raise exception 'The host already has full control.'; end if;
  update public.watch_room_participants set role='operator' where id=target.id;
  update public.watch_room_participants set last_seen_at=now() where id=host.id;
  return jsonb_build_object('participant_id',target.id,'role','operator');
end $$;

create or replace function public.watch_room_preview(p_code text)
returns jsonb language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select jsonb_build_object('code',r.code,'media',r.media,'playback',r.playback,
    'viewer_count',(select count(*) from public.watch_room_participants p where p.room_id=r.id and p.last_seen_at>now()-interval '45 seconds'),
    'is_active',r.closed_at is null and r.expires_at>now())
  from public.watch_rooms r where r.code=upper(trim(p_code)) and r.closed_at is null and r.expires_at>now() limit 1;
$$;

create or replace function public.send_watch_room_message(p_code text,p_token text,p_body text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants; m public.watch_room_messages;
begin
  select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at > now();
  if not found then raise exception 'Room not found or expired.'; end if;
  select * into p from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'You are not a member of this room.'; end if;
  if coalesce((r.settings->>'chat_enabled')::boolean,true)=false then raise exception 'The host has disabled room chat.'; end if;
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


create or replace function public.delete_watch_together_history(p_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare removed integer;
begin
  if auth.uid() is null then raise exception 'Sign in to manage synced screening history.'; end if;
  if p_id is null then
    delete from public.watch_together_history where user_id = auth.uid();
  else
    delete from public.watch_together_history where user_id = auth.uid() and id = p_id;
  end if;
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.delete_watch_together_history(uuid) from public, anon;
grant execute on function public.delete_watch_together_history(uuid) to authenticated;

create or replace function public.get_watch_together_history()
returns jsonb language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select coalesce(jsonb_agg(to_jsonb(h) order by h.last_watched_at desc),'[]'::jsonb)
  from (select id,room_code,title,media,duration_seconds,started_at,last_watched_at from public.watch_together_history
        where user_id=auth.uid() order by last_watched_at desc limit 50) h;
$$;

create or replace function public.change_watch_room_media(p_code text,p_token text,p_media jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $change_watch_room_media$
declare
  r public.watch_rooms;
  p public.watch_room_participants;
  next_playback jsonb;
begin
  select * into r
  from public.watch_rooms
  where code = upper(trim(p_code))
    and closed_at is null
    and expires_at > now()
  for update;
  if not found then raise exception 'Room not found or expired.'; end if;

  select * into p
  from public.watch_room_participants
  where room_id = r.id
    and token_hash = encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found or p.role <> 'host' then
    raise exception 'Only the room host can change the shared movie or file.';
  end if;

  if coalesce(p_media->>'kind','') = 'local_file' then
    if coalesce(length(p_media->>'fileFingerprint'),0) <> 64
       or coalesce((p_media->>'fileSize')::bigint,0) <= 0
       or coalesce(length(p_media->>'fileName'),0) = 0 then
      raise exception 'A valid local video file is required.';
    end if;
  elsif coalesce((p_media->>'tmdbId')::bigint,0) <= 0 then
    raise exception 'Choose a movie or series with a valid TMDB ID.';
  end if;
  if length(p_media::text) > 12000 then
    raise exception 'Room media details are too large.';
  end if;

  next_playback := jsonb_build_object(
    'position', 0,
    'paused', true,
    'season', greatest(1,coalesce((p_media->>'season')::integer,1)),
    'episode', greatest(1,coalesce((p_media->>'episode')::integer,1)),
    'updated_at', now(),
    'actor', p.id
  );

  update public.watch_rooms
  set media = p_media,
      playback = next_playback,
      state_version = state_version + 1,
      updated_at = now(),
      expires_at = now() + make_interval(mins=>coalesce((r.settings->>'expiry_minutes')::integer,30))
  where id = r.id
  returning * into r;

  update public.watch_room_participants set last_seen_at = now() where id = p.id;
  return to_jsonb(r) - 'owner_token_hash' - 'owner_user_id';
end;
$change_watch_room_media$;

revoke all on function public.cleanup_expired_watch_rooms() from public, anon, authenticated;
revoke all on function public.create_watch_room(text,text,text,text,jsonb) from public;
revoke all on function public.change_watch_room_media(text,text,jsonb) from public;
revoke all on function public.list_watch_rooms(text) from public;
revoke all on function public.delete_watch_room(text,text) from public;
revoke all on function public.join_watch_room(text,text,text,text) from public;
revoke all on function public.watch_room_snapshot(text,text) from public;
revoke all on function public.watch_room_heartbeat(text,text,double precision,double precision) from public;
revoke all on function public.watch_room_playback_snapshot(text,text) from public;
revoke all on function public.set_watch_room_playback(text,text,jsonb) from public;
revoke all on function public.send_watch_room_message(text,text,text) from public;
revoke all on function public.grant_watch_room_operator(text,text,uuid) from public;
revoke all on function public.watch_room_preview(text) from public;
revoke all on function public.leave_watch_room(text,text) from public;
revoke all on function public.close_watch_room(text,text) from public;
revoke all on function public.request_watch_room_access(text,text,text,jsonb) from public;
revoke all on function public.resolve_watch_room_request(text,text,bigint,boolean) from public;
revoke all on function public.rename_watch_room_participant(text,text,text,text) from public;
revoke all on function public.record_watch_together_history(text,text,integer) from public;
revoke all on function public.get_watch_together_history() from public;

grant execute on function public.create_watch_room(text,text,text,text,jsonb) to anon, authenticated;
grant execute on function public.change_watch_room_media(text,text,jsonb) to anon, authenticated;
grant execute on function public.list_watch_rooms(text) to anon, authenticated;
grant execute on function public.delete_watch_room(text,text) to anon, authenticated;
grant execute on function public.join_watch_room(text,text,text,text) to anon, authenticated;
grant execute on function public.watch_room_snapshot(text,text) to anon, authenticated;
grant execute on function public.watch_room_heartbeat(text,text,double precision,double precision) to anon, authenticated;
grant execute on function public.watch_room_playback_snapshot(text,text) to anon, authenticated;
grant execute on function public.set_watch_room_playback(text,text,jsonb) to anon, authenticated;
grant execute on function public.send_watch_room_message(text,text,text) to anon, authenticated;
grant execute on function public.grant_watch_room_operator(text,text,uuid) to anon, authenticated;
grant execute on function public.watch_room_preview(text) to anon, authenticated;
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


-- Host controls: room permissions, ownership transfer, participant removal and expiry.
create or replace function public.update_watch_room_settings(p_code text,p_token text,p_settings jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants; s jsonb;
begin
 select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at>now() for update;
 if not found then raise exception 'Room not found or expired.'; end if;
 select * into p from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not found or p.role<>'host' then raise exception 'Only the host can change room settings.'; end if;
 s := r.settings || jsonb_strip_nulls(jsonb_build_object(
  'locked',case when p_settings ? 'locked' then (p_settings->>'locked')::boolean else null end,
  'chat_enabled',case when p_settings ? 'chat_enabled' then (p_settings->>'chat_enabled')::boolean else null end,
  'reactions_enabled',case when p_settings ? 'reactions_enabled' then (p_settings->>'reactions_enabled')::boolean else null end,
  'voice_enabled',case when p_settings ? 'voice_enabled' then (p_settings->>'voice_enabled')::boolean else null end,
  'p2p_video_enabled',case when p_settings ? 'p2p_video_enabled' then (p_settings->>'p2p_video_enabled')::boolean else null end,
  'p2p_voice_enabled',case when p_settings ? 'p2p_voice_enabled' then (p_settings->>'p2p_voice_enabled')::boolean else null end,
  'guests_can_change_episode',case when p_settings ? 'guests_can_change_episode' then (p_settings->>'guests_can_change_episode')::boolean else null end,
  'expiry_minutes',case when p_settings ? 'expiry_minutes' then greatest(30,least(1440,(p_settings->>'expiry_minutes')::integer)) else null end
 ));
 update public.watch_rooms set settings=s,expires_at=now()+make_interval(mins=>coalesce((s->>'expiry_minutes')::integer,30)) where id=r.id returning * into r;
 return r.settings;
end $$;

create or replace function public.transfer_watch_room_host(p_code text,p_token text,p_participant_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.watch_rooms; old_host public.watch_room_participants; target public.watch_room_participants;
begin
 select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at>now() for update;
 if not found then raise exception 'Room not found or expired.'; end if;
 select * into old_host from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not found or old_host.role<>'host' then raise exception 'Only the current host can transfer ownership.'; end if;
 select * into target from public.watch_room_participants where id=p_participant_id and room_id=r.id and last_seen_at>now()-interval '45 seconds';
 if not found then raise exception 'That participant is no longer in the room.'; end if;
 update public.watch_room_participants set role='viewer',is_host=false where id=old_host.id;
 update public.watch_room_participants set role='host',is_host=true where id=target.id;
 update public.watch_rooms set host_participant_id=target.id,owner_token_hash=target.token_hash,owner_user_id=target.user_id where id=r.id;
 return jsonb_build_object('host_id',target.id);
end $$;

create or replace function public.remove_watch_room_participant(p_code text,p_token text,p_participant_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.watch_rooms; host public.watch_room_participants;
begin
 select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at>now() for update;
 if not found then raise exception 'Room not found or expired.'; end if;
 select * into host from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not found or host.role<>'host' then raise exception 'Only the host can remove participants.'; end if;
 delete from public.watch_room_participants where id=p_participant_id and room_id=r.id and is_host=false;
 return found;
end $$;

revoke all on function public.update_watch_room_settings(text,text,jsonb) from public;
revoke all on function public.transfer_watch_room_host(text,text,uuid) from public;
revoke all on function public.remove_watch_room_participant(text,text,uuid) from public;
grant execute on function public.update_watch_room_settings(text,text,jsonb) to anon,authenticated;
grant execute on function public.transfer_watch_room_host(text,text,uuid) to anon,authenticated;
grant execute on function public.remove_watch_room_participant(text,text,uuid) to anon,authenticated;

create or replace function public.change_watch_room_episode(p_code text,p_token text,p_season integer,p_episode integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants; next_state jsonb;
begin
 select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at>now() for update;
 if not found then raise exception 'Room not found or expired.'; end if;
 select * into p from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not found then raise exception 'You are not a member of this room.'; end if;
 if p.role not in ('host','operator') and coalesce((r.settings->>'guests_can_change_episode')::boolean,false)=false then raise exception 'The host has disabled guest episode changes.'; end if;
 if coalesce(r.media->>'mediaType','')<>'tv' then raise exception 'This room is not screening a series.'; end if;
 next_state:=jsonb_build_object('position',0,'paused',false,'season',greatest(1,least(99,p_season)),'episode',greatest(1,least(999,p_episode)),'updated_at',now(),'actor',p.id);
 update public.watch_rooms set playback=next_state,state_version=state_version+1,updated_at=now(),
 expires_at=now()+make_interval(mins=>coalesce((r.settings->>'expiry_minutes')::integer,30)) where id=r.id returning * into r;
 return jsonb_build_object('playback',r.playback,'state_version',r.state_version);
end $$;
revoke all on function public.change_watch_room_episode(text,text,integer,integer) from public;
grant execute on function public.change_watch_room_episode(text,text,integer,integer) to anon,authenticated;

-- Private, room-scoped WebRTC signalling for Watch Together voice chat.
create table if not exists public.watch_room_voice_signals (
 id bigserial primary key,
 room_id uuid not null references public.watch_rooms(id) on delete cascade,
 sender_id uuid not null references public.watch_room_participants(id) on delete cascade,
 receiver_id uuid not null references public.watch_room_participants(id) on delete cascade,
 payload jsonb not null,
 created_at timestamptz not null default now()
);
create index if not exists watch_room_voice_signals_receiver_idx on public.watch_room_voice_signals(room_id,receiver_id,id);
alter table public.watch_room_voice_signals enable row level security;
revoke all on public.watch_room_voice_signals from public,anon,authenticated;

create or replace function public.send_watch_room_voice_signal(p_code text,p_token text,p_to_participant_id uuid,p_payload jsonb)
returns bigint language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.watch_rooms; sender public.watch_room_participants; target public.watch_room_participants; signal_id bigint;
begin
 select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at>now();
 if not found then raise exception 'Room not found or expired.'; end if;
 select * into sender from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not found then raise exception 'You are not a member of this room.'; end if;
 select * into target from public.watch_room_participants where id=p_to_participant_id and room_id=r.id and last_seen_at>now()-interval '60 seconds';
 if not found then raise exception 'Voice participant is no longer connected.'; end if;
 if pg_column_size(p_payload)>12000 or p_payload->>'type' not in ('offer','answer','ice','bye') then raise exception 'Invalid voice signal.'; end if;
 insert into public.watch_room_voice_signals(room_id,sender_id,receiver_id,payload)
 values(r.id,sender.id,target.id,p_payload) returning id into signal_id;
 delete from public.watch_room_voice_signals where room_id=r.id and created_at<now()-interval '2 minutes';
 return signal_id;
end $$;

create or replace function public.poll_watch_room_voice_signals(p_code text,p_token text,p_after_id bigint default 0)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants; result jsonb;
begin
 select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at>now();
 if not found then raise exception 'Room not found or expired.'; end if;
 select * into p from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not found then raise exception 'You are not a member of this room.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'sender_id',s.sender_id,'payload',s.payload) order by s.id),'[]'::jsonb)
 into result from public.watch_room_voice_signals s
 where s.room_id=r.id and s.receiver_id=p.id and s.id>greatest(0,coalesce(p_after_id,0)) and s.created_at>now()-interval '2 minutes';
 return result;
end $$;
revoke all on function public.send_watch_room_voice_signal(text,text,uuid,jsonb) from public;
revoke all on function public.poll_watch_room_voice_signals(text,text,bigint) from public;
grant execute on function public.send_watch_room_voice_signal(text,text,uuid,jsonb) to anon,authenticated;
grant execute on function public.poll_watch_room_voice_signals(text,text,bigint) to anon,authenticated;


-- Secure OpenVidu token authorization. The browser never receives the API secret.
create or replace function public.watch_room_voice_access(p_code text,p_token text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants;
begin
  select * into r from public.watch_rooms
  where code=upper(trim(p_code)) and closed_at is null and expires_at>now();
  if not found then raise exception 'Room not found or expired.'; end if;
  select * into p from public.watch_room_participants
  where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'You are not a member of this room.'; end if;
  if coalesce((r.settings->>'voice_enabled')::boolean,false) is not true then
    raise exception 'Voice chat is disabled by the host.';
  end if;
  return jsonb_build_object(
    'room_code',r.code,
    'participant_id',p.id,
    'display_name',p.display_name,
    'role',p.role
  );
end $$;
revoke all on function public.watch_room_voice_access(text,text) from public;
grant execute on function public.watch_room_voice_access(text,text) to anon,authenticated;


-- Experimental WebRTC signaling for optional peer-to-peer video and voice.
create table if not exists public.watch_room_p2p_signals (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  from_participant_id uuid not null references public.watch_room_participants(id) on delete cascade,
  to_participant_id uuid not null references public.watch_room_participants(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists watch_room_p2p_signals_target_idx on public.watch_room_p2p_signals(room_id,to_participant_id,id);
alter table public.watch_room_p2p_signals enable row level security;
revoke all on public.watch_room_p2p_signals from anon, authenticated;
create or replace function public.watch_room_p2p_send(p_code text,p_token text,p_to uuid,p_payload jsonb)
returns bigint language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.watch_rooms; sender public.watch_room_participants; target public.watch_room_participants; signal_id bigint;
begin
 select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at>now();
 if not found then raise exception 'Room not found or expired.'; end if;
 select * into sender from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and last_seen_at>now()-interval '60 seconds';
 if not found then raise exception 'You are not an active room participant.'; end if;
 select * into target from public.watch_room_participants where id=p_to and room_id=r.id and last_seen_at>now()-interval '60 seconds';
 if not found then raise exception 'P2P target is no longer in this room.'; end if;
 if jsonb_typeof(p_payload)<>'object' or length(p_payload::text)>12000 then raise exception 'Invalid P2P signal.'; end if;
 insert into public.watch_room_p2p_signals(room_id,from_participant_id,to_participant_id,payload)
 values(r.id,sender.id,target.id,p_payload) returning id into signal_id;
 return signal_id;
end $$;
create or replace function public.watch_room_p2p_poll(p_code text,p_token text,p_after bigint default 0)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.watch_rooms; receiver public.watch_room_participants; result jsonb;
begin
 select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at>now();
 if not found then raise exception 'Room not found or expired.'; end if;
 select * into receiver from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and last_seen_at>now()-interval '60 seconds';
 if not found then raise exception 'You are not an active room participant.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'from_participant_id',s.from_participant_id,'payload',s.payload) order by s.id),'[]'::jsonb)
 into result from public.watch_room_p2p_signals s
 where s.room_id=r.id and s.to_participant_id=receiver.id and s.id>coalesce(p_after,0);
 delete from public.watch_room_p2p_signals where room_id=r.id and created_at<now()-interval '10 minutes';
 return result;
end $$;
revoke all on function public.watch_room_p2p_send(text,text,uuid,jsonb) from public;
revoke all on function public.watch_room_p2p_poll(text,text,bigint) from public;
grant execute on function public.watch_room_p2p_send(text,text,uuid,jsonb) to anon,authenticated;
grant execute on function public.watch_room_p2p_poll(text,text,bigint) to anon,authenticated;


-- Security hardening: voice/P2P features were removed from the client.
-- Keep legacy objects for migration compatibility, but disable client access.
revoke all on function public.send_watch_room_voice_signal(text,text,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.poll_watch_room_voice_signals(text,text,bigint) from public, anon, authenticated;
revoke all on function public.watch_room_voice_access(text,text) from public, anon, authenticated;
revoke all on function public.watch_room_p2p_send(text,text,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.watch_room_p2p_poll(text,text,bigint) from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- Temporary anonymous website visitors
-- ---------------------------------------------------------------------------
-- Only engaged browser sessions are registered by the client. A row expires
-- seven days after its last genuine visit; inactive rows are purged on the
-- next registration. No client table access is granted.

create table if not exists public.temporary_visitors (
  id uuid primary key,
  token_hash text not null,
  display_name text not null check (char_length(display_name) between 1 and 32),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

alter table public.temporary_visitors
  alter column expires_at set default (now() + interval '7 days');
create index if not exists temporary_visitors_expires_idx
  on public.temporary_visitors(expires_at);
create index if not exists temporary_visitors_last_seen_idx
  on public.temporary_visitors(last_seen desc);

alter table public.temporary_visitors enable row level security;
revoke all on public.temporary_visitors from public, anon, authenticated;

create or replace function public.register_temporary_visitor(
  p_visitor_id uuid,
  p_token text,
  p_display_name text
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_token_hash text;
begin
  if p_visitor_id is null
     or coalesce(p_token, '') !~ '^[0-9a-fA-F]{64}$'
     or coalesce(length(trim(p_display_name)), 0) not between 1 and 32 then
    raise exception 'Invalid temporary visitor identity.';
  end if;

  v_token_hash := encode(sha256(convert_to(lower(p_token), 'UTF8')), 'hex');

  insert into public.temporary_visitors
    (id, token_hash, display_name, user_id, last_seen, expires_at)
  values
    (p_visitor_id, v_token_hash, trim(p_display_name), auth.uid(), now(), now() + interval '7 days')
  on conflict (id) do update set
    display_name = excluded.display_name,
    user_id = coalesce(temporary_visitors.user_id, excluded.user_id),
    last_seen = now(),
    expires_at = now() + interval '7 days'
  where temporary_visitors.token_hash = excluded.token_hash
    and (temporary_visitors.user_id is null
         or excluded.user_id is null
         or temporary_visitors.user_id = excluded.user_id);

  if not found then
    raise exception 'Temporary visitor identity could not be verified.';
  end if;

  -- Remove records inactive for seven days, including rows created by the
  -- previous eager page-load registration behaviour.
  delete from public.temporary_visitors
  where last_seen <= now() - interval '7 days'
     or expires_at <= now();
  return true;
end;
$$;

revoke all on function public.register_temporary_visitor(uuid, text, text) from public;
grant execute on function public.register_temporary_visitor(uuid, text, text) to anon, authenticated;


-- Public Watch Together rooms. Public visibility is limited to live online movie/series rooms.
alter table public.watch_rooms add column if not exists is_public boolean not null default false;

create or replace function public.set_watch_room_public(p_code text,p_token text,p_public boolean)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.watch_rooms; host public.watch_room_participants;
begin
  select * into r from public.watch_rooms
  where code=upper(trim(p_code)) and closed_at is null and expires_at>now() for update;
  if not found then raise exception 'Room not found or expired.'; end if;
  select * into host from public.watch_room_participants
  where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found or host.role<>'host' then raise exception 'Only the host can change public room visibility.'; end if;
  if p_public and coalesce(r.media->>'kind','')='local_file' then
    raise exception 'Local-file rooms cannot be public.';
  end if;
  update public.watch_rooms set is_public=coalesce(p_public,false), settings=case when coalesce(p_public,false) then jsonb_set(coalesce(settings,'{}'::jsonb),'{locked}','false'::jsonb,true) else settings end where id=r.id;
  return true;
end $$;

create or replace function public.list_public_watch_rooms()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare result jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',wr.id,'code',wr.code,'title',coalesce(wr.media->>'title','Screening room'),
    'poster',coalesce(wr.media->>'poster',''),'media_type',coalesce(wr.media->>'mediaType','movie'),
    'host_name',coalesce(host.display_name,'Host'),
    'viewer_count',(select count(*) from public.watch_room_participants wp where wp.room_id=wr.id and wp.last_seen_at>now()-interval '45 seconds')
  ) order by wr.created_at desc),'[]'::jsonb) into result
  from public.watch_rooms wr
  left join public.watch_room_participants host on host.id=wr.host_participant_id
  where wr.is_public=true and wr.closed_at is null and wr.expires_at>now()
    and coalesce(wr.media->>'kind','')<>'local_file'
    and exists(select 1 from public.watch_room_participants active where active.room_id=wr.id and active.last_seen_at>now()-interval '45 seconds');
  return result;
end $$;

revoke all on function public.set_watch_room_public(text,text,boolean) from public;
revoke all on function public.list_public_watch_rooms() from public;
grant execute on function public.set_watch_room_public(text,text,boolean) to anon,authenticated;
grant execute on function public.list_public_watch_rooms() to anon,authenticated;


-- Active playback protection and participant pause tracking.
-- Protect active playback when a host deletes or ends a room.
alter table public.watch_room_participants
  add column if not exists playback_paused boolean not null default true;

create or replace function public.watch_room_heartbeat(
  p_code text,
  p_token text,
  p_position double precision default null,
  p_duration double precision default null,
  p_paused boolean default null
)
returns boolean language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
declare rid uuid;
begin
  select id into rid from public.watch_rooms
  where code=upper(trim(p_code)) and closed_at is null and expires_at>now();
  if rid is null then return false; end if;
  update public.watch_room_participants set
    last_seen_at=now(),
    playback_position=greatest(0,least(86400,coalesce(p_position,playback_position))),
    playback_duration=greatest(0,least(86400,coalesce(p_duration,playback_duration))),
    playback_updated_at=case when p_position is not null then now() else playback_updated_at end,
    playback_paused=coalesce(p_paused,playback_paused)
  where room_id=rid and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if found then update public.watch_rooms set expires_at=now()+make_interval(mins=>coalesce((settings->>'expiry_minutes')::integer,30)) where id=rid; end if;
  return found;
end $$;

create or replace function public.delete_watch_room(p_code text,p_token text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.watch_rooms;
begin
  select * into r from public.watch_rooms
  where code=upper(trim(p_code))
    and (owner_token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')
      or (auth.uid() is not null and owner_user_id=auth.uid()))
  for update;
  if not found then raise exception 'Room not found or you are not its creator.'; end if;
  delete from public.watch_rooms where id=r.id;
  return true;
end $$;

create or replace function public.close_watch_room(p_code text,p_token text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.watch_rooms; host public.watch_room_participants;
begin
  select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null for update;
  if not found then raise exception 'Room not found or already ended.'; end if;
  select * into host from public.watch_room_participants
  where id=r.host_participant_id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'Only the host can close this room.'; end if;
  delete from public.watch_rooms where id=r.id;
  return true;
end $$;

revoke all on function public.watch_room_heartbeat(text,text,double precision,double precision,boolean) from public;
grant execute on function public.watch_room_heartbeat(text,text,double precision,double precision,boolean) to anon,authenticated;
