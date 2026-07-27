begin;
select plan(63);

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

insert into public.follower_contacts(id,email_ciphertext,email_hash,email_masked)
values(
  'ba300000-0000-4000-8000-000000000001','ciphertext',
  encode(extensions.digest('publish@example.com','sha256'),'hex'),'p••••@example.com'
);
insert into public.follower_connections(
  id,creator_id,follower_contact_id,preference_token_hash,unsubscribe_token_hash,
  source_platform,consent_source
) values(
  'ba400000-0000-4000-8000-000000000001',current_setting('tests.studio_a')::uuid,
  'ba300000-0000-4000-8000-000000000001','publish-pref','publish-unsub',
  'instagram','creator_page'
);
insert into public.follower_recovery_methods(
  id,follower_contact_id,method_type,method_status,destination_hash,destination_masked,verified_at
) values(
  'ba500000-0000-4000-8000-000000000001','ba300000-0000-4000-8000-000000000001',
  'email','verified',encode(extensions.digest('publish@example.com','sha256'),'hex'),
  'p••••@example.com',now()
);
update public.follower_connections
set selected_recovery_method_id='ba500000-0000-4000-8000-000000000001'
where id='ba400000-0000-4000-8000-000000000001';
update public.follower_category_preferences set enabled=true
where follower_connection_id='ba400000-0000-4000-8000-000000000001'
  and category_key='announcements';

insert into public.creator_updates(
  id,creator_id,broadcast_type,broadcast_intent,status,title,subject,content,
  scheduled_for,cancelled_at
) values(
  'ba600000-0000-4000-8000-000000000001',current_setting('tests.studio_a')::uuid,
  'announcement','general_announcement','cancelled','Publish','Publish subject','Publish body',
  now()+interval '1 hour',now()
);
set local role authenticated;
select set_config('request.jwt.claim.sub','ba000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims','{"sub":"ba000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
create temporary table publish_result as
select public.publish_update_delivery_queue(
  'ba600000-0000-4000-8000-000000000001',
  current_setting('tests.studio_a')::uuid,
  jsonb_build_array(jsonb_build_object(
    'connection_id','ba400000-0000-4000-8000-000000000001',
    'recovery_method_id','ba500000-0000-4000-8000-000000000001',
    'destination','publish@example.com',
    'destination_hash',encode(extensions.digest('publish@example.com','sha256'),'hex')
  ))
) result;
select is((select result->>'status' from publish_result),'published','publication returns stable published status');
select is(((select result->>'queued' from publish_result))::integer,1,'publication reports one queued delivery');
select is((select status::text from public.creator_updates where id='ba600000-0000-4000-8000-000000000001'),'queued','publication marks update queued');
select ok((select queued_at is not null from public.creator_updates where id='ba600000-0000-4000-8000-000000000001'),'publication sets queued_at');
select ok((select scheduled_for is null from public.creator_updates where id='ba600000-0000-4000-8000-000000000001'),'publish now clears scheduled_for');
select ok((select cancelled_at is null from public.creator_updates where id='ba600000-0000-4000-8000-000000000001'),'publication clears cancelled_at');
select is((select count(*)::integer from public.update_deliveries where update_id='ba600000-0000-4000-8000-000000000001'),1,'publication creates one real delivery');

create temporary table repeat_result as
select public.publish_update_delivery_queue(
  'ba600000-0000-4000-8000-000000000001',
  current_setting('tests.studio_a')::uuid,
  jsonb_build_array(jsonb_build_object(
    'connection_id','ba400000-0000-4000-8000-000000000001',
    'recovery_method_id','ba500000-0000-4000-8000-000000000001',
    'destination','publish@example.com',
    'destination_hash',encode(extensions.digest('publish@example.com','sha256'),'hex')
  ))
) result;
select is(((select result->>'queued' from repeat_result))::integer,0,'repeat publication queues no duplicate');
select is(((select result->>'duplicates' from repeat_result))::integer,1,'repeat publication reports the duplicate');
select is((select count(*)::integer from public.update_deliveries where update_id='ba600000-0000-4000-8000-000000000001'),1,'repeat publication leaves one delivery');

insert into public.creator_updates(id,creator_id,broadcast_type,broadcast_intent,title,subject,content)
values
('ba600000-0000-4000-8000-000000000002',current_setting('tests.studio_a')::uuid,'announcement','general_announcement','Zero','Zero subject','Zero body'),
('ba600000-0000-4000-8000-000000000003',current_setting('tests.studio_a')::uuid,'announcement','general_announcement','Payload','Payload subject','Payload body'),
('ba600000-0000-4000-8000-000000000004',current_setting('tests.studio_a')::uuid,'announcement','general_announcement','','','');
insert into public.creator_updates(
  id,creator_id,broadcast_type,broadcast_intent,status,title,subject,content,sent_at
) values(
  'ba600000-0000-4000-8000-000000000005',current_setting('tests.studio_a')::uuid,
  'announcement','general_announcement','sent','Sent','Sent subject','Sent body',now()
);

select throws_ok(
  $$select public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000003',current_setting('tests.studio_a')::uuid,
    '[{"connection_id":"ba400000-0000-4000-8000-000000000001","recovery_method_id":"ba500000-0000-4000-8000-000000000001","destination":"publish@example.com","destination_hash":"wrong","transport":"sms"}]'::jsonb
  )$$,
  '22023',null,'transport cannot be supplied or overridden'
);
select is((select status::text from public.creator_updates where id='ba600000-0000-4000-8000-000000000003'),'draft','invalid payload leaves update editable');
select throws_ok(
  $$select public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000002',current_setting('tests.studio_a')::uuid,'[]'::jsonb
  )$$,
  'P0001',null,'zero eligible audience is blocked'
);
select is((select status::text from public.creator_updates where id='ba600000-0000-4000-8000-000000000002'),'draft','zero audience remains a draft');
select is((select count(*)::integer from public.update_deliveries where update_id='ba600000-0000-4000-8000-000000000002'),0,'zero audience creates no deliveries');
select throws_ok(
  $$select public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000002',current_setting('tests.studio_b')::uuid,'[]'::jsonb
  )$$,
  '42501',null,'invalid creator ownership is rejected'
);
select throws_ok(
  $$select public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000004',current_setting('tests.studio_a')::uuid,'[]'::jsonb
  )$$,
  '23514',null,'incomplete publication is rejected'
);
select throws_ok(
  $$select public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000005',current_setting('tests.studio_a')::uuid,'[]'::jsonb
  )$$,
  '55000',null,'published status cannot be published again'
);
select throws_ok(
  $$select public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000003',current_setting('tests.studio_a')::uuid,
    '[{"connection_id":"ba400000-0000-4000-8000-000000000099","recovery_method_id":"ba500000-0000-4000-8000-000000000001","destination":"publish@example.com","destination_hash":"bad"}]'::jsonb
  )$$,
  '23514',null,'arbitrary connection IDs are rejected'
);
select throws_ok(
  $$select public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000003',current_setting('tests.studio_a')::uuid,
    '[{"connection_id":"ba400000-0000-4000-8000-000000000001","recovery_method_id":"ba500000-0000-4000-8000-000000000099","destination":"publish@example.com","destination_hash":"bad"}]'::jsonb
  )$$,
  '23514',null,'arbitrary recovery method IDs are rejected'
);
select is(
  (select status::text from public.update_deliveries where update_id='ba600000-0000-4000-8000-000000000001'),
  'queued','published deliveries remain queued for the dispatcher'
);

