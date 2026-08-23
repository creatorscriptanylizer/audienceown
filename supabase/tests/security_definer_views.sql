begin;
create extension if not exists pgtap with schema extensions;
set local role postgres;
set local search_path = public, extensions;
select plan(25);

select is(
  (select c.relowner::regrole::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='public_creator_profiles'),
  'postgres',
  'public creator profile view owner is recorded'
);
select is(
  (select c.relowner::regrole::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='public_connected_accounts'),
  'postgres',
  'public connected account view owner is recorded'
);
select ok(
  (select coalesce(c.reloptions,'{}'::text[]) @> array['security_invoker=true']
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='public_creator_profiles'),
  'public creator profile view is security invoker'
);
select ok(
  (select coalesce(c.reloptions,'{}'::text[]) @> array['security_invoker=true']
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='public_connected_accounts'),
  'public connected account view is security invoker'
);
select table_privs_are('public','public_creator_profiles','anon',array[]::text[],'anon has no legacy profile view privileges');
select table_privs_are('public','public_connected_accounts','anon',array[]::text[],'anon has no legacy account view privileges');
select table_privs_are('public','public_creator_profiles','authenticated',array[]::text[],'authenticated has no legacy profile view privileges');
select table_privs_are('public','public_connected_accounts','authenticated',array[]::text[],'authenticated has no legacy account view privileges');
select table_privs_are('public','public_creator_profiles','service_role',array[]::text[],'service role does not depend on the legacy profile view');
select table_privs_are('public','public_connected_accounts','service_role',array[]::text[],'service role does not depend on the legacy account view');
select table_privs_are('public','creators','anon',array[]::text[],'anon has no creator base-table privileges');
select table_privs_are('public','connected_accounts','anon',array[]::text[],'anon has no connected-account base-table privileges');
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='creators'),
  'creator RLS is enabled and forced'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='connected_accounts'),
  'connected-account RLS is enabled and forced'
);
select ok(has_table_privilege('service_role','public.creators','SELECT'),'service role retains creator-table access');
select ok(has_table_privilege('service_role','public.connected_accounts','SELECT'),'service role retains connected-account access');

insert into auth.users(id,email) values
  ('15900000-0000-4000-8000-000000000001','view-fix-public@example.test'),
  ('15900000-0000-4000-8000-000000000002','view-fix-private@example.test');
delete from public.creator_onboarding
where creator_id in (
  select id from public.creators
  where owner_user_id in (
    '15900000-0000-4000-8000-000000000001',
    '15900000-0000-4000-8000-000000000002'
  )
);
update public.creators set
  id='15910000-0000-4000-8000-000000000001', display_name='View Fix Public',
  public_slug='view-fix-public', public_bio='Public biography',
  public_profile_enabled=true, recovery_pass_enabled=true
where owner_user_id='15900000-0000-4000-8000-000000000001';
update public.creators set
  id='15910000-0000-4000-8000-000000000002', display_name='View Fix Private',
  public_slug='view-fix-private', public_bio='Private biography',
  public_profile_enabled=false, recovery_pass_enabled=true
where owner_user_id='15900000-0000-4000-8000-000000000002';
insert into public.creator_plan_entitlements(creator_id,plan,subscription_status)
values('15910000-0000-4000-8000-000000000001','pro','active');
insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,is_public,position,connection_health,provider_status)
values
  ('15920000-0000-4000-8000-000000000001','15910000-0000-4000-8000-000000000001','youtube','official','Public account','https://example.com/public',true,1,'healthy','ready'),
  ('15920000-0000-4000-8000-000000000002','15910000-0000-4000-8000-000000000001','instagram','official','Private account','https://example.com/private',false,2,'healthy','ready'),
  ('15920000-0000-4000-8000-000000000003','15910000-0000-4000-8000-000000000001','tiktok','backup','Backup account','https://example.com/backup',true,3,'healthy','ready'),
  ('15920000-0000-4000-8000-000000000004','15910000-0000-4000-8000-000000000001','facebook','official','Revoked account','https://example.com/revoked',true,4,'revoked','reconnect_required');

set local role anon;
select throws_ok($$select * from public.public_creator_profiles$$,'42501',null,'anon cannot use the retired creator profile view');
select throws_ok($$select * from public.public_connected_accounts$$,'42501',null,'anon cannot use the retired connected-account view');
select is(public.get_public_creator_page('view-fix-private'),null,'anon cannot read a private creator through the public RPC');
select is(public.get_public_recovery_pass_profile('view-fix-private'),null,'private Recovery Pass profile is not public');
select is(public.get_public_creator_page('view-fix-public')#>>'{profile,displayName}','View Fix Public','anon can read the intended public creator through the bounded RPC');
select is(jsonb_array_length(public.get_public_creator_page('view-fix-public')->'links'),1,'anon sees only the public official active account');
select ok(
  public.get_public_creator_page('view-fix-public')::text !~* '(creator_id|owner_user_id|provider_metadata|token|external_account_id|lease_owner)',
  'public payload excludes creator-private and connected-account internal fields'
);

reset role;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','15900000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is(public.get_public_creator_page('view-fix-public')#>>'{profile,displayName}','View Fix Public','authenticated callers receive the same public contract');
select is(public.get_public_creator_page('view-fix-private'),null,'authenticated callers cannot cross into a private creator public page');

select * from finish();
rollback;
