begin;
select plan(24);
select has_function('public','claim_social_connections',array['integer','integer','uuid'],'generic claim RPC exists');
select has_function('public','ingest_social_detection',array['uuid','text','text','text','text','text','jsonb','timestamp with time zone','text'],'generic ingestion RPC exists');
select has_function('public','create_social_draft',array['uuid'],'generic draft RPC exists');
select has_table('public','social_webhook_receipts','webhook receipt table exists');
select ok((select relforcerowsecurity from pg_class where oid='public.social_webhook_receipts'::regclass),'webhook receipt RLS forced');
select table_privs_are('public','platform_connection_secrets','authenticated',array[]::text[],'token secrets remain isolated');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,
created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change) values
('00000000-0000-0000-0000-000000000000','d4000000-0000-4000-8000-000000000001','authenticated','authenticated',
'multi@example.com',crypt('pw',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
update public.creators set public_slug='multi-owner' where owner_user_id='d4000000-0000-4000-8000-000000000001';
select set_config('tests.multi',(select id::text from public.creators where public_slug='multi-owner'),true);
insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,is_primary,is_public,watch_enabled,
external_account_id,external_account_name,external_account_url,provider_metadata,connection_health,provider_status,next_sync_at)
values('d4100000-0000-4000-8000-000000000001',current_setting('tests.multi')::uuid,'spotify','official','Artist',
'https://open.spotify.com/artist/a',true,true,true,'artist-a','Artist','https://open.spotify.com/artist/a','{}','healthy','ready',now()-interval '1 minute');

set local role service_role;select set_config('request.jwt.claim.role','service_role',true);
create temporary table claims as select * from public.claim_social_connections(10,120,'d4200000-0000-4000-8000-000000000001');
select is((select count(*)::integer from claims),1,'generic claim leases eligible provider');
select is((select lease_owner from public.connected_accounts where id='d4100000-0000-4000-8000-000000000001'),'d4200000-0000-4000-8000-000000000001'::uuid,'lease owner persists');
select ok((select lease_expires_at>now() from public.connected_accounts where id='d4100000-0000-4000-8000-000000000001'),'lease expiry persists');
create temporary table ingest as select public.ingest_social_detection('d4100000-0000-4000-8000-000000000001','spotify',
'release-a','event-a','audio_release','published','{"title":"New album","canonical_url":"https://open.spotify.com/album/a"}',now(),'polling') result;
select is((select result->>'inserted' from ingest),'true','generic provider event ingests');
create temporary table duplicate as select public.ingest_social_detection('d4100000-0000-4000-8000-000000000001','spotify',
'release-a','event-a','audio_release','published','{"title":"New album","canonical_url":"https://open.spotify.com/album/a"}',now(),'polling') result;
select is((select result->>'inserted' from duplicate),'false','generic event deduplicates');
select throws_ok($$select public.ingest_social_detection('d4100000-0000-4000-8000-000000000001','unknown','x','e','post','published','{"canonical_url":"https://example.com"}',now(),'polling')$$,
'P0002','social connection not found','unregistered provider cannot ingest');
select throws_ok($$select public.ingest_social_detection('d4100000-0000-4000-8000-000000000001','spotify','','e','audio_release','published','{"canonical_url":"https://open.spotify.com/x"}',now(),'polling')$$,
'22023','malformed social object','missing external ID is rejected');
select throws_ok($$select public.ingest_social_detection('d4100000-0000-4000-8000-000000000001','spotify','x','e','audio_release','published','{"canonical_url":"https://open.spotify.com/x"}',null,'polling')$$,
'22023','malformed social object','missing timestamp is rejected');
create temporary table draft as select public.create_social_draft((select(result->>'event_id')::uuid from ingest)) result;
select is((select result->>'created' from draft),'true','generic draft is created');
select is((select source_provider from public.creator_updates where id=(select(result->>'update_id')::uuid from draft)),'spotify','draft records provider');
select is((select status::text from public.creator_updates where id=(select(result->>'update_id')::uuid from draft)),'draft','approval remains required');
select is((select count(*)::integer from public.imported_social_content where creator_update_id=(select(result->>'update_id')::uuid from draft)),1,'draft linkage persists');
select lives_ok($$select public.mark_social_connection_healthy('d4100000-0000-4000-8000-000000000001','release-a',now()+interval '5 minutes')$$,'healthy transition works');
select is((select connection_health from public.connected_accounts where id='d4100000-0000-4000-8000-000000000001'),'healthy','healthy state stored');
select lives_ok($$insert into public.social_webhook_receipts(provider,provider_event_id,signature_verified,event_timestamp,payload_digest)
values('twitch','evt-1',true,now(),'digest')$$,'verified webhook receipt persists');
select throws_ok($$insert into public.social_webhook_receipts(provider,provider_event_id,signature_verified,event_timestamp,payload_digest)
values('twitch','evt-1',true,now(),'digest')$$,'23505',null,'webhook event deduplicates');
reset role;set local role authenticated;select set_config('request.jwt.claim.sub','d4000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is(((public.get_social_automation_analytics('spotify')->>'detections')::integer),1,'provider analytics are creator scoped');
select throws_ok($$select * from public.social_webhook_receipts$$,'42501',null,'webhook receipts are not browser readable');
select * from finish();rollback;
