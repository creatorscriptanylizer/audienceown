begin;

create type public.delivery_operator_role as enum ('delivery_operator', 'delivery_admin');
create type public.delivery_operator_action_type as enum (
  'retry_delivery',
  'release_stuck_delivery',
  'reconcile_provider_event',
  'cancel_delivery',
  'mark_incident',
  'resolve_incident'
);

create table public.delivery_operator_actions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_role public.delivery_operator_role not null,
  action_type public.delivery_operator_action_type not null,
  target_delivery_id uuid references public.update_deliveries(id) on delete restrict,
  target_update_id uuid references public.creator_updates(id) on delete restrict,
  target_provider text,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index delivery_operator_actions_created_idx
  on public.delivery_operator_actions(created_at desc);
create index delivery_operator_actions_delivery_idx
  on public.delivery_operator_actions(target_delivery_id, created_at desc);
create index delivery_operator_actions_update_idx
  on public.delivery_operator_actions(target_update_id, created_at desc);
create index delivery_operator_actions_actor_idx
  on public.delivery_operator_actions(actor_user_id, created_at desc);
create index delivery_operator_actions_provider_idx
  on public.delivery_operator_actions(target_provider, created_at desc);

create table public.delivery_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  metrics jsonb not null check (jsonb_typeof(metrics) = 'object'),
  created_at timestamptz not null default now()
);
create index delivery_health_snapshots_created_idx
  on public.delivery_health_snapshots(created_at desc);

alter table public.delivery_operator_actions enable row level security;
alter table public.delivery_operator_actions force row level security;
alter table public.delivery_health_snapshots enable row level security;
alter table public.delivery_health_snapshots force row level security;
revoke all on public.delivery_operator_actions from public, anon, authenticated;
revoke all on public.delivery_health_snapshots from public, anon, authenticated;
grant select, insert on public.delivery_operator_actions to service_role;
grant select, insert on public.delivery_health_snapshots to service_role;

create or replace function public.reject_delivery_operations_mutation()
returns trigger language plpgsql set search_path = ''
as $$
begin
  raise exception 'delivery operations audit records are append-only' using errcode = '42501';
end
$$;
create trigger delivery_operator_actions_append_only
before update or delete on public.delivery_operator_actions
for each row execute function public.reject_delivery_operations_mutation();
create trigger delivery_health_snapshots_append_only
before update or delete on public.delivery_health_snapshots
for each row execute function public.reject_delivery_operations_mutation();

create index if not exists update_deliveries_operations_status_idx
  on public.update_deliveries(status, last_attempt_at, queued_at);
create index if not exists update_deliveries_operations_stuck_idx
  on public.update_deliveries(sending_at, attempt_count)
  where status = 'sending';
create index if not exists update_delivery_events_operations_pending_idx
  on public.update_delivery_events(received_at, provider)
  where processing_status = 'pending';

create or replace function public.protect_update_delivery_lifecycle()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare operator_transition boolean;
begin
  operator_transition := auth.role() = 'service_role'
    and current_setting('app.delivery_operator_action', true) = 'on';
  if new.update_id <> old.update_id or new.creator_id <> old.creator_id
    or new.connection_id <> old.connection_id or new.contact_id <> old.contact_id
    or new.transport <> old.transport or new.recovery_method_id <> old.recovery_method_id then
    raise exception 'delivery identity cannot be changed' using errcode = '42501';
  end if;
  if old.status <> 'queued' and (
    new.destination <> old.destination
    or new.destination_hash is distinct from old.destination_hash
  ) then
    raise exception 'destination identity cannot change after sending begins' using errcode = '42501';
  end if;
  if not (operator_transition and (
      (old.status = 'failed' and new.status = 'queued')
      or (old.status = 'sending' and new.status in ('queued','failed'))
    )) and (
    old.status = 'complained' and new.status <> old.status
    or old.status = 'bounced' and new.status not in ('bounced', 'complained')
    or old.status = 'delivered' and new.status not in ('delivered', 'bounced', 'complained')
    or old.status = 'accepted' and new.status not in (
      'accepted', 'delivered', 'bounced', 'complained',
      case when old.transport in ('sms','whatsapp') then 'failed'::public.delivery_status else 'accepted' end
    )
    or old.status = 'failed' and new.status <> old.status
    or old.status in ('skipped', 'cancelled') and new.status <> old.status
    or old.status = 'sending' and new.status not in (
      'sending', 'queued', 'accepted', 'delivered', 'bounced', 'complained', 'failed', 'cancelled'
    )
    or old.status = 'queued' and new.status not in ('queued', 'sending', 'skipped', 'cancelled')
  ) then
    raise exception 'invalid delivery status transition' using errcode = '23514';
  end if;
  if auth.role() = 'authenticated'
    and not (old.status = 'queued' and new.status = 'cancelled') then
    raise exception 'creators may only cancel queued deliveries' using errcode = '42501';
  end if;
  return new;
