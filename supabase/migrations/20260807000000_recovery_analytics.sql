begin;

create table public.creator_recovery_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null,
  snapshot_date date not null default current_date,
  total_relationships integer not null check (total_relationships >= 0),
  recovery_ready_relationships integer not null check (recovery_ready_relationships >= 0),
  uncovered_relationships integer not null check (uncovered_relationships >= 0),
  partially_configured_relationships integer not null check (partially_configured_relationships >= 0),
  email_count integer not null check (email_count >= 0),
  browser_notification_count integer not null check (browser_notification_count >= 0),
  sms_count integer not null check (sms_count >= 0),
  whatsapp_count integer not null check (whatsapp_count >= 0),
  created_at timestamptz not null default now(),
  unique(creator_user_id, snapshot_date)
);
create index creator_recovery_snapshots_owner_date_idx
  on public.creator_recovery_daily_snapshots(creator_user_id, snapshot_date desc);
alter table public.creator_recovery_daily_snapshots enable row level security;
alter table public.creator_recovery_daily_snapshots force row level security;
revoke all on public.creator_recovery_daily_snapshots from public, anon, authenticated;
grant select on public.creator_recovery_daily_snapshots to authenticated;
grant select, insert, update on public.creator_recovery_daily_snapshots to service_role;
create policy creator_recovery_snapshots_own_select
on public.creator_recovery_daily_snapshots for select to authenticated
using (creator_user_id = auth.uid());

create or replace function public.is_recovery_method_usable(
  p_method_id uuid,
  p_contact_id uuid
)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.follower_recovery_methods method
    where method.id = p_method_id
      and method.follower_contact_id = p_contact_id
      and method.method_status = 'verified'
      and method.verified_at is not null
      and method.consent_revoked_at is null
      and method.opted_out_at is null
      and not coalesce(method.failure_code = any(array[
        'invalid_destination','opted_out','not_opted_in','not_whatsapp_capable',
        'blocked_destination','template_not_approved','template_paused',
        'template_disabled','provider_configuration','provider_not_configured'
      ]), false)
      and (
        method.method_type <> 'web_push'
        or nullif(btrim(method.provider_identifier), '') is not null
      )
      and (
        method.method_type <> 'whatsapp'
        or (
          method.consent_purpose = 'recovery_alerts_whatsapp'
          and method.consent_version is not null
          and method.consented_at is not null
        )
      )
      and (
        method.method_type <> 'sms'
        or method.consented_at is not null
      )
  )
$$;
revoke all on function public.is_recovery_method_usable(uuid,uuid)
  from public, anon, authenticated;

create or replace function public.get_creator_recovery_coverage()
returns table(
  total_relationships bigint,
  recovery_ready_relationships bigint,
  uncovered_relationships bigint,
  partially_configured_relationships bigint,
  recovery_coverage_rate numeric,
  change_vs_previous_snapshot numeric,
  last_snapshot_at timestamptz
) language plpgsql stable security definer set search_path = ''
as $$
declare v_creator_id uuid; current_ready bigint; previous_rate numeric;
begin
  select id into v_creator_id from public.creators where owner_user_id = auth.uid();
  if v_creator_id is null then raise exception 'creator access required' using errcode = '42501'; end if;
  return query
  with relationships as (
    select connection.id, connection.follower_contact_id,
      public.is_recovery_method_usable(
        connection.selected_recovery_method_id, connection.follower_contact_id
      ) ready,
      exists(select 1 from public.follower_recovery_methods method
        where method.follower_contact_id = connection.follower_contact_id) has_method
    from public.follower_connections connection
    where connection.creator_id = v_creator_id and connection.status = 'active'
  ), totals as (
    select count(*) total,
      count(*) filter(where ready) ready,
      count(*) filter(where not ready and not has_method) uncovered,
      count(*) filter(where not ready and has_method) partial
    from relationships
  ), snapshots as (
    select daily.snapshot_date, daily.created_at,
      case when daily.total_relationships = 0 then 0
        else daily.recovery_ready_relationships * 100.0 / daily.total_relationships end rate
    from public.creator_recovery_daily_snapshots daily
    where daily.creator_user_id = auth.uid()
    order by daily.snapshot_date desc limit 2
  ), snapshot_values as (
    select max(created_at) latest_at,
      max(rate) filter(where position = 2) previous
    from (select *, row_number() over(order by snapshot_date desc) position from snapshots) ranked
  )
  select totals.total, totals.ready, totals.uncovered, totals.partial,
    case when totals.total = 0 then 0 else round(totals.ready * 100.0 / totals.total, 2) end,
    case when snapshot_values.previous is null then null
      else round((case when totals.total = 0 then 0 else totals.ready * 100.0 / totals.total end)
        - snapshot_values.previous, 2) end,
    snapshot_values.latest_at
  from totals cross join snapshot_values;
