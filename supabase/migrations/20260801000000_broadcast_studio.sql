begin;

create type public.broadcast_intent as enum (
  'account_hacked',
  'account_banned',
  'account_inaccessible',
  'impersonation_warning',
  'platform_migration',
  'new_video',
  'livestream',
  'podcast_episode',
  'product_release',
  'event',
  'general_announcement',
  'community_update'
);

alter table public.creator_updates
  add column broadcast_intent public.broadcast_intent,
  add column affected_platform_connection_id uuid
    references public.connected_accounts(id) on delete restrict;

update public.creator_updates
set broadcast_intent = case broadcast_type
      when 'account_update' then 'account_inaccessible'::public.broadcast_intent
      when 'new_content' then 'new_video'::public.broadcast_intent
      when 'livestream' then 'livestream'::public.broadcast_intent
      when 'event' then 'event'::public.broadcast_intent
      when 'product_launch' then 'product_release'::public.broadcast_intent
      when 'announcement' then 'general_announcement'::public.broadcast_intent
    end;

alter table public.creator_updates
  alter column broadcast_intent set not null;

create index creator_updates_affected_platform_idx
  on public.creator_updates(affected_platform_connection_id)
  where affected_platform_connection_id is not null;

create or replace function public.broadcast_type_for_intent(
  intent public.broadcast_intent
)
returns public.broadcast_type
language sql
immutable
set search_path = ''
as $$
  select case
    when intent in (
      'account_hacked',
      'account_banned',
      'account_inaccessible',
      'impersonation_warning',
      'platform_migration'
    ) then 'account_update'::public.broadcast_type
    when intent in ('new_video', 'podcast_episode') then 'new_content'::public.broadcast_type
    when intent = 'livestream' then 'livestream'::public.broadcast_type
    when intent = 'event' then 'event'::public.broadcast_type
    when intent = 'product_release' then 'product_launch'::public.broadcast_type
    else 'announcement'::public.broadcast_type
  end
$$;

