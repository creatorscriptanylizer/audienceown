begin;
select plan(19);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,recovery_token,email_change_token_new,email_change
) values
('00000000-0000-0000-0000-000000000000','ba000000-0000-4000-8000-000000000001','authenticated','authenticated','studio-a@example.com',crypt('pw',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','ba000000-0000-4000-8000-000000000002','authenticated','authenticated','studio-b@example.com',crypt('pw',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');

update public.creators set public_slug='studio-a',display_name='Studio A' where owner_user_id='ba000000-0000-4000-8000-000000000001';
update public.creators set public_slug='studio-b',display_name='Studio B' where owner_user_id='ba000000-0000-4000-8000-000000000002';
select set_config('tests.studio_a',(select id::text from public.creators where public_slug='studio-a'),true);
select set_config('tests.studio_b',(select id::text from public.creators where public_slug='studio-b'),true);

insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,is_primary,is_public,position) values
('ba100000-0000-4000-8000-000000000001',current_setting('tests.studio_a')::uuid,'instagram','official','@studioa','https://instagram.com/studioa',true,true,0),
('ba100000-0000-4000-8000-000000000002',current_setting('tests.studio_a')::uuid,'instagram','backup','@studioabackup','https://instagram.com/studioabackup',false,true,1),
('ba100000-0000-4000-8000-000000000003',current_setting('tests.studio_b')::uuid,'youtube','official','Studio B','https://youtube.com/@studiob',true,true,0);

select throws_ok(
  $$insert into public.creator_updates(creator_id,broadcast_type,broadcast_intent,title,subject,preview_text,content)
    values(current_setting('tests.studio_a')::uuid,'account_update','account_hacked','','','','')$$,
  '23514', null, 'emergency requires an affected platform'
);
select throws_ok(
  $$insert into public.creator_updates(creator_id,broadcast_type,broadcast_intent,affected_platform_connection_id,title,subject,preview_text,content)
    values(current_setting('tests.studio_a')::uuid,'account_update','account_hacked','ba100000-0000-4000-8000-000000000003','','','','')$$,
  '23514', null, 'another creator platform is rejected'
);
select throws_ok(
  $$insert into public.creator_updates(creator_id,broadcast_type,broadcast_intent,affected_platform_connection_id,title,subject,preview_text,content)
    values(current_setting('tests.studio_a')::uuid,'account_update','account_hacked','ba100000-0000-4000-8000-000000000002','','','','')$$,
  '23514', null, 'backup cannot be selected as affected official account'
);
select throws_ok(
  $$insert into public.creator_updates(creator_id,broadcast_type,broadcast_intent,affected_platform_connection_id,title,subject,preview_text,content)
    values(current_setting('tests.studio_a')::uuid,'announcement','account_hacked','ba100000-0000-4000-8000-000000000001','','','','')$$,
  '23514', null, 'emergency cannot be downgraded to announcement'
);
select lives_ok(
  $$insert into public.creator_updates(id,creator_id,broadcast_type,broadcast_intent,affected_platform_connection_id,title,subject,preview_text,content)
    values('ba200000-0000-4000-8000-000000000001',current_setting('tests.studio_a')::uuid,'account_update','account_hacked','ba100000-0000-4000-8000-000000000001','Alert','Subject','','Message')$$,
  'creator may target own official platform'
);
select is((select broadcast_type::text from public.creator_updates where id='ba200000-0000-4000-8000-000000000001'),'account_update','emergency remains an account update');
select lives_ok(
  $$insert into public.creator_updates(id,creator_id,broadcast_type,broadcast_intent,title,subject,preview_text,content)
    values('ba200000-0000-4000-8000-000000000002',current_setting('tests.studio_a')::uuid,'announcement','general_announcement','Note','Subject','','Message')$$,
  'regular category broadcast is accepted'
);
select has_column('public','creator_updates','broadcast_intent','creator updates stores broadcast intent');
select has_column('public','creator_updates','affected_platform_connection_id','creator updates stores affected platform');
select hasnt_column('public','creator_updates','audience_rule','creator updates does not store audience rule');
select is(public.broadcast_audience_rule_for_target('account_hacked',null),'affected_platform','emergency derives affected platform');
select is(public.broadcast_audience_rule_for_target('new_video','ba100000-0000-4000-8000-000000000001'),'platform_followers','video with platform derives platform followers');
select is(public.broadcast_audience_rule_for_target('livestream','ba100000-0000-4000-8000-000000000001'),'platform_followers','livestream with platform derives platform followers');
select is(public.broadcast_audience_rule_for_target('new_video',null),'category_followers','video without platform derives category followers');
select is(public.broadcast_audience_rule_for_target('general_announcement',null),'category_followers','announcement derives category followers');
select throws_ok(
  $$insert into public.creator_updates(creator_id,broadcast_type,broadcast_intent,audience_rule,title,subject,preview_text,content)
    values(current_setting('tests.studio_a')::uuid,'announcement','general_announcement','affected_platform','','','','')$$,
  '42703', null, 'client cannot submit an audience rule'
);
select lives_ok(
  $$update public.creator_updates set status='scheduled',scheduled_for=now()+interval '1 hour',broadcast_intent='new_video',broadcast_type='new_content' where id='ba200000-0000-4000-8000-000000000001'$$,
  'a draft can be scheduled with a valid targeting change'
);
select throws_ok(
  $$update public.creator_updates set broadcast_intent='livestream',broadcast_type='livestream' where id='ba200000-0000-4000-8000-000000000001'$$,
  '42501', null, 'scheduled intent cannot change'
);
select throws_ok(
  $$update public.creator_updates set affected_platform_connection_id=null where id='ba200000-0000-4000-8000-000000000001'$$,
  '42501', null, 'scheduled affected platform cannot change'
);

select * from finish();
rollback;
