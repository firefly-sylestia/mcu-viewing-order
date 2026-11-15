-- Incursion Watch Together
-- Run once in Supabase SQL Editor. Uses the project's existing Supabase project.
-- Guest access is mediated by SECURITY DEFINER RPCs; tables are not directly exposed.

create extension if not exists pgcrypto;

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
  closed_at timestamptz
);

create table if not exists public.watch_room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.watch_rooms(id) on delete cascade,
  token_hash text not null,
  display_name text not null check (char_length(display_name) between 1 and 32),
  avatar_url text not null default '',
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(room_id, token_hash)
);

alter table public.watch_rooms
  drop constraint if exists watch_rooms_host_participant_id_fkey;
alter table public.watch_rooms
  add constraint watch_rooms_host_participant_id_fkey
  foreign key (host_participant_id) references public.watch_room_participants(id) on delete set null;

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
create index if not exists watch_room_participants_presence_idx on public.watch_room_participants(room_id, last_seen_at desc);
create index if not exists watch_room_messages_room_idx on public.watch_room_messages(room_id, id desc);

alter table public.watch_rooms enable row level security;
alter table public.watch_room_participants enable row level security;
alter table public.watch_room_messages enable row level security;

revoke all on public.watch_rooms from anon, authenticated;
revoke all on public.watch_room_participants from anon, authenticated;
revoke all on public.watch_room_messages from anon, authenticated;
revoke all on sequence public.watch_room_messages_id_seq from anon, authenticated;

create or replace function public.create_watch_room(
  p_code text, p_token text, p_name text, p_avatar text, p_media jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants;
begin
  if p_code !~ '^[A-HJ-NP-Z2-9]{8}$' or length(p_token) < 32 then raise exception 'Invalid room credentials.'; end if;
  if coalesce(length(trim(p_name)),0) not between 1 and 32 then raise exception 'Display name must be 1–32 characters.'; end if;
  if coalesce((p_media->>'tmdbId')::bigint,0) <= 0 then raise exception 'This title cannot be screened because its TMDB ID is missing.'; end if;
  delete from public.watch_rooms where expires_at < now() or closed_at is not null;
  insert into public.watch_rooms(code, media, playback)
  values (p_code, p_media, jsonb_build_object('position',0,'paused',true,'season',greatest(1,coalesce((p_media->>'season')::integer,1)),'episode',greatest(1,coalesce((p_media->>'episode')::integer,1)),'updated_at',now()))
  returning * into r;
  insert into public.watch_room_participants(room_id, token_hash, display_name, avatar_url, is_host)
  values (r.id, encode(sha256(convert_to(p_token,'UTF8')),'hex'), trim(p_name), left(coalesce(p_avatar,''),1000), true)
  returning * into p;
  update public.watch_rooms set host_participant_id=p.id where id=r.id returning * into r;
  return jsonb_build_object(
    'room', to_jsonb(r),
    'participant', jsonb_build_object('id',p.id,'token',p_token,'display_name',p.display_name,'avatar_url',p.avatar_url,'is_host',p.is_host),
    'participants', jsonb_build_array(jsonb_build_object('id',p.id,'display_name',p.display_name,'avatar_url',p.avatar_url,'is_host',p.is_host)),
    'messages', '[]'::jsonb
  );
end $$;

create or replace function public.join_watch_room(
  p_code text, p_token text, p_name text, p_avatar text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants; parts jsonb; msgs jsonb;
begin
  if length(p_token) < 32 then raise exception 'Invalid guest token.'; end if;
  select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at > now();
  if not found then raise exception 'Room not found or expired.'; end if;
  insert into public.watch_room_participants(room_id, token_hash, display_name, avatar_url)
  values (r.id, encode(sha256(convert_to(p_token,'UTF8')),'hex'), left(trim(p_name),32), left(coalesce(p_avatar,''),1000))
  on conflict(room_id,token_hash) do update set display_name=excluded.display_name, avatar_url=excluded.avatar_url, last_seen_at=now()
  returning * into p;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'display_name',display_name,'avatar_url',avatar_url,'is_host',is_host) order by joined_at),'[]'::jsonb)
  into parts from public.watch_room_participants where room_id=r.id and last_seen_at > now()-interval '45 seconds';
  select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]'::jsonb) into msgs
  from (select id,participant_id,display_name,avatar_url,body,created_at from public.watch_room_messages where room_id=r.id order by id desc limit 60) m;
  return jsonb_build_object('room',to_jsonb(r),'participant',jsonb_build_object('id',p.id,'token',p_token,'display_name',p.display_name,'avatar_url',p.avatar_url,'is_host',p.is_host),'participants',parts,'messages',msgs);
