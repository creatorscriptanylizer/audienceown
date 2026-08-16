-- Make Recovery Pass creation owner-scoped and atomic, and allow the internal
-- authenticity projection trigger to maintain its protected table.
begin;

create or replace function public.sync_authenticity_public_slug()returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.public_slug is distinct from old.public_slug then
    update public.creator_authenticity_profiles
    set public_slug=new.public_slug,presentation_revision=presentation_revision+1
    where creator_id=new.id;
  end if;
  return new;
end$$;
revoke all on function public.sync_authenticity_public_slug() from public,anon,authenticated;

create or replace function public.create_recovery_pass(p_display_name text,p_slug text)
returns text language plpgsql set search_path='' as $$
declare
  owned_creator_id uuid;
  normalized_slug text:=lower(btrim(p_slug));
  normalized_name text:=btrim(p_display_name);
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;
  if normalized_name is null or char_length(normalized_name) not between 1 and 80 then
    raise exception 'invalid display name' using errcode='22023';
  end if;
  if normalized_slug is null
    or normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(normalized_slug) not between 3 and 40
    or normalized_slug=any(array['admin','api','auth','c','dashboard','login','logout','register','signup','settings','support','pricing','about','terms','privacy','onboarding']) then
    raise exception 'invalid or reserved creator name' using errcode='22023';
  end if;

  update public.creators
  set display_name=normalized_name,
      public_slug=normalized_slug,
      public_profile_enabled=true,
      recovery_pass_enabled=true
  where owner_user_id=auth.uid()
  returning id into owned_creator_id;
  if owned_creator_id is null then
    raise exception 'creator not found' using errcode='42501';
  end if;

  update public.creator_onboarding
  set recovery_pass_completed_at=coalesce(recovery_pass_completed_at,now())
  where creator_onboarding.creator_id=owned_creator_id;
  if not found then
    raise exception 'creator onboarding state not found' using errcode='P0002';
  end if;

  return normalized_slug;
end$$;
revoke all on function public.create_recovery_pass(text,text) from public,anon;
grant execute on function public.create_recovery_pass(text,text) to authenticated;

commit;
