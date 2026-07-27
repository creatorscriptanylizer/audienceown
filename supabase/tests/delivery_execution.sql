begin;

select plan(33);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  'ca000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'execution@example.com',
  crypt('test-password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
);

update public.creators
set public_slug = 'execution-creator', display_name = 'Execution Creator'
where owner_user_id = 'ca000000-0000-4000-8000-000000000001';
select set_config('tests.execution_creator', (
  select id::text from public.creators where public_slug = 'execution-creator'
), true);

insert into public.follower_contacts (
  id, email_ciphertext, email_hash, email_masked
) values (
  'cb000000-0000-4000-8000-000000000001',
  'ciphertext',
  encode(extensions.digest('delivery@example.com', 'sha256'), 'hex'),
  'd••••@example.com'
);
insert into public.follower_connections (
  id, creator_id, follower_contact_id, preference_token_hash,
  unsubscribe_token_hash, source_platform, consent_source
) values (
  'cc000000-0000-4000-8000-000000000001',
  current_setting('tests.execution_creator')::uuid,
  'cb000000-0000-4000-8000-000000000001',
  'execution-pref', 'execution-unsub', 'direct', 'creator_page'
);
insert into public.follower_recovery_methods (
  id, follower_contact_id, method_type, method_status,
  destination_hash, destination_masked, verified_at
) values (
  'cd000000-0000-4000-8000-000000000001',
  'cb000000-0000-4000-8000-000000000001',
  'email', 'verified',
  encode(extensions.digest('delivery@example.com', 'sha256'), 'hex'),
  'd••••@example.com', now()
);
update public.follower_connections
set selected_recovery_method_id = 'cd000000-0000-4000-8000-000000000001'
where id = 'cc000000-0000-4000-8000-000000000001';

