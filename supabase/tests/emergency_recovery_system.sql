begin;
select plan(58);
select has_table('public','creator_emergencies','creator emergencies exist');
select has_table('public','emergency_affected_accounts','affected accounts exist');
select has_table('public','emergency_replacement_accounts','replacement accounts exist');
select has_table('public','emergency_approvals','approvals exist');
select has_table('public','emergency_alert_snapshots','immutable snapshots exist');
select has_table('public','emergency_events','append-only history exists');
select has_column('public','creator_emergencies','severity','severity is stored');
select has_function('public','activate_emergency',array['uuid'],'activation RPC exists');
select ok((select relforcerowsecurity from pg_class where oid='public.creator_emergencies'::regclass),'emergency RLS is forced');
select table_privs_are('public','emergency_alert_snapshots','anon',array[]::text[],'snapshots are not browser-readable');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,
created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change) values
('00000000-0000-0000-0000-000000000000','f4000000-0000-4000-8000-000000000001','authenticated','authenticated','emergency-owner@example.com',crypt('pw',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','f4000000-0000-4000-8000-000000000002','authenticated','authenticated','emergency-approver@example.com',crypt('pw',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','f4000000-0000-4000-8000-000000000003','authenticated','authenticated','emergency-other@example.com',crypt('pw',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
update public.creators set public_slug='emergency-owner',public_profile_enabled=true where owner_user_id='f4000000-0000-4000-8000-000000000001';
update public.creators set public_slug='emergency-other' where owner_user_id='f4000000-0000-4000-8000-000000000003';
select set_config('tests.emergency_creator',(select id::text from public.creators where public_slug='emergency-owner'),true);
insert into public.connected_accounts(id,creator_id,platform,account_type,label,url,is_primary)
values('f4100000-0000-4000-8000-000000000001',current_setting('tests.emergency_creator')::uuid,'youtube','official','@original','https://youtube.com/@original',true);
insert into public.creator_team_members(creator_id,user_id,permissions) values
(current_setting('tests.emergency_creator')::uuid,'f4000000-0000-4000-8000-000000000002',array['emergency_manage','emergency_approve','emergency_activate']);

set local role authenticated;
select set_config('request.jwt.claim.sub','f4000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims','{"sub":"f4000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.create_emergency('account_hacked','critical','Account safety warning','Our original account is compromised.','f4100000-0000-4000-8000-000000000001')$$,'owner creates an emergency');
select set_config('tests.emergency_id',(select id::text from public.creator_emergencies limit 1),true);
select is((select lifecycle_status from public.creator_emergencies),'draft','incident starts as draft');
select is((select count(*)::integer from public.emergency_affected_accounts),1,'affected account is snapshotted');
select is((select count(*)::integer from public.emergency_events),1,'creation is audited');
select lives_ok($$select public.add_emergency_replacement(current_setting('tests.emergency_id')::uuid,'youtube','backup-123','@officialbackup','https://youtube.com/@officialbackup')$$,'replacement is added pending verification');
select is((select verification_state from public.emergency_replacement_accounts),'pending','replacement begins pending');
select is((public.submit_emergency(current_setting('tests.emergency_id')::uuid)->>'status'),'pending_verification','unverified replacement blocks approval');
select set_config('tests.replacement_id',(select id::text from public.emergency_replacement_accounts limit 1),true);
reset role;set local role service_role;select set_config('request.jwt.claim.role','service_role',true);
select lives_ok($$select public.record_emergency_verification(current_setting('tests.replacement_id')::uuid,'provider_api','high','backup-123','@officialbackup','https://youtube.com/channel/backup-123',null,jsonb_build_object('requested_by','f4000000-0000-4000-8000-000000000001'))$$,'replacement may be verified authoritatively');
reset role;set local role authenticated;select set_config('request.jwt.claim.role','authenticated',true);select set_config('request.jwt.claim.sub','f4000000-0000-4000-8000-000000000001',true);select set_config('request.jwt.claims','{"sub":"f4000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select ok((select official and verification_state='verified' and verified_at is not null from public.emergency_replacement_accounts),'only verified replacement is official');
select is((select lifecycle_status from public.creator_emergencies),'pending_approval','verification advances the incident');
select throws_ok($$select public.approve_emergency(current_setting('tests.emergency_id')::uuid,null)$$,'42501','critical requester cannot self-approve','critical self-approval is rejected');

select set_config('request.jwt.claim.sub','f4000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"f4000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*)::integer from public.creator_emergencies),0,'unrelated creator cannot read incident');
select throws_ok($$select public.submit_emergency(current_setting('tests.emergency_id')::uuid)$$,'42501','access denied','unrelated creator cannot manage incident');

select set_config('request.jwt.claim.sub','f4000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"f4000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*)::integer from public.creator_emergencies),1,'authorized approver can read incident');
select is((public.approve_emergency(current_setting('tests.emergency_id')::uuid,'Reviewed independently')->>'status'),'ready','independent approver makes alert ready');
select is((select approved_revision from public.creator_emergencies),(select content_revision from public.creator_emergencies),'approval binds exact revision');
select throws_ok($$select public.activate_emergency(current_setting('tests.emergency_id')::uuid,null)$$,'42501','critical authorization required','critical activation without a session fails in the database');
reset role;set local role service_role;select set_config('request.jwt.claim.role','service_role',true);
insert into public.emergency_authorization_sessions(id,creator_id,user_id,emergency_id,content_revision,purpose,assurance_level,expires_at,session_fingerprint_hash) values
('f4200000-0000-4000-8000-000000000001',current_setting('tests.emergency_creator')::uuid,'f4000000-0000-4000-8000-000000000002',current_setting('tests.emergency_id')::uuid,1,'approve_critical_incident','mfa',now()+interval '10 minutes',repeat('1',64)),
('f4200000-0000-4000-8000-000000000002',current_setting('tests.emergency_creator')::uuid,'f4000000-0000-4000-8000-000000000002',null,1,'activate_critical_incident','mfa',now()+interval '10 minutes',repeat('2',64)),
('f4200000-0000-4000-8000-000000000003',current_setting('tests.emergency_creator')::uuid,'f4000000-0000-4000-8000-000000000002',current_setting('tests.emergency_id')::uuid,1,'activate_critical_incident','mfa',now()+interval '10 minutes',repeat('3',64)),
('f4200000-0000-4000-8000-000000000004',current_setting('tests.emergency_creator')::uuid,'f4000000-0000-4000-8000-000000000002',current_setting('tests.emergency_id')::uuid,99,'activate_critical_incident','mfa',now()+interval '10 minutes',repeat('4',64)),
('f4200000-0000-4000-8000-000000000005',current_setting('tests.emergency_creator')::uuid,'f4000000-0000-4000-8000-000000000002',current_setting('tests.emergency_id')::uuid,1,'activate_critical_incident','mfa',now()+interval '10 minutes',repeat('5',64));
update public.emergency_authorization_sessions set issued_at=now()-interval '10 minutes',expires_at=now()-interval '1 minute' where id='f4200000-0000-4000-8000-000000000003';
update public.emergency_authorization_sessions set content_revision=(select content_revision from public.creator_emergencies where id=current_setting('tests.emergency_id')::uuid) where id in('f4200000-0000-4000-8000-000000000001','f4200000-0000-4000-8000-000000000002','f4200000-0000-4000-8000-000000000003','f4200000-0000-4000-8000-000000000005');
update public.emergency_authorization_sessions set content_revision=(select content_revision+1 from public.creator_emergencies where id=current_setting('tests.emergency_id')::uuid) where id='f4200000-0000-4000-8000-000000000004';
reset role;set local role authenticated;select set_config('request.jwt.claim.role','authenticated',true);select set_config('request.jwt.claim.sub','f4000000-0000-4000-8000-000000000002',true);select set_config('request.jwt.claims','{"sub":"f4000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.activate_emergency(current_setting('tests.emergency_id')::uuid,'f4200000-0000-4000-8000-000000000001')$$,'42501','authorization invalid','wrong-purpose authorization fails');
select ok((select consumed_at is null from public.emergency_authorization_sessions where id='f4200000-0000-4000-8000-000000000001'),'wrong-purpose failure does not consume authorization');
select throws_ok($$select public.activate_emergency(current_setting('tests.emergency_id')::uuid,'f4200000-0000-4000-8000-000000000002')$$,'42501','authorization invalid','wrong-emergency authorization fails');
select ok((select consumed_at is null from public.emergency_authorization_sessions where id='f4200000-0000-4000-8000-000000000002'),'wrong-emergency failure does not consume authorization');
select throws_ok($$select public.activate_emergency(current_setting('tests.emergency_id')::uuid,'f4200000-0000-4000-8000-000000000003')$$,'55000','authorization unavailable','expired authorization fails');
select ok((select consumed_at is null from public.emergency_authorization_sessions where id='f4200000-0000-4000-8000-000000000003'),'expired failure does not consume authorization');
select throws_ok($$select public.activate_emergency(current_setting('tests.emergency_id')::uuid,'f4200000-0000-4000-8000-000000000004')$$,'42501','authorization invalid','revision mismatch fails');
select ok((select consumed_at is null from public.emergency_authorization_sessions where id='f4200000-0000-4000-8000-000000000004'),'revision mismatch does not consume authorization');
reset role;set local role service_role;update public.emergency_approvals set snapshot_hash=repeat('0',64) where decision='approved';reset role;set local role authenticated;select set_config('request.jwt.claim.role','authenticated',true);select set_config('request.jwt.claim.sub','f4000000-0000-4000-8000-000000000002',true);select set_config('request.jwt.claims','{"sub":"f4000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.activate_emergency(current_setting('tests.emergency_id')::uuid,'f4200000-0000-4000-8000-000000000005')$$,'55000','approved snapshot or policy is stale','failed activation rolls back authorization consumption');
select ok((select consumed_at is null from public.emergency_authorization_sessions where id='f4200000-0000-4000-8000-000000000005'),'failed activation leaves authorization unused');
reset role;set local role service_role;update public.emergency_approvals set snapshot_hash=public.emergency_snapshot_hash(current_setting('tests.emergency_id')::uuid) where decision='approved';reset role;set local role authenticated;select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','f4000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"f4000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.update_emergency(current_setting('tests.emergency_id')::uuid,'account_hacked','critical','Updated safety warning','Use only the verified replacement.')$$,'owner may edit before activation');
select is((select lifecycle_status from public.creator_emergencies),'pending_approval','post-approval edit invalidates readiness');
select is((select decision from public.emergency_approvals),'invalidated','old approval is explicitly invalidated');
select ok((select approved_revision is null from public.creator_emergencies),'approved revision is cleared');

select set_config('request.jwt.claim.sub','f4000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"f4000000-0000-4000-8000-000000000002","role":"authenticated","reauthenticated_at":'||
extract(epoch from now())::bigint||'}',true);
select is((public.approve_emergency(current_setting('tests.emergency_id')::uuid,'Reviewed revised content')->>'status'),'ready','revised alert receives fresh approval');
reset role;set local role service_role;select set_config('request.jwt.claim.role','service_role',true);insert into public.emergency_authorization_sessions(id,creator_id,user_id,emergency_id,content_revision,purpose,assurance_level,expires_at,session_fingerprint_hash) select 'f4200000-0000-4000-8000-000000000006',creator_id,'f4000000-0000-4000-8000-000000000002',id,content_revision,'activate_critical_incident','mfa',now()+interval '10 minutes',repeat('6',64) from public.creator_emergencies where id=current_setting('tests.emergency_id')::uuid;reset role;set local role authenticated;select set_config('request.jwt.claim.role','authenticated',true);select set_config('request.jwt.claim.sub','f4000000-0000-4000-8000-000000000002',true);select set_config('request.jwt.claims','{"sub":"f4000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
create temporary table activation as select public.activate_emergency(current_setting('tests.emergency_id')::uuid,'f4200000-0000-4000-8000-000000000006') result;
select is((select result->>'status' from activation),'active','recently reauthenticated approver activates critical incident');
select ok((select consumed_at is not null from public.emergency_authorization_sessions where id='f4200000-0000-4000-8000-000000000006'),'successful activation consumes authorization exactly once');
select throws_ok($$select public.activate_emergency(current_setting('tests.emergency_id')::uuid,'f4200000-0000-4000-8000-000000000006')$$,'55000','authorization unavailable','consumed authorization cannot be replayed');
select is((select count(*)::integer from public.emergency_alert_snapshots),1,'activation stores one alert snapshot');
reset role;set local role service_role;select set_config('request.jwt.claim.role','service_role',true);
select is((select count(*)::integer from public.creator_updates),1,'activation creates one canonical creator update');
select is((select broadcast_type::text from public.creator_updates),'account_update','emergency uses account update delivery category');
select throws_ok($$update public.emergency_alert_snapshots set title='tampered'$$,'55000','emergency history is immutable','sent snapshot cannot be changed');
select throws_ok($$delete from public.emergency_events$$,'55000','emergency history is immutable','audit history is append-only');
select is((select count(*)::integer from public.emergency_events where event_type='activated'),1,'activation is audited');
reset role;set local role authenticated;select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f4000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"f4000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.close_emergency(current_setting('tests.emergency_id')::uuid,'resolve')->>'status'),'resolved','active incident resolves');
select is((select count(*)::integer from public.creator_emergencies where lifecycle_status='active'),0,'resolution removes active public emergency');
select is((select count(*)::integer from public.emergency_events where event_type='resolved'),1,'resolution is audited');
select lives_ok($$select public.create_emergency('account_suspended','important','Important account notice','An important non-critical update.','f4100000-0000-4000-8000-000000000001')$$,'owner creates non-critical emergency');
select set_config('tests.noncritical_id',(select id::text from public.creator_emergencies where severity='important' order by created_at desc limit 1),true);
select is((public.submit_emergency(current_setting('tests.noncritical_id')::uuid)->>'status'),'pending_approval','non-critical emergency reaches approval');
select set_config('request.jwt.claim.sub','f4000000-0000-4000-8000-000000000002',true);select set_config('request.jwt.claims','{"sub":"f4000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((public.approve_emergency(current_setting('tests.noncritical_id')::uuid,'Reviewed')->>'status'),'ready','non-critical emergency is approved');
select is((public.activate_emergency(current_setting('tests.noncritical_id')::uuid,null)->>'status'),'active','non-critical activation works without authorization session');
select * from finish();rollback;
