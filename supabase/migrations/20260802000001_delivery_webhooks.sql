alter table public.update_deliveries
  add column accepted_at timestamptz,
  add column bounced_at timestamptz,
  add column complained_at timestamptz,
  add column provider_status text,
  add column provider_error_code text,
  add column provider_error_message text;

update public.update_deliveries
set accepted_at = sent_at
where status = 'accepted' and accepted_at is null;

alter table public.update_deliveries
  drop constraint if exists update_deliveries_sent_time,
  drop column sent_at;

alter table public.update_deliveries
  add constraint update_deliveries_accepted_time
    check (status <> 'accepted' or accepted_at is not null),
  add constraint update_deliveries_bounced_time
    check (status <> 'bounced' or bounced_at is not null),
  add constraint update_deliveries_complained_time
    check (status <> 'complained' or complained_at is not null);

drop index if exists public.update_deliveries_provider_message_idx;
create unique index update_deliveries_provider_message_unique
  on public.update_deliveries(provider, provider_message_id)
  where provider is not null and provider_message_id is not null;

drop trigger protect_update_delivery on public.update_deliveries;
create trigger protect_update_delivery_insert
before insert on public.update_deliveries
for each row execute function public.protect_update_delivery();
create trigger protect_update_delivery_delete
before delete on public.update_deliveries
for each row execute function public.protect_update_delivery();

create or replace function public.protect_update_delivery_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.update_id <> old.update_id or new.creator_id <> old.creator_id
    or new.connection_id <> old.connection_id or new.contact_id <> old.contact_id
    or new.transport <> old.transport or new.recovery_method_id <> old.recovery_method_id then
    raise exception 'delivery identity cannot be changed' using errcode = '42501';
  end if;
  if old.status <> 'queued'
    and (
      new.destination <> old.destination
      or new.destination_hash is distinct from old.destination_hash
    ) then
    raise exception 'destination identity cannot change after sending begins' using errcode = '42501';
  end if;
  if old.status = 'complained' and new.status <> old.status
    or old.status = 'bounced' and new.status not in ('bounced', 'complained')
    or old.status = 'delivered' and new.status not in ('delivered', 'bounced', 'complained')
    or old.status = 'accepted' and new.status not in ('accepted', 'delivered', 'bounced', 'complained')
    or old.status = 'failed' and new.status <> old.status
    or old.status in ('skipped', 'cancelled') and new.status <> old.status
    or old.status = 'sending' and new.status not in (
      'sending', 'queued', 'accepted', 'delivered', 'bounced', 'complained', 'failed', 'cancelled'
    )
    or old.status = 'queued' and new.status not in ('queued', 'sending', 'skipped', 'cancelled') then
    raise exception 'invalid delivery status transition' using errcode = '23514';
  end if;
  if auth.role() = 'authenticated'
    and not (old.status = 'queued' and new.status = 'cancelled') then
    raise exception 'creators may only cancel queued deliveries' using errcode = '42501';
  end if;
  return new;
end
$$;

create trigger protect_update_delivery_update
before update on public.update_deliveries
for each row execute function public.protect_update_delivery_lifecycle();
revoke all on function public.protect_update_delivery_lifecycle()
  from public, anon, authenticated;

create table public.update_delivery_events (
  id uuid primary key default gen_random_uuid(),
  update_delivery_id uuid references public.update_deliveries(id) on delete restrict,
  provider text not null,
  provider_event_id text not null,
  provider_message_id text,
  event_type text not null,
  normalized_status public.delivery_status,
  event_timestamp timestamptz,
  received_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'pending'
    check (processing_status in ('pending','applied','duplicate','ignored','rejected')),
  processing_error text,
  signature_verified boolean not null,
  created_at timestamptz not null default now(),
  constraint update_delivery_events_provider_event_unique
    unique(provider, provider_event_id),
  constraint update_delivery_events_provider_present
    check (btrim(provider) <> '' and btrim(provider_event_id) <> ''),
  constraint update_delivery_events_payload_object
    check (jsonb_typeof(payload) = 'object')
);

create index update_delivery_events_message_idx
  on public.update_delivery_events(provider, provider_message_id)
  where provider_message_id is not null;
create index update_delivery_events_pending_idx
  on public.update_delivery_events(provider, provider_message_id)
  where processing_status = 'pending';

alter table public.update_delivery_events enable row level security;
revoke all on public.update_delivery_events from public, anon, authenticated;
grant select on public.update_delivery_events to service_role;

