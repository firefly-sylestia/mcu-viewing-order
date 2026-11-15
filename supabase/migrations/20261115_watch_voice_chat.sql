-- Watch Together voice-chat room permission support.
-- Run this once in the Supabase SQL Editor for the live project.

alter table public.watch_rooms
  alter column settings set default '{"locked":false,"chat_enabled":true,"reactions_enabled":true,"guests_can_change_episode":false,"voice_enabled":false,"expiry_minutes":30}'::jsonb;

update public.watch_rooms
set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{voice_enabled}', 'false'::jsonb, true)
where not (coalesce(settings, '{}'::jsonb) ? 'voice_enabled');

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
  'guests_can_change_episode',case when p_settings ? 'guests_can_change_episode' then (p_settings->>'guests_can_change_episode')::boolean else null end,
  'expiry_minutes',case when p_settings ? 'expiry_minutes' then greatest(30,least(1440,(p_settings->>'expiry_minutes')::integer)) else null end
 ));
 update public.watch_rooms set settings=s,expires_at=now()+make_interval(mins=>coalesce((s->>'expiry_minutes')::integer,30)) where id=r.id returning * into r;
 return r.settings;
end $$;

revoke all on function public.update_watch_room_settings(text,text,jsonb) from public;
grant execute on function public.update_watch_room_settings(text,text,jsonb) to anon,authenticated;
