begin;
select plan(10);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change) values
('00000000-0000-0000-0000-000000000000','9b000000-0000-4000-8000-000000000001','authenticated','authenticated','durable-hierarchy@example.com',crypt('test-password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
update public.creators set public_slug='durable-hierarchy' where owner_user_id='9b000000-0000-4000-8000-000000000001';
insert into public.creator_plan_entitlements(creator_id,plan,subscription_status) select id,'pro','active' from public.creators where owner_user_id='9b000000-0000-4000-8000-000000000001';
select set_config('tests.durable_creator',(select id::text from public.creators where owner_user_id='9b000000-0000-4000-8000-000000000001'),true);

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,is_primary,connection_health,provider_status) values
('9b000000-0000-4000-8000-000000000101',current_setting('tests.durable_creator')::uuid,'youtube','official','Old Main','https://youtube.com/@old-main',true,'healthy','ready'),
('9b000000-0000-4000-8000-000000000102',current_setting('tests.durable_creator')::uuid,'instagram','backup','Instagram Backup','https://instagram.com/backup',false,'healthy','ready'),
('9b000000-0000-4000-8000-000000000103',current_setting('tests.durable_creator')::uuid,'discord','backup','Discord Backup','https://discord.com/channels/1/2',false,'healthy','ready'),
('9b000000-0000-4000-8000-000000000104',current_setting('tests.durable_creator')::uuid,'tiktok','backup','TikTok Backup','https://tiktok.com/@backup',false,'healthy','ready');
insert into public.follower_contacts(id) values('9b000000-0000-4000-8000-000000000201');
insert into public.follower_connections(id,creator_id,follower_contact_id,status,preference_token_hash,unsubscribe_token_hash,source_platform,consent_source) values
('9b000000-0000-4000-8000-000000000301',current_setting('tests.durable_creator')::uuid,'9b000000-0000-4000-8000-000000000201','active','durable-pref','durable-unsub','direct','creator_recovery_pass');
insert into public.follower_recovery_destination_preferences(id,creator_id,follower_connection_id,connected_account_id,selected_at) values
('9b000000-0000-4000-8000-000000000401',current_setting('tests.durable_creator')::uuid,'9b000000-0000-4000-8000-000000000301','9b000000-0000-4000-8000-000000000102','2026-08-01T00:00:00Z');

delete from public.connected_accounts where id='9b000000-0000-4000-8000-000000000101';
select is((select count(*)::integer from public.connected_accounts where creator_id=current_setting('tests.durable_creator')::uuid and account_type='backup'),3,'all Backups survive Main deletion');
select is((select count(*)::integer from public.connected_accounts where creator_id=current_setting('tests.durable_creator')::uuid and account_type='official'),0,'creator may temporarily have no Main');
select is((select count(*)::integer from public.follower_recovery_destination_preferences where creator_id=current_setting('tests.durable_creator')::uuid),1,'Main deletion preserves destination preferences');
select is((select count(*)::integer from public.connected_accounts where id in('9b000000-0000-4000-8000-000000000102','9b000000-0000-4000-8000-000000000103','9b000000-0000-4000-8000-000000000104') and account_type='backup'),3,'Backup IDs and roles are unchanged');

insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,is_primary,connection_health,provider_status) values
('9b000000-0000-4000-8000-000000000105',current_setting('tests.durable_creator')::uuid,'x','official','New Main','https://x.com/new-main',true,'healthy','ready');
select is((select count(*)::integer from public.connected_accounts where creator_id=current_setting('tests.durable_creator')::uuid and account_type='backup'),3,'cross-provider Main replacement preserves Backups');
select is((select count(*)::integer from public.connected_accounts where creator_id=current_setting('tests.durable_creator')::uuid and account_type='backup' and is_primary),0,'no Backup is auto-promoted');
select is((select count(*)::integer from public.follower_recovery_destination_preferences where id='9b000000-0000-4000-8000-000000000401' and selected_at='2026-08-01T00:00:00Z'),1,'Main replacement does not rewrite attribution history');

set local role authenticated;
select set_config('request.jwt.claim.sub','9b000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((public.get_creator_recovery_audience_summary(current_setting('tests.durable_creator')::uuid,'all')->>'protectedAudience')::integer,1,'Protected Audience survives Main replacement');
select is((public.get_creator_recovery_audience_summary(current_setting('tests.durable_creator')::uuid,'all')->>'recoveryConnections')::integer,1,'Recovery Connections survive Main replacement');
select is((public.get_creator_recovery_audience_summary(current_setting('tests.durable_creator')::uuid,'all')#>>'{growth,points,0,date}'),'2026-08-01','Recovery growth retains its original timestamp');

select * from finish();
rollback;
