-- Fix the Watch Together create-room alias collision.
-- Run this once in Supabase SQL Editor after the original watch-together.sql.

create or replace function public.create_watch_room(
  p_code text, p_token text, p_name text, p_avatar text, p_media jsonb
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare r public.watch_rooms; p public.watch_room_participants;
begin
  if p_code !~ '^[A-HJ-NP-Z2-9]{8}$' or length(p_token) < 32 then raise exception 'Invalid room credentials.'; end if;
  if coalesce(length(trim(p_name)),0) not between 1 and 32 then raise exception 'Display name must be 1–32 characters.'; end if;
  if coalesce((p_media->>'tmdbId')::bigint,0) <= 0 then raise exception 'This title cannot be screened because its TMDB ID is missing.'; end if;
  if (length(p_media::text) > 12000) then raise exception 'Room media details are too large.'; end if;
  if (select count(*) from public.watch_rooms wr join public.watch_room_participants hp on hp.id=wr.host_participant_id where hp.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and wr.closed_at is null and wr.expires_at > now()) >= 2 then raise exception 'You already have two active screening rooms.'; end if;
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