insert into public.creator_updates (
  id, creator_id, broadcast_type, status, title, subject, content
)
select
  ('ce000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid,
  current_setting('tests.execution_creator')::uuid,
  'account_update', 'queued',
  'Execution update ' || number, 'Execution subject ' || number, 'Execution body ' || number
from generate_series(1, 10) number;

insert into public.update_deliveries (
  id, update_id, creator_id, connection_id, contact_id, recovery_method_id,
  transport, destination, destination_hash, preference_category
) values (
  'cf000000-0000-4000-8000-000000000001',
  'ce000000-0000-4000-8000-000000000001',
  current_setting('tests.execution_creator')::uuid,
  'cc000000-0000-4000-8000-000000000001',
  'cb000000-0000-4000-8000-000000000001',
  'cd000000-0000-4000-8000-000000000001',
  'email', 'delivery@example.com',
  encode(extensions.digest('delivery@example.com', 'sha256'), 'hex'),
  'recovery'
);

select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- 1
select is(
  (select delivery_id from public.claim_update_deliveries(1, 3, 900)),
  'cf000000-0000-4000-8000-000000000001'::uuid,
  'service role atomically claims a queued delivery'
);
-- 2
select is(
  (select status from public.update_deliveries where id = 'cf000000-0000-4000-8000-000000000001'),
  'sending'::public.delivery_status,
  'claim transitions queued delivery to sending'
);
-- 3
select is(
  (select attempt_count from public.update_deliveries where id = 'cf000000-0000-4000-8000-000000000001'),
  1,
  'claim increments attempt count'
);
-- 4
select ok(
  (select last_attempt_at is not null and claimed_at is not null
   from public.update_deliveries where id = 'cf000000-0000-4000-8000-000000000001'),
  'claim records attempt and claim timestamps'
);
-- 5
select is_empty(
  $$ select delivery_id from public.claim_update_deliveries(1, 3, 900) $$,
  'a live sending delivery cannot be claimed twice'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'ca000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"ca000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
-- 6
select throws_ok(
  $$ select * from public.claim_update_deliveries(1, 3, 900) $$,
  '42501', null, 'authenticated creators cannot claim deliveries'
);
select throws_ok(
  $$ select public.mark_update_delivery_accepted(
    'cf000000-0000-4000-8000-000000000001','resend','creator-forged'
  ) $$,
  '42501', null, 'authenticated creators cannot forge provider results'
);
reset role;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
-- 7
select throws_ok(
  $$ select * from public.claim_update_deliveries(1, 3, 900) $$,
  '42501', null, 'anonymous users cannot claim deliveries'
);

reset role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

insert into public.update_deliveries (
  id, update_id, creator_id, connection_id, contact_id, recovery_method_id,
  transport, destination, destination_hash, preference_category,
  status, cancelled_at
) values (
  'cf000000-0000-4000-8000-000000000002',
  'ce000000-0000-4000-8000-000000000002',
  current_setting('tests.execution_creator')::uuid,
  'cc000000-0000-4000-8000-000000000001',
  'cb000000-0000-4000-8000-000000000001',
  'cd000000-0000-4000-8000-000000000001',
  'email', 'delivery@example.com',
  encode(extensions.digest('delivery@example.com', 'sha256'), 'hex'),
  'recovery', 'cancelled', now()
);
-- 8
select is_empty(
  $$ select delivery_id from public.claim_update_deliveries(10, 3, 900)
     where delivery_id = 'cf000000-0000-4000-8000-000000000002' $$,
  'cancelled deliveries are never claimed'
);

-- 9
select throws_ok(
  $$ select public.mark_update_delivery_accepted(
    'cf000000-0000-4000-8000-000000000002','resend','message-invalid'
  ) $$,
  '23514', null, 'mark accepted requires sending status'
);
-- 10
select is(
  public.mark_update_delivery_accepted(
    'cf000000-0000-4000-8000-000000000001','resend','message-accepted'
  ),
  'accepted'::public.delivery_status,
  'mark accepted accepts a sending delivery'
);
-- 11
select ok(
  (select provider = 'resend' and provider_message_id = 'message-accepted'
      and accepted_at is not null
   from public.update_deliveries where id = 'cf000000-0000-4000-8000-000000000001'),
  'mark accepted records provider acceptance'
);
-- 12
select is_empty(
  $$ select delivery_id from public.claim_update_deliveries(10, 3, 900)
     where delivery_id = 'cf000000-0000-4000-8000-000000000001' $$,
  'accepted deliveries are never claimed again'
);

-- 13
select is(
  public.apply_update_delivery_event(
    'resend','event-delivered','message-accepted','email.delivered','delivered',
    '2026-07-27T12:00:00Z','{"raw_type":"email.delivered"}',true
  ) ->> 'processingStatus',
  'applied',
  'a delivered webhook is applied'
);
-- 14
select ok(
  (select status = 'delivered' and delivered_at = '2026-07-27T12:00:00Z'
   from public.update_deliveries where id = 'cf000000-0000-4000-8000-000000000001'),
  'provider delivery becomes the honest delivered state'
);
-- 15
select is(
  public.apply_update_delivery_event(
    'resend','event-delivered','message-accepted','email.delivered','delivered',
    '2026-07-27T12:00:00Z','{"raw_type":"email.delivered"}',true
  ) ->> 'processingStatus',
  'duplicate',
  'duplicate provider events are acknowledged idempotently'
);
-- 16
select is(
  (select count(*)::integer from public.update_delivery_events
   where provider = 'resend' and provider_event_id = 'event-delivered'),
  1,
  'duplicate provider events keep one audit record'
);
-- 17
select is(
  public.apply_update_delivery_event(
    'resend','event-bounced','message-accepted','email.bounced','bounced',
    '2026-07-27T12:05:00Z',
    '{"raw_type":"email.bounced","error_code":"Permanent","error_message":"Mailbox unavailable"}',
    true
  ) ->> 'deliveryStatus',
  'bounced',
  'a later bounce takes precedence over delivered'
);
-- 18
select ok(
  (select status = 'bounced' and bounced_at = '2026-07-27T12:05:00Z'
      and provider_error_code = 'Permanent'
   from public.update_deliveries where id = 'cf000000-0000-4000-8000-000000000001'),
  'bounce state and safe provider failure metadata are recorded'
);
-- 19
select is(
  public.apply_update_delivery_event(
    'resend','event-delivered-late','message-accepted','email.delivered','delivered',
    '2026-07-27T12:10:00Z','{"raw_type":"email.delivered"}',true
  ) ->> 'processingStatus',
  'ignored',
  'a late delivered event cannot regress a bounce'
);
-- 20
select is(
  public.apply_update_delivery_event(
    'resend','event-complained','message-accepted','email.complained','complained',
    '2026-07-27T12:15:00Z','{"raw_type":"email.complained"}',true
  ) ->> 'deliveryStatus',
  'complained',
  'complaint takes final precedence'
);
-- 21
select ok(
  (select status = 'complained' and complained_at = '2026-07-27T12:15:00Z'
   from public.update_deliveries where id = 'cf000000-0000-4000-8000-000000000001'),
  'complaint state and timestamp are recorded'
);
-- 22
select is(
  public.apply_update_delivery_event(
    'resend','event-unknown-message','unknown-message','email.delivered','delivered',
    now(),'{"raw_type":"email.delivered"}',true
  ) ->> 'processingStatus',
  'pending',
  'an early webhook remains pending until provider correlation exists'
);
-- 23
select is(
  public.apply_update_delivery_event(
    'resend','event-opened','message-accepted','email.opened',null,
    now(),'{"raw_type":"email.opened"}',true
  ) ->> 'processingStatus',
  'ignored',
  'unsupported provider events are audited and acknowledged'
);
-- 24
select throws_ok(
  $$ select public.apply_update_delivery_event(
    'resend','event-unverified','message-accepted','email.delivered','delivered',
    now(),'{}',false
  ) $$,
  '42501', null, 'unverified events cannot enter the audit trail'
);

-- 25
select throws_ok(
  $$ select public.mark_update_delivery_failed(
    'cf000000-0000-4000-8000-000000000002',
    'resend','temporary','Safe reason',true,3
  ) $$,
  '23514', null, 'mark failed requires sending status'
);

insert into public.update_deliveries (
  id, update_id, creator_id, connection_id, contact_id, recovery_method_id,
  transport, destination, destination_hash, preference_category
)
select
  ('cf000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid,
  ('ce000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid,
  current_setting('tests.execution_creator')::uuid,
  'cc000000-0000-4000-8000-000000000001',
  'cb000000-0000-4000-8000-000000000001',
  'cd000000-0000-4000-8000-000000000001',
  'email', 'delivery@example.com',
  encode(extensions.digest('delivery@example.com', 'sha256'), 'hex'),
  'recovery'
from generate_series(3, 6) number;
do $$
begin
  perform * from public.claim_update_deliveries(4, 3, 900);
end
$$;

-- 14
select is(
  public.mark_update_delivery_failed(
    'cf000000-0000-4000-8000-000000000003',
    'resend','rate_limit','Please retry later.',true,3
  ),
  'queued'::public.delivery_status,
  'retryable failure returns to queued while attempts remain'
);
update public.update_deliveries set attempt_count = 3
where id = 'cf000000-0000-4000-8000-000000000004';
-- 15
select is(
  public.mark_update_delivery_failed(
    'cf000000-0000-4000-8000-000000000004',
    'resend','rate_limit','Please retry later.',true,3
  ),
  'failed'::public.delivery_status,
  'exhausted retryable failure becomes terminal'
);
-- 16
select is(
  public.mark_update_delivery_failed(
    'cf000000-0000-4000-8000-000000000005',
    'resend','invalid_recipient','Recipient rejected.',false,3
  ),
  'failed'::public.delivery_status,
  'permanent failure becomes terminal'
);
-- 17
select is_empty(
  $$ select delivery_id from public.claim_update_deliveries(10, 3, 900)
     where delivery_id in (
       'cf000000-0000-4000-8000-000000000004',
       'cf000000-0000-4000-8000-000000000005'
     ) $$,
  'failed terminal deliveries are never claimed'
);
-- 18
select throws_ok(
  $$ select public.mark_update_delivery_accepted(
    'cf000000-0000-4000-8000-000000000006','unsupported','forged'
  ) $$,
  '23514', null, 'provider result must match the delivery transport'
);

update public.update_deliveries
set claimed_at = now() - interval '16 minutes'
where id = 'cf000000-0000-4000-8000-000000000006';
-- 19
select is(
  (select delivery_id from public.claim_update_deliveries(1, 3, 900)),
  'cf000000-0000-4000-8000-000000000006'::uuid,
  'stuck sending delivery is reclaimed after the timeout'
);
-- 20
select is(
  (select attempt_count from public.update_deliveries where id = 'cf000000-0000-4000-8000-000000000006'),
  2,
  'reclaim increments attempts only when claimed again'
);

select * from finish();
rollback;