end
$$;

create or replace function public.get_delivery_system_health()
returns jsonb language sql stable security definer set search_path = ''
as $$
  with metrics as (
    select
      count(*) filter (where status = 'queued') queued_count,
      count(*) filter (where status = 'sending') sending_count,
      count(*) filter (where status = 'accepted') accepted_count,
      count(*) filter (where status = 'delivered') delivered_count,
      count(*) filter (where status = 'failed') failed_count,
      count(*) filter (where status = 'skipped') skipped_count,
      count(*) filter (where status = 'cancelled') cancelled_count,
      count(*) filter (where status = 'failed' and attempt_count < 3 and failure_code in (
        'temporary_provider_failure','provider_temporary','rate_limited',
        'provider_rate_limited','state_update_failed'
      )) retryable_failed_count,
      count(*) filter (where status = 'failed' and not (
        attempt_count < 3 and failure_code in (
          'temporary_provider_failure','provider_temporary','rate_limited',
          'provider_rate_limited','state_update_failed'
        )
      )) exhausted_failed_count,
      count(*) filter (where status = 'sending'
        and coalesce(sending_at, claimed_at) < now() - interval '15 minutes') stuck_sending_count,
      coalesce(extract(epoch from now() - min(queued_at)
        filter (where status = 'queued')), 0)::bigint oldest_queued_seconds,
      coalesce(extract(epoch from now() - min(coalesce(sending_at, claimed_at))
        filter (where status = 'sending')), 0)::bigint oldest_sending_seconds,
      count(*) filter (where created_at >= now() - interval '60 minutes') recent_total,
      count(*) filter (where created_at >= now() - interval '60 minutes'
        and status in ('accepted','delivered','bounced','complained')) recent_accepted,
      count(*) filter (where created_at >= now() - interval '60 minutes'
        and status = 'delivered') recent_delivered,
      count(*) filter (where created_at >= now() - interval '60 minutes'
        and status = 'failed') recent_failed,
      max(last_attempt_at) recent_dispatcher_activity
    from public.update_deliveries
  ), callbacks as (
    select count(*) pending_count,
      coalesce(extract(epoch from now() - min(received_at)), 0)::bigint oldest_pending_seconds
    from public.update_delivery_events where processing_status = 'pending'
  )
  select jsonb_build_object(
    'queuedCount', queued_count, 'sendingCount', sending_count,
    'acceptedCount', accepted_count, 'deliveredCount', delivered_count,
    'failedCount', failed_count, 'skippedCount', skipped_count,
    'cancelledCount', cancelled_count, 'retryableFailedCount', retryable_failed_count,
    'exhaustedFailedCount', exhausted_failed_count, 'stuckSendingCount', stuck_sending_count,
    'oldestQueuedSeconds', oldest_queued_seconds, 'oldestSendingSeconds', oldest_sending_seconds,
    'pendingCallbackCount', pending_count, 'oldestPendingCallbackSeconds', oldest_pending_seconds,
    'recentDispatcherActivity', recent_dispatcher_activity,
    'recentAcceptanceRate', case when recent_total = 0 then 0 else round(recent_accepted * 100.0 / recent_total, 2) end,
    'recentDeliveryRate', case when recent_accepted = 0 then 0 else round(recent_delivered * 100.0 / recent_accepted, 2) end,
    'recentPermanentFailureRate', case when recent_total = 0 then 0 else round(recent_failed * 100.0 / recent_total, 2) end
  ) from metrics cross join callbacks
