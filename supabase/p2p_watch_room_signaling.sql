-- Apply once in Supabase SQL Editor. Also updates the room join limit to 29:
-- Run the updated supabase/setup.sql after this migration to replace join_watch_room's limit.

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


-- Allow the host to persist the experimental P2P toggles.
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
revoke all on function public.update_watch_room_settings(text,text,jsonb) from public;
grant execute on function public.update_watch_room_settings(text,text,jsonb) to anon,authenticated;
