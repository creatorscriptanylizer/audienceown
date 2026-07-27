begin;

select plan(19);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'authenticated', 'authenticated', 'delivery-a@example.com',
    crypt('test-password-a', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'delivery-b@example.com',
    crypt('test-password-b', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

update public.creators set public_slug = 'delivery-a', display_name = 'Delivery A'
where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
update public.creators set public_slug = 'delivery-b', display_name = 'Delivery B'
where owner_user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select set_config('tests.delivery_creator_a', (
  select id::text from public.creators where public_slug = 'delivery-a'
), true);
select set_config('tests.delivery_creator_b', (
  select id::text from public.creators where public_slug = 'delivery-b'
), true);

insert into public.follower_contacts (id, email_ciphertext, email_hash, email_masked)
values
  (
    '51000000-0000-0000-0000-000000000001', 'cipher-a',
    encode(extensions.digest('fan-a@example.com', 'sha256'), 'hex'), 'f••••@example.com'
  ),
  (
    '51000000-0000-0000-0000-000000000002', 'cipher-b',
    encode(extensions.digest('fan-b@example.com', 'sha256'), 'hex'), 'f••••@example.com'
  ),
  (
    '51000000-0000-0000-0000-000000000003', 'cipher-inactive',
    encode(extensions.digest('inactive@example.com', 'sha256'), 'hex'), 'i••••@example.com'
  ),
  (
    '51000000-0000-0000-0000-000000000004', 'cipher-unverified',
    encode(extensions.digest('unverified@example.com', 'sha256'), 'hex'), 'u••••@example.com'
  );

insert into public.follower_connections (
  id, creator_id, follower_contact_id, status, preference_token_hash,
  unsubscribe_token_hash, source_platform, consent_source
)
values
  (
    '52000000-0000-0000-0000-000000000001',
    current_setting('tests.delivery_creator_a')::uuid,
    '51000000-0000-0000-0000-000000000001',
    'active', 'delivery-pref-a', 'delivery-unsub-a', 'direct', 'creator_page'
  ),
  (
    '52000000-0000-0000-0000-000000000002',
    current_setting('tests.delivery_creator_b')::uuid,
    '51000000-0000-0000-0000-000000000002',
    'active', 'delivery-pref-b', 'delivery-unsub-b', 'direct', 'creator_page'
  ),
  (
    '52000000-0000-0000-0000-000000000003',
    current_setting('tests.delivery_creator_a')::uuid,
    '51000000-0000-0000-0000-000000000003',
    'deactivated', 'delivery-pref-inactive', 'delivery-unsub-inactive', 'direct', 'creator_page'
  ),
  (
    '52000000-0000-0000-0000-000000000004',
    current_setting('tests.delivery_creator_a')::uuid,
    '51000000-0000-0000-0000-000000000004',
    'active', 'delivery-pref-unverified', 'delivery-unsub-unverified', 'direct', 'creator_page'
  );

insert into public.follower_recovery_methods (
  follower_contact_id, method_type, method_status, destination_hash,
  destination_masked, verified_at
)
values
  (
    '51000000-0000-0000-0000-000000000001', 'email', 'verified',
    encode(extensions.digest('fan-a@example.com', 'sha256'), 'hex'),
    'f••••@example.com', now()
  ),
  (
    '51000000-0000-0000-0000-000000000002', 'email', 'verified',
    encode(extensions.digest('fan-b@example.com', 'sha256'), 'hex'),
    'f••••@example.com', now()
  ),
  (
    '51000000-0000-0000-0000-000000000003', 'email', 'verified',
    encode(extensions.digest('inactive@example.com', 'sha256'), 'hex'),
    'i••••@example.com', now()
  ),
  (
    '51000000-0000-0000-0000-000000000004', 'email', 'pending',
    encode(extensions.digest('unverified@example.com', 'sha256'), 'hex'),
    'u••••@example.com', null
  );

insert into public.creator_updates (
  id, creator_id, broadcast_type, title, subject, content
)
select
  ('53000000-0000-0000-0000-' || lpad(number::text, 12, '0'))::uuid,
  current_setting('tests.delivery_creator_a')::uuid,
  case when number = 10 then 'new_content'::public.broadcast_type else 'account_update'::public.broadcast_type end,
  'Complete update ' || number,
  'Subject ' || number,
  'Message ' || number
from generate_series(1, 12) as number;

insert into public.creator_updates (
  id, creator_id, broadcast_type, title, subject, content
)
values (
  '53000000-0000-0000-0000-000000000099',
  current_setting('tests.delivery_creator_b')::uuid,
  'account_update',
  'Creator B update',
  'Creator B subject',
  'Creator B message'
);

insert into public.update_deliveries (
  id, update_id, creator_id, connection_id, contact_id,
  recipient_email, preference_category
)
values (
  '54000000-0000-0000-0000-000000000099',
  '53000000-0000-0000-0000-000000000099',
  current_setting('tests.delivery_creator_b')::uuid,
  '52000000-0000-0000-0000-000000000002',
  '51000000-0000-0000-0000-000000000002',
  'fan-b@example.com',
  'recovery'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);

-- 1
select lives_ok(
  $$
    insert into public.update_deliveries (
      id, update_id, creator_id, connection_id, contact_id,
      recipient_email, preference_category
    )
    values (
      '54000000-0000-0000-0000-000000000001',
      '53000000-0000-0000-0000-000000000001',
      current_setting('tests.delivery_creator_a')::uuid,
      '52000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000001',
      'fan-a@example.com',
      'recovery'
    )
  $$,
  'creator can create a delivery for own update'
);

-- 2
select throws_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id,
      recipient_email, preference_category
    )
    values (
      '53000000-0000-0000-0000-000000000099',
      current_setting('tests.delivery_creator_b')::uuid,
      '52000000-0000-0000-0000-000000000002',
      '51000000-0000-0000-0000-000000000002',
      'fan-b@example.com',
      'recovery'
    )
  $$,
  '42501',
  null,
  'creator cannot create a delivery for another creator update'
);

