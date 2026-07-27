begin;

select plan(26);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'authenticated', 'authenticated', 'transport-a@example.com',
    crypt('test-password-a', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'transport-b@example.com',
    crypt('test-password-b', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

update public.creators set public_slug = 'transport-a', display_name = 'Transport A'
where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
update public.creators set public_slug = 'transport-b', display_name = 'Transport B'
where owner_user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select set_config('tests.transport_creator_a', (
  select id::text from public.creators where public_slug = 'transport-a'
), true);
select set_config('tests.transport_creator_b', (
  select id::text from public.creators where public_slug = 'transport-b'
), true);

insert into public.follower_contacts (
  id, email_ciphertext, email_hash, email_masked,
  phone_ciphertext, phone_hash, phone_masked
)
values
  (
    '71000000-0000-0000-0000-000000000001',
    'cipher-email', encode(extensions.digest('email@example.com', 'sha256'), 'hex'), 'e••••@example.com',
    null, null, null
  ),
  (
    '71000000-0000-0000-0000-000000000002',
    null, null, null,
    'cipher-sms', encode(extensions.digest('+447700900001', 'sha256'), 'hex'), '+44 •••• 0001'
  ),
  (
    '71000000-0000-0000-0000-000000000003',
    null, null, null,
    'cipher-whatsapp', encode(extensions.digest('+447700900002', 'sha256'), 'hex'), '+44 •••• 0002'
  ),
  (
    '71000000-0000-0000-0000-000000000004',
    null, null, null, null, null, null
  ),
  (
    '71000000-0000-0000-0000-000000000005',
    'cipher-fallback', encode(extensions.digest('fallback@example.com', 'sha256'), 'hex'), 'f••••@example.com',
    null, null, null
  ),
  (
    '71000000-0000-0000-0000-000000000099',
    'cipher-b', encode(extensions.digest('creator-b-fan@example.com', 'sha256'), 'hex'), 'c••••@example.com',
    null, null, null
  );

insert into public.follower_connections (
  id, creator_id, follower_contact_id,
  preference_token_hash, unsubscribe_token_hash, source_platform, consent_source
)
values
  (
    '72000000-0000-0000-0000-000000000001',
    current_setting('tests.transport_creator_a')::uuid,
    '71000000-0000-0000-0000-000000000001',
    'transport-pref-email', 'transport-unsub-email', 'direct', 'creator_page'
  ),
  (
    '72000000-0000-0000-0000-000000000002',
    current_setting('tests.transport_creator_a')::uuid,
    '71000000-0000-0000-0000-000000000002',
    'transport-pref-sms', 'transport-unsub-sms', 'direct', 'creator_page'
  ),
  (
    '72000000-0000-0000-0000-000000000003',
    current_setting('tests.transport_creator_a')::uuid,
    '71000000-0000-0000-0000-000000000003',
    'transport-pref-whatsapp', 'transport-unsub-whatsapp', 'direct', 'creator_page'
  ),
  (
    '72000000-0000-0000-0000-000000000004',
    current_setting('tests.transport_creator_a')::uuid,
    '71000000-0000-0000-0000-000000000004',
    'transport-pref-browser', 'transport-unsub-browser', 'direct', 'creator_page'
  ),
  (
    '72000000-0000-0000-0000-000000000005',
    current_setting('tests.transport_creator_a')::uuid,
    '71000000-0000-0000-0000-000000000005',
    'transport-pref-missing', 'transport-unsub-missing', 'direct', 'creator_page'
  ),
  (
    '72000000-0000-0000-0000-000000000099',
    current_setting('tests.transport_creator_b')::uuid,
    '71000000-0000-0000-0000-000000000099',
    'transport-pref-b', 'transport-unsub-b', 'direct', 'creator_page'
  );

insert into public.follower_recovery_methods (
  id, follower_contact_id, method_type, method_status,
  destination_hash, destination_masked, provider_identifier, verified_at
)
values
  (
    '73000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001', 'email', 'verified',
    encode(extensions.digest('email@example.com', 'sha256'), 'hex'), 'e••••@example.com', null, now()
  ),
  (
    '73000000-0000-0000-0000-000000000002',
    '71000000-0000-0000-0000-000000000002', 'sms', 'verified',
    encode(extensions.digest('+447700900001', 'sha256'), 'hex'), '+44 •••• 0001', null, now()
  ),
  (
    '73000000-0000-0000-0000-000000000003',
    '71000000-0000-0000-0000-000000000003', 'whatsapp', 'verified',
    encode(extensions.digest('+447700900002', 'sha256'), 'hex'), '+44 •••• 0002', null, now()
  ),
  (
    '73000000-0000-0000-0000-000000000004',
    '71000000-0000-0000-0000-000000000004', 'web_push', 'verified',
    null, 'Browser subscription', 'browser-subscription-reference', now()
  ),
  (
    '73000000-0000-0000-0000-000000000005',
    '71000000-0000-0000-0000-000000000005', 'email', 'verified',
    encode(extensions.digest('fallback@example.com', 'sha256'), 'hex'), 'f••••@example.com', null, now()
  ),
  (
    '73000000-0000-0000-0000-000000000006',
    '71000000-0000-0000-0000-000000000005', 'sms', 'pending',
    null, null, null, null
  ),
  (
    '73000000-0000-0000-0000-000000000007',
    '71000000-0000-0000-0000-000000000002', 'sms', 'verified',
    encode(extensions.digest('+447700900099', 'sha256'), 'hex'), '+44 •••• 0099', null, now()
  ),
  (
    '73000000-0000-0000-0000-000000000008',
    '71000000-0000-0000-0000-000000000001', 'sms', 'pending',
    null, null, null, null
  ),
  (
    '73000000-0000-0000-0000-000000000009',
    '71000000-0000-0000-0000-000000000001', 'passkey', 'verified',
    null, 'Passkey', 'passkey-reference', now()
  ),
  (
    '73000000-0000-0000-0000-000000000099',
    '71000000-0000-0000-0000-000000000099', 'email', 'verified',
    encode(extensions.digest('creator-b-fan@example.com', 'sha256'), 'hex'), 'c••••@example.com', null, now()
  );

update public.follower_connections connection
set selected_recovery_method_id = case connection.id
  when '72000000-0000-0000-0000-000000000001' then '73000000-0000-0000-0000-000000000001'::uuid
  when '72000000-0000-0000-0000-000000000002' then '73000000-0000-0000-0000-000000000002'::uuid
  when '72000000-0000-0000-0000-000000000003' then '73000000-0000-0000-0000-000000000003'::uuid
  when '72000000-0000-0000-0000-000000000004' then '73000000-0000-0000-0000-000000000004'::uuid
  when '72000000-0000-0000-0000-000000000005' then '73000000-0000-0000-0000-000000000006'::uuid
  when '72000000-0000-0000-0000-000000000099' then '73000000-0000-0000-0000-000000000099'::uuid
end;

insert into public.creator_updates (
  id, creator_id, broadcast_type, title, subject, content
)
select
  ('74000000-0000-0000-0000-' || lpad(number::text, 12, '0'))::uuid,
  current_setting('tests.transport_creator_a')::uuid,
  'account_update',
  'Transport update ' || number,
  'Subject ' || number,
  'Message ' || number
from generate_series(1, 15) as number;

insert into public.creator_updates (
  id, creator_id, broadcast_type, title, subject, content
)
values (
  '74000000-0000-0000-0000-000000000016',
  current_setting('tests.transport_creator_a')::uuid,
  'announcement', 'Regular announcement', 'Announcement subject', 'Announcement message'
);

insert into public.creator_updates (
  id, creator_id, broadcast_type, title, subject, content
)
values (
  '74000000-0000-0000-0000-000000000099',
  current_setting('tests.transport_creator_b')::uuid,
  'account_update', 'Other update', 'Other subject', 'Other message'
);

insert into public.update_deliveries (
  id, update_id, creator_id, connection_id, contact_id, recovery_method_id,
  transport, destination, destination_hash, preference_category
)
values (
  '75000000-0000-0000-0000-000000000099',
  '74000000-0000-0000-0000-000000000099',
  current_setting('tests.transport_creator_b')::uuid,
  '72000000-0000-0000-0000-000000000099',
  '71000000-0000-0000-0000-000000000099',
  '73000000-0000-0000-0000-000000000099',
  'email', 'creator-b-fan@example.com',
  encode(extensions.digest('creator-b-fan@example.com', 'sha256'), 'hex'),
  'recovery'
);

-- 1
select is(
  enum_range(null::public.delivery_transport)::text,
  '{email,sms,whatsapp,browser_notification}',
  'delivery transport enum contains all supported methods'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);

-- 2
select lives_ok(
  $$
    insert into public.update_deliveries (
      id, update_id, creator_id, connection_id, contact_id, recovery_method_id,
      transport, destination, destination_hash, preference_category
    )
    values (
      '75000000-0000-0000-0000-000000000001',
      '74000000-0000-0000-0000-000000000001',
      current_setting('tests.transport_creator_a')::uuid,
      '72000000-0000-0000-0000-000000000001',
      '71000000-0000-0000-0000-000000000001',
      '73000000-0000-0000-0000-000000000001',
      'email', 'email@example.com',
      encode(extensions.digest('email@example.com', 'sha256'), 'hex'),
      'recovery'
    )
  $$,
  'creator can create a transport-aware delivery'
);

-- 3
select throws_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id, recovery_method_id,
      transport, destination, destination_hash, preference_category
    )
    values (
      '74000000-0000-0000-0000-000000000099',
      current_setting('tests.transport_creator_b')::uuid,
      '72000000-0000-0000-0000-000000000099',
      '71000000-0000-0000-0000-000000000099',
      '73000000-0000-0000-0000-000000000099',
      'email', 'creator-b-fan@example.com',
      encode(extensions.digest('creator-b-fan@example.com', 'sha256'), 'hex'),
      'recovery'
    )
  $$,
  '42501',
  null,
  'creator cannot create delivery for another creator'
);