end
$$;

create or replace function public.get_creator_recovery_transport_breakdown()
returns table(
  transport public.delivery_transport,
  relationship_count bigint,
  percentage_of_total_audience numeric,
  percentage_of_recovery_ready numeric
) language plpgsql stable security definer set search_path = ''
as $$
declare v_creator_id uuid;
begin
  select id into v_creator_id from public.creators where owner_user_id = auth.uid();
  if v_creator_id is null then raise exception 'creator access required' using errcode = '42501'; end if;
  return query
  with relationships as (
    select connection.id,
      case method.method_type
        when 'email' then 'email'::public.delivery_transport
        when 'sms' then 'sms'::public.delivery_transport
        when 'whatsapp' then 'whatsapp'::public.delivery_transport
        when 'web_push' then 'browser_notification'::public.delivery_transport
      end transport,
      public.is_recovery_method_usable(method.id, connection.follower_contact_id) ready
    from public.follower_connections connection
    left join public.follower_recovery_methods method
      on method.id = connection.selected_recovery_method_id
    where connection.creator_id = v_creator_id and connection.status = 'active'
  ), totals as (
    select count(*) total, count(*) filter(where ready) ready from relationships
  ), supported as (
    select unnest(enum_range(null::public.delivery_transport)) transport
  )
  select supported.transport, count(relationships.id) filter(where relationships.ready),
    case when totals.total = 0 then 0 else round(
      count(relationships.id) filter(where relationships.ready) * 100.0 / totals.total, 2) end,
    case when totals.ready = 0 then 0 else round(
      count(relationships.id) filter(where relationships.ready) * 100.0 / totals.ready, 2) end
  from supported cross join totals
  left join relationships on relationships.transport = supported.transport
  group by supported.transport, totals.total, totals.ready order by supported.transport;
end
$$;

create or replace function public.get_creator_recovery_coverage_trend(p_days integer default 30)
returns table(
  snapshot_date date, total_relationships integer,
  recovery_ready_relationships integer, recovery_coverage_rate numeric,
  history_source text
) language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_days < 1 or p_days > 365 then raise exception 'invalid trend range' using errcode = '22023'; end if;
  if not exists(select 1 from public.creators where owner_user_id = auth.uid()) then
    raise exception 'creator access required' using errcode = '42501';
  end if;
  return query select snapshot.snapshot_date, snapshot.total_relationships,
    snapshot.recovery_ready_relationships,
    case when snapshot.total_relationships = 0 then 0 else round(
      snapshot.recovery_ready_relationships * 100.0 / snapshot.total_relationships, 2) end,
    'stage_3_1_snapshot'::text
  from public.creator_recovery_daily_snapshots snapshot
  where snapshot.creator_user_id = auth.uid()
    and snapshot.snapshot_date >= current_date - (p_days - 1)
  order by snapshot.snapshot_date;
end
$$;

create or replace function public.get_creator_recovery_funnel()
returns table(
  stage text, relationship_count bigint,
  percentage_of_total numeric, drop_from_previous_stage bigint
) language plpgsql stable security definer set search_path = ''
as $$
declare v_creator_id uuid;
begin
  select id into v_creator_id from public.creators where owner_user_id = auth.uid();
  if v_creator_id is null then raise exception 'creator access required' using errcode = '42501'; end if;
  return query
  with relationships as (
    select connection.id, connection.follower_contact_id,
      connection.selected_recovery_method_id,
      exists(select 1 from public.follower_recovery_methods m
        where m.follower_contact_id = connection.follower_contact_id) has_method,
      exists(select 1 from public.follower_recovery_methods m
        where m.follower_contact_id = connection.follower_contact_id
          and m.method_status = 'verified' and m.verified_at is not null) verified,
      public.is_recovery_method_usable(
        connection.selected_recovery_method_id, connection.follower_contact_id) ready
    from public.follower_connections connection
    where connection.creator_id = v_creator_id and connection.status = 'active'
  ), counts as (
    select count(*) total, count(*) filter(where has_method) method_added,
      count(*) filter(where verified) verified,
      count(*) filter(where selected_recovery_method_id is not null) selected,
      count(*) filter(where ready) ready from relationships
  ), stages as (
    select * from counts cross join lateral (values
      (1, 'total_audience'::text, total),
      (2, 'recovery_method_added', method_added),
      (3, 'recovery_method_verified', verified),
      (4, 'recovery_pass_selected', selected),
      (5, 'currently_recovery_ready', ready)
    ) stage(position, name, count)
  )
  select name, count,
    case when total = 0 then 0 else round(count * 100.0 / total, 2) end,
    greatest(0, coalesce(lag(count) over(order by position), count) - count)
  from stages order by position;
