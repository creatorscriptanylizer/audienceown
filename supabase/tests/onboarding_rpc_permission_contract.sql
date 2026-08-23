begin;
create extension if not exists pgtap with schema extensions;
set local role postgres;
set local search_path = public, extensions;
select plan(15);

select function_privs_are(
  'public', 'get_provider_connection_entitlement', array['uuid', 'text'], 'anon', array[]::text[],
  'anon cannot execute the creator entitlement RPC'
);
select function_privs_are(
  'public', 'get_provider_connection_entitlement', array['uuid', 'text'], 'authenticated', array['EXECUTE'],
  'authenticated creators can execute the creator-scoped entitlement RPC'
);
select function_privs_are(
  'public', 'get_provider_connection_entitlement', array['uuid', 'text'], 'service_role', array['EXECUTE'],
  'the server client can execute the entitlement RPC'
);
select function_privs_are(
  'public', 'provision_configured_app_admin', array['uuid', 'text'], 'anon', array[]::text[],
  'anon cannot execute admin provisioning'
);
select function_privs_are(
  'public', 'provision_configured_app_admin', array['uuid', 'text'], 'authenticated', array[]::text[],
  'authenticated users cannot execute admin provisioning'
);
select function_privs_are(
  'public', 'provision_configured_app_admin', array['uuid', 'text'], 'service_role', array['EXECUTE'],
  'only the server client can execute admin provisioning'
);

insert into auth.users(id, email) values
  ('91200000-0000-4000-8000-000000000001', 'rpc-owner@example.test'),
  ('91200000-0000-4000-8000-000000000002', 'rpc-other@example.test');
delete from public.creators
where owner_user_id in (
  '91200000-0000-4000-8000-000000000001',
  '91200000-0000-4000-8000-000000000002'
);
insert into public.creators(id, owner_user_id, display_name, public_slug, recovery_pass_name) values
  ('91200000-0000-4000-8000-000000000011', '91200000-0000-4000-8000-000000000001', 'RPC Owner', 'rpc-owner', 'RPC Owner Recovery Pass'),
  ('91200000-0000-4000-8000-000000000012', '91200000-0000-4000-8000-000000000002', 'RPC Other', 'rpc-other', 'RPC Other Recovery Pass');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91200000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.get_provider_connection_entitlement('91200000-0000-4000-8000-000000000011', 'official')$$,
  'creator can read its own official entitlement'
);
select lives_ok(
  $$select public.get_provider_connection_entitlement('91200000-0000-4000-8000-000000000011', 'backup')$$,
  'creator can read its own backup entitlement'
);
select throws_ok(
  $$select public.get_provider_connection_entitlement('91200000-0000-4000-8000-000000000012', 'official')$$,
  '42501', 'access denied', 'creator cannot read another creator entitlement'
);
select throws_ok(
  $$select public.get_provider_connection_entitlement('91200000-0000-4000-8000-000000000011', 'invalid')$$,
  '22023', 'invalid connection role', 'invalid connection roles are rejected'
);
select throws_ok(
  $$select public.provision_configured_app_admin('91200000-0000-4000-8000-000000000001', 'rpc-owner@example.test')$$,
  '42501', null, 'an authenticated user cannot promote itself'
);

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select throws_ok(
  $$select public.get_provider_connection_entitlement('91200000-0000-4000-8000-000000000011', 'official')$$,
  '42501', null, 'anon cannot read creator entitlements'
);
select throws_ok(
  $$select public.provision_configured_app_admin('91200000-0000-4000-8000-000000000001', 'rpc-owner@example.test')$$,
  '42501', null, 'anon cannot provision an administrator'
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select lives_ok(
  $$select public.provision_configured_app_admin('91200000-0000-4000-8000-000000000001', 'rpc-owner@example.test')$$,
  'the intended server-only provisioning path succeeds'
);
set local role postgres;
select ok(
  public.is_app_admin('91200000-0000-4000-8000-000000000001'),
  'server provisioning creates only the requested administrator record'
);

select * from finish();
rollback;