$$;
revoke all on function public.get_delivery_system_health() from public, anon, authenticated;
grant execute on function public.get_delivery_system_health() to service_role;

create or replace function public.get_delivery_provider_health(p_window_minutes integer default 60)
returns table(
  provider text, transport public.delivery_transport, queued bigint, sending bigint,
  accepted bigint, delivered bigint, failed bigint, retryable bigint,
  permanent_failures bigint, acceptance_rate numeric, delivery_rate numeric,
  last_activity timestamptz
) language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_window_minutes < 1 or p_window_minutes > 10080 then
    raise exception 'invalid provider health window' using errcode = '22023';
  end if;
  return query select
    coalesce(d.provider, public.delivery_provider_for_transport(d.transport)), d.transport,
    count(*) filter (where d.status = 'queued'),
    count(*) filter (where d.status = 'sending'),
    count(*) filter (where d.status = 'accepted'),
    count(*) filter (where d.status = 'delivered'),
    count(*) filter (where d.status = 'failed'),
    count(*) filter (where d.status = 'failed' and d.attempt_count < 3 and d.failure_code in (
      'temporary_provider_failure','provider_temporary','rate_limited',
      'provider_rate_limited','state_update_failed')),
    count(*) filter (where d.status = 'failed' and not (
      d.attempt_count < 3 and d.failure_code in (
        'temporary_provider_failure','provider_temporary','rate_limited',
        'provider_rate_limited','state_update_failed'))),
    case when count(*) = 0 then 0 else round(
      count(*) filter (where d.status in ('accepted','delivered','bounced','complained')) * 100.0 / count(*), 2) end,
    case when count(*) filter (where d.status in ('accepted','delivered','bounced','complained')) = 0 then 0
      else round(count(*) filter (where d.status = 'delivered') * 100.0 /
        count(*) filter (where d.status in ('accepted','delivered','bounced','complained')), 2) end,
    max(coalesce(d.last_attempt_at, d.created_at))
  from public.update_deliveries d
  where d.created_at >= now() - make_interval(mins => p_window_minutes)
  group by coalesce(d.provider, public.delivery_provider_for_transport(d.transport)), d.transport;
end
$$;
revoke all on function public.get_delivery_provider_health(integer) from public, anon, authenticated;
grant execute on function public.get_delivery_provider_health(integer) to service_role;

create or replace function public.get_stuck_deliveries(p_limit integer default 50)
returns table(
  id uuid, update_id uuid, provider text, transport public.delivery_transport,
  status public.delivery_status, attempt_count integer, sending_at timestamptz,
  age_seconds bigint, provider_message_id_present boolean, failure_code text
) language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 100 then raise exception 'invalid limit' using errcode = '22023'; end if;
  return query select d.id, d.update_id,
    coalesce(d.provider, public.delivery_provider_for_transport(d.transport)), d.transport,
    d.status, d.attempt_count, coalesce(d.sending_at, d.claimed_at),
    extract(epoch from now() - coalesce(d.sending_at, d.claimed_at))::bigint,
    d.provider_message_id is not null, d.failure_code
  from public.update_deliveries d
  where d.status = 'sending'
    and coalesce(d.sending_at, d.claimed_at) < now() - interval '15 minutes'
  order by coalesce(d.sending_at, d.claimed_at) limit p_limit;
end
$$;
revoke all on function public.get_stuck_deliveries(integer) from public, anon, authenticated;
grant execute on function public.get_stuck_deliveries(integer) to service_role;

create or replace function public.get_pending_provider_events(p_limit integer default 50)
returns table(
  id uuid, provider text, event_type text, received_at timestamptz,
  age_seconds bigint, provider_message_id_present boolean, processing_status text
) language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 100 then raise exception 'invalid limit' using errcode = '22023'; end if;
  return query select e.id, e.provider, e.event_type, e.received_at,
    extract(epoch from now() - e.received_at)::bigint,
    e.provider_message_id is not null, e.processing_status
  from public.update_delivery_events e where e.processing_status = 'pending'
  order by e.received_at limit p_limit;