create or replace function public.broadcast_audience_rule_for_target(
  intent public.broadcast_intent,
  affected_platform_connection_id uuid
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when intent in (
      'account_hacked',
      'account_banned',
      'account_inaccessible',
      'impersonation_warning',
      'platform_migration'
    ) then 'affected_platform'
    when intent in ('new_video', 'livestream')
      and affected_platform_connection_id is not null then 'platform_followers'
    else 'category_followers'
  end
$$;

create or replace function public.validate_broadcast_studio_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  platform_creator_id uuid;
  platform_account_type text;
  is_emergency boolean;
  platform_allowed boolean;
  is_trusted_legacy_insert boolean := false;
begin
  if new.broadcast_intent is null then
    if coalesce(auth.role(), '') in ('authenticated', 'anon')
      and new.broadcast_type = 'account_update' then
      raise exception 'broadcast intent is required' using errcode = '23502';
    end if;
    is_trusted_legacy_insert := true;
    new.broadcast_intent := case new.broadcast_type
      when 'account_update' then 'account_inaccessible'::public.broadcast_intent
      when 'new_content' then 'new_video'::public.broadcast_intent
      when 'livestream' then 'livestream'::public.broadcast_intent
      when 'event' then 'event'::public.broadcast_intent
      when 'product_launch' then 'product_release'::public.broadcast_intent
      else 'general_announcement'::public.broadcast_intent
    end;
  end if;
  is_emergency := new.broadcast_intent in (
    'account_hacked',
    'account_banned',
    'account_inaccessible',
    'impersonation_warning',
    'platform_migration'
  );
  platform_allowed := is_emergency or new.broadcast_intent in ('new_video', 'livestream');

  if new.broadcast_type <> public.broadcast_type_for_intent(new.broadcast_intent) then
    raise exception 'broadcast type must match intent' using errcode = '23514';
  end if;
  if is_emergency and new.affected_platform_connection_id is null and not is_trusted_legacy_insert then
    raise exception 'platform emergencies require an affected platform' using errcode = '23514';
  end if;
  if new.affected_platform_connection_id is not null and not platform_allowed then
    raise exception 'this broadcast intent does not accept platform targeting' using errcode = '23514';
  end if;

  if new.affected_platform_connection_id is not null then
    select account.creator_id, account.account_type
    into platform_creator_id, platform_account_type
    from public.connected_accounts account
    where account.id = new.affected_platform_connection_id;
    if platform_creator_id is null or platform_creator_id <> new.creator_id then
      raise exception 'affected platform must belong to creator' using errcode = '23514';
    end if;
    if platform_account_type <> 'official' then
      raise exception 'affected platform must be an official account' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.status = 'scheduled'
    and (
      new.broadcast_intent is distinct from old.broadcast_intent
      or new.affected_platform_connection_id is distinct from old.affected_platform_connection_id
    ) then
    raise exception 'scheduled broadcast targeting cannot change' using errcode = '42501';
  end if;
  return new;
end
$$;

create trigger validate_broadcast_studio_target
before insert or update on public.creator_updates
for each row execute function public.validate_broadcast_studio_target();

create or replace function public.publish_update_delivery_queue(
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
  update_row public.creator_updates%rowtype;
  recipient record;
  recipient_count integer;
  existing_count integer;
  queued_count integer;
  derived_rule text;
  affected_platform text;
  summary jsonb;
begin
  select candidate.*
  into update_row
  from public.creator_updates candidate
  join public.creators creator on creator.id = candidate.creator_id
  where candidate.id = p_update_id
    and candidate.creator_id = p_creator_id
    and (
      auth.role() <> 'authenticated'
      or creator.owner_user_id = auth.uid()
    )
  for update of candidate;

  if not found then
    raise exception 'broadcast is not publishable or not owned' using errcode = '42501';
  end if;
  if update_row.status not in ('draft', 'cancelled', 'queued') then
    raise exception 'broadcast status does not permit publication' using errcode = '55000';
  end if;
  if btrim(update_row.title) = ''
    or btrim(update_row.subject) = ''
    or btrim(update_row.content) = '' then
    raise exception 'broadcast content is incomplete' using errcode = '23514';
  end if;
  if update_row.broadcast_intent is null
    or update_row.broadcast_type <> public.broadcast_type_for_intent(update_row.broadcast_intent) then
    raise exception 'broadcast intent is invalid' using errcode = '23514';
  end if;

  derived_rule := public.broadcast_audience_rule_for_target(
    update_row.broadcast_intent,
    update_row.affected_platform_connection_id
  );
  if derived_rule = 'affected_platform'
    and update_row.affected_platform_connection_id is null then
    raise exception 'platform emergencies require an affected platform' using errcode = '23514';
  end if;
  if update_row.affected_platform_connection_id is not null then
    select account.platform
    into affected_platform
    from public.connected_accounts account
    where account.id = update_row.affected_platform_connection_id
      and account.creator_id = p_creator_id
      and account.account_type = 'official';
    if affected_platform is null then
      raise exception 'affected platform is invalid' using errcode = '23514';
    end if;
  end if;

  if jsonb_typeof(coalesce(p_recipients, '[]'::jsonb)) <> 'array' then
    raise exception 'recipient payload must be an array' using errcode = '22023';
  end if;
  recipient_count := jsonb_array_length(coalesce(p_recipients, '[]'::jsonb));
  if update_row.status <> 'queued' and recipient_count = 0 then
    raise exception 'no eligible recipients' using errcode = 'P0001';
  end if;

  -- Plaintext destinations are decrypted in the application. The database still
  -- authoritatively validates every relationship, selected method, stored hash,
  -- preference, platform scope, and derived transport before accepting the value.
  for recipient in
    select value as payload
    from jsonb_array_elements(coalesce(p_recipients, '[]'::jsonb))
  loop
    if recipient.payload ? 'transport' then
      raise exception 'recipient transport must not be supplied' using errcode = '22023';
    end if;
    if not exists (
      select 1
      from public.follower_connections connection
      join public.follower_category_preferences preference
        on preference.follower_connection_id = connection.id
        and preference.category_key = public.expected_update_preference(update_row.broadcast_type)
        and preference.enabled is true
      join public.follower_recovery_methods method
        on method.id = (recipient.payload ->> 'recovery_method_id')::uuid
        and method.follower_contact_id = connection.follower_contact_id
        and method.method_status = 'verified'
      join public.follower_contacts contact
        on contact.id = connection.follower_contact_id
      where connection.id = (recipient.payload ->> 'connection_id')::uuid
        and connection.creator_id = p_creator_id
        and connection.status = 'active'
        and (
          derived_rule = 'category_followers'
          or connection.source_platform = affected_platform
        )
        and (
          update_row.broadcast_type <> 'account_update'
          or method.id = connection.selected_recovery_method_id
        )
        and (
          (
            public.expected_delivery_transport(update_row.broadcast_type, method.method_type) = 'email'
            and method.method_type = 'email'
            and recipient.payload ->> 'destination_hash' = method.destination_hash
            and recipient.payload ->> 'destination_hash' = contact.email_hash
            and recipient.payload ->> 'destination_hash' = encode(
              extensions.digest(lower(btrim(recipient.payload ->> 'destination')), 'sha256'),
              'hex'
            )
          )
          or (
            public.expected_delivery_transport(update_row.broadcast_type, method.method_type) in ('sms', 'whatsapp')
            and method.method_type = public.expected_delivery_transport(
              update_row.broadcast_type, method.method_type
            )::text
            and recipient.payload ->> 'destination_hash' = method.destination_hash
            and recipient.payload ->> 'destination_hash' = contact.phone_hash
            and recipient.payload ->> 'destination_hash' = encode(
              extensions.digest(recipient.payload ->> 'destination', 'sha256'),
              'hex'
            )
          )
          or (
            public.expected_delivery_transport(update_row.broadcast_type, method.method_type) = 'browser_notification'
            and method.method_type = 'web_push'
            and method.provider_identifier is not null
            and btrim(method.provider_identifier) <> ''
            and recipient.payload ->> 'destination' = method.provider_identifier
            and recipient.payload -> 'destination_hash' = 'null'::jsonb
          )
        )
    ) then
      raise exception 'recipient payload is not authoritative' using errcode = '23514';
    end if;
  end loop;

  summary := public.create_update_delivery_queue(p_update_id, p_creator_id, p_recipients);
  queued_count := coalesce((summary ->> 'created')::integer, 0);
  select count(*)::integer into existing_count
  from public.update_deliveries delivery
  where delivery.update_id = p_update_id;

  update public.creator_updates
  set status = 'queued',
      queued_at = coalesce(queued_at, now()),
      scheduled_for = null,
      cancelled_at = null
  where id = p_update_id
    and creator_id = p_creator_id
    and status in ('draft', 'cancelled', 'queued');

  return jsonb_build_object(
    'status', 'published',
    'updateId', p_update_id,
    'eligible', recipient_count,
    'queued', queued_count,
    'duplicates', case
      when recipient_count = 0 and update_row.status = 'queued' then existing_count
      else recipient_count - queued_count
    end,
    'excluded', 0,
    'byTransport', summary -> 'byTransport'
  );
end
$$;

revoke all on function public.broadcast_type_for_intent(public.broadcast_intent)
  from public, anon, authenticated;
revoke all on function public.broadcast_audience_rule_for_target(public.broadcast_intent, uuid)
  from public, anon, authenticated;
revoke all on function public.create_update_delivery_queue(uuid, uuid, jsonb)
  from authenticated;
grant execute on function public.create_update_delivery_queue(uuid, uuid, jsonb)
  to service_role;
revoke all on function public.publish_update_delivery_queue(uuid, uuid, jsonb)
  from public, anon;
grant execute on function public.publish_update_delivery_queue(uuid, uuid, jsonb)
  to authenticated, service_role;

-- Published broadcasts are ready for the trusted execution worker.
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
      and update_row.status in ('queued', 'scheduled')
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

commit;
