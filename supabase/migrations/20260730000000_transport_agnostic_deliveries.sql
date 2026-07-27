begin;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'delivery_transport'
  ) then
    create type public.delivery_transport as enum (
      'email',
      'sms',
      'whatsapp',
      'browser_notification'
    );
  end if;
end
$$;

alter table public.follower_connections
  add column selected_recovery_method_id uuid
    references public.follower_recovery_methods(id) on delete restrict;

create index follower_connections_selected_recovery_method_idx
  on public.follower_connections(selected_recovery_method_id)
  where selected_recovery_method_id is not null;

alter table public.follower_recovery_methods
  drop constraint if exists follower_recovery_methods_method_type_check;
alter table public.follower_recovery_methods
  add constraint follower_recovery_methods_method_type_check
  check (method_type in ('email','sms','whatsapp','web_push','google','apple','passkey'));

update public.follower_connections connection
set selected_recovery_method_id = (
  select method.id
  from public.follower_recovery_methods method
  where method.follower_contact_id = connection.follower_contact_id
    and method.method_type = 'email'
    and method.method_status = 'verified'
  order by method.created_at, method.id
  limit 1
)
where connection.selected_recovery_method_id is null;

create or replace function public.protect_recovery_connection()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.source_platform := old.source_platform;
    new.source_campaign := old.source_campaign;
    new.source_referrer := old.source_referrer;
    new.landing_path := old.landing_path;
  end if;
  if new.selected_recovery_method_id is not null
    and not exists (
      select 1
      from public.follower_recovery_methods method
      where method.id = new.selected_recovery_method_id
        and method.follower_contact_id = new.follower_contact_id
    ) then
    raise exception 'selected recovery method must belong to the relationship contact'
      using errcode = '23514';
  end if;
  if new.status in ('active','paused') then
    new.activated_at := coalesce(new.activated_at, new.consented_at, now());
    new.deactivated_at := null;
    new.unsubscribed_at := null;
  elsif new.status = 'deactivated' then
    new.deactivated_at := coalesce(new.deactivated_at, now());
    new.unsubscribed_at := null;
  elsif new.status = 'unsubscribed' then
    new.unsubscribed_at := coalesce(new.unsubscribed_at, now());
  end if;
  return new;
end
$$;
comment on function public.protect_recovery_connection() is
  'Preserves attribution and status history and validates the exact selected recovery method.';

alter table public.update_deliveries
  add column transport public.delivery_transport,
  add column recovery_method_id uuid references public.follower_recovery_methods(id) on delete restrict,
  add column destination text,
  add column destination_hash text,
  add column provider text,
  add column provider_metadata jsonb not null default '{}'::jsonb;

update public.update_deliveries delivery
set transport = 'email',
    destination = delivery.recipient_email,
    destination_hash = encode(extensions.digest(delivery.recipient_email, 'sha256'), 'hex'),
    recovery_method_id = method.id
from public.follower_recovery_methods method
where method.follower_contact_id = delivery.contact_id
  and method.method_type = 'email'
  and method.method_status = 'verified'
  and method.destination_hash = encode(extensions.digest(delivery.recipient_email, 'sha256'), 'hex');

do $$
begin
  if exists (
    select 1 from public.update_deliveries
    where transport is null or destination is null or recovery_method_id is null
  ) then
    raise exception 'transport migration requires every existing delivery to have a verified email method';
  end if;
end
$$;

alter table public.update_deliveries
  alter column transport set not null,
  alter column recovery_method_id set not null,
  alter column destination set not null,
  drop constraint update_deliveries_update_connection_unique,
  drop constraint update_deliveries_email_normalized,
  drop column recipient_email,
  add constraint update_deliveries_update_connection_transport_unique
    unique(update_id, connection_id, transport),
  add constraint update_deliveries_destination_present check (btrim(destination) <> '');

drop index update_deliveries_provider_message_idx;
create index update_deliveries_transport_idx on public.update_deliveries(transport);
create index update_deliveries_update_transport_idx on public.update_deliveries(update_id, transport);
create index update_deliveries_method_idx on public.update_deliveries(recovery_method_id);
create index update_deliveries_provider_message_idx
  on public.update_deliveries(provider, provider_message_id)
  where provider_message_id is not null;

