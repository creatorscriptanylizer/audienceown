begin;
create extension if not exists pgtap with schema extensions;
set local role postgres;
set local search_path = public, extensions;
select plan(25);

select has_function('public','get_public_creator_page',array['text'],'canonical public creator page RPC exists');
select function_privs_are('public','get_public_creator_page',array['text'],'anon',array['EXECUTE'],'anon can execute canonical public page RPC');
select function_privs_are('public','get_public_creator_page',array['text'],'authenticated',array['EXECUTE'],'authenticated can execute canonical public page RPC');
select is((select proconfig[1] from pg_proc where oid='public.get_public_creator_page(text)'::regprocedure),'search_path=""'::text,'public page RPC search path is empty');
select table_privs_are('public','creators','anon',array[]::text[],'anon still has no creators table privileges');
select table_privs_are('public','connected_accounts','anon',array[]::text[],'anon still has no connected accounts table privileges');

insert into auth.users(id,email) values
  ('20000000-0000-0000-0000-000000000001','public-page-owner@example.test'),
  ('20000000-0000-0000-0000-000000000002','public-page-approver@example.test');
delete from public.creator_onboarding
where creator_id in (
  select id from public.creators
  where owner_user_id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002')
);
update public.creators set
  id='21000000-0000-0000-0000-000000000001',display_name='Canonical Creator',public_slug='canonical-creator',
  public_bio='Canonical biography',public_profile_enabled=true,recovery_pass_enabled=true,
  announcement_title='Public notice',announcement_body='Canonical announcement',announcement_published_at=now()
where owner_user_id='20000000-0000-0000-0000-000000000001';
update public.creators set
  id='21000000-0000-0000-0000-000000000002',display_name='Private Creator',public_slug='private-creator',
  public_bio='Private biography',public_profile_enabled=false,recovery_pass_enabled=true
where owner_user_id='20000000-0000-0000-0000-000000000002';
insert into public.creator_plan_entitlements(creator_id,plan,subscription_status)
values('21000000-0000-0000-0000-000000000001','pro','active');
select set_config('request.jwt.claim.role','service_role',true);

insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,is_public,position,connection_health)
values
  ('22000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','youtube','official','Public YouTube','https://example.com/youtube',true,2,'healthy'),
  ('22000000-0000-0000-0000-000000000002','21000000-0000-0000-0000-000000000001','website','official','Primary website','https://example.com',true,1,'disconnected'),
  ('22000000-0000-0000-0000-000000000003','21000000-0000-0000-0000-000000000001','instagram','official','Private Instagram','https://example.com/private',false,3,'healthy'),
  ('22000000-0000-0000-0000-000000000004','21000000-0000-0000-0000-000000000001','tiktok','backup','Backup TikTok','https://example.com/backup',true,4,'healthy'),
  ('22000000-0000-0000-0000-000000000005','21000000-0000-0000-0000-000000000001','facebook','official','Revoked Facebook','https://example.com/revoked',true,5,'revoked');

insert into public.creator_updates(id,creator_id,broadcast_type,status,title,subject,content,sent_at,scheduled_for,cancelled_at)
select gen_random_uuid(),'21000000-0000-0000-0000-000000000001','announcement',status,
  case when status='sent'then'Sent control'else status||' update'end,case when status in('queued','sending','sent')then status||' subject'else''end,
  case when status in('queued','sending','sent')then status||' content'else''end,
  case when status='sent'then now()-interval'1 day'else null end,
  case when status='scheduled'then now()+interval'1 day'else null end,
  case when status='cancelled'then now()else null end
from unnest(array['draft','scheduled','queued','sending','sent','cancelled','failed']::public.broadcast_status[]) status;
insert into public.creator_updates(creator_id,broadcast_type,status,title,subject,content,sent_at)
select '21000000-0000-0000-0000-000000000001','announcement','sent','Sent update '||n,'Subject','Content',now()-make_interval(mins=>n)
from generate_series(1,11)n;