insert into public.creator_updates(id,creator_id,broadcast_type,broadcast_intent,title,subject,content)
select
  ('ba600000-0000-4000-8000-' || lpad(number::text,12,'0'))::uuid,
  current_setting('tests.studio_a')::uuid,
  'announcement','general_announcement',
  'Scheduled ' || number,'Scheduled subject ' || number,'Scheduled body ' || number
from generate_series(6,12) number;

create temporary table schedule_result as
select public.publish_update_delivery_queue(
  'ba600000-0000-4000-8000-000000000006',
  current_setting('tests.studio_a')::uuid,
  jsonb_build_array(jsonb_build_object(
    'connection_id','ba400000-0000-4000-8000-000000000001',
    'recovery_method_id','ba500000-0000-4000-8000-000000000001',
    'destination','publish@example.com',
    'destination_hash',encode(extensions.digest('publish@example.com','sha256'),'hex')
  )),
  now()+interval '10 minutes'
) result;
select is((select result->>'status' from schedule_result),'scheduled','valid future scheduling returns scheduled status');
select is((select status::text from public.creator_updates where id='ba600000-0000-4000-8000-000000000006'),'scheduled','scheduled update status is persisted');
select ok((select scheduled_for = (select (result->>'scheduledFor')::timestamptz from schedule_result) from public.creator_updates where id='ba600000-0000-4000-8000-000000000006'),'scheduled_for is persisted exactly');
select ok((select queued_at is not null from public.creator_updates where id='ba600000-0000-4000-8000-000000000006'),'scheduling sets queued_at');
select ok((select cancelled_at is null from public.creator_updates where id='ba600000-0000-4000-8000-000000000006'),'scheduling clears cancelled_at');
select is((select count(*)::integer from public.update_deliveries where update_id='ba600000-0000-4000-8000-000000000006'),1,'scheduling atomically snapshots recipients');
select is((select status::text from public.update_deliveries where update_id='ba600000-0000-4000-8000-000000000006'),'queued','scheduled delivery remains queued');