create or replace function public.expected_delivery_transport(
  update_type public.broadcast_type,
  selected_method_type text
)
returns public.delivery_transport
language sql
immutable
set search_path = ''
as $$
  select case
    when update_type <> 'account_update' then 'email'::public.delivery_transport
    when selected_method_type = 'email' then 'email'::public.delivery_transport
    when selected_method_type = 'sms' then 'sms'::public.delivery_transport
    when selected_method_type = 'whatsapp' then 'whatsapp'::public.delivery_transport
    when selected_method_type = 'web_push' then 'browser_notification'::public.delivery_transport
    else null
  end
$$;
revoke all on function public.expected_delivery_transport(public.broadcast_type, text)
  from public, anon, authenticated;

create or replace function public.protect_update_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  update_creator_id uuid;
  update_type public.broadcast_type;
  connection_creator_id uuid;
  connection_contact_id uuid;
  connection_status text;
  selected_method_id uuid;
  selected_method_contact_id uuid;
  selected_method_type text;
  selected_method_status text;
  selected_method_provider_identifier text;
  expected_transport public.delivery_transport;
  method_contact_id uuid;
  method_type text;
  method_status text;
  method_destination_hash text;
  method_provider_identifier text;
  contact_email_hash text;
  contact_phone_hash text;
begin
  if tg_op = 'DELETE' then
    if auth.role() = 'authenticated' then
      raise exception 'delivery history cannot be deleted by creators' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.update_id <> old.update_id then
      raise exception 'update_id cannot be changed' using errcode = '42501';
    end if;
    if new.creator_id <> old.creator_id then
      raise exception 'creator_id cannot be changed' using errcode = '42501';
    end if;
    if new.connection_id <> old.connection_id then
      raise exception 'connection_id cannot be changed' using errcode = '42501';
    end if;
    if new.contact_id <> old.contact_id then
      raise exception 'contact_id cannot be changed' using errcode = '42501';
    end if;
    if new.transport <> old.transport then
      raise exception 'transport cannot be changed' using errcode = '42501';
    end if;
    if new.recovery_method_id <> old.recovery_method_id then
      raise exception 'recovery_method_id cannot be changed' using errcode = '42501';
    end if;
    if old.status <> 'queued'
      and (
        new.destination <> old.destination
        or new.destination_hash is distinct from old.destination_hash
      ) then
      raise exception 'destination identity cannot change after sending begins' using errcode = '42501';
    end if;

    if old.status = 'delivered' and new.status <> old.status
      or old.status in ('failed', 'skipped', 'cancelled') and new.status <> old.status
      or old.status = 'sent' and new.status not in ('sent', 'delivered')
      or old.status = 'sending' and new.status not in ('sending', 'sent', 'failed', 'cancelled')
      or old.status = 'queued' and new.status not in ('queued', 'sending', 'skipped', 'cancelled') then
      raise exception 'invalid delivery status transition' using errcode = '23514';
    end if;

    if auth.role() = 'authenticated'
      and not (old.status = 'queued' and new.status = 'cancelled') then
      raise exception 'creators may only cancel queued deliveries' using errcode = '42501';
    end if;
  end if;

  select update_row.creator_id, update_row.broadcast_type
  into update_creator_id, update_type
  from public.creator_updates update_row
  where update_row.id = new.update_id;

  if update_creator_id is null or new.creator_id <> update_creator_id then
    raise exception 'creator_id must match update owner' using errcode = '23514';
  end if;

  select
    connection.creator_id,
    connection.follower_contact_id,
    connection.status,
    connection.selected_recovery_method_id
  into
    connection_creator_id,
    connection_contact_id,
    connection_status,
    selected_method_id
  from public.follower_connections connection
  where connection.id = new.connection_id;

  if connection_creator_id is null
    or connection_creator_id <> new.creator_id
    or connection_contact_id <> new.contact_id then
    raise exception 'delivery connection does not belong to creator/contact' using errcode = '23514';
  end if;
  if connection_status <> 'active' then
    raise exception 'delivery connection must be active' using errcode = '23514';
  end if;

  if selected_method_id is not null then
    select
      method.follower_contact_id,
      method.method_type,
      method.method_status,
      method.provider_identifier
    into
      selected_method_contact_id,
      selected_method_type,
      selected_method_status,
      selected_method_provider_identifier
    from public.follower_recovery_methods method
    where method.id = selected_method_id;
  end if;

  expected_transport := public.expected_delivery_transport(update_type, selected_method_type);
  if expected_transport is null then
    raise exception 'selected recovery method is missing' using errcode = '23514';
  end if;
  if update_type = 'account_update' then
    if selected_method_contact_id is null
      or selected_method_contact_id <> connection_contact_id
      or selected_method_status <> 'verified'
      or new.recovery_method_id <> selected_method_id then
      raise exception 'delivery must use the exact selected recovery method' using errcode = '23514';
    end if;
    if expected_transport = 'browser_notification'
      and (
        selected_method_provider_identifier is null
        or btrim(selected_method_provider_identifier) = ''
      ) then
      raise exception 'inactive browser subscription' using errcode = '23514';
    end if;
  end if;
  if new.transport <> expected_transport then
    raise exception 'transport does not match selected recovery method' using errcode = '23514';
  end if;
  if new.preference_category <> public.expected_update_preference(update_type) then
    raise exception 'preference category does not match update type' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from public.follower_category_preferences preference
    where preference.follower_connection_id = new.connection_id
      and preference.category_key = new.preference_category
      and preference.enabled is true
  ) then
    raise exception 'recipient preference is disabled' using errcode = '23514';
  end if;

  select
    method.follower_contact_id,
    method.method_type,
    method.method_status,
    method.destination_hash,
    method.provider_identifier,
    contact.email_hash,
    contact.phone_hash
  into
    method_contact_id,
    method_type,
    method_status,
    method_destination_hash,
    method_provider_identifier,
    contact_email_hash,
    contact_phone_hash
  from public.follower_recovery_methods method
  join public.follower_contacts contact on contact.id = method.follower_contact_id
  where method.id = new.recovery_method_id;

  if method_contact_id is null or method_contact_id <> new.contact_id or method_status <> 'verified' then
    raise exception 'selected recovery destination is not verified' using errcode = '23514';
  end if;

  if new.transport = 'email' then
    if method_type <> 'email'
      or new.destination <> lower(btrim(new.destination))
      or new.destination !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or new.destination_hash is null
      or new.destination_hash <> method_destination_hash
      or new.destination_hash <> contact_email_hash
      or new.destination_hash <> encode(extensions.digest(new.destination, 'sha256'), 'hex') then
      raise exception 'invalid verified email destination' using errcode = '23514';
    end if;
  elsif new.transport in ('sms', 'whatsapp') then
    if method_type <> new.transport::text
      or new.destination !~ '^\+[1-9][0-9]{7,14}$'
      or new.destination_hash is null
      or new.destination_hash <> method_destination_hash
      or new.destination_hash <> contact_phone_hash
      or new.destination_hash <> encode(extensions.digest(new.destination, 'sha256'), 'hex') then
      raise exception 'invalid verified phone destination' using errcode = '23514';
    end if;
  elsif new.transport = 'browser_notification' then
    if method_type <> 'web_push'
      or method_provider_identifier is null
      or btrim(method_provider_identifier) = ''
      or new.destination <> method_provider_identifier
      or new.destination_hash is not null then
      raise exception 'inactive browser subscription' using errcode = '23514';
    end if;
  end if;

  return new;