-- 4
select throws_ok(
  $$
    update public.update_deliveries
    set transport = 'sms'
    where id = '75000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'transport is immutable'
);

-- 5
select throws_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id, recovery_method_id,
      transport, destination, destination_hash, preference_category
    )
    values (
      '74000000-0000-0000-0000-000000000001',
      current_setting('tests.transport_creator_a')::uuid,
      '72000000-0000-0000-0000-000000000001',
      '71000000-0000-0000-0000-000000000001',
      '73000000-0000-0000-0000-000000000001',
      'email', 'email@example.com',
      encode(extensions.digest('email@example.com', 'sha256'), 'hex'),
      'recovery'
    )
  $$,
  '23505',
  null,
  'duplicate update connection and transport is rejected'
);

-- 6
select throws_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id, recovery_method_id,
      transport, destination, destination_hash, preference_category
    )
    values (
      '74000000-0000-0000-0000-000000000002',
      current_setting('tests.transport_creator_a')::uuid,
      '72000000-0000-0000-0000-000000000001',
      '71000000-0000-0000-0000-000000000001',
      '73000000-0000-0000-0000-000000000005',
      'email', 'email@example.com',
      encode(extensions.digest('email@example.com', 'sha256'), 'hex'),
      'recovery'
    )
  $$,
  '23514',
  null,
  'email requires matching verified email method'
);

