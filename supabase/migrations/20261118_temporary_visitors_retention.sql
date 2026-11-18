-- Temporary visitor anti-noise and seven-day inactivity retention.
-- Apply this migration in the Supabase SQL editor after the existing
-- 20261118_temporary_visitors.sql migration.

alter table public.temporary_visitors
  alter column expires_at set default (now() + interval '7 days');

update public.temporary_visitors
set expires_at = last_seen + interval '7 days'
where expires_at is distinct from last_seen + interval '7 days';

delete from public.temporary_visitors
where last_seen <= now() - interval '7 days'
   or expires_at <= now();

create or replace function public.register_temporary_visitor(
  p_visitor_id uuid, p_token text, p_display_name text
) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare v_token_hash text;
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
    and (temporary_visitors.user_id is null or excluded.user_id is null
         or temporary_visitors.user_id = excluded.user_id);

  if not found then raise exception 'Temporary visitor identity could not be verified.'; end if;

  delete from public.temporary_visitors
  where last_seen <= now() - interval '7 days' or expires_at <= now();
  return true;
end;
$$;

revoke all on function public.register_temporary_visitor(uuid, text, text) from public;
grant execute on function public.register_temporary_visitor(uuid, text, text) to anon, authenticated;