create or replace function public.process_update_delivery_event(
  p_event_id uuid
)
returns public.delivery_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_row public.update_delivery_events%rowtype;
  delivery_row public.update_deliveries%rowtype;
  next_status public.delivery_status;
  occurred_at timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'delivery event processing requires service role' using errcode = '42501';
  end if;
  select event.* into event_row
  from public.update_delivery_events event
  where event.id = p_event_id
  for update;
  if not found then
    raise exception 'delivery event not found' using errcode = 'P0002';
  end if;
  if event_row.processing_status in ('applied','ignored','rejected','duplicate') then
    select status into next_status from public.update_deliveries
    where id = event_row.update_delivery_id;
    return next_status;
  end if;
  if event_row.normalized_status is null then
    update public.update_delivery_events
    set processing_status = 'ignored', processing_error = null
    where id = p_event_id;
    return null;
  end if;
  if event_row.provider_message_id is null then
    update public.update_delivery_events
    set processing_status = 'rejected', processing_error = 'provider message ID is required'
    where id = p_event_id;
    return null;
  end if;

  select delivery.* into delivery_row
  from public.update_deliveries delivery
  where delivery.provider = event_row.provider
    and delivery.provider_message_id = event_row.provider_message_id
  for update;
  if not found then
    update public.update_delivery_events
    set processing_status = 'pending', processing_error = 'provider message is not correlated'
    where id = p_event_id;
    return null;
  end if;

  update public.update_delivery_events
  set update_delivery_id = delivery_row.id
  where id = p_event_id;

  if delivery_row.status in ('cancelled','skipped')
    or delivery_row.status = 'failed' then
    update public.update_delivery_events
    set processing_status = 'rejected',
        processing_error = 'delivery state does not accept provider events'
    where id = p_event_id;
    return delivery_row.status;
  end if;

  next_status := case
    when delivery_row.status = 'complained' then 'complained'::public.delivery_status
    when event_row.normalized_status = 'complained' then 'complained'::public.delivery_status
    when delivery_row.status = 'bounced' then 'bounced'::public.delivery_status
    when event_row.normalized_status = 'bounced' then 'bounced'::public.delivery_status
    when delivery_row.status = 'delivered' then 'delivered'::public.delivery_status
    when event_row.normalized_status = 'delivered' then 'delivered'::public.delivery_status
    when delivery_row.status = 'accepted' then 'accepted'::public.delivery_status
    when event_row.normalized_status = 'accepted' then 'accepted'::public.delivery_status
    else delivery_row.status
  end;
  occurred_at := coalesce(event_row.event_timestamp, event_row.received_at);

  update public.update_deliveries
  set status = next_status,
      provider_status = event_row.event_type,
      accepted_at = case
        when next_status = 'accepted' then coalesce(accepted_at, occurred_at)
        else accepted_at
      end,
      delivered_at = case
        when next_status = 'delivered' then coalesce(delivered_at, occurred_at)
        else delivered_at
      end,
      bounced_at = case
        when next_status = 'bounced' then coalesce(bounced_at, occurred_at)
        else bounced_at
      end,
      complained_at = case
        when next_status = 'complained' then coalesce(complained_at, occurred_at)
        else complained_at
      end,
      provider_error_code = case
        when event_row.normalized_status = 'bounced'
          then left(event_row.payload ->> 'error_code', 120)
        else provider_error_code
      end,
      provider_error_message = case
        when event_row.normalized_status = 'bounced'
          then left(event_row.payload ->> 'error_message', 500)
        else provider_error_message
      end
  where id = delivery_row.id;

  update public.update_delivery_events
  set processing_status = case
        when next_status = delivery_row.status then 'ignored'
        else 'applied'
      end,
      processing_error = null
  where id = p_event_id;
  return next_status;
end
$$;

