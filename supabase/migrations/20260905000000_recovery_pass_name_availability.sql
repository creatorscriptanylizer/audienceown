-- Stage 12.4: narrow, authenticated Recovery Pass name availability lookup.
begin;

create or replace function public.check_recovery_pass_name_availability(p_slug text)
returns text
language sql
stable
security definer
set search_path=''
as $$
  select case
    when auth.uid() is null then 'unauthenticated'
    when exists(
      select 1 from public.creators c
      where lower(c.public_slug)=lower(p_slug)
        and c.owner_user_id<>auth.uid()
      limit 1
    ) then 'taken'
    else 'available'
  end
$$;

revoke all on function public.check_recovery_pass_name_availability(text) from public,anon;
grant execute on function public.check_recovery_pass_name_availability(text) to authenticated;

commit;
