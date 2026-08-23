begin;

create table public.follower_connection_account_memberships (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  follower_connection_id uuid not null references public.follower_connections(id) on delete cascade,
  connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_connection_id, connected_account_id)
);

create index follower_connection_account_memberships_creator_idx
  on public.follower_connection_account_memberships (creator_id, connected_account_id);

create table public.creator_update_publishing_accounts (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.creator_updates(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete set null,
  connected_account_reference uuid not null,
  role_snapshot text not null check (role_snapshot in ('main','recovery')),
  targeting_rule_snapshot text not null check (targeting_rule_snapshot in ('account_followers','video_opt_ins')),
  provider_snapshot text not null check (char_length(btrim(provider_snapshot)) between 1 and 80),
  account_display_snapshot text not null check (char_length(btrim(account_display_snapshot)) between 1 and 160),
  account_handle_snapshot text check (account_handle_snapshot is null or char_length(btrim(account_handle_snapshot)) between 1 and 160),
  created_at timestamptz not null default now(),
  unique (update_id, connected_account_reference)
);

create index creator_update_publishing_accounts_update_idx
  on public.creator_update_publishing_accounts (update_id, created_at);

create or replace function public.validate_follower_account_membership_scope()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.follower_connections connection
    where connection.id=new.follower_connection_id and connection.creator_id=new.creator_id
  ) then raise exception 'follower connection scope invalid' using errcode='23514'; end if;
  if not exists (
    select 1 from public.connected_accounts account
    where account.id=new.connected_account_id and account.creator_id=new.creator_id
      and account.account_type='official'
  ) then raise exception 'main account scope invalid' using errcode='23514'; end if;
  return new;
end $$;

create trigger validate_follower_account_membership
before insert or update on public.follower_connection_account_memberships
for each row execute function public.validate_follower_account_membership_scope();

create or replace function public.validate_update_publishing_account_scope()
returns trigger language plpgsql set search_path = '' as $$
declare update_creator uuid; account public.connected_accounts%rowtype;
begin
  select creator_id into update_creator from public.creator_updates where id=new.update_id;
  if update_creator is null then raise exception 'update scope invalid' using errcode='23514'; end if;
  if new.connected_account_id is null or new.connected_account_id<>new.connected_account_reference then
    raise exception 'connected account reference invalid' using errcode='23514';
  end if;
  select * into account from public.connected_accounts where id=new.connected_account_id;
  if not found or account.creator_id<>update_creator then
    raise exception 'publishing account scope invalid' using errcode='23514';
  end if;
  if (account.account_type='official' and (new.role_snapshot<>'main' or new.targeting_rule_snapshot<>'account_followers'))
    or (account.account_type='backup' and (new.role_snapshot<>'recovery' or new.targeting_rule_snapshot<>'video_opt_ins')) then
    raise exception 'publishing account role is not canonical' using errcode='23514';
  end if;
  return new;
end $$;

create trigger validate_update_publishing_account
before insert or update on public.creator_update_publishing_accounts
for each row execute function public.validate_update_publishing_account_scope();

-- The canonical publish RPC changes creator_updates.status in the same database
-- transaction that creates deliveries. Refresh and validate public-safe account
-- snapshots immediately before that status transition so account changes cannot
-- race publication.
create or replace function public.refresh_update_publishing_snapshots_on_publish()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target record; canonical_role text; canonical_rule text;
begin
  if new.broadcast_intent <> 'new_video' or new.status not in ('queued','scheduled')
    or old.status = new.status then return new; end if;
  if not exists(select 1 from public.creator_update_publishing_accounts where update_id=new.id) then
    raise exception 'new video publishing accounts required' using errcode='23514';
  end if;
  for target in
    select selected.id selected_id, account.* from public.creator_update_publishing_accounts selected
    join public.connected_accounts account on account.id=selected.connected_account_id
    where selected.update_id=new.id
  loop
    if target.creator_id<>new.creator_id or target.account_type not in ('official','backup') then
      raise exception 'publishing account is no longer available' using errcode='23514';
    end if;
    canonical_role:=case target.account_type when 'official' then 'main' else 'recovery' end;
    canonical_rule:=case target.account_type when 'official' then 'account_followers' else 'video_opt_ins' end;
    update public.creator_update_publishing_accounts set
      role_snapshot=canonical_role,targeting_rule_snapshot=canonical_rule,
      provider_snapshot=target.platform,
      account_display_snapshot=coalesce(target.external_account_name,target.label),
      account_handle_snapshot=null
    where id=target.selected_id;
  end loop;
  return new;
