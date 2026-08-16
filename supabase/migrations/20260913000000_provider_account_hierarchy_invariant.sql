-- A provider hierarchy is creator/provider scoped. Acquisition provenance is not
-- part of the relationship: one official owns every backup for that provider.
do $$
begin
  if exists (
    select 1 from public.connected_accounts
    where account_type = 'official'
    group by creator_id, platform
    having count(*) > 1
  ) then
    raise exception 'cannot enforce provider hierarchy: multiple official accounts exist for a creator/provider';
  end if;
end $$;

create unique index if not exists connected_accounts_one_official_per_provider
  on public.connected_accounts (creator_id, platform)
  where account_type = 'official';

create or replace function public.reconcile_provider_account_hierarchy(
  p_creator_id uuid,
  p_platform text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  official_id uuid;
  official_count integer;
begin
  if p_creator_id is null or p_platform is null then return null; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_creator_id::text || ':' || p_platform, 0));
  select count(*) into official_count
  from public.connected_accounts
  where creator_id = p_creator_id and platform = p_platform and account_type = 'official';

  if official_count > 1 then
    raise exception 'multiple official accounts exist for creator/provider' using errcode = '23505';
  end if;
  select id into official_id from public.connected_accounts
  where creator_id = p_creator_id and platform = p_platform and account_type = 'official'
  limit 1;

  update public.connected_accounts
  set protected_official_account_id = official_id
  where creator_id = p_creator_id
    and platform = p_platform
    and account_type = 'backup'
    and protected_official_account_id is distinct from official_id;

  return official_id;
end
$$;

revoke all on function public.reconcile_provider_account_hierarchy(uuid, text) from public, anon, authenticated;
grant execute on function public.reconcile_provider_account_hierarchy(uuid, text) to service_role;

create or replace function public.validate_connected_account_protection() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  official_id uuid;
  official_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.creator_id::text || ':' || new.platform, 0));

  if new.account_type = 'official' then
    new.protected_official_account_id := null;
    if exists (
      select 1 from public.connected_accounts a
      where a.creator_id = new.creator_id and a.platform = new.platform
        and a.account_type = 'official' and a.id <> new.id
    ) then
      raise exception 'only one official account is allowed per creator/provider' using errcode = '23505';
    end if;
    return new;
  end if;

  select count(*) into official_count
  from public.connected_accounts a
  where a.creator_id = new.creator_id and a.platform = new.platform
    and a.account_type = 'official' and a.id <> new.id;
  if official_count > 1 then
    raise exception 'multiple official accounts exist for creator/provider' using errcode = '23505';
  end if;
  select id into official_id from public.connected_accounts a
  where a.creator_id = new.creator_id and a.platform = new.platform
    and a.account_type = 'official' and a.id <> new.id
  limit 1;

  -- The canonical official, including NULL when none exists, is authoritative.
  -- Caller-supplied acquisition state can never create a stale relationship.
  new.protected_official_account_id := official_id;
  return new;
end
$$;

create or replace function public.reconcile_connected_account_hierarchy_trigger() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then return null; end if;

  if tg_op = 'DELETE' then
    perform public.reconcile_provider_account_hierarchy(old.creator_id, old.platform);
  elsif tg_op = 'UPDATE' then
    if old.creator_id is distinct from new.creator_id or old.platform is distinct from new.platform then
      perform public.reconcile_provider_account_hierarchy(old.creator_id, old.platform);
    end if;
    perform public.reconcile_provider_account_hierarchy(new.creator_id, new.platform);
  else
    perform public.reconcile_provider_account_hierarchy(new.creator_id, new.platform);
  end if;
  return null;
end
$$;

drop trigger if exists reconcile_connected_account_hierarchy on public.connected_accounts;
create trigger reconcile_connected_account_hierarchy
after insert or delete or update of creator_id, platform, account_type, protected_official_account_id
on public.connected_accounts
for each row execute function public.reconcile_connected_account_hierarchy_trigger();

-- Safe legacy reconciliation: the ambiguity guard above has already proved that
-- each creator/provider has at most one official.
do $$
declare provider record;
begin
  for provider in
    select distinct creator_id, platform from public.connected_accounts
  loop
    perform public.reconcile_provider_account_hierarchy(provider.creator_id, provider.platform);
  end loop;
end $$;
