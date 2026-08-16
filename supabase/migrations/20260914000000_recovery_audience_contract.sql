begin;

-- Recovery audience is derived only from explicit Recovery Pass destination
-- preferences. Provider-reported follower/subscriber totals are intentionally
-- absent from this function.
create or replace function public.get_creator_recovery_audience_summary(p_creator_id uuid,p_range text default '30d')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_creator_id uuid; result jsonb;
begin
  if p_range not in ('7d','30d','90d','all') then
    raise exception 'invalid recovery audience range' using errcode = '22023';
  end if;
  select c.id into v_creator_id from public.creators c
    where c.id=p_creator_id and public.has_creator_permission(c.id,'emergency_manage');
  if v_creator_id is null then
    raise exception 'creator access required' using errcode = '42501';
  end if;

  with valid_preferences as (
    select p.id, p.follower_connection_id, f.follower_contact_id, p.selected_at,
      coalesce(p.connected_account_id,p.identity_account_id,p.ecosystem_destination_id) destination_id
    from public.follower_recovery_destination_preferences p
    join public.follower_connections f on f.id=p.follower_connection_id and f.creator_id=p.creator_id
    where p.creator_id=v_creator_id and p.status='active' and f.status='active'
      and (
        exists(select 1 from public.connected_accounts a where a.id=p.connected_account_id
          and a.creator_id=p.creator_id and a.account_type='backup'
          and coalesce(a.connection_health,'disconnected')<>'revoked'
          and coalesce(a.provider_status,'configuration_pending')<>'revoked')
        or exists(select 1 from public.creator_identity_accounts i where i.id=p.identity_account_id
          and i.creator_id=p.creator_id and not i.official and i.account_kind='replacement_account'
          and i.verification_status='verified' and i.revoked_at is null and i.archived_at is null)
        or exists(select 1 from public.creator_ecosystem_destinations e where e.id=p.ecosystem_destination_id
          and e.creator_id=p.creator_id and e.verification_status='verified'
          and e.revoked_at is null and e.archived_at is null)
      )
  ), bounds as (
    select case p_range
      when '7d' then current_date-6 when '30d' then current_date-29
      when '90d' then current_date-89
      else coalesce(min(timezone('UTC',selected_at)::date),current_date) end start_date
    from valid_preferences
  ), days as (
    select generate_series(bounds.start_date,current_date,interval '1 day')::date snapshot_date from bounds
  ), points as (
    select d.snapshot_date,
      count(distinct v.follower_contact_id) filter(where v.selected_at<d.snapshot_date+1)::bigint protected_audience,
      count(distinct v.id) filter(where v.selected_at<d.snapshot_date+1)::bigint recovery_connections
    from days d left join valid_preferences v on v.selected_at<d.snapshot_date+1 group by d.snapshot_date order by d.snapshot_date
  ), totals as (
    select count(distinct follower_contact_id)::bigint protected_audience,
      count(distinct id)::bigint recovery_connections,
      count(distinct destination_id)::bigint recovery_destinations from valid_preferences
  )
  select jsonb_build_object(
    'protectedAudience',totals.protected_audience,
    'recoveryConnections',totals.recovery_connections,
    'recoveryDestinations',totals.recovery_destinations,
    'growth',jsonb_build_object('range',p_range,'historySource','recovery_pass_destination_selected_at',
      'points',coalesce((select jsonb_agg(jsonb_build_object('date',points.snapshot_date,
        'protectedAudience',points.protected_audience,'recoveryConnections',points.recovery_connections)
        order by points.snapshot_date) from points),'[]'::jsonb))
  ) into strict result from totals;
  return result;
end $$;

revoke all on function public.get_creator_recovery_audience_summary(uuid,text) from public,anon;
grant execute on function public.get_creator_recovery_audience_summary(uuid,text) to authenticated;

commit;
