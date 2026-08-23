begin;
select plan(17);

select has_table('public','creator_update_publishing_accounts','publishing targets are normalized');
select has_table('public','follower_connection_account_memberships','specific Main-account membership is normalized');
select col_is_null('public','creator_update_publishing_accounts','connected_account_id','detached accounts retain historical snapshots');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.creator_update_publishing_accounts'::regclass),'publishing targets force RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.follower_connection_account_memberships'::regclass),'memberships force RLS');

insert into auth.users(id,email,raw_user_meta_data) values
('17100000-0000-4000-8000-000000000001','targets-a@example.com','{}'),
('17100000-0000-4000-8000-000000000002','targets-b@example.com','{}');
select set_config('tests.creator_a',(select id::text from public.creators where owner_user_id='17100000-0000-4000-8000-000000000001'),true);
select set_config('tests.creator_b',(select id::text from public.creators where owner_user_id='17100000-0000-4000-8000-000000000002'),true);
insert into public.creator_plan_entitlements(creator_id,plan,subscription_status,source) values
(current_setting('tests.creator_a')::uuid,'pro','active','billing_provider'),
(current_setting('tests.creator_b')::uuid,'pro','active','billing_provider');

insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,is_primary,is_public,position,connection_health,provider_status) values
('17110000-0000-4000-8000-000000000001',current_setting('tests.creator_a')::uuid,'youtube','official','Main YouTube','https://youtube.com/@main',true,true,0,'healthy','ready'),
('17110000-0000-4000-8000-000000000002',current_setting('tests.creator_a')::uuid,'tiktok','official','Main TikTok','https://tiktok.com/@main',false,true,1,'healthy','ready'),
('17110000-0000-4000-8000-000000000003',current_setting('tests.creator_a')::uuid,'youtube','backup','Recovery YouTube','https://youtube.com/@recovery',false,true,2,'healthy','ready'),
('17110000-0000-4000-8000-000000000004',current_setting('tests.creator_b')::uuid,'youtube','official','Foreign','https://youtube.com/@foreign',true,true,0,'healthy','ready');

insert into public.creator_updates(id,creator_id,broadcast_type,broadcast_intent,title,subject,content) values
('17120000-0000-4000-8000-000000000001',current_setting('tests.creator_a')::uuid,'new_content','new_video','Video','Video','Message');

insert into public.creator_update_publishing_accounts(update_id,connected_account_id,connected_account_reference,role_snapshot,targeting_rule_snapshot,provider_snapshot,account_display_snapshot) values
('17120000-0000-4000-8000-000000000001','17110000-0000-4000-8000-000000000001','17110000-0000-4000-8000-000000000001','main','account_followers','youtube','Main YouTube'),
('17120000-0000-4000-8000-000000000001','17110000-0000-4000-8000-000000000002','17110000-0000-4000-8000-000000000002','main','account_followers','tiktok','Main TikTok'),
('17120000-0000-4000-8000-000000000001','17110000-0000-4000-8000-000000000003','17110000-0000-4000-8000-000000000003','recovery','video_opt_ins','youtube','Recovery YouTube');

select is((select count(*)::integer from public.creator_update_publishing_accounts where update_id='17120000-0000-4000-8000-000000000001'),3,'draft persists all selected accounts');
select throws_ok($$insert into public.creator_update_publishing_accounts(update_id,connected_account_id,connected_account_reference,role_snapshot,targeting_rule_snapshot,provider_snapshot,account_display_snapshot) values('17120000-0000-4000-8000-000000000001','17110000-0000-4000-8000-000000000004','17110000-0000-4000-8000-000000000004','main','account_followers','youtube','Foreign')$$,'23514',null,'foreign account is rejected');
select throws_ok($$insert into public.creator_update_publishing_accounts(update_id,connected_account_id,connected_account_reference,role_snapshot,targeting_rule_snapshot,provider_snapshot,account_display_snapshot) values('17120000-0000-4000-8000-000000000001','17110000-0000-4000-8000-000000000003','17110000-0000-4000-8000-000000000003','main','account_followers','youtube','Wrong')$$,'23514',null,'browser role claims are rejected');
select is((select targeting_rule_snapshot from public.creator_update_publishing_accounts where connected_account_reference='17110000-0000-4000-8000-000000000003'),'video_opt_ins','Recovery rule is auditable');

update public.connected_accounts set label='Renamed Main' where id='17110000-0000-4000-8000-000000000001';
select is((select account_display_snapshot from public.creator_update_publishing_accounts where connected_account_reference='17110000-0000-4000-8000-000000000001'),'Main YouTube','draft history does not silently change after rename');

set local role authenticated;
select set_config('request.jwt.claim.sub','17100000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((select count(*)::integer from public.creator_update_publishing_accounts),3,'owner can read own publishing targets');
select throws_ok($$update public.creator_update_publishing_accounts set role_snapshot='recovery'$$,'42501',null,'creator cannot rewrite canonical snapshots');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','17100000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((select count(*)::integer from public.creator_update_publishing_accounts),0,'foreign creator cannot read publishing targets');
select lives_ok($$delete from public.creator_update_publishing_accounts where update_id='17120000-0000-4000-8000-000000000001'$$,'foreign delete is safely filtered to zero rows');
reset role;

select has_trigger('public','update_deliveries','enforce_new_video_publishing_target','delivery insertion has a server-side target guard');
select has_trigger('public','creator_updates','refresh_update_publishing_snapshots','send refreshes account snapshots transactionally');
select has_function('public','enforce_new_video_publishing_target',array[]::text[],'authoritative delivery guard exists');

select * from finish();
rollback;