-- 7
select lives_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id, recovery_method_id,
      transport, destination, destination_hash, preference_category
    )
    values (
      '74000000-0000-0000-0000-000000000003',
      current_setting('tests.transport_creator_a')::uuid,
      '72000000-0000-0000-0000-000000000002',
      '71000000-0000-0000-0000-000000000002',
      '73000000-0000-0000-0000-000000000002',
      'sms', '+447700900001',
      encode(extensions.digest('+447700900001', 'sha256'), 'hex'),
      'recovery'
    )
  $$,
  'SMS requires and accepts its verified phone method'
);

-- 8
select lives_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id, recovery_method_id,
      transport, destination, destination_hash, preference_category
    )
    values (
      '74000000-0000-0000-0000-000000000004',
      current_setting('tests.transport_creator_a')::uuid,
      '72000000-0000-0000-0000-000000000003',
      '71000000-0000-0000-0000-000000000003',
      '73000000-0000-0000-0000-000000000003',
      'whatsapp', '+447700900002',
      encode(extensions.digest('+447700900002', 'sha256'), 'hex'),
      'recovery'
    )
  $$,
  'WhatsApp requires and accepts its verified phone method'
);

-- 9
select lives_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id, recovery_method_id,
      transport, destination, destination_hash, preference_category
    )
    values (
      '74000000-0000-0000-0000-000000000005',
      current_setting('tests.transport_creator_a')::uuid,
      '72000000-0000-0000-0000-000000000004',
      '71000000-0000-0000-0000-000000000004',
      '73000000-0000-0000-0000-000000000004',
      'browser_notification', 'browser-subscription-reference', null, 'recovery'
    )
  $$,
  'browser delivery requires a verified active subscription reference'
);

