begin;

alter table public.follower_recovery_methods
  add constraint follower_recovery_methods_whatsapp_verified_check
    check (method_type <> 'whatsapp' or method_status <> 'verified' or verified_at is not null),
  add constraint follower_recovery_methods_whatsapp_destination_check
    check (
      method_type <> 'whatsapp' or method_status <> 'verified' or (
        destination_hash is not null
        and char_length(destination_hash) = 64
        and destination_masked ~ '•.*[0-9]{4}$'
        and char_length(destination_masked) <= 30
      )
    ),
  add constraint follower_recovery_methods_phone_consent_check
    check (
      method_type <> 'whatsapp'
      or method_status <> 'verified'
      -- Pre-2.9 fixtures/methods may have no consent evidence. New activation
      -- always writes the complete WhatsApp-specific evidence set.
      or (
        consent_purpose is null and consent_version is null
        and consent_source is null and consented_at is not null
      )
      or (
        consented_at is not null
        and consent_version is not null
        and consent_source is not null
        and consent_purpose = 'recovery_alerts_whatsapp'
      )
    );

create table public.whatsapp_verification_sessions (
  id uuid primary key default gen_random_uuid(),
  recovery_method_id uuid not null references public.follower_recovery_methods(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  session_token_hash text not null unique,
  provider_verification_id text,
  provider_verified_at timestamptz,
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
  cancelled_at timestamptz,
  replaced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_verification_preferences_object check (jsonb_typeof(preferences) = 'object'),
  constraint whatsapp_verification_expiry check (expires_at > created_at),
  constraint whatsapp_verification_terminal check (
    num_nonnulls(completed_at, cancelled_at, replaced_at) <= 1
  )
);
create unique index whatsapp_verification_one_active_method_idx
  on public.whatsapp_verification_sessions(recovery_method_id)
  where completed_at is null and cancelled_at is null and replaced_at is null;
create index whatsapp_verification_destination_rate_idx
  on public.whatsapp_verification_sessions(recovery_method_id, created_at desc);
create index whatsapp_verification_ip_rate_idx
  on public.whatsapp_verification_sessions(source_ip_hash, created_at desc)
  where source_ip_hash is not null;
create trigger whatsapp_verification_sessions_updated
before update on public.whatsapp_verification_sessions
for each row execute function public.set_updated_at();
alter table public.whatsapp_verification_sessions enable row level security;
alter table public.whatsapp_verification_sessions force row level security;
revoke all on public.whatsapp_verification_sessions from public, anon, authenticated;
grant all on public.whatsapp_verification_sessions to service_role;

create or replace function public.delivery_provider_for_transport(
  p_transport public.delivery_transport
)
returns text language sql immutable set search_path = ''
as $$
  select case
    when p_transport = 'email' then 'resend'
    when p_transport = 'browser_notification' then 'web-push'
    when p_transport = 'sms' then 'twilio'
    when p_transport = 'whatsapp' then 'twilio-whatsapp'
    else 'unsupported'
  end
$$;
revoke all on function public.delivery_provider_for_transport(public.delivery_transport)
  from public, anon, authenticated;

create or replace function public.opt_out_whatsapp_recovery_method(
  p_destination_hash text,
  p_reason text
)
returns integer language plpgsql security definer set search_path = ''
as $$
declare method_ids uuid[]; affected integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'WhatsApp opt-out requires service role' using errcode = '42501';
  end if;
  select array_agg(method.id) into method_ids
  from public.follower_recovery_methods method
  where method.method_type = 'whatsapp'
    and method.destination_hash = p_destination_hash
    and method.method_status <> 'revoked';
  if method_ids is null then return 0; end if;
  update public.follower_connections set selected_recovery_method_id = null
  where selected_recovery_method_id = any(method_ids);
  update public.follower_recovery_methods
  set method_status = 'revoked', opted_out_at = now(), consent_revoked_at = now(),
      opt_out_reason = left(coalesce(nullif(btrim(p_reason), ''), 'provider_opt_out'), 120)
  where id = any(method_ids);
  get diagnostics affected = row_count;
  update public.whatsapp_verification_sessions set replaced_at = now()
  where recovery_method_id = any(method_ids)
    and completed_at is null and cancelled_at is null and replaced_at is null;
  return affected;
end
$$;
revoke all on function public.opt_out_whatsapp_recovery_method(text, text)
  from public, anon, authenticated;
grant execute on function public.opt_out_whatsapp_recovery_method(text, text) to service_role;

create or replace function public.complete_whatsapp_recovery_verification(
  p_session_id uuid,
  p_recovery_method_id uuid,
  p_destination_hash text,
  p_preference_token_hash text,
  p_unsubscribe_token_hash text,
  p_token_expires_at timestamptz
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  session_row public.whatsapp_verification_sessions%rowtype;
  method_row public.follower_recovery_methods%rowtype;
  connection_row public.follower_connections%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'WhatsApp activation requires service role' using errcode = '42501';
  end if;
  select * into session_row from public.whatsapp_verification_sessions
  where id = p_session_id for update;
  if not found or session_row.completed_at is not null
    or session_row.cancelled_at is not null or session_row.replaced_at is not null
    or session_row.expires_at <= now() or session_row.provider_verified_at is null
    or session_row.recovery_method_id <> p_recovery_method_id then
    raise exception 'WhatsApp verification session is not completable' using errcode = '23514';
  end if;
  select * into method_row from public.follower_recovery_methods
  where id = p_recovery_method_id and method_type = 'whatsapp'
    and destination_hash = p_destination_hash for update;
  if not found then raise exception 'WhatsApp recovery method mismatch' using errcode = '23514'; end if;
  if method_row.consent_purpose <> 'recovery_alerts_whatsapp'
    or method_row.consent_version is null or method_row.consented_at is null
    or method_row.consent_source is null or method_row.consent_revoked_at is not null then
    raise exception 'WhatsApp-specific consent is required' using errcode = '23514';
  end if;

  select * into connection_row from public.follower_connections
  where creator_id = session_row.creator_id
    and follower_contact_id = method_row.follower_contact_id for update;
  if found and (connection_row.status <> 'active'
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
    session_row.creator_id, method_row.follower_contact_id, 'active', now(), now(),
    p_preference_token_hash, p_unsubscribe_token_hash, p_token_expires_at,
    p_token_expires_at, null, 'creator_recovery_pass', session_row.source_platform,
    session_row.source_referrer, session_row.landing_path
  ) on conflict(creator_id, follower_contact_id) do update set
    preference_token_hash = excluded.preference_token_hash,
    unsubscribe_token_hash = excluded.unsubscribe_token_hash,
    preference_token_expires_at = excluded.preference_token_expires_at,
    unsubscribe_token_expires_at = excluded.unsubscribe_token_expires_at
  returning * into connection_row;
  update public.follower_recovery_methods
  set method_status = 'verified', verified_at = now(), opted_out_at = null,
      opt_out_reason = null, consent_revoked_at = null
  where id = method_row.id;
  update public.follower_connections set selected_recovery_method_id = method_row.id
  where id = connection_row.id;
  insert into public.follower_category_preferences(follower_connection_id, category_key, enabled)
  select connection_row.id, entry.key, (entry.value)::text::boolean
  from jsonb_each(session_row.preferences) entry
  on conflict(follower_connection_id, category_key) do update set enabled = excluded.enabled;
  update public.whatsapp_verification_sessions set completed_at = now()
  where id = session_row.id and completed_at is null;
  return connection_row.id;
end
$$;
revoke all on function public.complete_whatsapp_recovery_verification(
  uuid, uuid, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.complete_whatsapp_recovery_verification(
  uuid, uuid, text, text, text, timestamptz
) to service_role;

commit;