end
$$;
revoke all on function public.get_pending_provider_events(integer) from public, anon, authenticated;
grant execute on function public.get_pending_provider_events(integer) to service_role;

create or replace function public.retry_failed_delivery(
  p_delivery_id uuid, p_reason text, p_actor_user_id uuid,
  p_actor_role public.delivery_operator_role default 'delivery_operator'
) returns public.delivery_status language plpgsql security definer set search_path = ''
as $$
declare d public.update_deliveries%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'operator access required' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'reason required' using errcode = '22023'; end if;
  select * into d from public.update_deliveries where id = p_delivery_id for update;
  if not found then raise exception 'delivery not found' using errcode = 'P0002'; end if;
  if d.status <> 'failed' then raise exception 'delivery is not failed' using errcode = '23514'; end if;
  if d.attempt_count >= 3 then raise exception 'delivery attempts exhausted' using errcode = '23514'; end if;
  if d.failure_code not in ('temporary_provider_failure','provider_temporary','rate_limited',
    'provider_rate_limited','state_update_failed') then
    raise exception 'delivery failure is permanent' using errcode = '23514';
  end if;
  if d.provider_message_id is not null then raise exception 'provider reconciliation required' using errcode = '23514'; end if;
  if not exists (select 1 from public.follower_recovery_methods m
    where m.id = d.recovery_method_id and m.method_status = 'verified'
      and m.consent_revoked_at is null and m.opted_out_at is null) then
    raise exception 'recovery method is no longer usable' using errcode = '23514';
  end if;
  perform set_config('app.delivery_operator_action', 'on', true);
  update public.update_deliveries set status = 'queued', queued_at = now(),
    failed_at = null, failure_code = null, failure_reason = null,
    provider_error_code = null, provider_error_message = null
  where id = d.id;
  insert into public.update_delivery_events(
    update_delivery_id, provider, provider_event_id, provider_message_id,
    event_type, normalized_status, event_timestamp, payload,
    processing_status, signature_verified
  ) values (d.id, coalesce(d.provider, public.delivery_provider_for_transport(d.transport)),
    'operator-retry-' || gen_random_uuid(), d.provider_message_id, 'operator_retry',
    'queued', now(), jsonb_build_object('reason', left(btrim(p_reason), 500)), 'applied', false);
  insert into public.delivery_operator_actions(
    actor_user_id, actor_role, action_type, target_delivery_id,
    target_update_id, target_provider, reason
  ) values (p_actor_user_id, p_actor_role, 'retry_delivery', d.id,
    d.update_id, coalesce(d.provider, public.delivery_provider_for_transport(d.transport)), btrim(p_reason));
  return 'queued';
end
$$;

create or replace function public.release_stuck_delivery(
  p_delivery_id uuid, p_reason text, p_actor_user_id uuid,
  p_actor_role public.delivery_operator_role default 'delivery_operator'
) returns public.delivery_status language plpgsql security definer set search_path = ''
as $$
declare d public.update_deliveries%rowtype; next_status public.delivery_status;
begin
  if auth.role() <> 'service_role' then raise exception 'operator access required' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'reason required' using errcode = '22023'; end if;
  select * into d from public.update_deliveries where id = p_delivery_id for update;
  if not found then raise exception 'delivery not found' using errcode = 'P0002'; end if;
  if d.status <> 'sending' or coalesce(d.sending_at, d.claimed_at) >= now() - interval '15 minutes' then
    raise exception 'delivery is not stuck' using errcode = '23514';
  end if;
  if d.provider_message_id is not null then raise exception 'provider reconciliation required' using errcode = '23514'; end if;
  next_status := case when d.attempt_count < 3 then 'queued'::public.delivery_status else 'failed'::public.delivery_status end;
  perform set_config('app.delivery_operator_action', 'on', true);
  update public.update_deliveries set status = next_status,
    queued_at = case when next_status = 'queued' then now() else queued_at end,
    failed_at = case when next_status = 'failed' then now() else null end,
    failure_code = case when next_status = 'failed' then 'attempts_exhausted' else null end,
    failure_reason = case when next_status = 'failed' then 'Stuck delivery exhausted attempts.' else null end
  where id = d.id;
  insert into public.update_delivery_events(
    update_delivery_id, provider, provider_event_id, event_type,
    normalized_status, event_timestamp, payload, processing_status, signature_verified
  ) values (d.id, coalesce(d.provider, public.delivery_provider_for_transport(d.transport)),
    'operator-release-' || gen_random_uuid(), 'operator_release_stuck', next_status, now(),
    jsonb_build_object('reason', left(btrim(p_reason), 500)), 'applied', false);
  insert into public.delivery_operator_actions(
    actor_user_id, actor_role, action_type, target_delivery_id,
    target_update_id, target_provider, reason
  ) values (p_actor_user_id, p_actor_role, 'release_stuck_delivery', d.id,
    d.update_id, coalesce(d.provider, public.delivery_provider_for_transport(d.transport)), btrim(p_reason));
  return next_status;
