begin;

alter table public.sms_verification_sessions
  add column if not exists follower_connection_id uuid
  references public.follower_connections(id) on delete cascade;

-- SMS verification proves ownership of the destination. Enrollment becomes active
-- only after the follower reviews and submits Stage 5.
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
  connection_row public.follower_connections%rowtype;
  source_contact public.follower_contacts%rowtype;
  connection_found boolean := false;
begin
  if auth.role() <> 'service_role' then
    raise exception 'SMS verification requires service role' using errcode = '42501';
  end if;

  select * into session_row
  from public.sms_verification_sessions
  where id = p_session_id
  for update;

  if not found or session_row.completed_at is not null
    or session_row.replaced_at is not null or session_row.expires_at <= now() then
    raise exception 'SMS verification session is not completable' using errcode = '23514';
  end if;

  select * into method_row
  from public.follower_recovery_methods
  where id = session_row.recovery_method_id and method_type = 'sms'
  for update;

  if not found or method_row.consent_purpose <> 'recovery_alerts'
    or method_row.consent_version is null or method_row.consented_at is null
    or method_row.consent_source is null or method_row.consent_revoked_at is not null then
    raise exception 'SMS-specific consent is required' using errcode = '23514';
  end if;

  if session_row.follower_connection_id is not null then
    select * into connection_row
    from public.follower_connections
    where id = session_row.follower_connection_id
      and creator_id = session_row.creator_id
      and status in ('active', 'paused')
      and management_tokens_revoked_at is null
    for update;
    if not found then
      raise exception 'Managed follower relationship is unavailable' using errcode = '23514';
    end if;
    connection_found := true;

    if method_row.follower_contact_id <> connection_row.follower_contact_id then
      select * into source_contact
      from public.follower_contacts
      where id = method_row.follower_contact_id
      for update;

      update public.follower_recovery_methods
      set method_status = 'revoked', consent_revoked_at = now()
      where follower_contact_id = connection_row.follower_contact_id
        and method_type = 'sms' and method_status = 'verified'
        and destination_hash <> method_row.destination_hash;

      update public.follower_recovery_methods
      set follower_contact_id = connection_row.follower_contact_id
      where id = method_row.id;
      update public.follower_contacts
      set phone_ciphertext = null, phone_hash = null, phone_masked = null
      where id = source_contact.id;
      update public.follower_contacts
      set phone_ciphertext = source_contact.phone_ciphertext,
          phone_hash = source_contact.phone_hash,
          phone_masked = source_contact.phone_masked
      where id = connection_row.follower_contact_id;
      delete from public.follower_contacts where id = source_contact.id;
      method_row.follower_contact_id := connection_row.follower_contact_id;
    end if;
  end if;

  if session_row.follower_connection_id is null then
    select * into connection_row
    from public.follower_connections
    where creator_id = session_row.creator_id
      and follower_contact_id = method_row.follower_contact_id
    for update;
    connection_found := found;
  end if;

  if connection_found and (connection_row.status not in ('active', 'paused')
    or connection_row.management_tokens_revoked_at is not null) then
    raise exception 'Follower relationship is inactive' using errcode = '23514';
  end if;

  insert into public.follower_connections(
    creator_id, follower_contact_id, status, consented_at, activated_at,
    preference_token_hash, unsubscribe_token_hash,
    preference_token_expires_at, unsubscribe_token_expires_at,
    management_tokens_revoked_at, consent_source, source_platform,
    source_referrer, landing_path
  ) values (
    session_row.creator_id, method_row.follower_contact_id, 'paused', now(), now(),
    p_preference_token_hash, p_unsubscribe_token_hash,
    p_token_expires_at, p_token_expires_at,
    null, 'creator_recovery_pass', session_row.source_platform,
    session_row.source_referrer, session_row.landing_path
  )
  on conflict(creator_id, follower_contact_id) do update set
    preference_token_hash = excluded.preference_token_hash,
    unsubscribe_token_hash = excluded.unsubscribe_token_hash,
    preference_token_expires_at = excluded.preference_token_expires_at,
    unsubscribe_token_expires_at = excluded.unsubscribe_token_expires_at
  returning * into connection_row;

  update public.follower_recovery_methods
  set method_status = 'verified', verified_at = now(), opted_out_at = null,
      opt_out_reason = null, consent_revoked_at = null
  where id = method_row.id;

  update public.follower_connections
  set selected_recovery_method_id = method_row.id
  where id = connection_row.id;

  update public.sms_verification_sessions
  set completed_at = now()
  where id = session_row.id and completed_at is null;

  return connection_row.id;
end
$$;

revoke all on function public.activate_sms_recovery_pass(uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.activate_sms_recovery_pass(uuid, text, text, timestamptz)
  to service_role;

commit;
