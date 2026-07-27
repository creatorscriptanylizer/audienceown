begin;

select plan(37);

-- ---------------------------------------------------------------------------
-- Fixed test identities
-- ---------------------------------------------------------------------------

-- creator_a:
-- aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
--
-- creator_b:
-- bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb

-- Create the two Supabase Auth users directly.
--
-- The existing auth.users -> public.creators trigger should create one creator
-- row for each user, matching normal application registration behaviour.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'creator-a@example.com',
    crypt('test-password-a', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'creator-b@example.com',
    crypt('test-password-b', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

-- ---------------------------------------------------------------------------
-- Creator fixtures
-- ---------------------------------------------------------------------------

update public.creators
set
  public_slug = 'creator-a',
  display_name = 'Creator A',
  public_profile_enabled = true,
  profile_image_path =
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/profile/a.jpg'
where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

update public.creators
set
  public_slug = 'creator-b',
  display_name = 'Creator B',
  public_profile_enabled = false
where owner_user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

-- Store creator B's creator-row ID for later RLS checks.
select set_config(
  'tests.creator_b_id',
  (
    select id::text
    from public.creators
    where public_slug = 'creator-b'
  ),
  true
);

insert into public.creator_updates (
  id, creator_id, broadcast_type, status, title, subject, content, sent_at
)
select
  '40000000-0000-0000-0000-000000000003',
  id,
  'announcement',
  'sent',
  'Sent update',
  'Already sent',
  'This update has already been sent.',
  now()
from public.creators
where public_slug = 'creator-a';

insert into public.creator_updates (
  id, creator_id, broadcast_type, title
)
select
  '40000000-0000-0000-0000-000000000002',
  id,
  'announcement',
  'Creator B draft'
from public.creators
where public_slug = 'creator-b';

-- ---------------------------------------------------------------------------
-- Connected-account fixtures
-- ---------------------------------------------------------------------------

insert into public.connected_accounts (
  id,
  creator_id,
  platform,
  account_type,
  label,
  url,
  is_public
)
select
  '10000000-0000-0000-0000-000000000001',
  id,
  'youtube',
  'official',
  'Public A',
  'https://example.com/a',
  true
from public.creators
where public_slug = 'creator-a';

insert into public.connected_accounts (
  id,
  creator_id,
  platform,
  account_type,
  label,
  url,
  is_public
)
select
  '10000000-0000-0000-0000-000000000002',
  id,
  'youtube',
  'backup',
  'Backup A',
  'https://example.com/backup',
  true
from public.creators
where public_slug = 'creator-a';

-- ---------------------------------------------------------------------------
-- Recovery Pass fixtures
-- ---------------------------------------------------------------------------

insert into public.follower_contacts (
  id,
  email_ciphertext,
  email_hash,
  email_masked
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'cipher-a',
    'hash-a',
    'a••@example.com'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'cipher-b',
    'hash-b',
    'b••@example.com'
  );

insert into public.follower_connections (
  id,
  creator_id,
  follower_contact_id,
  preference_token_hash,
  unsubscribe_token_hash,
  source_platform,
  consent_source
)
select
  '30000000-0000-0000-0000-000000000001',
  id,
  '20000000-0000-0000-0000-000000000001',
  'pref-a',
  'unsub-a',
  'tiktok',
  'creator_page'
from public.creators
where public_slug = 'creator-a';

insert into public.follower_connections (
  id,
  creator_id,
  follower_contact_id,
  preference_token_hash,
  unsubscribe_token_hash,
  source_platform,
  consent_source
)
select
  '30000000-0000-0000-0000-000000000002',
  id,
  '20000000-0000-0000-0000-000000000002',
  'pref-b',
  'unsub-b',
  'youtube',
  'creator_page'
from public.creators
where public_slug = 'creator-b';

insert into public.follower_recovery_methods (
  follower_contact_id,
  method_type,
  destination_hash,
  destination_masked
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'email',
    'method-a',
    'a••@example.com'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'email',
    'method-b',
    'b••@example.com'
  );

-- ---------------------------------------------------------------------------
-- Authenticate as creator A
-- ---------------------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  true
);

select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'role',
    'authenticated',
    'email',
    'creator-a@example.com'
  )::text,
  true
);

-- 1
select is(
  (select count(*)::int from public.creators),
  1,
  'owner reads only own creator'
);

-- 2
select lives_ok(
  $$
    update public.creators
    set public_bio = 'mine'
    where public_slug = 'creator-a'
  $$,
  'owner updates own creator'
);

