begin;

alter table public.update_deliveries
  add column claimed_at timestamptz;

create index update_deliveries_claimable_idx
  on public.update_deliveries(status, queued_at)
  where status = 'queued';
create index update_deliveries_stuck_sending_idx
  on public.update_deliveries(claimed_at)
  where status = 'sending';

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
    if old.status = 'delivered' and new.status <> old.status
      or old.status in ('failed', 'skipped', 'cancelled') and new.status <> old.status
      or old.status = 'sent' and new.status not in ('sent', 'delivered')
      or old.status = 'sending' and new.status not in ('sending', 'queued', 'sent', 'failed', 'cancelled')
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

  select connection.creator_id, connection.follower_contact_id, connection.status,
         connection.selected_recovery_method_id
  into connection_creator_id, connection_contact_id, connection_status, selected_method_id
  from public.follower_connections connection
  where connection.id = new.connection_id;
  if connection_creator_id is null or connection_creator_id <> new.creator_id
    or connection_contact_id <> new.contact_id then
    raise exception 'delivery connection does not belong to creator/contact' using errcode = '23514';
  end if;
  if connection_status <> 'active' then
    raise exception 'delivery connection must be active' using errcode = '23514';
  end if;

  if selected_method_id is not null then
    select method.follower_contact_id, method.method_type, method.method_status,
           method.provider_identifier
    into selected_method_contact_id, selected_method_type, selected_method_status,
         selected_method_provider_identifier
    from public.follower_recovery_methods method
    where method.id = selected_method_id;
  end if;
  expected_transport := public.expected_delivery_transport(update_type, selected_method_type);
  if expected_transport is null then
    raise exception 'selected recovery method is missing' using errcode = '23514';
  end if;
  if update_type = 'account_update' then
    if selected_method_contact_id is null or selected_method_contact_id <> connection_contact_id
      or selected_method_status <> 'verified' or new.recovery_method_id <> selected_method_id then
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
    select 1 from public.follower_category_preferences preference
    where preference.follower_connection_id = new.connection_id
      and preference.category_key = new.preference_category and preference.enabled is true
  ) then
    raise exception 'recipient preference is disabled' using errcode = '23514';
  end if;

  select method.follower_contact_id, method.method_type, method.method_status,
         method.destination_hash, method.provider_identifier,
         contact.email_hash, contact.phone_hash
  into method_contact_id, method_type, method_status, method_destination_hash,
       method_provider_identifier, contact_email_hash, contact_phone_hash
  from public.follower_recovery_methods method
  join public.follower_contacts contact on contact.id = method.follower_contact_id
  where method.id = new.recovery_method_id;
  if method_contact_id is null or method_contact_id <> new.contact_id
    or method_status <> 'verified' then
    raise exception 'selected recovery destination is not verified' using errcode = '23514';
  end if;

  if new.transport = 'email' then
    if method_type <> 'email' or new.destination <> lower(btrim(new.destination))
      or new.destination !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or new.destination_hash is null or new.destination_hash <> method_destination_hash
      or new.destination_hash <> contact_email_hash
      or new.destination_hash <> encode(extensions.digest(new.destination, 'sha256'), 'hex') then
      raise exception 'invalid verified email destination' using errcode = '23514';
    end if;
  elsif new.transport in ('sms', 'whatsapp') then
    if method_type <> new.transport::text or new.destination !~ '^\+[1-9][0-9]{7,14}$'
      or new.destination_hash is null or new.destination_hash <> method_destination_hash
      or new.destination_hash <> contact_phone_hash
      or new.destination_hash <> encode(extensions.digest(new.destination, 'sha256'), 'hex') then
      raise exception 'invalid verified phone destination' using errcode = '23514';
    end if;
  elsif new.transport = 'browser_notification' then
    if method_type <> 'web_push' or method_provider_identifier is null
      or btrim(method_provider_identifier) = '' or new.destination <> method_provider_identifier
      or new.destination_hash is not null then
      raise exception 'inactive browser subscription' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;

