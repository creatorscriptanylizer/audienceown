begin;
select plan(21);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,
created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change) values
('00000000-0000-0000-0000-000000000000','13700000-0000-4000-8000-000000000001','authenticated','authenticated',
'hierarchy@example.com',crypt('pw',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
update public.creators set public_slug='provider-hierarchy' where owner_user_id='13700000-0000-4000-8000-000000000001';
insert into public.creator_plan_entitlements(creator_id,plan,subscription_status)
select id,'pro','active' from public.creators where owner_user_id='13700000-0000-4000-8000-000000000001';
select set_config('tests.hierarchy_creator',(select id::text from public.creators where public_slug='provider-hierarchy'),true);

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);

insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,external_account_id,connection_health,provider_status)
values
('13710000-0000-4000-8000-000000000001',current_setting('tests.hierarchy_creator')::uuid,'youtube','backup','Backup 1','https://youtube.com/channel/backup1','oauth-backup-1','healthy','ready'),
('13710000-0000-4000-8000-000000000002',current_setting('tests.hierarchy_creator')::uuid,'youtube','backup','Backup 2','https://youtube.com/channel/backup2',null,'healthy','configuration_pending'),
('13710000-0000-4000-8000-000000000003',current_setting('tests.hierarchy_creator')::uuid,'instagram','backup','Other provider','https://instagram.com/other',null,'healthy','configuration_pending');

select is((select protected_official_account_id from public.connected_accounts where id='13710000-0000-4000-8000-000000000001'),null,'backup created first remains unassigned');
select is((select count(*)::integer from public.connected_accounts where creator_id=current_setting('tests.hierarchy_creator')::uuid),3,'backup-first writes preserve account counts');

insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,external_account_id,connection_health,provider_status)
values('13710000-0000-4000-8000-000000000010',current_setting('tests.hierarchy_creator')::uuid,'youtube','official','Official A','https://youtube.com/channel/official-a','oauth-official-a','healthy','ready');

select is((select protected_official_account_id from public.connected_accounts where id='13710000-0000-4000-8000-000000000001'),'13710000-0000-4000-8000-000000000010'::uuid,'OAuth backup auto-links to later official');
select is((select protected_official_account_id from public.connected_accounts where id='13710000-0000-4000-8000-000000000002'),'13710000-0000-4000-8000-000000000010'::uuid,'manual backup auto-links to later official');
select is((select protected_official_account_id from public.connected_accounts where id='13710000-0000-4000-8000-000000000003'),null,'cross-provider backup is untouched');
select throws_ok($$insert into public.connected_accounts(creator_id,platform,account_type,label,url) values(current_setting('tests.hierarchy_creator')::uuid,'youtube','official','Invalid second official','https://youtube.com/channel/second')$$,'23505',null,'second official for a provider is rejected');

delete from public.connected_accounts where id='13710000-0000-4000-8000-000000000010';
select is((select protected_official_account_id from public.connected_accounts where id='13710000-0000-4000-8000-000000000001'),null,'official deletion clears the relationship');
select is((select count(*)::integer from public.connected_accounts where platform='youtube' and account_type='backup' and creator_id=current_setting('tests.hierarchy_creator')::uuid),2,'official deletion preserves backups');

insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,connection_health,provider_status)
values('13710000-0000-4000-8000-000000000011',current_setting('tests.hierarchy_creator')::uuid,'youtube','official','Official B','https://youtube.com/channel/official-b','healthy','configuration_pending');
select is((select protected_official_account_id from public.connected_accounts where id='13710000-0000-4000-8000-000000000001'),'13710000-0000-4000-8000-000000000011'::uuid,'replacement official reparents first backup');
select is((select protected_official_account_id from public.connected_accounts where id='13710000-0000-4000-8000-000000000002'),'13710000-0000-4000-8000-000000000011'::uuid,'replacement official reparents every backup');

update public.connected_accounts set protected_official_account_id='13710000-0000-4000-8000-000000000003'
where id='13710000-0000-4000-8000-000000000001';
select is((select protected_official_account_id from public.connected_accounts where id='13710000-0000-4000-8000-000000000001'),'13710000-0000-4000-8000-000000000011'::uuid,'caller-supplied stale parent is replaced canonically');

select is(public.reconcile_provider_account_hierarchy(current_setting('tests.hierarchy_creator')::uuid,'youtube'),'13710000-0000-4000-8000-000000000011'::uuid,'explicit reconciliation resolves the official');
select is(public.reconcile_provider_account_hierarchy(current_setting('tests.hierarchy_creator')::uuid,'youtube'),'13710000-0000-4000-8000-000000000011'::uuid,'reconciliation is idempotent');
select is((select external_account_id from public.connected_accounts where id='13710000-0000-4000-8000-000000000001'),'oauth-backup-1','reconciliation preserves OAuth provenance');
select is((select external_account_id from public.connected_accounts where id='13710000-0000-4000-8000-000000000002'),null,'reconciliation preserves manual provenance');

update public.connected_accounts set account_type='backup' where id='13710000-0000-4000-8000-000000000011';
select is((select count(*)::integer from public.connected_accounts where platform='youtube' and account_type='backup' and protected_official_account_id is not null and creator_id=current_setting('tests.hierarchy_creator')::uuid),0,'official-to-backup role change enters a safe no-official state');
update public.connected_accounts set account_type='official' where id='13710000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.connected_accounts where platform='youtube' and account_type='backup' and protected_official_account_id='13710000-0000-4000-8000-000000000002' and creator_id=current_setting('tests.hierarchy_creator')::uuid),2,'backup-to-official role change reparents all remaining backups');
select is((select protected_official_account_id from public.connected_accounts where id='13710000-0000-4000-8000-000000000002'),null,'official can never protect itself');

update public.connected_accounts set connection_health='revoked' where id='13710000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.connected_accounts where platform='youtube' and account_type='backup' and protected_official_account_id is not null and creator_id=current_setting('tests.hierarchy_creator')::uuid),0,'revoking the current official clears active backup parents');
select lives_ok($$insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,connection_health,provider_status)
  values('13710000-0000-4000-8000-000000000012',current_setting('tests.hierarchy_creator')::uuid,'youtube','official','Official C','https://youtube.com/channel/official-c','healthy','ready')$$,
  'inactive official does not block its replacement');
select is((select count(*)::integer from public.connected_accounts where platform='youtube' and account_type='backup' and protected_official_account_id='13710000-0000-4000-8000-000000000012' and creator_id=current_setting('tests.hierarchy_creator')::uuid),2,'replacement after revocation reparents every active backup');

select * from finish();
rollback;
