-- Public Watch Together rooms. Only live online movie/series rooms are discoverable.
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