-- 10
select throws_ok(
  $$
    insert into public.update_deliveries (
      update_id, creator_id, connection_id, contact_id, recovery_method_id,
      transport, destination, destination_hash, preference_category
    )
    values (
      '74000000-0000-0000-0000-000000000006',
      current_setting('tests.transport_creator_a')::uuid,
      '72000000-0000-0000-0000-000000000002',
      '71000000-0000-0000-0000-000000000002',
      '73000000-0000-0000-0000-000000000002',
      'email', 'email@example.com',
      encode(extensions.digest('email@example.com', 'sha256'), 'hex'),
      'recovery'
    )
  $$,
  '23514',
  null,
  'selected Recovery Pass method is respected'
);

-- 11-13
select throws_ok(
  $$ insert into public.update_deliveries (update_id,creator_id,connection_id,contact_id,recovery_method_id,transport,destination,destination_hash,preference_category)
     values ('74000000-0000-0000-0000-000000000007',current_setting('tests.transport_creator_a')::uuid,'72000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000002','73000000-0000-0000-0000-000000000001','email','email@example.com',encode(extensions.digest('email@example.com','sha256'),'hex'),'recovery') $$,
  '23514', null, 'SMS selection never falls back to email'
);
select throws_ok(
  $$ insert into public.update_deliveries (update_id,creator_id,connection_id,contact_id,recovery_method_id,transport,destination,destination_hash,preference_category)
     values ('74000000-0000-0000-0000-000000000008',current_setting('tests.transport_creator_a')::uuid,'72000000-0000-0000-0000-000000000003','71000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000001','email','email@example.com',encode(extensions.digest('email@example.com','sha256'),'hex'),'recovery') $$,
  '23514', null, 'WhatsApp selection never falls back to email'
);
select throws_ok(
  $$ insert into public.update_deliveries (update_id,creator_id,connection_id,contact_id,recovery_method_id,transport,destination,destination_hash,preference_category)
     values ('74000000-0000-0000-0000-000000000009',current_setting('tests.transport_creator_a')::uuid,'72000000-0000-0000-0000-000000000004','71000000-0000-0000-0000-000000000004','73000000-0000-0000-0000-000000000001','email','email@example.com',encode(extensions.digest('email@example.com','sha256'),'hex'),'recovery') $$,
  '23514', null, 'browser notification selection never falls back'
);

-- 14
select is(
  (select transport from public.update_deliveries where update_id = '74000000-0000-0000-0000-000000000003'),
  'sms'::public.delivery_transport,
  'account update uses selected recovery transport'
);

-- 15
reset role;
select is(
  (
    public.create_update_delivery_queue(
      '74000000-0000-0000-0000-000000000010',
      current_setting('tests.transport_creator_a')::uuid,
      jsonb_build_array(jsonb_build_object(
        'connection_id', '72000000-0000-0000-0000-000000000005',
        'recovery_method_id', '73000000-0000-0000-0000-000000000005',
        'destination', 'fallback@example.com',
        'destination_hash', encode(extensions.digest('fallback@example.com', 'sha256'), 'hex')
      ))
    ) ->> 'created'
  )::integer,
  0,
  'missing selected-method destination is excluded without fallback'
);

-- 16
select is(
  public.create_update_delivery_queue(
    '74000000-0000-0000-0000-000000000011',
    current_setting('tests.transport_creator_a')::uuid,
    jsonb_build_array(
      jsonb_build_object('connection_id','72000000-0000-0000-0000-000000000001','recovery_method_id','73000000-0000-0000-0000-000000000001','destination','email@example.com','destination_hash',encode(extensions.digest('email@example.com','sha256'),'hex')),
      jsonb_build_object('connection_id','72000000-0000-0000-0000-000000000002','recovery_method_id','73000000-0000-0000-0000-000000000002','destination','+447700900001','destination_hash',encode(extensions.digest('+447700900001','sha256'),'hex')),
      jsonb_build_object('connection_id','72000000-0000-0000-0000-000000000003','recovery_method_id','73000000-0000-0000-0000-000000000003','destination','+447700900002','destination_hash',encode(extensions.digest('+447700900002','sha256'),'hex')),
      jsonb_build_object('connection_id','72000000-0000-0000-0000-000000000004','recovery_method_id','73000000-0000-0000-0000-000000000004','destination','browser-subscription-reference','destination_hash',null)
    )
  ) -> 'byTransport',
  '{"email":1,"sms":1,"whatsapp":1,"browser_notification":1}'::jsonb,
  'queue summary groups created rows by transport'
);

