-- Refine the canonical slot to active lifecycle rows. Disconnected manual rows
-- remain valid accounts; revoked/expired rows do not block a replacement.
drop index if exists public.connected_accounts_one_official_per_provider;

do $$
begin
  if exists (
    select 1 from public.connected_accounts
    where account_type = 'official'
      and connection_health not in ('revoked','expired')
      and provider_status <> 'revoked'
    group by creator_id, platform
    having count(*) > 1
  ) then
    raise exception 'cannot enforce provider hierarchy: multiple active official accounts exist for a creator/provider';
  end if;
end $$;

create unique index connected_accounts_one_official_per_provider
  on public.connected_accounts (creator_id, platform)
  where account_type = 'official'
    and connection_health not in ('revoked','expired')
    and provider_status <> 'revoked';

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

  select count(*) into official_count from public.connected_accounts
  where creator_id = p_creator_id and platform = p_platform and account_type = 'official'
    and connection_health not in ('revoked','expired') and provider_status <> 'revoked';
  if official_count > 1 then
    raise exception 'multiple active official accounts exist for creator/provider' using errcode = '23505';
  end if;
  select id into official_id from public.connected_accounts
  where creator_id = p_creator_id and platform = p_platform and account_type = 'official'
    and connection_health not in ('revoked','expired') and provider_status <> 'revoked'
  limit 1;

  update public.connected_accounts set protected_official_account_id = official_id
  where creator_id = p_creator_id and platform = p_platform and account_type = 'backup'
    and connection_health not in ('revoked','expired') and provider_status <> 'revoked'
    and protected_official_account_id is distinct from official_id;
  return official_id;
end
$$;

create or replace function public.validate_connected_account_protection() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  official_id uuid;
  official_count integer;
  new_is_active boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.creator_id::text || ':' || new.platform, 0));
  new_is_active := new.connection_health not in ('revoked','expired') and new.provider_status <> 'revoked';

  if new.account_type = 'official' then
    new.protected_official_account_id := null;
    if new_is_active and exists (
      select 1 from public.connected_accounts a
      where a.creator_id = new.creator_id and a.platform = new.platform and a.account_type = 'official'
        and a.connection_health not in ('revoked','expired') and a.provider_status <> 'revoked' and a.id <> new.id
    ) then
      raise exception 'only one active official account is allowed per creator/provider' using errcode = '23505';
    end if;
    return new;
  end if;

  if not new_is_active then
    new.protected_official_account_id := null;
    return new;
  end if;
  select count(*) into official_count from public.connected_accounts a
  where a.creator_id = new.creator_id and a.platform = new.platform and a.account_type = 'official'
    and a.connection_health not in ('revoked','expired') and a.provider_status <> 'revoked' and a.id <> new.id;
  if official_count > 1 then
    raise exception 'multiple active official accounts exist for creator/provider' using errcode = '23505';
  end if;
  select id into official_id from public.connected_accounts a
  where a.creator_id = new.creator_id and a.platform = new.platform and a.account_type = 'official'
    and a.connection_health not in ('revoked','expired') and a.provider_status <> 'revoked' and a.id <> new.id
  limit 1;
  new.protected_official_account_id := official_id;
  return new;
end
$$;

drop trigger if exists validate_connected_account_protection on public.connected_accounts;
create trigger validate_connected_account_protection
before insert or update of account_type, creator_id, platform, protected_official_account_id, connection_health, provider_status
on public.connected_accounts for each row execute function public.validate_connected_account_protection();

drop trigger if exists reconcile_connected_account_hierarchy on public.connected_accounts;
create trigger reconcile_connected_account_hierarchy
after insert or delete or update of creator_id, platform, account_type, protected_official_account_id, connection_health, provider_status
on public.connected_accounts for each row execute function public.reconcile_connected_account_hierarchy_trigger();

do $$
declare provider record;
begin
  for provider in select distinct creator_id, platform from public.connected_accounts loop
    perform public.reconcile_provider_account_hierarchy(provider.creator_id, provider.platform);
  end loop;
end $$;
