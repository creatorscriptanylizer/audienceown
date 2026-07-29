begin;

alter table public.follower_recovery_methods
  add column if not exists consent_purpose text,
  add column if not exists consent_version text,
  add column if not exists consent_source text,
  add column if not exists consent_revoked_at timestamptz,
  add column if not exists opted_out_at timestamptz,
  add column if not exists opt_out_reason text,
  add column if not exists last_failure_at timestamptz,
  add column if not exists failure_code text;

alter table public.follower_recovery_methods
  add constraint follower_recovery_methods_verified_timestamp_check
    check (method_type <> 'sms' or method_status <> 'verified' or verified_at is not null),
  add constraint follower_recovery_methods_sms_destination_check
    check (
      method_type <> 'sms'
      or method_status <> 'verified'
      or (
        destination_hash is not null
        and char_length(destination_hash) = 64
        and destination_masked ~ '•.*[0-9]{4}$'
        and char_length(destination_masked) <= 30
      )
    ),
  add constraint follower_recovery_methods_sms_opt_out_check
    check (method_type = 'sms' or (opted_out_at is null and opt_out_reason is null));

create table public.sms_verification_sessions (
  id uuid primary key default gen_random_uuid(),
  recovery_method_id uuid not null references public.follower_recovery_methods(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  session_token_hash text not null unique,
  provider_verification_id text,
  source_ip_hash text,
  preferences jsonb not null,
  source_platform text not null,
  source_referrer text,
  landing_path text,
  expires_at timestamptz not null,
  resend_available_at timestamptz not null,
  resend_count integer not null default 0 check (resend_count between 0 and 3),
  attempt_count integer not null default 0 check (attempt_count between 0 and 6),
  completed_at timestamptz,
  replaced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sms_verification_preferences_object check (jsonb_typeof(preferences) = 'object'),
  constraint sms_verification_expiry check (expires_at > created_at),
  constraint sms_verification_terminal check (
    completed_at is null or replaced_at is null
  )
);

create unique index sms_verification_one_active_method_idx
  on public.sms_verification_sessions(recovery_method_id)
  where completed_at is null and replaced_at is null;
create index sms_verification_destination_rate_idx
  on public.sms_verification_sessions(recovery_method_id, created_at desc);
create index sms_verification_ip_rate_idx
  on public.sms_verification_sessions(source_ip_hash, created_at desc)
  where source_ip_hash is not null;

create trigger sms_verification_sessions_updated
before update on public.sms_verification_sessions
for each row execute function public.set_updated_at();

alter table public.sms_verification_sessions enable row level security;
alter table public.sms_verification_sessions force row level security;
revoke all on public.sms_verification_sessions from public, anon, authenticated;
grant all on public.sms_verification_sessions to service_role;

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
        and method.method_status = 'verified'
        and method.verified_at is not null
        and method.opted_out_at is null
        and (
          method.method_type <> 'web_push'
          or nullif(btrim(method.provider_identifier), '') is not null
        )
    ) then
    raise exception 'selected recovery method must be active, verified, and owned by the relationship contact'
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

