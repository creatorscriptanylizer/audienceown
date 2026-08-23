begin;

-- Publishing accounts describe where content exists. Recovery Pass consent is
-- the sole recipient-authorization boundary for New Video deliveries.
alter table public.creator_update_publishing_accounts
  drop constraint if exists creator_update_publishing_accounts_targeting_rule_snapshot_check;
alter table public.creator_update_publishing_accounts
  add constraint creator_update_publishing_accounts_targeting_rule_snapshot_check
  check (targeting_rule_snapshot in ('account_followers','video_opt_ins','recovery_pass_video_opt_in'));

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
  if (account.account_type='official' and new.role_snapshot<>'main')
    or (account.account_type='backup' and new.role_snapshot<>'recovery')
    or account.account_type not in ('official','backup')
    or new.targeting_rule_snapshot<>'recovery_pass_video_opt_in' then
    raise exception 'publishing account role or consent provenance is not canonical' using errcode='23514';
  end if;
  return new;
end $$;

create or replace function public.refresh_update_publishing_snapshots_on_publish()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target record; canonical_role text;
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
    update public.creator_update_publishing_accounts set
      role_snapshot=canonical_role,targeting_rule_snapshot='recovery_pass_video_opt_in',
      provider_snapshot=target.platform,
      account_display_snapshot=coalesce(target.external_account_name,target.label),
      account_handle_snapshot=null
    where id=target.selected_id;
  end loop;
  return new;
end $$;

create or replace function public.enforce_new_video_publishing_target()
returns trigger language plpgsql security definer set search_path = '' as $$
declare intent public.broadcast_intent;
begin
  select broadcast_intent into intent from public.creator_updates where id=new.update_id;
  if intent<>'new_video' then return new; end if;
  if not exists(
    select 1 from public.follower_connections connection
    join public.follower_category_preferences preference
      on preference.follower_connection_id=connection.id
     and preference.category_key='videos' and preference.enabled=true
    where connection.id=new.connection_id and connection.creator_id=new.creator_id
      and connection.status='active'
  ) then raise exception 'recipient lacks Recovery Pass Video-alert consent' using errcode='23514'; end if;
  return new;
end $$;

revoke all on function public.validate_update_publishing_account_scope(), public.refresh_update_publishing_snapshots_on_publish(), public.enforce_new_video_publishing_target() from public,anon,authenticated;

commit;
