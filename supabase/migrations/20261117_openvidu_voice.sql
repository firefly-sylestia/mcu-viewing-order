-- OpenVidu v3 voice authorization for Watch Together.
-- The OpenVidu API secret stays on the Vercel server; this RPC only validates room membership.
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