create or replace function public.apply_update_delivery_event(
  p_provider text,
  p_provider_event_id text,
  p_provider_message_id text,
  p_event_type text,
  p_normalized_status text,
  p_event_timestamp timestamptz,
  p_payload jsonb,
  p_signature_verified boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_id uuid;
  inserted boolean;
  resulting_status public.delivery_status;
  event_status text;
  delivery_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'delivery event ingestion requires service role' using errcode = '42501';
  end if;
  if not p_signature_verified then
    raise exception 'delivery event signature is not verified' using errcode = '42501';
  end if;
  if btrim(coalesce(p_provider, '')) = ''
    or btrim(coalesce(p_provider_event_id, '')) = ''
    or btrim(coalesce(p_event_type, '')) = '' then
    raise exception 'delivery event identity is incomplete' using errcode = '22023';
  end if;

  insert into public.update_delivery_events(
    provider, provider_event_id, provider_message_id, event_type,
    normalized_status, event_timestamp, payload, signature_verified
  ) values (
    p_provider, p_provider_event_id, nullif(btrim(p_provider_message_id), ''),
    p_event_type, nullif(btrim(p_normalized_status), '')::public.delivery_status, p_event_timestamp,
    coalesce(p_payload, '{}'::jsonb), true
  )
  on conflict(provider, provider_event_id) do nothing
  returning id into event_id;
  inserted := event_id is not null;
  if not inserted then
    select id, processing_status into event_id, event_status
    from public.update_delivery_events
    where provider = p_provider and provider_event_id = p_provider_event_id;
    return jsonb_build_object(
      'eventId', event_id,
      'processingStatus', 'duplicate',
      'deliveryId', (
        select event.update_delivery_id from public.update_delivery_events event
        where event.id = event_id
      ),
      'deliveryStatus', (
        select delivery.status from public.update_delivery_events event
        join public.update_deliveries delivery on delivery.id = event.update_delivery_id
        where event.id = event_id
      )
    );
  end if;

  resulting_status := public.process_update_delivery_event(event_id);
  select processing_status, update_delivery_id into event_status, delivery_id
  from public.update_delivery_events where id = event_id;
  return jsonb_build_object(
    'eventId', event_id,
    'processingStatus', event_status,
    'deliveryId', delivery_id,
    'deliveryStatus', resulting_status
  );
end
$$;

create or replace function public.reconcile_update_delivery_events(
  p_provider text,
  p_provider_message_id text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_row record;
  processed integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'delivery event reconciliation requires service role' using errcode = '42501';
  end if;
  for event_row in
    select id from public.update_delivery_events
    where provider = p_provider
      and provider_message_id = p_provider_message_id
      and processing_status = 'pending'
    order by received_at, id
  loop
    perform public.process_update_delivery_event(event_row.id);
    processed := processed + 1;
  end loop;
  return processed;
end
$$;

alter function public.mark_update_delivery_sent(uuid, text, text)
  rename to mark_update_delivery_accepted;
create or replace function public.mark_update_delivery_accepted(
  p_delivery_id uuid,
  p_provider text,
  p_provider_message_id text
)
returns public.delivery_status
language plpgsql
security definer
set search_path = ''
as $$
declare result public.delivery_status;
begin
  if auth.role() <> 'service_role' then
    raise exception 'delivery completion requires service role' using errcode = '42501';
  end if;
  if btrim(coalesce(p_provider_message_id, '')) = '' then
    raise exception 'provider message ID is required' using errcode = '22023';
  end if;
  update public.update_deliveries delivery
  set status = 'accepted',
      provider = p_provider,
      provider_message_id = p_provider_message_id,
      accepted_at = coalesce(accepted_at, now()),
      provider_status = 'api.accepted',
      claimed_at = null,
      failure_code = null,
      failure_reason = null,
      provider_error_code = null,
      provider_error_message = null
  where delivery.id = p_delivery_id and delivery.status = 'sending'
    and p_provider = public.delivery_provider_for_transport(delivery.transport)
  returning delivery.status into result;
  if result is null then
    raise exception 'delivery is not sending or provider does not match' using errcode = '23514';
  end if;
  perform public.reconcile_update_delivery_events(p_provider, p_provider_message_id);
  select status into result from public.update_deliveries where id = p_delivery_id;
  return result;
end
$$;

revoke all on function public.process_update_delivery_event(uuid)
  from public, anon, authenticated;
revoke all on function public.apply_update_delivery_event(
  text, text, text, text, text, timestamptz, jsonb, boolean
) from public, anon, authenticated;
revoke all on function public.reconcile_update_delivery_events(text, text)
  from public, anon, authenticated;
revoke all on function public.mark_update_delivery_accepted(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.process_update_delivery_event(uuid) to service_role;
grant execute on function public.apply_update_delivery_event(
  text, text, text, text, text, timestamptz, jsonb, boolean
) to service_role;
grant execute on function public.reconcile_update_delivery_events(text, text) to service_role;
grant execute on function public.mark_update_delivery_accepted(uuid, text, text) to service_role;

comment on table public.update_delivery_events is
  'Minimal signed provider event audit trail; payloads exclude destinations and secrets.';
comment on function public.process_update_delivery_event(uuid) is
  'Central delivery lifecycle transition matrix. Precedence: complained > bounced > delivered > accepted.';
