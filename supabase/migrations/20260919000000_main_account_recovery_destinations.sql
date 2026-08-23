begin;

create table public.main_account_recovery_destinations (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  main_connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  recovery_connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (main_connected_account_id, recovery_connected_account_id),
  check (main_connected_account_id <> recovery_connected_account_id)
);

create index main_account_recovery_destinations_creator_idx
  on public.main_account_recovery_destinations (creator_id, main_connected_account_id);
create index main_account_recovery_destinations_recovery_idx
  on public.main_account_recovery_destinations (recovery_connected_account_id);

create or replace function public.validate_main_account_recovery_destination()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.connected_accounts account
    where account.id = new.main_connected_account_id
      and account.creator_id = new.creator_id
      and account.account_type = 'official'
      and account.connection_health not in ('revoked','expired')
      and account.provider_status <> 'revoked'
  ) then raise exception 'active creator-owned Main account required' using errcode='23514'; end if;
  if not exists (
    select 1 from public.connected_accounts account
    where account.id = new.recovery_connected_account_id
      and account.creator_id = new.creator_id
      and account.account_type = 'backup'
      and account.connection_health not in ('revoked','expired')
      and account.provider_status <> 'revoked'
  ) then raise exception 'active creator-owned Recovery account required' using errcode='23514'; end if;
  return new;
end $$;

create trigger validate_main_account_recovery_destination
before insert or update on public.main_account_recovery_destinations
for each row execute function public.validate_main_account_recovery_destination();

alter table public.main_account_recovery_destinations enable row level security;
alter table public.main_account_recovery_destinations force row level security;

create policy "owner reads recovery networks" on public.main_account_recovery_destinations
for select to authenticated using (exists (
  select 1 from public.creators creator
  where creator.id = creator_id and creator.owner_user_id = auth.uid()
));

create or replace function public.set_main_account_recovery_destinations(
  p_creator_id uuid, p_main_account_id uuid, p_recovery_account_ids uuid[]
) returns integer language plpgsql security definer set search_path = '' as $$
declare recovery_id uuid; normalized uuid[]; result_count integer;
begin
  if not exists(select 1 from public.creators where id=p_creator_id and owner_user_id=auth.uid()) then
    raise exception 'recovery network not found' using errcode='42501';
  end if;
  if not exists(select 1 from public.connected_accounts where id=p_main_account_id and creator_id=p_creator_id and account_type='official'
    and connection_health not in ('revoked','expired') and provider_status<>'revoked') then
    raise exception 'active creator-owned Main account required' using errcode='23514';
  end if;
  select coalesce(array_agg(distinct value),array[]::uuid[]) into normalized from unnest(coalesce(p_recovery_account_ids,array[]::uuid[])) value;
  foreach recovery_id in array normalized loop
    if not exists(select 1 from public.connected_accounts where id=recovery_id and creator_id=p_creator_id and account_type='backup'
      and connection_health not in ('revoked','expired') and provider_status<>'revoked') then
      raise exception 'active creator-owned Recovery account required' using errcode='23514';
    end if;
  end loop;
  delete from public.main_account_recovery_destinations where creator_id=p_creator_id and main_connected_account_id=p_main_account_id
    and not (recovery_connected_account_id=any(normalized));
  insert into public.main_account_recovery_destinations(creator_id,main_connected_account_id,recovery_connected_account_id)
    select p_creator_id,p_main_account_id,value from unnest(normalized) value on conflict do nothing;
  select count(*) into result_count from public.main_account_recovery_destinations where creator_id=p_creator_id and main_connected_account_id=p_main_account_id;
  return result_count;
end $$;

revoke all on public.main_account_recovery_destinations from public, anon, authenticated;
grant select on public.main_account_recovery_destinations to authenticated;
grant select, insert, update, delete on public.main_account_recovery_destinations to service_role;
revoke all on function public.validate_main_account_recovery_destination() from public, anon, authenticated;
revoke all on function public.set_main_account_recovery_destinations(uuid,uuid,uuid[]) from public, anon;
grant execute on function public.set_main_account_recovery_destinations(uuid,uuid,uuid[]) to authenticated;

-- Existing flat rows are intentionally left unassigned. There is no reliable
-- cross-provider evidence from which to infer a recovery relationship.
comment on table public.main_account_recovery_destinations is
  'Creator-owned many-to-many links from Main connected accounts to reusable Recovery connected accounts.';

commit;