create or replace function public.delivery_provider_for_transport(
  p_transport public.delivery_transport
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_transport = 'email' then 'resend'
    when p_transport = 'browser_notification' then 'web-push'
    when p_transport = 'sms' then 'twilio'
    else 'unsupported'
  end
$$;
revoke all on function public.delivery_provider_for_transport(public.delivery_transport)
  from public, anon, authenticated;

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
    and (new.destination <> old.destination
      or new.destination_hash is distinct from old.destination_hash) then
    raise exception 'destination identity cannot change after sending begins' using errcode = '42501';
  end if;
  if old.status = 'complained' and new.status <> old.status
    or old.status = 'bounced' and new.status not in ('bounced', 'complained')
    or old.status = 'delivered' and new.status not in ('delivered', 'bounced', 'complained')
    or old.status = 'accepted' and new.status not in (
      'accepted', 'delivered', 'bounced', 'complained',
      case when old.transport in ('sms', 'whatsapp') then 'failed'::public.delivery_status else 'accepted' end
    )
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

create or replace function public.process_update_delivery_event(p_event_id uuid)
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
  select event.* into event_row from public.update_delivery_events event
  where event.id = p_event_id for update;
  if not found then raise exception 'delivery event not found' using errcode = 'P0002'; end if;
  if event_row.processing_status in ('applied','ignored','rejected','duplicate') then
    select status into next_status from public.update_deliveries
    where id = event_row.update_delivery_id;
    return next_status;
  end if;
  if event_row.normalized_status is null then
    update public.update_delivery_events set processing_status = 'ignored', processing_error = null
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
  update public.update_delivery_events set update_delivery_id = delivery_row.id
  where id = p_event_id;

  if delivery_row.status in ('cancelled','skipped','failed') then
    update public.update_delivery_events
    set processing_status = 'rejected',
        processing_error = 'delivery state does not accept provider events'
    where id = p_event_id;
    return delivery_row.status;
  end if;
  if event_row.normalized_status = 'failed'
    and delivery_row.transport not in ('sms', 'whatsapp') then
    update public.update_delivery_events
    set processing_status = 'rejected',
        processing_error = 'failed provider callbacks are not valid for this transport'
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
    when event_row.normalized_status = 'failed' then 'failed'::public.delivery_status
    when delivery_row.status = 'accepted' then 'accepted'::public.delivery_status
    when event_row.normalized_status = 'accepted' then 'accepted'::public.delivery_status
    else delivery_row.status
  end;
  occurred_at := coalesce(event_row.event_timestamp, event_row.received_at);

  update public.update_deliveries
  set status = next_status,
      provider_status = event_row.event_type,
      accepted_at = case when next_status = 'accepted'
        then coalesce(accepted_at, occurred_at) else accepted_at end,
      delivered_at = case when next_status = 'delivered'
        then coalesce(delivered_at, occurred_at) else delivered_at end,
      failed_at = case when next_status = 'failed'
        then coalesce(failed_at, occurred_at) else failed_at end,
      bounced_at = case when next_status = 'bounced'
        then coalesce(bounced_at, occurred_at) else bounced_at end,
      complained_at = case when next_status = 'complained'
        then coalesce(complained_at, occurred_at) else complained_at end,
      provider_error_code = case when event_row.normalized_status in ('bounced','failed')
        then left(event_row.payload ->> 'error_code', 120) else provider_error_code end,
      provider_error_message = case when event_row.normalized_status in ('bounced','failed')
        then left(event_row.payload ->> 'failure_category', 500) else provider_error_message end
  where id = delivery_row.id;

  update public.update_delivery_events
  set processing_status = case when next_status = delivery_row.status then 'ignored' else 'applied' end,
      processing_error = null
  where id = p_event_id;
  return next_status;
end
$$;
revoke all on function public.process_update_delivery_event(uuid)
  from public, anon, authenticated;
grant execute on function public.process_update_delivery_event(uuid) to service_role;

create or replace function public.opt_out_sms_recovery_method(
  p_destination_hash text,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  method_ids uuid[];
  affected integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'SMS opt-out requires service role' using errcode = '42501';
  end if;
  select array_agg(method.id) into method_ids
  from public.follower_recovery_methods method
  where method.method_type = 'sms'
    and method.destination_hash = p_destination_hash
    and method.method_status <> 'revoked';
  if method_ids is null then return 0; end if;

  update public.follower_connections
  set selected_recovery_method_id = null
  where selected_recovery_method_id = any(method_ids);
  update public.follower_recovery_methods
  set method_status = 'revoked',
      opted_out_at = now(),
      consent_revoked_at = now(),
      opt_out_reason = left(coalesce(nullif(btrim(p_reason), ''), 'provider_opt_out'), 120)
  where id = any(method_ids);
  get diagnostics affected = row_count;
  update public.sms_verification_sessions
  set replaced_at = now()
  where recovery_method_id = any(method_ids)
    and completed_at is null and replaced_at is null;
  return affected;
end
$$;
revoke all on function public.opt_out_sms_recovery_method(text, text)
  from public, anon, authenticated;
grant execute on function public.opt_out_sms_recovery_method(text, text) to service_role;

create or replace function public.activate_sms_recovery_pass(
  p_session_id uuid,
  p_preference_token_hash text,
  p_unsubscribe_token_hash text,
  p_token_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.sms_verification_sessions%rowtype;
  method_row public.follower_recovery_methods%rowtype;
  connection_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'SMS activation requires service role' using errcode = '42501';
  end if;
  select session.* into session_row
  from public.sms_verification_sessions session
  where session.id = p_session_id
  for update;
  if not found or session_row.completed_at is not null
    or session_row.replaced_at is not null or session_row.expires_at <= now() then
    raise exception 'SMS verification session is not active' using errcode = '23514';
  end if;
  select method.* into method_row
  from public.follower_recovery_methods method
  where method.id = session_row.recovery_method_id
    and method.method_type = 'sms'
  for update;
  if not found then
    raise exception 'SMS recovery method is missing' using errcode = '23514';
  end if;

  insert into public.follower_connections(
    creator_id, follower_contact_id, status, consented_at, activated_at,
    preference_token_hash, unsubscribe_token_hash,
    preference_token_expires_at, unsubscribe_token_expires_at,
    management_tokens_revoked_at, consent_source, source_platform,
    source_referrer, landing_path
  ) values (
    session_row.creator_id, method_row.follower_contact_id, 'active', now(), now(),
    p_preference_token_hash, p_unsubscribe_token_hash,
    p_token_expires_at, p_token_expires_at,
    null, 'creator_recovery_pass', session_row.source_platform,
    session_row.source_referrer, session_row.landing_path
  )
  on conflict(creator_id, follower_contact_id) do update
  set status = 'active',
      consented_at = now(),
      activated_at = now(),
      preference_token_hash = excluded.preference_token_hash,
      unsubscribe_token_hash = excluded.unsubscribe_token_hash,
      preference_token_expires_at = excluded.preference_token_expires_at,
      unsubscribe_token_expires_at = excluded.unsubscribe_token_expires_at,
      management_tokens_revoked_at = null
  returning id into connection_id;

  update public.follower_recovery_methods
  set method_status = 'verified', verified_at = now(),
      opted_out_at = null, opt_out_reason = null, consent_revoked_at = null
  where id = method_row.id;
  update public.follower_connections
  set selected_recovery_method_id = method_row.id
  where id = connection_id;
  insert into public.follower_category_preferences(
    follower_connection_id, category_key, enabled
  )
  select connection_id, entry.key, (entry.value)::text::boolean
  from jsonb_each(session_row.preferences) entry
  on conflict(follower_connection_id, category_key)
  do update set enabled = excluded.enabled;
  insert into public.follower_notification_preferences(
    follower_connection_id, creator_announcements, new_content,
    important_account_updates
  ) values (
    connection_id,
    coalesce((session_row.preferences ->> 'announcements')::boolean, false),
    coalesce((session_row.preferences ->> 'videos')::boolean, false),
    true
  )
  on conflict(follower_connection_id) do update
  set creator_announcements = excluded.creator_announcements,
      new_content = excluded.new_content,
      important_account_updates = true;
  update public.sms_verification_sessions
  set completed_at = now()
  where id = session_row.id;
  return connection_id;
end
$$;
revoke all on function public.activate_sms_recovery_pass(uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.activate_sms_recovery_pass(uuid, text, text, timestamptz)
  to service_role;

commit;