end $$;

create or replace function public.watch_room_snapshot(p_code text, p_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants; parts jsonb; msgs jsonb;
begin
  select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at > now();
  if not found then raise exception 'Room not found or expired.'; end if;
  select * into p from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'You are not a member of this room.'; end if;
  update public.watch_room_participants set last_seen_at=now() where id=p.id;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'display_name',display_name,'avatar_url',avatar_url,'is_host',is_host) order by joined_at),'[]'::jsonb)
  into parts from public.watch_room_participants where room_id=r.id and last_seen_at > now()-interval '45 seconds';
  select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]'::jsonb) into msgs
  from (select id,participant_id,display_name,avatar_url,body,created_at from public.watch_room_messages where room_id=r.id order by id desc limit 60) m;
  return jsonb_build_object('room',to_jsonb(r),'participants',parts,'messages',msgs);
end $$;

create or replace function public.watch_room_heartbeat(p_code text,p_token text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare rid uuid;
begin
  select id into rid from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at > now();
  if rid is null then return false; end if;
  update public.watch_room_participants set last_seen_at=now()
  where room_id=rid and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  return found;
end $$;

create or replace function public.set_watch_room_playback(p_code text,p_token text,p_playback jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants; next_state jsonb;
begin
  select * into r from public.watch_rooms where code=upper(trim(p_code)) and closed_at is null and expires_at > now() for update;
  if not found then raise exception 'Room not found or expired.'; end if;
  select * into p from public.watch_room_participants where room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'You are not a member of this room.'; end if;
  next_state := jsonb_build_object(
    'position', greatest(0,least(86400,coalesce((p_playback->>'position')::double precision,0))),
    'paused', coalesce((p_playback->>'paused')::boolean,true),
    'season', greatest(1,least(99,coalesce((p_playback->>'season')::integer,1))),
    'episode', greatest(1,least(999,coalesce((p_playback->>'episode')::integer,1))),
    'updated_at', now(),
    'actor', p.id
  );
  update public.watch_rooms set playback=next_state,state_version=state_version+1,updated_at=now(),
    expires_at=greatest(expires_at,now()+interval '2 hours')
  where id=r.id returning * into r;
  update public.watch_room_participants set last_seen_at=now() where id=p.id;
  return jsonb_build_object('state_version',r.state_version,'playback',r.playback);
end $$;

create or replace function public.send_watch_room_message(p_code text,p_token text,p_body text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
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
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare rid uuid;
begin
  select id into rid from public.watch_rooms where code=upper(trim(p_code));
  if rid is null then return false; end if;
  update public.watch_room_participants set last_seen_at=now()-interval '2 minutes'
  where room_id=rid and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  return found;
end $$;

create or replace function public.close_watch_room(p_code text,p_token text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare rid uuid;
begin
  select r.id into rid from public.watch_rooms r join public.watch_room_participants p on p.id=r.host_participant_id
  where r.code=upper(trim(p_code)) and p.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if rid is null then raise exception 'Only the host can close this room.'; end if;
  update public.watch_rooms set closed_at=now(),expires_at=now() where id=rid;
  return true;
end $$;

revoke all on function public.create_watch_room(text,text,text,text,jsonb) from public;
revoke all on function public.join_watch_room(text,text,text,text) from public;
revoke all on function public.watch_room_snapshot(text,text) from public;
revoke all on function public.watch_room_heartbeat(text,text) from public;
revoke all on function public.set_watch_room_playback(text,text,jsonb) from public;
revoke all on function public.send_watch_room_message(text,text,text) from public;
revoke all on function public.leave_watch_room(text,text) from public;
revoke all on function public.close_watch_room(text,text) from public;

grant execute on function public.create_watch_room(text,text,text,text,jsonb) to anon, authenticated;
grant execute on function public.join_watch_room(text,text,text,text) to anon, authenticated;
grant execute on function public.watch_room_snapshot(text,text) to anon, authenticated;
grant execute on function public.watch_room_heartbeat(text,text) to anon, authenticated;
grant execute on function public.set_watch_room_playback(text,text,jsonb) to anon, authenticated;
grant execute on function public.send_watch_room_message(text,text,text) to anon, authenticated;
grant execute on function public.leave_watch_room(text,text) to anon, authenticated;
grant execute on function public.close_watch_room(text,text) to anon, authenticated;

-- Optional cleanup job: enable pg_cron in Supabase and schedule:
-- select cron.schedule('cleanup-watch-rooms','*/15 * * * *',
--   $$delete from public.watch_rooms where expires_at < now() or closed_at is not null$$);
