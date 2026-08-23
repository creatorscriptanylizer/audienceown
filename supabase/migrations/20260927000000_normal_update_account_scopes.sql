begin;

create or replace function public.enforce_new_video_publishing_target()
returns trigger language plpgsql security definer set search_path='' as $$
declare intent public.broadcast_intent; affected_main uuid; preference_key text;
begin
  select broadcast_intent,affected_platform_connection_id into intent,affected_main
  from public.creator_updates where id=new.update_id and creator_id=new.creator_id;
  if intent in ('account_hacked','account_banned','account_inaccessible','impersonation_warning','platform_migration') then
    if affected_main is null or not exists(
      select 1 from public.follower_connections connection
      join public.follower_category_preferences preference on preference.follower_connection_id=connection.id and preference.category_key='recovery' and preference.enabled=true
      where connection.id=new.connection_id and connection.creator_id=new.creator_id and connection.status='active' and (
        exists(select 1 from public.follower_connection_account_memberships membership where membership.creator_id=new.creator_id and membership.follower_connection_id=new.connection_id and membership.connected_account_id=affected_main)
        or exists(select 1 from public.follower_recovery_destination_preferences recovery_preference join public.creator_update_recovery_destinations selected on selected.update_id=new.update_id and selected.creator_id=new.creator_id and selected.connected_account_id=recovery_preference.connected_account_id where recovery_preference.creator_id=new.creator_id and recovery_preference.follower_connection_id=new.connection_id and recovery_preference.status='active')
      )
    ) then raise exception 'recipient is outside selected Emergency account opt-ins' using errcode='23514'; end if;
    return new;
  end if;
  preference_key:=case intent when 'livestream' then 'livestreams' when 'product_release' then 'products' when 'general_announcement' then 'announcements' when 'community_update' then 'announcements' when 'event' then 'announcements' else 'videos' end;
  if not exists(select 1 from public.follower_connections connection join public.follower_category_preferences preference on preference.follower_connection_id=connection.id and preference.category_key=preference_key and preference.enabled=true where connection.id=new.connection_id and connection.creator_id=new.creator_id and connection.status='active') then
    raise exception 'recipient lacks normal Update category consent' using errcode='23514';
  end if;
  if exists(select 1 from public.creator_update_publishing_accounts selected where selected.update_id=new.update_id) and not exists(
    select 1 from public.creator_update_publishing_accounts selected where selected.update_id=new.update_id and (
      selected.role_snapshot='main' and exists(select 1 from public.follower_connection_account_memberships membership where membership.creator_id=new.creator_id and membership.follower_connection_id=new.connection_id and membership.connected_account_id=selected.connected_account_reference)
      or selected.role_snapshot='recovery' and exists(select 1 from public.follower_recovery_destination_preferences recovery_preference where recovery_preference.creator_id=new.creator_id and recovery_preference.follower_connection_id=new.connection_id and recovery_preference.connected_account_id=selected.connected_account_reference and recovery_preference.status='active')
    )
  ) then raise exception 'recipient is outside selected normal Update account opt-ins' using errcode='23514'; end if;
  return new;
end$$;

revoke all on function public.enforce_new_video_publishing_target() from public,anon,authenticated;
comment on function public.enforce_new_video_publishing_target() is 'Database recipient boundary for account-scoped category Updates and account-scoped Emergency communications.';
commit;