-- 3
select is(
  (
    select count(*)::int
    from public.creators
    where public_slug = 'creator-b'
  ),
  0,
  'owner cannot read another creator'
);

-- Attempting the update should affect zero rows because creator B is hidden
-- by creator A's RLS policy.
update public.creators
set public_bio = 'hacked'
where public_slug = 'creator-b';

-- 4
select is(
  (
    select count(*)::int
    from public.creators
    where public_slug = 'creator-b'
      and public_bio = 'hacked'
  ),
  0,
  'owner cannot update another creator'
);

-- 5
select lives_ok(
  $$
    insert into public.connected_accounts (
      creator_id,
      platform,
      account_type,
      label,
      url
    )
    select
      id,
      'website',
      'official',
      'Mine',
      'https://mine.example'
    from public.creators
    where public_slug = 'creator-a'
  $$,
  'owner creates own account'
);

-- 6
select throws_ok(
  $$
    insert into public.connected_accounts (
      creator_id,
      platform,
      account_type,
      label,
      url
    )
    values (
      current_setting('tests.creator_b_id')::uuid,
      'website',
      'official',
      'Theirs',
      'https://theirs.example'
    )
  $$,
  '42501',
  null,
  'owner cannot create account for another creator'
);

-- 7
select lives_ok(
  $$
    update public.connected_accounts
    set label = 'Updated'
    where id = '10000000-0000-0000-0000-000000000001'
  $$,
  'owner updates own account'
);

update public.connected_accounts
set label = 'Updated Backup'
where id = '10000000-0000-0000-0000-000000000002';

-- 8
select is(
  (
    select count(*)::int
    from public.connected_accounts
    where id = '10000000-0000-0000-0000-000000000002'
      and label = 'Updated Backup'
  ),
  1,
  'owner can update own backup account'
);

-- 9
select lives_ok(
  $$
    delete from public.connected_accounts
    where label = 'Updated'
  $$,
  'owner deletes own account'
);

-- 10
select is(
  (
    select count(*)::int
    from public.follower_connections
  ),
  1,
  'creator sees only own audience'
);

-- 11
select is(
  (
    select count(*)::int
    from public.follower_recovery_methods
  ),
  1,
  'creator sees methods only for own audience'
);

-- 12
select is(
  (
    select count(*)::int
    from public.follower_category_preferences
  ),
  5,
  'creator sees canonical preferences only for own audience'
);

-- 13
select throws_ok(
  $$
    select email_ciphertext
    from public.follower_contacts
  $$,
  '42501',
  null,
  'creator cannot read encrypted contacts'
);

-- 14
select throws_ok(
  $$
    update public.follower_connections
    set status = 'deactivated'
  $$,
  '42501',
  null,
  'creator cannot alter fan consent state'
);

-- 15
select lives_ok(
  $$
    insert into public.creator_updates (
      id, creator_id, broadcast_type, title
    )
    select
      '40000000-0000-0000-0000-000000000001',
      id,
      'new_content',
      ''
    from public.creators
    where public_slug = 'creator-a'
  $$,
  'creator can insert their own draft'
);

-- 16
select is(
  (
    select count(*)::int
    from public.creator_updates
    where id = '40000000-0000-0000-0000-000000000001'
  ),
  1,
  'creator can read their own draft'
);

-- 17
select is(
  (
    select count(*)::int
    from public.creator_updates
    where id = '40000000-0000-0000-0000-000000000002'
  ),
  0,
  'creator cannot read another creator draft'
);

-- 18
select throws_ok(
  $$
    insert into public.creator_updates (creator_id, broadcast_type)
    values (current_setting('tests.creator_b_id')::uuid, 'announcement')
  $$,
  '42501',
  null,
  'creator cannot insert for another creator'
);

-- 19
select lives_ok(
  $$
    update public.creator_updates
    set subject = 'Draft subject'
    where id = '40000000-0000-0000-0000-000000000001'
  $$,
  'creator can update their own draft'
);

-- 20
select throws_ok(
  $$
    update public.creator_updates
    set creator_id = current_setting('tests.creator_b_id')::uuid
    where id = '40000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'creator cannot change creator_id'
);

-- 21
select results_eq(
  $$
    delete from public.creator_updates
    where id = '40000000-0000-0000-0000-000000000001'
    returning id
  $$,
  array['40000000-0000-0000-0000-000000000001'::uuid],
  'creator can delete their own draft'
);

