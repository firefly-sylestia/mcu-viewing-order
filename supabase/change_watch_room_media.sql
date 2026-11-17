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
  return to_jsonb(r);
end;
$change_watch_room_media$;

revoke all on function public.change_watch_room_media(text,text,jsonb) from public;
grant execute on function public.change_watch_room_media(text,text,jsonb) to anon, authenticated;
