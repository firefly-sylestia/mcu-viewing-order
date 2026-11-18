-- Allow each signed-in user to remove their own Watch Together history.
create or replace function public.delete_watch_together_history(p_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare removed integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to manage synced screening history.';
  end if;
  if p_id is null then
    delete from public.watch_together_history where user_id = auth.uid();
  else
    delete from public.watch_together_history where user_id = auth.uid() and id = p_id;
  end if;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.delete_watch_together_history(uuid) from public, anon;
grant execute on function public.delete_watch_together_history(uuid) to authenticated;
