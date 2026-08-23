begin;

create or replace function public.enforce_new_video_publishing_target()
returns trigger language plpgsql security definer set search_path = '' as $$
declare intent public.broadcast_intent; affected_main uuid;
begin
  select broadcast_intent,affected_platform_connection_id into intent,affected_main
  from public.creator_updates where id=new.update_id and creator_id=new.creator_id;
  if intent='new_video' then
    if not exists(
      select 1 from public.follower_connections connection
      join public.follower_category_preferences preference
        on preference.follower_connection_id=connection.id
       and preference.category_key='videos' and preference.enabled=true
      where connection.id=new.connection_id and connection.creator_id=new.creator_id and connection.status='active'
    ) then raise exception 'recipient lacks Recovery Pass Video-alert consent' using errcode='23514'; end if;
    return new;
  end if;
  if intent not in ('account_hacked','account_banned','account_inaccessible','impersonation_warning','platform_migration') then return new; end if;
  if affected_main is null or not exists(
    select 1 from public.follower_connections connection
    join public.follower_category_preferences preference on preference.follower_connection_id=connection.id
      and preference.category_key='recovery' and preference.enabled=true
    where connection.id=new.connection_id and connection.creator_id=new.creator_id and connection.status='active'
      and (
        exists(select 1 from public.follower_connection_account_memberships membership
          where membership.creator_id=new.creator_id and membership.follower_connection_id=new.connection_id
            and membership.connected_account_id=affected_main)
        or exists(select 1 from public.follower_recovery_destination_preferences recovery_preference
          join public.creator_update_recovery_destinations selected
            on selected.update_id=new.update_id and selected.creator_id=new.creator_id
           and selected.connected_account_id=recovery_preference.connected_account_id
          where recovery_preference.creator_id=new.creator_id
            and recovery_preference.follower_connection_id=new.connection_id
            and recovery_preference.status='active')
      )
  ) then raise exception 'recipient is outside selected Emergency account opt-ins' using errcode='23514'; end if;
  return new;
end$$;

revoke all on function public.enforce_new_video_publishing_target() from public,anon,authenticated;

comment on function public.enforce_new_video_publishing_target() is
  'Database boundary for category-scoped New Video recipients and account-scoped Emergency recipients.';

commit;