-- 17
select is(
  (
    public.create_update_delivery_queue(
      '74000000-0000-0000-0000-000000000011',
      current_setting('tests.transport_creator_a')::uuid,
      jsonb_build_array(jsonb_build_object(
        'connection_id','72000000-0000-0000-0000-000000000001',
        'recovery_method_id','73000000-0000-0000-0000-000000000001',
        'destination','email@example.com',
        'destination_hash',encode(extensions.digest('email@example.com','sha256'),'hex')
      ))
    ) ->> 'created'
  )::integer,
  0,
  'repeated queue preparation remains idempotent'
);

-- 18
set local role authenticated;
select results_eq(
  $$ update public.update_deliveries set status='cancelled',cancelled_at=now()
     where id='75000000-0000-0000-0000-000000000099' returning id $$,
  array[]::uuid[],
  'cross-creator delivery status changes are denied'
);

-- 19
select throws_ok(
  $$
    insert into public.update_deliveries (
      update_id,creator_id,connection_id,contact_id,recovery_method_id,
      transport,destination,destination_hash,preference_category,status
    )
    values (
      '74000000-0000-0000-0000-000000000012',
      current_setting('tests.transport_creator_a')::uuid,
      '72000000-0000-0000-0000-000000000001',
      '71000000-0000-0000-0000-000000000001',
      '73000000-0000-0000-0000-000000000001',
      'email','email@example.com',
      encode(extensions.digest('email@example.com','sha256'),'hex'),
      'recovery','accepted'
    )
  $$,
  '23514',
  null,
  'accepted deliveries require an acceptance timestamp'
);

reset role;

-- 20
select has_column(
  'public',
  'follower_connections',
  'selected_recovery_method_id',
  'relationships store the exact selected recovery method ID'
);

-- 21
select col_is_fk(
  'public',
  'follower_connections',
  'selected_recovery_method_id',
  'selected recovery method ID is protected by a foreign key'
);

-- 22
select throws_ok(
  $$
    update public.follower_connections
    set selected_recovery_method_id = '73000000-0000-0000-0000-000000000099'
    where id = '72000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  null,
  'selected recovery method must belong to the relationship contact'
);

-- 23
select throws_ok(
  $$
    insert into public.update_deliveries (
      update_id,creator_id,connection_id,contact_id,recovery_method_id,
      transport,destination,destination_hash,preference_category
    )
    values (
      '74000000-0000-0000-0000-000000000013',
      current_setting('tests.transport_creator_a')::uuid,
      '72000000-0000-0000-0000-000000000002',
      '71000000-0000-0000-0000-000000000002',
      '73000000-0000-0000-0000-000000000007',
      'sms','+447700900099',
      encode(extensions.digest('+447700900099','sha256'),'hex'),
      'recovery'
    )
  $$,
  '23514',
  null,
  'account updates cannot substitute another method of the selected transport'
);

-- 24
update public.follower_connections
set selected_recovery_method_id = '73000000-0000-0000-0000-000000000009'
where id = '72000000-0000-0000-0000-000000000001';
select is(
  (
    public.create_update_delivery_queue(
      '74000000-0000-0000-0000-000000000014',
      current_setting('tests.transport_creator_a')::uuid,
      jsonb_build_array(jsonb_build_object(
        'connection_id','72000000-0000-0000-0000-000000000001',
        'recovery_method_id','73000000-0000-0000-0000-000000000001',
        'destination','email@example.com',
        'destination_hash',encode(extensions.digest('email@example.com','sha256'),'hex')
      ))
    ) ->> 'created'
  )::integer,
  0,
  'unsupported selected method types are excluded'
);

-- 25
update public.follower_connections
set selected_recovery_method_id = '73000000-0000-0000-0000-000000000008'
where id = '72000000-0000-0000-0000-000000000001';
update public.follower_category_preferences
set enabled = true
where follower_connection_id = '72000000-0000-0000-0000-000000000001'
  and category_key = 'announcements';
select is(
  (
    public.create_update_delivery_queue(
      '74000000-0000-0000-0000-000000000016',
      current_setting('tests.transport_creator_a')::uuid,
      jsonb_build_array(jsonb_build_object(
        'connection_id','72000000-0000-0000-0000-000000000001',
        'recovery_method_id','73000000-0000-0000-0000-000000000001',
        'destination','email@example.com',
        'destination_hash',encode(extensions.digest('email@example.com','sha256'),'hex')
      ))
    ) ->> 'created'
  )::integer,
  1,
  'regular broadcasts use verified email even when another method is selected'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);

-- 26
select throws_ok(
  $$ select * from public.update_deliveries $$,
  '42501',
  null,
  'anonymous cannot read transport deliveries'
);

select * from finish();
rollback;
