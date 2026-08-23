begin;

alter table public.creators
  add column if not exists recovery_pass_name text,
  add column if not exists public_tagline text;

update public.creators
set recovery_pass_name = display_name || '''s Recovery Pass'
where recovery_pass_name is null;

alter table public.creators
  alter column recovery_pass_name set not null,
  drop constraint if exists creators_display_name_check,
  add constraint creators_display_name_check check (char_length(display_name) between 1 and 100),
  add constraint creators_recovery_pass_name_length check (char_length(recovery_pass_name) between 1 and 100),
  add constraint creators_public_tagline_length check (public_tagline is null or char_length(public_tagline) <= 160);

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

create or replace function public.get_public_recovery_pass_profile(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'recoveryPassName', c.recovery_pass_name,
    'displayName', c.display_name,
    'slug', c.public_slug,
    'tagline', c.public_tagline,
    'biography', c.public_bio
  )
  from public.creators c
  where lower(c.public_slug) = lower(btrim(p_slug))
    and c.public_profile_enabled is true
    and c.recovery_pass_enabled is true
  limit 1
$$;

revoke all on function public.get_public_recovery_pass_profile(text) from public;
grant execute on function public.get_public_recovery_pass_profile(text) to anon, authenticated, service_role;

commit;
