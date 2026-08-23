begin;
alter table public.update_deliveries disable trigger enforce_new_video_publishing_target;
select plan(20);

select has_table('public', 'sms_verification_sessions',
  'SMS verification sessions use dedicated server-only storage');
select has_column('public', 'follower_recovery_methods', 'opted_out_at',
  'SMS methods record authoritative opt-out time');
select has_column('public', 'follower_recovery_methods', 'consent_version',
  'SMS methods retain minimal consent version');
select is(
  public.expected_delivery_transport('account_update', 'sms')::text,
  'sms',
  'verified selected SMS derives the sms transport'
);
select is(
  public.expected_delivery_transport('announcement', 'sms')::text,
  'sms',
  'optional broadcasts use the follower selected verified SMS route'
);
select is(
  public.expected_delivery_transport('announcement', null)::text,
  'email',
  'legacy optional broadcasts retain the established email fallback'
);
select is(
  public.delivery_provider_for_transport('sms'),
  'twilio',
  'SMS resolves to Twilio through the provider registry'
);
select throws_ok(
  $$set local role authenticated; select * from public.sms_verification_sessions$$,
  '42501', null,
  'browser roles cannot query OTP session metadata'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '28000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'sms-owner@example.com',
  crypt('test-password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
);
update public.creators set public_slug = 'sms-owner'
where owner_user_id = '28000000-0000-4000-8000-000000000001';

insert into public.follower_contacts(
  id, phone_ciphertext, phone_hash, phone_masked
) values (
  '28100000-0000-4000-8000-000000000001',
  'encrypted-e164',
  encode(extensions.digest('+14155552671', 'sha256'), 'hex'),
  '•••• •••• 2671'
);

select throws_ok(
  $$insert into public.follower_recovery_methods(
      follower_contact_id, method_type, method_status, destination_hash,
      destination_masked, verified_at
    ) values (
      '28100000-0000-4000-8000-000000000001', 'sms', 'verified',
      encode(extensions.digest('+14155552671', 'sha256'), 'hex'),
      '•••• •••• 2671', null
    )$$,
  '23514', null,
  'verified SMS requires verified_at'
);

insert into public.follower_recovery_methods(
  id, follower_contact_id, method_type, method_status, destination_hash,
  destination_masked, verified_at
) values (
  '28200000-0000-4000-8000-000000000001',
  '28100000-0000-4000-8000-000000000001',
  'sms', 'pending',
  encode(extensions.digest('+14155552671', 'sha256'), 'hex'),
  '•••• •••• 2671', null
);

insert into public.follower_connections(
  id, creator_id, follower_contact_id, preference_token_hash,
  unsubscribe_token_hash, source_platform, consent_source
) values (
  '28300000-0000-4000-8000-000000000001',
  (select id from public.creators where public_slug = 'sms-owner'),
  '28100000-0000-4000-8000-000000000001',
  'sms-pref-token', 'sms-unsub-token', 'direct', 'creator_recovery_pass'
);

select throws_ok(
  $$update public.follower_connections
    set selected_recovery_method_id = '28200000-0000-4000-8000-000000000001'
    where id = '28300000-0000-4000-8000-000000000001'$$,
  '23514', null,
  'pending SMS cannot be selected'
);

update public.follower_recovery_methods
set method_status = 'verified', verified_at = now()
where id = '28200000-0000-4000-8000-000000000001';
update public.follower_connections
set selected_recovery_method_id = '28200000-0000-4000-8000-000000000001'
where id = '28300000-0000-4000-8000-000000000001';

select is(
  (select selected_recovery_method_id
   from public.follower_connections
   where id = '28300000-0000-4000-8000-000000000001'),
  '28200000-0000-4000-8000-000000000001'::uuid,
  'verified SMS can be selected'
);

insert into public.creator_updates(
  id, creator_id, broadcast_type, title, subject, content
) values (
  '28400000-0000-4000-8000-000000000001',
  (select id from public.creators where public_slug = 'sms-owner'),
  'account_update', 'SMS recovery', 'Account inaccessible', 'Official recovery update'
);
insert into public.update_deliveries(
  id, update_id, creator_id, connection_id, contact_id, recovery_method_id,
  transport, destination, destination_hash, preference_category, status,
  provider, provider_message_id, accepted_at
) values (
  '28500000-0000-4000-8000-000000000001',
  '28400000-0000-4000-8000-000000000001',
  (select id from public.creators where public_slug = 'sms-owner'),
  '28300000-0000-4000-8000-000000000001',
  '28100000-0000-4000-8000-000000000001',
  '28200000-0000-4000-8000-000000000001',
  'sms', '+14155552671',
  encode(extensions.digest('+14155552671', 'sha256'), 'hex'),
  'recovery', 'accepted', 'twilio', 'SM-stage-28', now()
);
set local role service_role;
select lives_ok(
  $$select public.apply_update_delivery_event(
    'twilio', 'sms-failed-1', 'SM-stage-28', 'undelivered', 'failed', now(),
    '{"error_code":"30005","failure_category":"invalid_destination"}'::jsonb, true
  )$$,
  'signed terminal SMS failure is applied through the central event RPC'
);
reset role;
select is(
  (select status from public.update_deliveries
   where id = '28500000-0000-4000-8000-000000000001'),
  'failed'::public.delivery_status,
  'accepted SMS can transition to failed from a terminal callback'
);
set local role service_role;
select lives_ok(
  $$select public.apply_update_delivery_event(
    'twilio', 'sms-stale-accepted-1', 'SM-stage-28', 'sent', 'accepted', now(),
    '{}'::jsonb, true
  )$$,
  'stale accepted SMS callback is retained without regressing terminal failure'
);
reset role;
select is(
  (select status from public.update_deliveries
   where id = '28500000-0000-4000-8000-000000000001'),
  'failed'::public.delivery_status,
  'terminal SMS failure does not regress to accepted'
);

select lives_ok(
  $$set local role service_role;
    select public.opt_out_sms_recovery_method(
      encode(extensions.digest('+14155552671', 'sha256'), 'hex'),
      'provider_stop'
    )$$,
  'signed provider opt-out is applied authoritatively'
);
reset role;

select is(
  (select method_status from public.follower_recovery_methods
   where id = '28200000-0000-4000-8000-000000000001'),
  'revoked',
  'opt-out revokes the SMS method'
);
select is(
  (select opt_out_reason from public.follower_recovery_methods
   where id = '28200000-0000-4000-8000-000000000001'),
  'provider_stop',
  'opt-out stores only a safe reason'
);
select is(
  (select selected_recovery_method_id from public.follower_connections
   where id = '28300000-0000-4000-8000-000000000001'),
  null::uuid,
  'opt-out clears selection without fallback'
);
set local role service_role;
select is(
  public.opt_out_sms_recovery_method(
    encode(extensions.digest('+14155552671', 'sha256'), 'hex'),
    'provider_stop'
  ),
  0,
  'SMS opt-out is idempotent'
);
reset role;

select * from finish();
rollback;
