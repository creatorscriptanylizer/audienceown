-- Stage 12.3: a new creator chooses their permanent Recovery Pass during onboarding.
begin;

alter table public.creators alter column public_slug drop not null;
alter table public.creators drop constraint if exists creators_public_slug_format;
alter table public.creators add constraint creators_public_slug_format check(
  public_slug is null or (
    public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(public_slug) between 3 and 40
  )
);

create or replace function public.create_creator_for_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.creators(owner_user_id,display_name,public_slug)
  values(new.id,coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'),''),split_part(new.email,'@',1),'Creator'),null)
  on conflict(owner_user_id)do nothing;
  return new;
end $$;
revoke all on function public.create_creator_for_new_user() from public,anon,authenticated;

-- Identity/authenticity records are created only after a public identity exists.
create or replace function public.create_authenticity_profile_from_identity()returns trigger
language plpgsql set search_path=''as $$
begin
  insert into public.creator_authenticity_profiles(creator_id,identity_profile_id,public_slug)
  select new.creator_id,new.id,c.public_slug from public.creators c
  where c.id=new.creator_id and c.public_slug is not null
  on conflict(creator_id)do nothing;
  return new;
end$$;

commit;