end
$$;
comment on function public.protect_update_delivery() is
  'Preserves transport-aware delivery identity, ownership, eligibility, and forward-only history.';
revoke all on function public.protect_update_delivery() from public, anon, authenticated;

drop function public.create_update_delivery_queue(uuid, uuid, jsonb);
create or replace function public.create_update_delivery_queue(
  p_update_id uuid,
  p_creator_id uuid,
  p_recipients jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1
    from public.creator_updates update_row
    where update_row.id = p_update_id
      and update_row.creator_id = p_creator_id
      and (
        auth.role() <> 'authenticated'
        or exists (
          select 1 from public.creators creator
          where creator.id = p_creator_id and creator.owner_user_id = auth.uid()
        )
      )
  ) then
    raise exception 'update not found or not owned' using errcode = '42501';
  end if;

  with candidates as (
    select
      update_row.id as update_id,
      update_row.creator_id,
      update_row.broadcast_type,
      connection.id as connection_id,
      connection.follower_contact_id as contact_id,
      public.expected_delivery_transport(
        update_row.broadcast_type,
        method.method_type
      ) as transport,
      method.id as recovery_method_id,
      recipient.destination,
      recipient.destination_hash
    from public.creator_updates update_row
    cross join lateral jsonb_to_recordset(coalesce(p_recipients, '[]'::jsonb))
      as recipient(
        connection_id uuid,
        recovery_method_id uuid,
        destination text,
        destination_hash text
      )
    join public.follower_connections connection
      on connection.id = recipient.connection_id
      and connection.creator_id = p_creator_id
      and connection.status = 'active'
    join public.follower_category_preferences preference
      on preference.follower_connection_id = connection.id
      and preference.category_key = public.expected_update_preference(update_row.broadcast_type)
      and preference.enabled is true
    join public.follower_recovery_methods method
      on method.id = case
        when update_row.broadcast_type = 'account_update'
          then connection.selected_recovery_method_id
        else recipient.recovery_method_id
      end
      and method.follower_contact_id = connection.follower_contact_id
      and method.method_status = 'verified'
    join public.follower_contacts contact
      on contact.id = connection.follower_contact_id
    where update_row.id = p_update_id
      and update_row.creator_id = p_creator_id
      and (
        (
          public.expected_delivery_transport(
            update_row.broadcast_type,
            method.method_type
          ) = 'email'
          and method.method_type = 'email'
          and recipient.destination_hash = method.destination_hash
          and recipient.destination_hash = contact.email_hash
          and recipient.destination_hash = encode(
            extensions.digest(lower(btrim(recipient.destination)), 'sha256'),
            'hex'
          )
        )
        or (
          public.expected_delivery_transport(
            update_row.broadcast_type,
            method.method_type
          ) in ('sms', 'whatsapp')
          and method.method_type = public.expected_delivery_transport(
            update_row.broadcast_type,
            method.method_type
          )::text
          and recipient.destination_hash = method.destination_hash
          and recipient.destination_hash = contact.phone_hash
          and recipient.destination_hash = encode(
            extensions.digest(recipient.destination, 'sha256'),
            'hex'
          )
        )
        or (
          public.expected_delivery_transport(
            update_row.broadcast_type,
            method.method_type
          ) = 'browser_notification'
          and method.method_type = 'web_push'
          and method.provider_identifier is not null
          and btrim(method.provider_identifier) <> ''
          and recipient.destination = method.provider_identifier
          and recipient.destination_hash is null
        )
      )
  ),
  inserted as (
    insert into public.update_deliveries (
      update_id,
      creator_id,
      connection_id,
      contact_id,
      recovery_method_id,
      transport,
      destination,
      destination_hash,
      preference_category
    )
    select
      candidate.update_id,
      candidate.creator_id,
      candidate.connection_id,
      candidate.contact_id,
      candidate.recovery_method_id,
      candidate.transport,
      case
        when candidate.transport = 'email' then lower(btrim(candidate.destination))
        else candidate.destination
      end,
      candidate.destination_hash,
      public.expected_update_preference(candidate.broadcast_type)
    from candidates candidate
    where candidate.transport is not null
    on conflict (update_id, connection_id, transport) do nothing
    returning transport
  )
  select jsonb_build_object(
    'created', count(*)::integer,
    'byTransport', jsonb_build_object(
      'email', count(*) filter (where transport = 'email'),
      'sms', count(*) filter (where transport = 'sms'),
      'whatsapp', count(*) filter (where transport = 'whatsapp'),
      'browser_notification', count(*) filter (where transport = 'browser_notification')
    )
  )
  into result
  from inserted;

  return result;
end
$$;
comment on function public.create_update_delivery_queue(uuid, uuid, jsonb) is
  'Atomically prepares idempotent transport-aware deliveries and returns aggregate counts only.';
revoke all on function public.create_update_delivery_queue(uuid, uuid, jsonb) from public, anon;
grant execute on function public.create_update_delivery_queue(uuid, uuid, jsonb)
  to authenticated, service_role;

commit;
