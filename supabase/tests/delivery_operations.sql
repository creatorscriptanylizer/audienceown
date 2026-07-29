begin;
select plan(12);

select has_table('public', 'delivery_operator_actions', 'operator audit table exists');
select has_table('public', 'delivery_health_snapshots', 'health snapshot table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.delivery_operator_actions'::regclass), 'operator audit RLS enabled');
select ok((select relforcerowsecurity from pg_class where oid = 'public.delivery_operator_actions'::regclass), 'operator audit RLS forced');
select function_privs_are(
  'public', 'retry_failed_delivery',
  array['uuid','text','uuid','delivery_operator_role'],
  'anon', array[]::text[], 'anonymous users cannot retry deliveries'
);
select function_privs_are(
  'public', 'release_stuck_delivery',
  array['uuid','text','uuid','delivery_operator_role'],
  'authenticated', array[]::text[], 'authenticated creators cannot release deliveries'
);
select function_privs_are(
  'public', 'reconcile_pending_provider_event',
  array['uuid','text','uuid','delivery_operator_role'],
  'authenticated', array[]::text[], 'authenticated creators cannot reconcile events'
);

select is((public.get_delivery_system_health()->>'queuedCount')::integer, 0, 'empty queue depth is zero');
select is((public.get_delivery_system_health()->>'oldestQueuedSeconds')::integer, 0, 'empty oldest queued age is zero');
select is((public.get_delivery_system_health()->>'recentAcceptanceRate')::numeric, 0::numeric, 'zero denominator acceptance rate is zero');

insert into public.delivery_operator_actions(
  actor_user_id, actor_role, action_type, reason
) values (
  '90000000-0000-4000-8000-000000000001', 'delivery_operator',
  'mark_incident', 'Test audit append'
);
select is((select count(*)::integer from public.delivery_operator_actions), 1, 'operator action appends');
select throws_ok(
  $$update public.delivery_operator_actions set reason = 'Changed'$$,
  '42501',
  'delivery operations audit records are append-only',
  'operator audit cannot be updated'
);

select * from finish();
rollback;