end $$;

create trigger refresh_update_publishing_snapshots
before update of status on public.creator_updates
for each row execute function public.refresh_update_publishing_snapshots_on_publish();

create or replace function public.enforce_new_video_publishing_target()
returns trigger language plpgsql security definer set search_path = '' as $$
declare intent public.broadcast_intent;
begin
  select broadcast_intent into intent from public.creator_updates where id=new.update_id;
  if intent<>'new_video' then return new; end if;
  if not exists(
    select 1 from public.creator_update_publishing_accounts selected
    where selected.update_id=new.update_id and (
      (selected.role_snapshot='main' and exists(
        select 1 from public.follower_connection_account_memberships membership
        where membership.follower_connection_id=new.connection_id
          and membership.connected_account_id=selected.connected_account_reference
          and membership.creator_id=new.creator_id
      )) or
      (selected.role_snapshot='recovery' and exists(
        select 1 from public.follower_recovery_destination_preferences preference
        where preference.follower_connection_id=new.connection_id
          and preference.connected_account_id=selected.connected_account_reference
          and preference.creator_id=new.creator_id and preference.status='active'
      ))
    )
  ) then raise exception 'recipient is outside selected publishing accounts' using errcode='23514'; end if;
  return new;
end $$;

create trigger enforce_new_video_publishing_target
before insert on public.update_deliveries
for each row execute function public.enforce_new_video_publishing_target();

alter table public.follower_connection_account_memberships enable row level security;
alter table public.follower_connection_account_memberships force row level security;
alter table public.creator_update_publishing_accounts enable row level security;
alter table public.creator_update_publishing_accounts force row level security;

create policy "owner reads follower account memberships"
on public.follower_connection_account_memberships for select to authenticated
using (exists(select 1 from public.creators creator where creator.id=creator_id and creator.owner_user_id=auth.uid()));

create policy "owner reads update publishing accounts"
on public.creator_update_publishing_accounts for select to authenticated
using (exists(select 1 from public.creator_updates update_row join public.creators creator on creator.id=update_row.creator_id
  where update_row.id=update_id and creator.owner_user_id=auth.uid()));

create policy "owner creates update publishing accounts"
on public.creator_update_publishing_accounts for insert to authenticated
with check (exists(select 1 from public.creator_updates update_row join public.creators creator on creator.id=update_row.creator_id
  where update_row.id=update_id and update_row.status in ('draft','cancelled') and creator.owner_user_id=auth.uid()));

create policy "owner deletes update publishing accounts"
on public.creator_update_publishing_accounts for delete to authenticated
using (exists(select 1 from public.creator_updates update_row join public.creators creator on creator.id=update_row.creator_id
  where update_row.id=update_id and update_row.status in ('draft','cancelled') and creator.owner_user_id=auth.uid()));

revoke all on public.follower_connection_account_memberships, public.creator_update_publishing_accounts from public,anon,authenticated;
grant select on public.follower_connection_account_memberships to authenticated;
grant select,insert,delete on public.creator_update_publishing_accounts to authenticated;
grant select,insert,update,delete on public.follower_connection_account_memberships, public.creator_update_publishing_accounts to service_role;
revoke all on function public.validate_follower_account_membership_scope(), public.validate_update_publishing_account_scope(), public.refresh_update_publishing_snapshots_on_publish(), public.enforce_new_video_publishing_target() from public,anon,authenticated;

commit;
