begin;
select plan(33);
select has_table('public','creator_ai_settings','creator AI settings exist');
select has_table('public','ai_draft_enhancement_jobs','AI jobs exist');
select has_table('public','ai_draft_variants','AI variants exist');
select has_table('public','ai_usage_events','AI usage exists');
select has_column('public','creator_updates','content_revision','draft revisions are tracked');
select ok((select relforcerowsecurity from pg_class where oid='public.ai_usage_events'::regclass),'usage RLS forced');
select table_privs_are('public','ai_usage_events','anon',array[]::text[],'anonymous users cannot read usage');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,
created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change) values
('00000000-0000-0000-0000-000000000000','e4000000-0000-4000-8000-000000000001','authenticated','authenticated','ai-a@example.com',crypt('pw',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','e4000000-0000-4000-8000-000000000002','authenticated','authenticated','ai-b@example.com',crypt('pw',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
update public.creators set public_slug='ai-owner-a' where owner_user_id='e4000000-0000-4000-8000-000000000001';
update public.creators set public_slug='ai-owner-b' where owner_user_id='e4000000-0000-4000-8000-000000000002';
select set_config('tests.ai_a',(select id::text from public.creators where public_slug='ai-owner-a'),true);
select set_config('tests.ai_b',(select id::text from public.creators where public_slug='ai-owner-b'),true);
insert into public.creator_ai_settings(creator_id,enabled,monthly_generation_limit,monthly_budget_minor_units)
values(current_setting('tests.ai_a')::uuid,true,10,1000),(current_setting('tests.ai_b')::uuid,true,10,1000);
insert into public.creator_updates(id,creator_id,broadcast_type,broadcast_intent,title,subject,content,source_provider,source_external_id,
source_published_at,source_metadata,deterministic_title,deterministic_content)
values('e4100000-0000-4000-8000-000000000001',current_setting('tests.ai_a')::uuid,'new_content','new_video','Original','Original','Original body',
'youtube','video-ai',now(),'{"title":"Source","canonical_url":"https://youtube.com/watch?v=video-ai"}','Original','Original body');
select is((select count(*)::integer from public.ai_draft_enhancement_jobs where creator_update_id='e4100000-0000-4000-8000-000000000001'),1,'social draft auto-enqueues one job');
select is((select status from public.ai_draft_enhancement_jobs where creator_update_id='e4100000-0000-4000-8000-000000000001'),'pending','job begins pending');

set local role authenticated;select set_config('request.jwt.claim.sub','e4000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((select count(*)::integer from public.creator_ai_settings),1,'creator reads only own AI settings');
do $$declare affected integer;begin
  update public.creator_ai_settings set tone='energetic' where creator_id=current_setting('tests.ai_b')::uuid;
  get diagnostics affected=row_count;
  perform set_config('tests.unauthorized_ai_updates',affected::text,true);
end$$;
select is(current_setting('tests.unauthorized_ai_updates')::integer,0,'creator cannot update another AI profile');
create temporary table repeated as select public.enqueue_ai_draft_enhancement('e4100000-0000-4000-8000-000000000001','social-draft-v1',array['standard'],false) result;
select is((select count(*)::integer from public.ai_draft_enhancement_jobs where creator_update_id='e4100000-0000-4000-8000-000000000001'),1,'enqueue is idempotent');
select is((select result->>'status' from repeated),'pending','repeat enqueue returns active job');

reset role;set local role service_role;select set_config('request.jwt.claim.role','service_role',true);
create temporary table claimed as select * from public.claim_ai_draft_enhancement_jobs(5,120,'e4200000-0000-4000-8000-000000000001');
select is((select count(*)::integer from claimed),1,'worker claims one job');
select is((select status from claimed),'processing','claim transitions to processing');
select ok((select lease_expires_at>now() from claimed),'claim receives lease');
select is((select attempt_count from claimed),1,'claim increments attempt count');
create temporary table completed as select public.complete_ai_draft_enhancement((select id from claimed),
'e4200000-0000-4000-8000-000000000001','openai','test-model',
'[{"variantType":"standard","title":"Enhanced","body":"Enhanced body","callToAction":"Watch","sourceUrl":"https://youtube.com/watch?v=video-ai"}]'::jsonb,10,20,1) result;
select is((select result->>'applied' from completed),'true','eligible result applies');
select is((select title from public.creator_updates where id='e4100000-0000-4000-8000-000000000001'),'Enhanced','selected variant updates canonical draft');
select is((select count(*)::integer from public.ai_draft_variants),1,'one generated variant stored');
select is((select count(*)::integer from public.ai_usage_events),1,'usage charged once');
select lives_ok($$select public.complete_ai_draft_enhancement((select id from claimed),'e4200000-0000-4000-8000-000000000001',
'openai','test-model','[]'::jsonb,10,20,1)$$,'completion is idempotent');
select is((select count(*)::integer from public.ai_usage_events),1,'repeat completion does not duplicate usage');
select throws_ok($$insert into public.ai_draft_variants(creator_id,creator_update_id,enhancement_job_id,variant_type,title,body,provider,model,prompt_version)
select creator_id,creator_update_id,id,'standard','Duplicate','Duplicate','openai','test','social-draft-v1' from public.ai_draft_enhancement_jobs limit 1$$,
'23505',null,'variant type is unique per job');
select lives_ok($$select public.enqueue_ai_draft_enhancement('e4100000-0000-4000-8000-000000000001','social-draft-v1',array['standard'],false)$$,
'a completed prompt may be intentionally regenerated');
create temporary table stale_claim as select * from public.claim_ai_draft_enhancement_jobs(5,120,'e4200000-0000-4000-8000-000000000002');
select is((select count(*)::integer from stale_claim),1,'regeneration job is claimed');
reset role;set local role authenticated;select set_config('request.jwt.claim.sub','e4000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
update public.creator_updates set content='Creator manual edit' where id='e4100000-0000-4000-8000-000000000001';
reset role;set local role service_role;select set_config('request.jwt.claim.role','service_role',true);
create temporary table stale_complete as select public.complete_ai_draft_enhancement((select id from stale_claim),
'e4200000-0000-4000-8000-000000000002','openai','test-model',
'[{"variantType":"standard","title":"Late AI","body":"Late AI body","callToAction":"Watch","sourceUrl":"https://youtube.com/watch?v=video-ai"}]'::jsonb,10,20,1) result;
select is((select result->>'stale' from stale_complete),'true','manual revision makes late result stale');
select is((select content from public.creator_updates where id='e4100000-0000-4000-8000-000000000001'),'Creator manual edit','late AI never overwrites manual edit');

reset role;set local role authenticated;select set_config('request.jwt.claim.sub','e4000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is(((public.get_ai_usage_summary()->>'estimated_cost_minor_units')::integer),2,'usage summary aggregates estimated cost');
select throws_ok($$select public.select_ai_draft_variant('e4100000-0000-4000-8000-000000000001',gen_random_uuid())$$,
'P0002','variant not found','unknown variant is rejected');
update public.creator_ai_settings set monthly_generation_limit=1 where creator_id=current_setting('tests.ai_a')::uuid;
insert into public.creator_updates(id,creator_id,broadcast_type,broadcast_intent,title,subject,content)
values('e4100000-0000-4000-8000-000000000002',current_setting('tests.ai_a')::uuid,'new_content','new_video','Second','Second','Second');
select is((public.enqueue_ai_draft_enhancement('e4100000-0000-4000-8000-000000000002','social-draft-v1',array['standard'],false)->>'reason'),
'monthly_limit_reached','monthly generation limit is enforced');
update public.creator_ai_settings set monthly_generation_limit=10,monthly_budget_minor_units=1 where creator_id=current_setting('tests.ai_a')::uuid;
select is((public.enqueue_ai_draft_enhancement('e4100000-0000-4000-8000-000000000002','social-draft-v1',array['standard'],false)->>'reason'),
'monthly_budget_reached','monthly budget is enforced');
select is((select count(*)::integer from public.ai_usage_events),2,'creator sees only own usage records');
select * from finish();rollback;
