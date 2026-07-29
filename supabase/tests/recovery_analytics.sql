begin;
select plan(16);

select has_table('public', 'creator_recovery_daily_snapshots', 'daily aggregate snapshot table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.creator_recovery_daily_snapshots'::regclass), 'snapshot RLS enabled');
select ok((select relforcerowsecurity from pg_class where oid = 'public.creator_recovery_daily_snapshots'::regclass), 'snapshot RLS forced');
select function_privs_are(
  'public', 'capture_recovery_daily_snapshots', array['integer'],
  'authenticated', array[]::text[], 'bulk snapshot capture is service-role only'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '91000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'analytics-owner@example.com',
  crypt('test-password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
);
update public.creators set public_slug = 'analytics-owner'
where owner_user_id = '91000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is((select total_relationships::integer from public.get_creator_recovery_coverage()), 0, 'zero active audience is calculated safely');
select is((select recovery_ready_relationships::integer from public.get_creator_recovery_coverage()), 0, 'zero recovery-ready count is safe');
select is((select uncovered_relationships::integer from public.get_creator_recovery_coverage()), 0, 'zero uncovered count is safe');
select is((select recovery_coverage_rate from public.get_creator_recovery_coverage()), 0::numeric, 'zero denominator coverage rate is zero');
select is((select count(*)::integer from public.get_creator_recovery_transport_breakdown()), 4, 'all supported transports are represented');
select is((select count(*)::integer from public.get_creator_recovery_funnel()), 5, 'authoritative funnel stages are returned');

select lives_ok(
  $$select public.capture_creator_recovery_daily_snapshot('91000000-0000-4000-8000-000000000001')$$,
  'creator may capture only their own current aggregate snapshot'
);
select lives_ok(
  $$select public.capture_creator_recovery_daily_snapshot('91000000-0000-4000-8000-000000000001')$$,
  'daily snapshot capture is idempotent'
);
select is(
  (select count(*)::integer from public.creator_recovery_daily_snapshots),
  1, 'one snapshot exists per creator per day'
);
select throws_ok(
  $$insert into public.creator_recovery_daily_snapshots(
      creator_user_id, total_relationships, recovery_ready_relationships,
      uncovered_relationships, partially_configured_relationships,
      email_count, browser_notification_count, sms_count, whatsapp_count
    ) values (
      '91000000-0000-4000-8000-000000000001', 99, 99, 0, 0, 99, 0, 0, 0
    )$$,
  '42501', null, 'creator cannot forge analytics snapshots'
);
select throws_ok(
  $$select public.capture_creator_recovery_daily_snapshot('92000000-0000-4000-8000-000000000002')$$,
  '42501', 'snapshot access denied', 'creator cannot capture another creator snapshot'
);
select is(
  (select history_source from public.get_creator_recovery_coverage_trend(30) limit 1),
  'stage_3_1_snapshot', 'trend clearly identifies snapshot-only history'
);

reset role;
select * from finish();
rollback;