end
$$;

create or replace function public.get_creator_recovery_broadcast_performance(
  p_limit integer default 20,
  p_before timestamptz default null
) returns table(
  update_id uuid, title text, published_at timestamptz,
  broadcast_intent public.broadcast_intent, affected_platform text,
  audience_snapshot_size bigint, queued bigint, sending bigint, accepted bigint,
  delivered bigint, failed bigint, skipped bigint, cancelled bigint,
  retryable_failed bigint, permanent_failed bigint, acceptance_rate numeric,
  confirmed_delivery_rate numeric, failure_rate numeric,
  transport_breakdown jsonb, provider_breakdown jsonb,
  latest_delivery_activity timestamptz, data_completeness_state text
) language plpgsql stable security definer set search_path = ''
as $$
declare v_creator_id uuid;
begin
  if p_limit < 1 or p_limit > 100 then raise exception 'invalid limit' using errcode = '22023'; end if;
  select id into v_creator_id from public.creators where owner_user_id = auth.uid();
  if v_creator_id is null then raise exception 'creator access required' using errcode = '42501'; end if;
  return query
  select update_row.id, update_row.title, update_row.sent_at,
    update_row.broadcast_intent, account.platform,
    count(delivery.id),
    count(*) filter(where delivery.status = 'queued'),
    count(*) filter(where delivery.status = 'sending'),
    count(*) filter(where delivery.status = 'accepted'),
    count(*) filter(where delivery.status = 'delivered'),
    count(*) filter(where delivery.status = 'failed'),
    count(*) filter(where delivery.status = 'skipped'),
    count(*) filter(where delivery.status = 'cancelled'),
    count(*) filter(where delivery.status = 'failed' and delivery.attempt_count < 3
      and delivery.failure_code in ('temporary_provider_failure','provider_temporary',
        'rate_limited','provider_rate_limited','state_update_failed')),
    count(*) filter(where delivery.status = 'failed' and not (
      delivery.attempt_count < 3 and delivery.failure_code in (
        'temporary_provider_failure','provider_temporary','rate_limited',
        'provider_rate_limited','state_update_failed'))),
    case when count(delivery.id) = 0 then 0 else round(
      count(*) filter(where delivery.status in ('accepted','delivered','bounced','complained'))
      * 100.0 / count(delivery.id), 2) end,
    case when count(delivery.id) = 0 then 0 else round(
      count(*) filter(where delivery.status = 'delivered') * 100.0 / count(delivery.id), 2) end,
    case when count(delivery.id) = 0 then 0 else round(
      count(*) filter(where delivery.status = 'failed') * 100.0 / count(delivery.id), 2) end,
    coalesce((select jsonb_object_agg(grouped.transport, grouped.count)
      from (select d.transport::text transport, count(*) count
        from public.update_deliveries d where d.update_id = update_row.id group by d.transport) grouped), '{}'::jsonb),
    coalesce((select jsonb_object_agg(grouped.provider, grouped.count)
      from (select coalesce(d.provider, public.delivery_provider_for_transport(d.transport)) provider,
          count(*) count from public.update_deliveries d
        where d.update_id = update_row.id
        group by coalesce(d.provider, public.delivery_provider_for_transport(d.transport))) grouped), '{}'::jsonb),
    max(coalesce(delivery.updated_at, delivery.created_at)),
    case when count(delivery.id) = 0 then 'no_delivery_snapshot' else 'complete' end
  from public.creator_updates update_row
  left join public.connected_accounts account on account.id = update_row.affected_platform_connection_id
  left join public.update_deliveries delivery on delivery.update_id = update_row.id
  where update_row.creator_id = v_creator_id and update_row.broadcast_type = 'account_update'
    and update_row.sent_at is not null
    and (p_before is null or update_row.sent_at < p_before)
  group by update_row.id, account.platform
  order by update_row.sent_at desc limit p_limit;
end
$$;