reset role;
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select is_empty(
  $$select delivery_id from public.claim_update_deliveries(10,3,900)
    where update_id='ba600000-0000-4000-8000-000000000006'$$,
  'future scheduled delivery cannot be claimed'
);
alter table public.creator_updates disable trigger user;
update public.creator_updates set scheduled_for=now()-interval '1 minute'
where id='ba600000-0000-4000-8000-000000000006';
alter table public.creator_updates enable trigger user;
select is(
  (select delivery_id from public.claim_update_deliveries(10,3,900)
    where update_id='ba600000-0000-4000-8000-000000000006'),
  (select id from public.update_deliveries where update_id='ba600000-0000-4000-8000-000000000006'),
  'due scheduled delivery can be claimed'
);
select is((select status::text from public.creator_updates where id='ba600000-0000-4000-8000-000000000006'),'queued','first due claim promotes scheduled update to queued');

set local role authenticated;
select set_config('request.jwt.claim.sub','ba000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims','{"sub":"ba000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
  perform public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000007',current_setting('tests.studio_a')::uuid,
    jsonb_build_array(jsonb_build_object(
      'connection_id','ba400000-0000-4000-8000-000000000001',
      'recovery_method_id','ba500000-0000-4000-8000-000000000001',
      'destination','publish@example.com',
      'destination_hash',encode(extensions.digest('publish@example.com','sha256'),'hex')
    )),now()+interval '20 minutes'
  );
end $$;
select is(public.cancel_scheduled_update(
  'ba600000-0000-4000-8000-000000000007',current_setting('tests.studio_a')::uuid
)->>'status','cancelled','future scheduled update can be cancelled');
select is((select status::text from public.creator_updates where id='ba600000-0000-4000-8000-000000000007'),'cancelled','cancellation marks update cancelled');
select is((select status::text from public.update_deliveries where update_id='ba600000-0000-4000-8000-000000000007'),'cancelled','cancellation marks queued delivery cancelled');
select is(public.cancel_scheduled_update(
  'ba600000-0000-4000-8000-000000000007',current_setting('tests.studio_a')::uuid
)->>'status','cancelled','repeated cancellation is idempotent');

select throws_ok(
  $$select public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000008',current_setting('tests.studio_a')::uuid,'[]'::jsonb,now()
  )$$,'22007',null,'exact-now schedule is rejected'
);
select throws_ok(
  $$select public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000008',current_setting('tests.studio_a')::uuid,'[]'::jsonb,now()-interval '1 hour'
  )$$,'22007',null,'past schedule is rejected'
);
select throws_ok(
  $$select public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000008',current_setting('tests.studio_a')::uuid,'[]'::jsonb,now()+interval '30 seconds'
  )$$,'22007',null,'schedule inside minimum buffer is rejected'
);
select throws_ok(
  $$select public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000008',current_setting('tests.studio_a')::uuid,'[]'::jsonb,now()+interval '5 minutes'
  )$$,'P0001',null,'zero audience blocks scheduling'
);
select is((select status::text from public.creator_updates where id='ba600000-0000-4000-8000-000000000008'),'draft','zero audience scheduling leaves draft unchanged');
select throws_ok(
  $$select public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000001',current_setting('tests.studio_a')::uuid,'[]'::jsonb,now()+interval '5 minutes'
  )$$,'55000',null,'scheduling after immediate publication is rejected'
);

do $$ begin
  perform public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000009',current_setting('tests.studio_a')::uuid,
    jsonb_build_array(jsonb_build_object(
      'connection_id','ba400000-0000-4000-8000-000000000001',
      'recovery_method_id','ba500000-0000-4000-8000-000000000001',
      'destination','publish@example.com',
      'destination_hash',encode(extensions.digest('publish@example.com','sha256'),'hex')
    )),now()+interval '15 minutes'
  );
end $$;
select throws_ok(
  $$select public.publish_update_delivery_queue(
    'ba600000-0000-4000-8000-000000000009',current_setting('tests.studio_a')::uuid,'[]'::jsonb,null
  )$$,'55000',null,'publish now after scheduling is rejected'
);
select throws_ok(
  $$update public.creator_updates set content='Changed after snapshot'
    where id='ba600000-0000-4000-8000-000000000009'$$,
  '42501',null,'scheduled content is immutable'
);
reset role;
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claims','{"role":"service_role"}',true);
update public.update_deliveries
set status='sending',sending_at=now(),claimed_at=now()
where update_id='ba600000-0000-4000-8000-000000000009';
set local role authenticated;
select set_config('request.jwt.claim.sub','ba000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims','{"sub":"ba000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok(
  $$select public.cancel_scheduled_update(
    'ba600000-0000-4000-8000-000000000009',current_setting('tests.studio_a')::uuid
  )$$,'55000',null,'cancellation fails after dispatch begins'
);

select * from finish();
rollback;
