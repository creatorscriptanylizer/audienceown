begin;
select plan(19);

select has_table('public','platform_connection_secrets','OAuth secret table exists');
select has_table('public','social_detection_events','detection event table exists');
select has_table('public','imported_social_content','imported content table exists');
select has_table('public','creator_activity','creator activity table exists');
select ok((select relrowsecurity from pg_class where oid='public.social_detection_events'::regclass),'detection RLS enabled');
select ok((select relforcerowsecurity from pg_class where oid='public.platform_connection_secrets'::regclass),'secret RLS forced');
select table_privs_are('public','platform_connection_secrets','authenticated',array[]::text[],'browser role has no secret privileges');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
 raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
values
('00000000-0000-0000-0000-000000000000','c4000000-0000-4000-8000-000000000001','authenticated','authenticated','social-a@example.com',crypt('pw',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','c4000000-0000-4000-8000-000000000002','authenticated','authenticated','social-b@example.com',crypt('pw',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
update public.creators set public_slug='social-a' where owner_user_id='c4000000-0000-4000-8000-000000000001';
update public.creators set public_slug='social-b' where owner_user_id='c4000000-0000-4000-8000-000000000002';
select set_config('tests.social_a',(select id::text from public.creators where public_slug='social-a'),true);
select set_config('tests.social_b',(select id::text from public.creators where public_slug='social-b'),true);

insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,is_primary,is_public,
 watch_enabled,external_account_id,external_account_name,provider_metadata,connection_health)
values
('c4100000-0000-4000-8000-000000000001',current_setting('tests.social_a')::uuid,'youtube','official','Channel A','https://youtube.com/channel/a',true,true,true,'channel-a','Channel A','{"uploads_playlist_id":"uploads-a"}','healthy'),
('c4100000-0000-4000-8000-000000000002',current_setting('tests.social_b')::uuid,'youtube','official','Channel B','https://youtube.com/channel/b',true,true,true,'channel-b','Channel B','{"uploads_playlist_id":"uploads-b"}','healthy');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
create temporary table first_ingest as select public.ingest_youtube_detection(
 'c4100000-0000-4000-8000-000000000001','video-1','video','published',
 '{"title":"First video","canonical_url":"https://youtube.com/watch?v=video-1"}',now()-interval '1 minute') result;
create temporary table repeat_ingest as select public.ingest_youtube_detection(
 'c4100000-0000-4000-8000-000000000001','video-1','video','published',
 '{"title":"First video"}',now()-interval '1 minute') result;
select is((select result->>'inserted' from first_ingest),'true','first detection inserts');
select is((select result->>'inserted' from repeat_ingest),'false','repeat detection deduplicates');
select is((select count(*)::integer from public.social_detection_events where external_object_id='video-1'),1,'database stores one detection');
create temporary table draft_result as select public.create_youtube_draft(
 (select (result->>'event_id')::uuid from first_ingest)) result;
select is((select result->>'created' from draft_result),'true','detection creates draft');
select is((select count(*)::integer from public.creator_updates where source_external_id='video-1'),1,'one normal update is linked');
select is((select count(*)::integer from public.imported_social_content where creator_update_id=(select (result->>'update_id')::uuid from draft_result)),1,'import links draft');
select is((select count(*)::integer from public.creator_activity where activity_type='social_draft_generated'),1,'creator activity is generated');
select is((select status::text from public.creator_updates where source_external_id='video-1'),'draft','approval is required by default');
select is((select auto_send from public.connected_accounts where id='c4100000-0000-4000-8000-000000000001'),false,'auto-send defaults off');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','c4000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((select count(*)::integer from public.social_detection_events),1,'owner reads own detection only');
select is(((public.get_youtube_automation_analytics()->>'generated_drafts')::integer),1,'analytics reports generated draft');
select throws_ok($$select * from public.platform_connection_secrets$$,'42501',null,'creator cannot read OAuth secrets');

select * from finish();
rollback;
