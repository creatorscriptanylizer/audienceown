begin;
create extension if not exists pgtap with schema extensions;
set local role postgres;
set local search_path=public,extensions;
select plan(14);

select has_function('public','get_creator_recovery_audience_summary',array['uuid','text'],'recovery audience aggregate exists');
select function_privs_are('public','get_creator_recovery_audience_summary',array['uuid','text'],'anon',array[]::text[],'anonymous callers cannot read recovery audience');
select function_privs_are('public','get_creator_recovery_audience_summary',array['uuid','text'],'authenticated',array['EXECUTE'],'authenticated callers can execute recovery audience');
select function_privs_are('public','get_creator_recovery_audience_summary',array['uuid','text'],'service_role',array['EXECUTE'],'service role retains platform-standard execution access');
select is((select proconfig[1] from pg_proc where oid='public.get_creator_recovery_audience_summary(uuid,text)'::regprocedure),'search_path=""'::text,'aggregate search path is empty');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change) values
('00000000-0000-0000-0000-000000000000','9a000000-0000-4000-8000-000000000001','authenticated','authenticated','recovery-contract@example.com',crypt('test-password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
update public.creators set public_slug='recovery-contract' where owner_user_id='9a000000-0000-4000-8000-000000000001';
insert into public.creator_plan_entitlements(creator_id,plan,subscription_status)
select id,'pro','active' from public.creators where owner_user_id='9a000000-0000-4000-8000-000000000001';
insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,is_primary) select v.id,c.id,'instagram',v.role,v.label,v.url,false from public.creators c cross join(values
 ('9a000000-0000-4000-8000-000000000101'::uuid,'backup','Backup One','https://instagram.com/backup-one'),
 ('9a000000-0000-4000-8000-000000000102'::uuid,'backup','Backup Two','https://instagram.com/backup-two'),
 ('9a000000-0000-4000-8000-000000000103'::uuid,'official','Official','https://instagram.com/official'))v(id,role,label,url) where c.owner_user_id='9a000000-0000-4000-8000-000000000001';
insert into public.follower_contacts(id) values('9a000000-0000-4000-8000-000000000201'),('9a000000-0000-4000-8000-000000000202');
insert into public.follower_connections(id,creator_id,follower_contact_id,status,preference_token_hash,unsubscribe_token_hash,source_platform,consent_source) select v.id,c.id,v.contact,'active',v.pref,v.unsub,'direct','creator_recovery_pass' from public.creators c cross join(values
 ('9a000000-0000-4000-8000-000000000301'::uuid,'9a000000-0000-4000-8000-000000000201'::uuid,'rc-pref-1','rc-unsub-1'),
 ('9a000000-0000-4000-8000-000000000302'::uuid,'9a000000-0000-4000-8000-000000000202'::uuid,'rc-pref-2','rc-unsub-2'))v(id,contact,pref,unsub) where c.owner_user_id='9a000000-0000-4000-8000-000000000001';
insert into public.follower_recovery_destination_preferences(creator_id,follower_connection_id,connected_account_id,selected_at) select c.id,v.connection,v.destination,v.selected_at from public.creators c cross join(values
 ('9a000000-0000-4000-8000-000000000301'::uuid,'9a000000-0000-4000-8000-000000000101'::uuid,now()-interval '2 days'),
 ('9a000000-0000-4000-8000-000000000301'::uuid,'9a000000-0000-4000-8000-000000000102'::uuid,now()-interval '1 day'),
 ('9a000000-0000-4000-8000-000000000302'::uuid,'9a000000-0000-4000-8000-000000000101'::uuid,now()))v(connection,destination,selected_at) where c.owner_user_id='9a000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','9a000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((public.get_creator_recovery_audience_summary((select id from public.creators where owner_user_id=auth.uid()),'7d')->>'protectedAudience')::integer,2,'two fans are protected');
select is((public.get_creator_recovery_audience_summary((select id from public.creators where owner_user_id=auth.uid()),'7d')->>'recoveryConnections')::integer,3,'three destination opt-ins are counted');
select is((public.get_creator_recovery_audience_summary((select id from public.creators where owner_user_id=auth.uid()),'7d')->>'recoveryDestinations')::integer,2,'same-provider backup accounts stay distinct');
select is(jsonb_array_length(public.get_creator_recovery_audience_summary((select id from public.creators where owner_user_id=auth.uid()),'7d')#>'{growth,points}'),7,'7d range has seven real calendar points');
select is((public.get_creator_recovery_audience_summary((select id from public.creators where owner_user_id=auth.uid()),'7d')#>>'{growth,historySource}'),'recovery_pass_destination_selected_at','growth identifies Recovery Pass timestamps');
select throws_ok($$select public.get_creator_recovery_audience_summary((select id from public.creators where owner_user_id=auth.uid()),'invalid')$$,'22023','invalid recovery audience range','unknown ranges are rejected');
select throws_ok($$select public.get_creator_recovery_audience_summary('00000000-0000-0000-0000-000000000000','30d')$$,'42501','creator access required','unauthorized creator access is rejected');
set local role postgres;
update public.follower_connections set status='unsubscribed',unsubscribed_at=now() where id='9a000000-0000-4000-8000-000000000302';
set local role authenticated;
select set_config('request.jwt.claim.sub','9a000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((public.get_creator_recovery_audience_summary((select id from public.creators where owner_user_id=auth.uid()),'30d')->>'protectedAudience')::integer,1,'fan opt-out is excluded');
select is((public.get_creator_recovery_audience_summary((select id from public.creators where owner_user_id=auth.uid()),'30d')->>'recoveryConnections')::integer,2,'fan opt-out removes their connections');

select * from finish();
rollback;
