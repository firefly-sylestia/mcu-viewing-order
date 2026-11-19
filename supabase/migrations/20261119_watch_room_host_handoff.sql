-- When the host ends a screening, active participants keep watching.
-- Each participant detects the deleted room and creates a new private room
-- with their own participant token and the current playback position.

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
  select * into r from public.watch_rooms
  where code=upper(trim(p_code)) and closed_at is null
  for update;
  if not found then raise exception 'Room not found or already ended.'; end if;
  select * into host from public.watch_room_participants
  where id=r.host_participant_id
    and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'Only the host can close this room.'; end if;
  delete from public.watch_rooms where id=r.id;
  return true;
end $$;

revoke all on function public.delete_watch_room(text,text) from public;
revoke all on function public.close_watch_room(text,text) from public;
grant execute on function public.delete_watch_room(text,text) to anon,authenticated;
grant execute on function public.close_watch_room(text,text) to anon,authenticated;
