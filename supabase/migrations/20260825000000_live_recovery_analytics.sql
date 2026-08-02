begin;

create or replace function public.get_live_recovery_analytics(p_emergency_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare e public.creator_emergencies%rowtype; result jsonb;
begin
  select * into e from public.creator_emergencies where id = p_emergency_id;
  if not found or not public.has_creator_permission(e.creator_id, 'emergency_manage') then
    raise exception 'incident not found' using errcode = 'P0002';
  end if;
  with deliveries as (
    select d.connection_id, d.transport, d.status, d.created_at, d.updated_at
    from public.update_deliveries d where d.update_id = e.creator_update_id
  ), totals as (
    select count(distinct connection_id) targeted,
      count(distinct connection_id) filter (where status in ('sending','accepted','delivered','bounced','complained')) sent,
      max(coalesce(updated_at, created_at)) latest
    from deliveries
  ), transports as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'transport', transport, 'targeted', targeted, 'sent', sent, 'delivered', delivered,
      'failed', failed, 'opened', null, 'openCoverage', 'unavailable') order by transport), '[]'::jsonb) value
    from (select transport, count(distinct connection_id) targeted,
      count(distinct connection_id) filter(where status in ('sending','accepted','delivered','bounced','complained')) sent,
      count(distinct connection_id) filter(where status = 'delivered') delivered,
      count(distinct connection_id) filter(where status = 'failed') failed
      from deliveries group by transport) grouped
  )
  select jsonb_build_object(
    'emergencyId', e.id, 'title', e.title, 'severity', e.severity, 'status', e.lifecycle_status,
    'activatedAt', e.activated_at, 'resolvedAt', e.resolved_at, 'calculatedAt', now(),
    'dataFreshness', case when totals.latest is null then 'awaiting_delivery' else 'current' end,
    'metrics', jsonb_build_object(
      'fansTargeted', jsonb_build_object('status','available','value',totals.targeted,'updatedAt',coalesce(totals.latest,e.activated_at),
        'explanation','Unique eligible recipients in the immutable incident delivery audience, deduplicated across transports.'),
      'alertsSent', jsonb_build_object('status','available','value',totals.sent,'updatedAt',totals.latest,
        'explanation','Unique recipients handed to a transport. Queued-only deliveries and retries are excluded.'),
      'alertsOpened', jsonb_build_object('status','unavailable','value',null,'updatedAt',null,
        'coverage',jsonb_build_object('supportedTransports','[]'::jsonb,'unsupportedTransports',coalesce((select jsonb_agg(distinct transport) from deliveries),'[]'::jsonb),'measurableRecipients',0,'totalRecipients',totals.targeted),
        'explanation','Configured recovery transports do not currently provide an authoritative incident-scoped open/read signal.'),
      'recoveryPageVisits', jsonb_build_object('status','unavailable','value',null,'updatedAt',null,
        'explanation','Incident-scoped privacy-safe unique visit tracking is not available; aggregate page views are not substituted.'),
      'followClicks', jsonb_build_object('status','unavailable','value',null,'updatedAt',null,
        'explanation','Incident-scoped privacy-safe unique destination clicks are not available.'),
      'migrationRate', jsonb_build_object('status','unavailable','value',null,'numerator',null,'denominator',totals.targeted,
        'unit','percent','measurement','unavailable','updatedAt',null,
        'explanation','No verified follow confirmation or incident-scoped click-through proxy is currently measurable.')
    ), 'transportBreakdown', transports.value, 'destinationBreakdown', '[]'::jsonb
  ) into result from totals cross join transports;
  return result;
end $$;

revoke all on function public.get_live_recovery_analytics(uuid) from public, anon;
grant execute on function public.get_live_recovery_analytics(uuid) to authenticated;
comment on function public.get_live_recovery_analytics(uuid) is
  'Creator-scoped incident recovery aggregates. Returns no recipient, destination, or visitor identifiers.';

commit;