end
$$;

create or replace function public.reconcile_pending_provider_event(
  p_pending_event_id uuid, p_reason text, p_actor_user_id uuid,
  p_actor_role public.delivery_operator_role default 'delivery_operator'
) returns public.delivery_status language plpgsql security definer set search_path = ''
as $$
declare
  e public.update_delivery_events%rowtype;
  matched_delivery public.update_deliveries%rowtype;
  resulting public.delivery_status;
begin
  if auth.role() <> 'service_role' then raise exception 'operator access required' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'reason required' using errcode = '22023'; end if;
  select * into e from public.update_delivery_events where id = p_pending_event_id for update;
  if not found then raise exception 'provider event not found' using errcode = 'P0002'; end if;
  if e.processing_status <> 'pending' then raise exception 'provider event is not pending' using errcode = '23514'; end if;
  if e.provider_message_id is not null then
    select * into matched_delivery from public.update_deliveries d
    where d.provider = e.provider and d.provider_message_id = e.provider_message_id
    for update;
  end if;
  if e.provider_message_id is null or matched_delivery.id is null then
    raise exception 'provider event cannot be safely matched' using errcode = '23514';
  end if;
  resulting := public.process_update_delivery_event(e.id);
  insert into public.delivery_operator_actions(
    actor_user_id, actor_role, action_type, target_delivery_id,
    target_update_id, target_provider, reason, metadata
  ) select p_actor_user_id, p_actor_role, 'reconcile_provider_event',
    matched_delivery.id, matched_delivery.update_id, e.provider, btrim(p_reason),
    jsonb_build_object('event_id', e.id)
  ;
  return resulting;
end
$$;

create or replace function public.reconcile_pending_provider_events(p_limit integer default 25)
returns integer language plpgsql security definer set search_path = ''
as $$
declare affected integer;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode = '42501'; end if;
  if p_limit < 1 or p_limit > 100 then raise exception 'invalid limit' using errcode = '22023'; end if;
  with candidates as (
    select e.id from public.update_delivery_events e
    where e.processing_status = 'pending' and e.provider_message_id is not null
      and exists (select 1 from public.update_deliveries d
        where d.provider = e.provider and d.provider_message_id = e.provider_message_id)
    order by e.received_at for update skip locked limit p_limit
  ) select count(*) into affected from candidates
  where public.process_update_delivery_event(candidates.id) is not null;
  return affected;
end
$$;

revoke all on function public.retry_failed_delivery(uuid,text,uuid,public.delivery_operator_role) from public, anon, authenticated;
revoke all on function public.release_stuck_delivery(uuid,text,uuid,public.delivery_operator_role) from public, anon, authenticated;
revoke all on function public.reconcile_pending_provider_event(uuid,text,uuid,public.delivery_operator_role) from public, anon, authenticated;
revoke all on function public.reconcile_pending_provider_events(integer) from public, anon, authenticated;
grant execute on function public.retry_failed_delivery(uuid,text,uuid,public.delivery_operator_role) to service_role;
grant execute on function public.release_stuck_delivery(uuid,text,uuid,public.delivery_operator_role) to service_role;
grant execute on function public.reconcile_pending_provider_event(uuid,text,uuid,public.delivery_operator_role) to service_role;
grant execute on function public.reconcile_pending_provider_events(integer) to service_role;

commit;
