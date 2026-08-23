begin;
select plan(13);
select has_table('public','main_account_recovery_destinations','recovery network relation exists');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.main_account_recovery_destinations'::regclass),'recovery networks force RLS');
select table_privs_are('public','main_account_recovery_destinations','authenticated',array['SELECT'],'creators cannot mutate relationships directly');
select function_privs_are('public','set_main_account_recovery_destinations',array['uuid','uuid','uuid[]'],'authenticated',array['EXECUTE'],'atomic creator action is available');

insert into auth.users(id,email,raw_user_meta_data) values
('19100000-0000-4000-8000-000000000001','network-a@example.test','{}'),
('19100000-0000-4000-8000-000000000002','network-b@example.test','{}');
select set_config('tests.creator_a',(select id::text from public.creators where owner_user_id='19100000-0000-4000-8000-000000000001'),true);
select set_config('tests.creator_b',(select id::text from public.creators where owner_user_id='19100000-0000-4000-8000-000000000002'),true);
insert into public.creator_plan_entitlements(creator_id,plan,subscription_status) values
(current_setting('tests.creator_a')::uuid,'pro','active'),(current_setting('tests.creator_b')::uuid,'pro','active');
insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,is_primary,is_public,position,connection_health,provider_status) values
('19110000-0000-4000-8000-000000000001',current_setting('tests.creator_a')::uuid,'youtube','official','Main A','https://youtube.com/@a',true,true,0,'healthy','ready'),
('19110000-0000-4000-8000-000000000002',current_setting('tests.creator_a')::uuid,'instagram','backup','Recovery A','https://instagram.com/a',false,true,1,'healthy','ready'),
('19110000-0000-4000-8000-000000000003',current_setting('tests.creator_a')::uuid,'facebook','official','Main A2','https://facebook.com/a',false,true,2,'healthy','ready'),
('19110000-0000-4000-8000-000000000004',current_setting('tests.creator_b')::uuid,'instagram','backup','Recovery B','https://instagram.com/b',false,true,0,'healthy','ready');
insert into public.main_account_recovery_destinations(creator_id,main_connected_account_id,recovery_connected_account_id) values
(current_setting('tests.creator_a')::uuid,'19110000-0000-4000-8000-000000000001','19110000-0000-4000-8000-000000000002'),
(current_setting('tests.creator_a')::uuid,'19110000-0000-4000-8000-000000000003','19110000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.main_account_recovery_destinations where recovery_connected_account_id='19110000-0000-4000-8000-000000000002'),2,'one Recovery account protects multiple Main accounts');
delete from public.main_account_recovery_destinations where main_connected_account_id='19110000-0000-4000-8000-000000000001' and recovery_connected_account_id='19110000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.connected_accounts where id='19110000-0000-4000-8000-000000000002'),1,'removing a link keeps the Recovery account');
select is((select count(*)::integer from public.main_account_recovery_destinations where main_connected_account_id='19110000-0000-4000-8000-000000000003'),1,'other Main link remains intact');
select throws_ok($$insert into public.main_account_recovery_destinations(creator_id,main_connected_account_id,recovery_connected_account_id) values(current_setting('tests.creator_a')::uuid,'19110000-0000-4000-8000-000000000001','19110000-0000-4000-8000-000000000004')$$,'23514',null,'cross-creator link rejected');
select throws_ok($$insert into public.main_account_recovery_destinations(creator_id,main_connected_account_id,recovery_connected_account_id) values(current_setting('tests.creator_a')::uuid,'19110000-0000-4000-8000-000000000003','19110000-0000-4000-8000-000000000001')$$,'23514',null,'Main to Main rejected');
select throws_ok($$insert into public.main_account_recovery_destinations(creator_id,main_connected_account_id,recovery_connected_account_id) values(current_setting('tests.creator_a')::uuid,'19110000-0000-4000-8000-000000000002','19110000-0000-4000-8000-000000000002')$$,'23514',null,'self-link rejected');
update public.connected_accounts set connection_health='revoked' where id='19110000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.main_account_recovery_destinations network join public.connected_accounts recovery on recovery.id=network.recovery_connected_account_id where network.main_connected_account_id='19110000-0000-4000-8000-000000000003' and recovery.connection_health not in('revoked','expired') and recovery.provider_status<>'revoked'),0,'revoked Recovery does not count as healthy protection');
delete from public.connected_accounts where id='19110000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.main_account_recovery_destinations),0,'global disconnect cascades relationship rows without orphaning');
select is((select count(*)::integer from public.connected_accounts where id in('19110000-0000-4000-8000-000000000001','19110000-0000-4000-8000-000000000003')),2,'disconnecting Recovery preserves Main accounts');
select * from finish();
rollback;