-- 22
select results_eq(
  $$
    delete from public.creator_updates
    where id = '40000000-0000-0000-0000-000000000003'
    returning id
  $$,
  array[]::uuid[],
  'creator cannot delete a sent update'
);

-- 23
select lives_ok(
  $$
    insert into public.creator_updates (creator_id, broadcast_type)
    select id, 'event'
    from public.creators
    where public_slug = 'creator-a'
  $$,
  'incomplete draft is allowed'
);

-- 24
select throws_ok(
  $$
    insert into public.creator_updates (
      creator_id, broadcast_type, status, title, subject, content, scheduled_for
    )
    select id, 'livestream', 'scheduled', 'Live', 'Join me', 'Going live.', now() - interval '1 minute'
    from public.creators
    where public_slug = 'creator-a'
  $$,
  '23514',
  null,
  'scheduled update requires a future scheduled_for'
);

-- 25
select throws_ok(
  $$
    insert into public.creator_updates (
      creator_id, broadcast_type, status, title
    )
    select id, 'announcement', 'queued', 'Incomplete queued update'
    from public.creators
    where public_slug = 'creator-a'
  $$,
  '23514',
  null,
  'queued update requires subject and content'
);

-- 26
select throws_ok(
  $$
    insert into public.creator_updates (
      creator_id, broadcast_type, cta_url
    )
    select id, 'product_launch', 'http://example.com'
    from public.creators
    where public_slug = 'creator-a'
  $$,
  '23514',
  null,
  'CTA URL must use HTTPS when present'
);

-- ---------------------------------------------------------------------------
-- Return to the database owner for invariant tests
-- ---------------------------------------------------------------------------

reset role;

-- Clear request identity so invariant tests do not accidentally rely on
-- creator A's JWT.
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);
select set_config('request.jwt.claims', '{}', true);

-- 27
select is(
  (
    select source_platform
    from public.follower_connections
    where id = '30000000-0000-0000-0000-000000000001'
  ),
  'tiktok',
  'first-touch source begins with activation source'
);

update public.follower_connections
set source_platform = 'instagram'
where id = '30000000-0000-0000-0000-000000000001';

-- 28
select is(
  (
    select source_platform
    from public.follower_connections
    where id = '30000000-0000-0000-0000-000000000001'
  ),
  'tiktok',
  'ordinary updates preserve first-touch source'
);

-- 29
select throws_ok(
  $$
    update public.follower_category_preferences
    set enabled = false
    where follower_connection_id =
      '30000000-0000-0000-0000-000000000001'
      and category_key = 'recovery'
  $$,
  '23514',
  null,
  'active pass cannot disable recovery'
);

-- 30
select lives_ok(
  $$
    update public.follower_category_preferences
    set enabled = true
    where follower_connection_id =
      '30000000-0000-0000-0000-000000000001'
      and category_key = 'videos'
  $$,
  'optional preference can change'
);

-- 31
select throws_ok(
  $$
    insert into public.follower_category_preferences (
      follower_connection_id,
      category_key,
      enabled
    )
    values (
      '30000000-0000-0000-0000-000000000001',
      'unsafe',
      true
    )
  $$,
  '23514',
  null,
  'invalid category is rejected'
);

-- ---------------------------------------------------------------------------
-- Anonymous/public access
-- ---------------------------------------------------------------------------

set local role anon;

select set_config(
  'request.jwt.claim.sub',
  '',
  true
);

select set_config(
  'request.jwt.claim.role',
  'anon',
  true
);

select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);

-- 32
select is(
  (
    select count(*)::int
    from public.public_creator_profiles
  ),
  1,
  'anonymous reads only published creator profile'
);

-- 33
select is(
  (
    select count(*)::int
    from public.public_connected_accounts
  ),
  1,
  'anonymous reads only published official public accounts'
);

-- 34
select throws_ok(
  $$
    select *
    from public.creators
  $$,
  '42501',
  null,
  'anonymous cannot query creator base table'
);

-- 35
select throws_ok(
  $$
    select *
    from public.follower_contacts
  $$,
  '42501',
  null,
  'anonymous cannot select contacts'
);

-- 36
select throws_ok(
  $$
    select *
    from public.follower_connections
  $$,
  '42501',
  null,
  'anonymous cannot select connections'
);

-- 37
select throws_ok(
  $$
    select *
    from public.follower_recovery_methods
  $$,
  '42501',
  null,
  'anonymous cannot enumerate methods'
);

select * from finish();

rollback;