insert into public.creator_emergencies(id,creator_id,emergency_type,lifecycle_status,severity,title,message,requested_by,activated_at)
values
  ('23000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','account_hacked','active','critical','Active public emergency','Use the verified replacement.','20000000-0000-0000-0000-000000000001',now()),
  ('23000000-0000-0000-0000-000000000002','21000000-0000-0000-0000-000000000001','account_hacked','resolved','important','Resolved emergency','Resolved.','20000000-0000-0000-0000-000000000001',now());
insert into public.emergency_affected_accounts(emergency_id,creator_id,provider,stable_provider_account_id,display_handle,canonical_profile_url)
values('23000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','youtube','affected-stable-id','@affected','https://example.com/affected');
insert into public.emergency_replacement_accounts(emergency_id,creator_id,provider,stable_provider_account_id,display_handle,canonical_profile_url,verification_state,verified_at,verified_by,official)
values
  ('23000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','youtube','pending-stable-id','@pending','https://example.com/pending','pending',null,null,false),
  ('23000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','youtube','verified-stable-id','@verified','https://example.com/verified','verified',now(),'20000000-0000-0000-0000-000000000002',true);

select isnt(public.get_public_creator_page('canonical-creator'),null,'published creator returns a payload');
select is(public.get_public_creator_page('private-creator'),null,'unpublished creator returns null');
select is(public.get_public_creator_page('missing-creator'),null,'missing creator returns null');
select is(public.get_public_creator_page('INVALID SLUG'),null,'invalid slug returns null');
select is(public.get_public_creator_page('CANONICAL-CREATOR')->'profile'->>'displayName','Canonical Creator','slug lookup is normalized');
select is(public.get_public_creator_page('canonical-creator')->'profile'->>'bio','Canonical biography','profile contains canonical public biography');
select is(jsonb_array_length(public.get_public_creator_page('canonical-creator')->'links'),2,'only public official non-revoked links are returned');
select is(public.get_public_creator_page('canonical-creator')#>>'{links,0,label}','Primary website','links use canonical order');
select ok(not (public.get_public_creator_page('canonical-creator')->'links' @> '[{"label":"Backup TikTok"}]'),'backup links are excluded');
select ok(not (public.get_public_creator_page('canonical-creator')->'links' @> '[{"label":"Revoked Facebook"}]'),'revoked links are excluded');
select is(jsonb_array_length(public.get_public_creator_page('canonical-creator')->'updates'),10,'public updates are limited to ten');
select ok((select bool_and(value->>'title' like 'Sent update %') from jsonb_array_elements(public.get_public_creator_page('canonical-creator')->'updates')),'only sent updates are returned');
select is(public.get_public_creator_page('canonical-creator')#>>'{updates,0,title}','Sent update 1','newest sent update is first');
select is(public.get_public_creator_page('canonical-creator')#>>'{emergency,title}','Active public emergency','only active emergency is returned');
select is(public.get_public_creator_page('canonical-creator')#>>'{emergency,affected,displayHandle}','@affected','safe affected account is returned');
select is(public.get_public_creator_page('canonical-creator')#>>'{emergency,replacement,displayHandle}','@verified','only verified official replacement is returned');
select ok((public.get_public_creator_page('canonical-creator')::text !~* '(creator_id|owner_user_id|email|phone|recipient|delivery|token|authorization|stable_provider_account_id|secret)'),'payload contains no private field names');
select ok((public.get_public_creator_page('canonical-creator')->'profile') ?& array['slug','displayName','bio','profileImagePath','bannerImagePath','recoveryPassEnabled','announcement','createdAt','updatedAt'],'profile allowlist is complete');
select is((select count(*)::integer from jsonb_object_keys(public.get_public_creator_page('canonical-creator')->'profile')),9,'profile exposes only allowlisted keys');

select * from finish();
rollback;