-- 3
select is(
  (select count(*)::int from public.update_deliveries where id = '54000000-0000-0000-0000-000000000099'),
  0,
  'creator cannot read another creator deliveries'
);

-- 4
select throws_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id,
      recipient_email, preference_category
    )
    values (
      '53000000-0000-0000-0000-000000000002',
      current_setting('tests.delivery_creator_b')::uuid,
      '52000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000001',
      'fan-a@example.com',
      'recovery'
    )
  $$,
  '23514',
  null,
  'creator_id must match update owner'
);

-- 5
select throws_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id,
      recipient_email, preference_category
    )
    values (
      '53000000-0000-0000-0000-000000000001',
      current_setting('tests.delivery_creator_a')::uuid,
      '52000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000001',
      'fan-a@example.com',
      'recovery'
    )
  $$,
  '23505',
  null,
  'duplicate update and connection is rejected'
);

-- 6
select throws_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id,
      recipient_email, preference_category
    )
    values (
      '53000000-0000-0000-0000-000000000002',
      current_setting('tests.delivery_creator_a')::uuid,
      '52000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000001',
      'fan-a@example.com',
      'products'
    )
  $$,
  '23514',
  null,
  'canonical preference category is enforced'
);

-- 7
select lives_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id,
      recipient_email, preference_category
    )
    values (
      '53000000-0000-0000-0000-000000000002',
      current_setting('tests.delivery_creator_a')::uuid,
      '52000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000001',
      'fan-a@example.com',
      'recovery'
    )
  $$,
  'queued delivery may omit provider message ID'
);

-- 8
select throws_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id,
      recipient_email, preference_category, status
    )
    values (
      '53000000-0000-0000-0000-000000000003',
      current_setting('tests.delivery_creator_a')::uuid,
      '52000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000001',
      'fan-a@example.com', 'recovery', 'sent'
    )
  $$,
  '23514',
  null,
  'sent delivery requires sent_at'
);