create or replace function public.delivery_provider_for_transport(
  p_transport public.delivery_transport
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_transport = 'email' then 'resend' else 'unsupported' end
$$;
revoke all on function public.delivery_provider_for_transport(public.delivery_transport)
  from public, anon, authenticated;

create or replace function public.claim_update_deliveries(
  p_limit integer,
  p_max_attempts integer,
  p_stuck_timeout_seconds integer
)
returns table (
  delivery_id uuid,
  update_id uuid,
  creator_id uuid,
  transport public.delivery_transport,
  destination text,
  attempt_count integer,
  broadcast_type public.broadcast_type,
  title text,
  subject text,
  preview_text text,
  content text,
  cta_label text,
  cta_url text,
  creator_display_name text,
  creator_public_slug text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'delivery claims require service role' using errcode = '42501';
  end if;
  if p_limit < 1 or p_limit > 100 or p_max_attempts < 1
    or p_stuck_timeout_seconds < 60 then
    raise exception 'invalid delivery claim limits' using errcode = '22023';
  end if;

  return query
  with claimable as (
    select delivery.id
    from public.update_deliveries delivery
    join public.creator_updates update_row on update_row.id = delivery.update_id
    join public.creators creator on creator.id = delivery.creator_id
    where delivery.attempt_count < p_max_attempts
      and (
        delivery.status = 'queued'
        or (
          delivery.status = 'sending'
          and delivery.claimed_at < now() - make_interval(secs => p_stuck_timeout_seconds)
        )
      )
      and update_row.status in ('draft', 'scheduled')
      and btrim(update_row.title) <> ''
      and btrim(update_row.subject) <> ''
      and btrim(update_row.content) <> ''
      and (update_row.scheduled_for is null or update_row.scheduled_for <= now())
    order by delivery.queued_at, delivery.id
    for update of delivery skip locked
    limit p_limit
  ),
  claimed as (
    update public.update_deliveries delivery
    set status = 'sending',
        attempt_count = delivery.attempt_count + 1,
        last_attempt_at = now(),
        claimed_at = now(),
        sending_at = now(),
        failed_at = null,
        failure_code = null,
        failure_reason = null
    from claimable
    where delivery.id = claimable.id
    returning delivery.*
  )
  select claimed.id, claimed.update_id, claimed.creator_id, claimed.transport,
         claimed.destination, claimed.attempt_count, update_row.broadcast_type,
         update_row.title, update_row.subject, update_row.preview_text,
         update_row.content, update_row.cta_label, update_row.cta_url,
         creator.display_name, creator.public_slug
  from claimed
  join public.creator_updates update_row on update_row.id = claimed.update_id
  join public.creators creator on creator.id = claimed.creator_id;
end
$$;

create or replace function public.mark_update_delivery_sent(
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
  set status = 'sent', provider = p_provider,
      provider_message_id = p_provider_message_id, sent_at = now(),
      claimed_at = null, failure_code = null, failure_reason = null
  where delivery.id = p_delivery_id and delivery.status = 'sending'
    and p_provider = public.delivery_provider_for_transport(delivery.transport)
  returning delivery.status into result;
  if result is null then
    raise exception 'delivery is not sending or provider does not match' using errcode = '23514';
  end if;
  return result;
end
$$;

create or replace function public.mark_update_delivery_failed(
  p_delivery_id uuid,
  p_provider text,
  p_code text,
  p_reason text,
  p_retryable boolean,
  p_max_attempts integer
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
  if p_max_attempts < 1 then
    raise exception 'invalid maximum attempts' using errcode = '22023';
  end if;
  update public.update_deliveries delivery
  set status = case
        when p_retryable and delivery.attempt_count < p_max_attempts
          then 'queued'::public.delivery_status
        else 'failed'::public.delivery_status
      end,
      provider = p_provider,
      provider_message_id = null,
      claimed_at = null,
      failed_at = case
        when p_retryable and delivery.attempt_count < p_max_attempts then null
        else now()
      end,
      failure_code = left(coalesce(nullif(btrim(p_code), ''), 'provider_error'), 120),
      failure_reason = left(coalesce(nullif(btrim(p_reason), ''), 'Delivery provider failed.'), 500)
  where delivery.id = p_delivery_id and delivery.status = 'sending'
    and p_provider = public.delivery_provider_for_transport(delivery.transport)
  returning delivery.status into result;
  if result is null then
    raise exception 'delivery is not sending or provider does not match' using errcode = '23514';
  end if;
  return result;
end
$$;

revoke all on function public.claim_update_deliveries(integer, integer, integer)
  from public, anon, authenticated;
revoke all on function public.mark_update_delivery_sent(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.mark_update_delivery_failed(uuid, text, text, text, boolean, integer)
  from public, anon, authenticated;
grant execute on function public.claim_update_deliveries(integer, integer, integer)
  to service_role;
grant execute on function public.mark_update_delivery_sent(uuid, text, text)
  to service_role;
grant execute on function public.mark_update_delivery_failed(uuid, text, text, text, boolean, integer)
  to service_role;

commit;