create or replace function public.get_creator_recovery_update_performance(p_update_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
  if not exists(select 1 from public.creator_updates update_row
    join public.creators creator on creator.id = update_row.creator_id
    where update_row.id = p_update_id and creator.owner_user_id = auth.uid()
      and update_row.broadcast_type = 'account_update') then
    raise exception 'recovery update not found' using errcode = 'P0002';
  end if;
  select to_jsonb(performance) into result
  from public.get_creator_recovery_broadcast_performance(100, null) performance
  where performance.update_id = p_update_id;
  return result;
end
$$;

create or replace function public.capture_creator_recovery_daily_snapshot(p_creator_user_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_creator_id uuid; snapshot_id uuid;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_creator_user_id then
    raise exception 'snapshot access denied' using errcode = '42501';
  end if;
  select id into v_creator_id from public.creators where owner_user_id = p_creator_user_id;
  if v_creator_id is null then raise exception 'creator not found' using errcode = 'P0002'; end if;
  with relationships as (
    select connection.follower_contact_id,
      public.is_recovery_method_usable(
        connection.selected_recovery_method_id, connection.follower_contact_id) ready,
      exists(select 1 from public.follower_recovery_methods m
        where m.follower_contact_id = connection.follower_contact_id) has_method,
      case method.method_type when 'email' then 'email'
        when 'sms' then 'sms' when 'whatsapp' then 'whatsapp'
        when 'web_push' then 'browser_notification' end transport
    from public.follower_connections connection
    left join public.follower_recovery_methods method
      on method.id = connection.selected_recovery_method_id
    where connection.creator_id = v_creator_id and connection.status = 'active'
  ), values_to_save as (
    select count(*)::integer total, count(*) filter(where ready)::integer ready,
      count(*) filter(where not ready and not has_method)::integer uncovered,
      count(*) filter(where not ready and has_method)::integer partial,
      count(*) filter(where ready and transport = 'email')::integer email_count,
      count(*) filter(where ready and transport = 'browser_notification')::integer browser_count,
      count(*) filter(where ready and transport = 'sms')::integer sms_count,
      count(*) filter(where ready and transport = 'whatsapp')::integer whatsapp_count
    from relationships
  )
  insert into public.creator_recovery_daily_snapshots(
    creator_user_id, snapshot_date, total_relationships,
    recovery_ready_relationships, uncovered_relationships,
    partially_configured_relationships, email_count,
    browser_notification_count, sms_count, whatsapp_count
  ) select p_creator_user_id, current_date, total, ready, uncovered,
    partial, email_count, browser_count, sms_count, whatsapp_count from values_to_save
  on conflict(creator_user_id, snapshot_date) do update set
    total_relationships = excluded.total_relationships,
    recovery_ready_relationships = excluded.recovery_ready_relationships,
    uncovered_relationships = excluded.uncovered_relationships,
    partially_configured_relationships = excluded.partially_configured_relationships,
    email_count = excluded.email_count,
    browser_notification_count = excluded.browser_notification_count,
    sms_count = excluded.sms_count,
    whatsapp_count = excluded.whatsapp_count,
    created_at = now()
  returning id into snapshot_id;
  return snapshot_id;
end
$$;

create or replace function public.capture_recovery_daily_snapshots(p_limit integer default 100)
returns integer language plpgsql security definer set search_path = ''
as $$
declare creator_user uuid; captured integer := 0;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode = '42501'; end if;
  if p_limit < 1 or p_limit > 1000 then raise exception 'invalid limit' using errcode = '22023'; end if;
  for creator_user in select owner_user_id from public.creators order by id limit p_limit loop
    perform public.capture_creator_recovery_daily_snapshot(creator_user);
    captured := captured + 1;
  end loop;
  return captured;
end
$$;

revoke all on function public.get_creator_recovery_coverage() from public, anon;
revoke all on function public.get_creator_recovery_transport_breakdown() from public, anon;
revoke all on function public.get_creator_recovery_coverage_trend(integer) from public, anon;
revoke all on function public.get_creator_recovery_funnel() from public, anon;
revoke all on function public.get_creator_recovery_broadcast_performance(integer,timestamptz) from public, anon;
revoke all on function public.get_creator_recovery_update_performance(uuid) from public, anon;
revoke all on function public.capture_creator_recovery_daily_snapshot(uuid) from public, anon;
revoke all on function public.capture_recovery_daily_snapshots(integer) from public, anon, authenticated;
grant execute on function public.get_creator_recovery_coverage() to authenticated;
grant execute on function public.get_creator_recovery_transport_breakdown() to authenticated;
grant execute on function public.get_creator_recovery_coverage_trend(integer) to authenticated;
grant execute on function public.get_creator_recovery_funnel() to authenticated;
grant execute on function public.get_creator_recovery_broadcast_performance(integer,timestamptz) to authenticated;
grant execute on function public.get_creator_recovery_update_performance(uuid) to authenticated;
grant execute on function public.capture_creator_recovery_daily_snapshot(uuid) to authenticated, service_role;
grant execute on function public.capture_recovery_daily_snapshots(integer) to service_role;

commit;
