begin;select plan(31);
select has_table('public','provider_audience_metrics','metric table exists');
select has_table('public','provider_audience_metric_snapshots','snapshot table exists');
select ok((select relforcerowsecurity from pg_class where oid='public.provider_audience_metrics'::regclass),'metric RLS forced');
select ok((select relforcerowsecurity from pg_class where oid='public.provider_audience_metric_snapshots'::regclass),'snapshot RLS forced');
select table_privs_are('public','provider_audience_metrics','authenticated',array['SELECT'],'creators cannot mutate metrics');
select table_privs_are('public','provider_audience_metric_snapshots','authenticated',array['SELECT'],'creators cannot mutate snapshots');
select col_has_check('public','provider_audience_metrics','audience_count','negative counts constrained');
select col_has_check('public','provider_audience_metrics','audience_unit','units constrained');
select has_function('public','claim_provider_audience_metrics',array['integer','uuid'],'bounded claim exists');
select has_function('public','upsert_provider_audience_metric',array['uuid','uuid','uuid','text','text','bigint','text','text','boolean','timestamp with time zone','timestamp with time zone','text'],'generic upsert exists');
select has_function('public','append_provider_audience_snapshot',array['uuid'],'snapshot append exists');
select has_function('public','get_creator_platform_audience_metrics',array[]::text[],'creator-safe aggregate exists');
select is((select count(*)::integer from information_schema.columns where table_schema='public'and table_name in('provider_audience_metrics','provider_audience_metric_snapshots')and column_name in('email','phone','username','handle','token','stable_provider_id')),0,'no follower identity or credential columns');
select is((select count(*)::integer from information_schema.columns where table_schema='public'and table_name='provider_audience_metrics'and column_name='audience_count'),1,'one aggregate count only');
select is((select count(*)::integer from information_schema.columns where table_schema='public'and table_name='provider_audience_metrics'and column_name='approximate'),1,'approximation preserved');
select is((select proconfig[1] from pg_proc where oid='public.claim_provider_audience_metrics(integer,uuid)'::regprocedure),'search_path=""'::text,'claim search path empty');
select is((select proconfig[1] from pg_proc where oid='public.upsert_provider_audience_metric(uuid,uuid,uuid,text,text,bigint,text,text,boolean,timestamptz,timestamptz,text)'::regprocedure),'search_path=""'::text,'upsert search path empty');
select is((select count(*)::integer from information_schema.columns where table_schema='public'and table_name='provider_audience_metrics'and column_name like'%trust%'),0,'metrics do not mutate trust');
select is((select count(*)::integer from information_schema.columns where table_schema='public'and table_name='provider_audience_metrics'and column_name like'%emergency%'),0,'metrics do not activate emergencies');
select has_table('public','follower_recovery_destination_preferences','canonical destination preference relationship exists');
select ok((select relforcerowsecurity from pg_class where oid='public.follower_recovery_destination_preferences'::regclass),'destination preferences force RLS');
select table_privs_are('public','follower_recovery_destination_preferences','authenticated',array['SELECT'],'creators cannot fabricate destination opt-ins');
select has_function('public','get_creator_recovery_destination_breakdown',array[]::text[],'safe destination aggregate exists');
select has_function('public','get_creator_protected_fan_count',array[]::text[],'deduplicated protected fan aggregate exists');
select is((select count(*)::integer from information_schema.columns where table_schema='public'and table_name='follower_recovery_destination_preferences'and column_name in('email','phone','name','provider_stable_id','token')),0,'destination preferences contain no fan PII or stable provider IDs');
select is((select proconfig[1] from pg_proc where oid='public.get_creator_recovery_destination_breakdown()'::regprocedure),'search_path=""'::text,'destination aggregate search path empty');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change) values
('00000000-0000-0000-0000-000000000000','98000000-0000-4000-8000-000000000001','authenticated','authenticated','destination-owner@example.com',crypt('test-password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
update public.creators set public_slug='destination-owner' where owner_user_id='98000000-0000-4000-8000-000000000001';
insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,is_primary) select '98000000-0000-4000-8000-000000000101',id,'tiktok','backup','TikTok Backup','https://tiktok.com/@backup',false from public.creators where owner_user_id='98000000-0000-4000-8000-000000000001';
insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,is_primary) select '98000000-0000-4000-8000-000000000102',id,'youtube','backup','YouTube Backup','https://youtube.com/@backup',false from public.creators where owner_user_id='98000000-0000-4000-8000-000000000001';
insert into public.follower_contacts(id) values('98000000-0000-4000-8000-000000000201'),('98000000-0000-4000-8000-000000000202'),('98000000-0000-4000-8000-000000000203');
insert into public.follower_connections(id,creator_id,follower_contact_id,status,preference_token_hash,unsubscribe_token_hash,source_platform,consent_source) select v.connection_id,c.id,v.contact_id,'active',v.preference_token,v.unsubscribe_token,'direct','recovery_pass' from public.creators c cross join(values
 ('98000000-0000-4000-8000-000000000301'::uuid,'98000000-0000-4000-8000-000000000201'::uuid,'pref-1','unsub-1'),
 ('98000000-0000-4000-8000-000000000302'::uuid,'98000000-0000-4000-8000-000000000202'::uuid,'pref-2','unsub-2'),
 ('98000000-0000-4000-8000-000000000303'::uuid,'98000000-0000-4000-8000-000000000203'::uuid,'pref-3','unsub-3'))v(connection_id,contact_id,preference_token,unsubscribe_token) where c.owner_user_id='98000000-0000-4000-8000-000000000001';
insert into public.follower_recovery_destination_preferences(creator_id,follower_connection_id,connected_account_id) select c.id,v.connection_id,v.destination_id from public.creators c cross join(values
 ('98000000-0000-4000-8000-000000000301'::uuid,'98000000-0000-4000-8000-000000000101'::uuid),
 ('98000000-0000-4000-8000-000000000301'::uuid,'98000000-0000-4000-8000-000000000102'::uuid),
 ('98000000-0000-4000-8000-000000000302'::uuid,'98000000-0000-4000-8000-000000000101'::uuid),
 ('98000000-0000-4000-8000-000000000303'::uuid,'98000000-0000-4000-8000-000000000102'::uuid))v(connection_id,destination_id) where c.owner_user_id='98000000-0000-4000-8000-000000000001';
set local role authenticated;select set_config('request.jwt.claim.sub','98000000-0000-4000-8000-000000000001',true);select set_config('request.jwt.claim.role','authenticated',true);
select is(public.get_creator_protected_fan_count()::integer,3,'global Protected Fans deduplicates destination overlap');
select is((select opted_in_fan_count::integer from public.get_creator_recovery_destination_breakdown() where provider='tiktok'),2,'TikTok destination counts two unique fans');
select is((select opted_in_fan_count::integer from public.get_creator_recovery_destination_breakdown() where provider='youtube'),2,'YouTube destination counts two unique fans');
select is((select min(coverage_percent) from public.get_creator_recovery_destination_breakdown()),66.7::numeric,'coverage uses the deduplicated global denominator');
select ok((select sum(coverage_percent)>100 from public.get_creator_recovery_destination_breakdown()),'overlapping destination coverage may exceed 100 percent');
select * from finish();rollback;
