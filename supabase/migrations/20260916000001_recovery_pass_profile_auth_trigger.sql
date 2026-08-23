begin;

-- Forward fix for local databases that applied 20260916000000 before the
-- canonical Recovery Pass name was added to the auth-user provisioning path.
create or replace function public.create_creator_for_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare normalized_name text;
begin
  normalized_name := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'),''),split_part(new.email,'@',1),'Creator');
  insert into public.creators(owner_user_id,display_name,public_slug,recovery_pass_name)
  values(new.id,normalized_name,null,left(normalized_name,84)||'''s Recovery Pass')
  on conflict(owner_user_id)do nothing;
  return new;
end $$;
revoke all on function public.create_creator_for_new_user() from public,anon,authenticated;

commit;
