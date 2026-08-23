begin;
create extension if not exists pgtap with schema extensions;
set local role postgres;
set local search_path = public, extensions;
select plan(29);

select has_table('public','creator_plan_entitlements','authoritative plan projection exists');
select ok((select relrowsecurity from pg_class where oid='public.creator_plan_entitlements'::regclass),'entitlement RLS enabled');
select ok((select relforcerowsecurity from pg_class where oid='public.creator_plan_entitlements'::regclass),'entitlement RLS forced');
select table_privs_are('public','creator_plan_entitlements','authenticated',array[]::text[],'browser cannot read or mutate billing state');
select has_function('public','get_provider_connection_entitlement',array['uuid','text'],'one entitlement API exists');
select has_trigger('public','connected_accounts','enforce_provider_connection_entitlement','connection inserts are protected');
select matches(pg_get_functiondef('public.enforce_provider_connection_entitlement()'::regprocedure),'pg_advisory_xact_lock','role slot is transaction locked');

insert into auth.users(id,email) values
 ('91130000-0000-4000-8000-000000000001','free-entitlement@example.test'),
 ('91130000-0000-4000-8000-000000000002','pro-entitlement@example.test');
delete from public.creators where owner_user_id in('91130000-0000-4000-8000-000000000001','91130000-0000-4000-8000-000000000002');
insert into public.creators(id,owner_user_id,display_name,public_slug,recovery_pass_name) values
 ('91130000-0000-4000-8000-000000000011','91130000-0000-4000-8000-000000000001','Free Creator','stage-1113-free','Free Creator Recovery Pass'),
 ('91130000-0000-4000-8000-000000000012','91130000-0000-4000-8000-000000000002','Pro Creator','stage-1113-pro','Pro Creator Recovery Pass');
insert into public.creator_plan_entitlements(creator_id,plan,subscription_status) values
 ('91130000-0000-4000-8000-000000000012','pro','active');

select set_config('request.jwt.claim.role','service_role',true);

select lives_ok($$insert into public.connected_accounts(creator_id,platform,account_type,label,url)values('91130000-0000-4000-8000-000000000011','youtube','official','YouTube','https://youtube.com/a')$$,'Free can add first official');
select throws_ok($$insert into public.connected_accounts(creator_id,platform,account_type,label,url)values('91130000-0000-4000-8000-000000000011','instagram','official','Instagram','https://instagram.com/a')$$,'P0001','connection_limit_reached','Free cannot add second official across providers');
select lives_ok($$insert into public.connected_accounts(creator_id,platform,account_type,label,url)values('91130000-0000-4000-8000-000000000011','tiktok','backup','TikTok backup','https://tiktok.com/@backup')$$,'official does not consume backup slot');
select throws_ok($$insert into public.connected_accounts(creator_id,platform,account_type,label,url)values('91130000-0000-4000-8000-000000000011','youtube','backup','YouTube backup','https://youtube.com/backup')$$,'P0001','connection_limit_reached','Free cannot add second backup');
select lives_ok($$update public.connected_accounts set connection_health='expired' where creator_id='91130000-0000-4000-8000-000000000011'and account_type='official'$$,'expired authorization remains preserved');
select throws_ok($$insert into public.connected_accounts(creator_id,platform,account_type,label,url)values('91130000-0000-4000-8000-000000000011','x','official','X','https://x.com/a')$$,'P0001','connection_limit_reached','expired authorization still consumes slot');
select lives_ok($$update public.connected_accounts set label='Reconnected YouTube',connection_health='healthy'where creator_id='91130000-0000-4000-8000-000000000011'and account_type='official'$$,'exact reconnect update remains allowed');

select lives_ok($$insert into public.connected_accounts(creator_id,platform,account_type,label,url)values
 ('91130000-0000-4000-8000-000000000012','youtube','official','YouTube','https://youtube.com/pro'),
 ('91130000-0000-4000-8000-000000000012','instagram','official','Instagram','https://instagram.com/pro'),
 ('91130000-0000-4000-8000-000000000012','tiktok','official','TikTok','https://tiktok.com/@pro'),
 ('91130000-0000-4000-8000-000000000012','x','backup','X backup','https://x.com/probackup'),
 ('91130000-0000-4000-8000-000000000012','twitch','backup','Twitch backup','https://twitch.tv/probackup')$$,'Pro supports multiple official and backup accounts');
select is((select count(*)::integer from public.connected_accounts where creator_id='91130000-0000-4000-8000-000000000012'and account_type='official'),3,'Pro official accounts preserved');
select is((select count(*)::integer from public.connected_accounts where creator_id='91130000-0000-4000-8000-000000000012'and account_type='backup'),2,'Pro backup accounts preserved');

update public.creator_plan_entitlements set plan='free',subscription_status='canceled' where creator_id='91130000-0000-4000-8000-000000000012';
select is((select count(*)::integer from public.connected_accounts where creator_id='91130000-0000-4000-8000-000000000012'),5,'downgrade deletes no accounts');
select throws_ok($$insert into public.connected_accounts(creator_id,platform,account_type,label,url)values('91130000-0000-4000-8000-000000000012','facebook','official','Facebook','https://facebook.com/pro')$$,'P0001','connection_limit_reached','downgraded official is blocked');
select throws_ok($$insert into public.connected_accounts(creator_id,platform,account_type,label,url)values('91130000-0000-4000-8000-000000000012','discord','backup','Discord','https://discord.com/pro')$$,'P0001','connection_limit_reached','downgraded backup is blocked');
delete from public.connected_accounts where creator_id='91130000-0000-4000-8000-000000000012'and account_type='official'and platform in('instagram','tiktok');
select throws_ok($$insert into public.connected_accounts(creator_id,platform,account_type,label,url)values('91130000-0000-4000-8000-000000000012','facebook','official','Facebook','https://facebook.com/pro')$$,'P0001','connection_limit_reached','at Free maximum remains blocked');
delete from public.connected_accounts where creator_id='91130000-0000-4000-8000-000000000012'and account_type='official';
select lives_ok($$insert into public.connected_accounts(creator_id,platform,account_type,label,url)values('91130000-0000-4000-8000-000000000012','facebook','official','Facebook','https://facebook.com/pro')$$,'slot opens only below Free maximum');

select is((public.get_provider_connection_entitlement('91130000-0000-4000-8000-000000000011','official')->>'currentCount')::integer,1,'authoritative API reports official usage');
select is((public.get_provider_connection_entitlement('91130000-0000-4000-8000-000000000011','backup')->>'currentCount')::integer,1,'authoritative API reports backup usage independently');
select is(public.get_provider_connection_entitlement('91130000-0000-4000-8000-000000000011','official')->>'plan','free','missing billing row fails closed to Free');
select is(public.get_provider_connection_entitlement('91130000-0000-4000-8000-000000000012','official')->>'plan','free','canceled Pro resolves to Free');
select throws_ok($$select public.get_provider_connection_entitlement('91130000-0000-4000-8000-000000000011','invalid')$$,'22023','invalid connection role','invalid roles fail closed');

select is((select count(*)::integer from public.connected_accounts where creator_id='91130000-0000-4000-8000-000000000011'and account_type='official'),1,'competing Free official attempts leave exactly one row');
select is((select count(*)::integer from public.connected_accounts where creator_id='91130000-0000-4000-8000-000000000011'and account_type='backup'),1,'competing Free backup attempts leave exactly one row');

select * from finish();
rollback;
