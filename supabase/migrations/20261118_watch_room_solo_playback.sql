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
  if exists(select 1 from public.watch_room_participants p
    where p.room_id=r.id and p.last_seen_at>now()-interval '45 seconds' and p.playback_paused=false) then
    raise exception 'Someone is still watching. Ask everyone to pause before deleting this room.';
  end if;
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
  if exists(select 1 from public.watch_room_participants p
    where p.room_id=r.id and p.last_seen_at>now()-interval '45 seconds' and p.playback_paused=false) then
    raise exception 'Someone is still watching. Ask everyone to pause before ending this room.';
  end if;
  delete from public.watch_rooms where id=r.id;
  return true;
end $$;

revoke all on function public.watch_room_heartbeat(text,text,double precision,double precision,boolean) from public;
grant execute on function public.watch_room_heartbeat(text,text,double precision,double precision,boolean) to anon,authenticated;