-- 9
select throws_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id,
      recipient_email, preference_category, status
    )
    values (
      '53000000-0000-0000-0000-000000000004',
      current_setting('tests.delivery_creator_a')::uuid,
      '52000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000001',
      'fan-a@example.com', 'recovery', 'delivered'
    )
  $$,
  '23514',
  null,
  'delivered delivery requires delivered_at'
);

-- 10
select throws_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id,
      recipient_email, preference_category, status
    )
    values (
      '53000000-0000-0000-0000-000000000005',
      current_setting('tests.delivery_creator_a')::uuid,
      '52000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000001',
      'fan-a@example.com', 'recovery', 'failed'
    )
  $$,
  '23514',
  null,
  'failed delivery requires failed_at'
);

-- 11
select throws_ok(
  $$
    update public.update_deliveries
    set update_id = '53000000-0000-0000-0000-000000000006'
    where id = '54000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'update_id is immutable'
);

-- 12
select throws_ok(
  $$
    update public.update_deliveries
    set creator_id = current_setting('tests.delivery_creator_b')::uuid
    where id = '54000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'creator_id is immutable'
);

-- 13
select results_eq(
  $$
    update public.update_deliveries
    set status = 'cancelled', cancelled_at = now()
    where id = '54000000-0000-0000-0000-000000000099'
    returning id
  $$,
  array[]::uuid[],
  'another creator cannot update delivery status'
);

-- 14
select is(
  public.create_update_delivery_queue(
    '53000000-0000-0000-0000-000000000007',
    current_setting('tests.delivery_creator_a')::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'connection_id', '52000000-0000-0000-0000-000000000001',
        'contact_id', '51000000-0000-0000-0000-000000000001',
        'recipient_email', 'fan-a@example.com'
      ),
      jsonb_build_object(
        'connection_id', '52000000-0000-0000-0000-000000000003',
        'contact_id', '51000000-0000-0000-0000-000000000003',
        'recipient_email', 'inactive@example.com'
      ),
      jsonb_build_object(
        'connection_id', '52000000-0000-0000-0000-000000000004',
        'contact_id', '51000000-0000-0000-0000-000000000004',
        'recipient_email', 'unverified@example.com'
      )
    )
  ),
  1,
  'queue creation selects only active recipients with verified email'
);

-- 15
select is(
  public.create_update_delivery_queue(
    '53000000-0000-0000-0000-000000000010',
    current_setting('tests.delivery_creator_a')::uuid,
    jsonb_build_array(jsonb_build_object(
      'connection_id', '52000000-0000-0000-0000-000000000001',
      'contact_id', '51000000-0000-0000-0000-000000000001',
      'recipient_email', 'fan-a@example.com'
    ))
  ),
  0,
  'preference-disabled recipient is excluded'
);

-- 16
select is(
  (
    select count(*)::int
    from public.update_deliveries
    where update_id = '53000000-0000-0000-0000-000000000007'
      and connection_id in (
        '52000000-0000-0000-0000-000000000003',
        '52000000-0000-0000-0000-000000000004'
      )
  ),
  0,
  'inactive and unverified email recipients are excluded'
);

-- 17
select is(
  (
    select preference_category
    from public.update_deliveries
    where update_id = '53000000-0000-0000-0000-000000000007'
  ),
  'recovery',
  'account update resolves to recovery preference'
);

-- 18
select is(
  public.create_update_delivery_queue(
    '53000000-0000-0000-0000-000000000007',
    current_setting('tests.delivery_creator_a')::uuid,
    jsonb_build_array(jsonb_build_object(
      'connection_id', '52000000-0000-0000-0000-000000000001',
      'contact_id', '51000000-0000-0000-0000-000000000001',
      'recipient_email', 'fan-a@example.com'
    ))
  ),
  0,
  'repeated queue creation is idempotent'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);

-- 19
select throws_ok(
  $$ select * from public.update_deliveries $$,
  '42501',
  null,
  'anonymous cannot read delivery data'
);

select * from finish();
rollback;
