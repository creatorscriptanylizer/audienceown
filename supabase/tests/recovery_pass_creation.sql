begin;create extension if not exists pgtap with schema extensions;set local role postgres;set local search_path=public,extensions;select plan(12);
insert into auth.users(id,email)values
('12600000-0000-4000-8000-000000000001','recovery-owner@example.test'),
('12600000-0000-4000-8000-000000000002','recovery-other@example.test');
update public.creators set public_slug='already-taken'where owner_user_id='12600000-0000-4000-8000-000000000002';
set local role authenticated;select set_config('request.jwt.claim.role','authenticated',true);select set_config('request.jwt.claim.sub','12600000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.create_recovery_pass('Recovery Owner','fresh-recovery')$$,'owner creates a Recovery Pass');
select is((select public_slug from public.creators where owner_user_id=auth.uid()),'fresh-recovery','chosen slug persists');
select ok((select public_profile_enabled and recovery_pass_enabled from public.creators where owner_user_id=auth.uid()),'public Recovery Pass is active');
select ok((select recovery_pass_completed_at is not null from public.creator_onboarding o join public.creators c on c.id=o.creator_id where c.owner_user_id=auth.uid()),'onboarding milestone persists');
select lives_ok($$select public.create_recovery_pass('Recovery Owner','fresh-recovery')$$,'successful retry is idempotent');
select throws_ok($$select public.create_recovery_pass('Recovery Owner','already-taken')$$,'23505',null,'concurrent unique conflict is preserved');
select is((select public_slug from public.creators where owner_user_id=auth.uid()),'fresh-recovery','unique failure rolls back creator state');
select throws_ok($$select public.create_recovery_pass('Recovery Owner','admin')$$,'22023','invalid or reserved creator name','reserved slug is rejected');
set local role authenticated;select set_config('request.jwt.claim.sub','12600000-0000-4000-8000-000000000099',true);
select throws_ok($$select public.create_recovery_pass('Missing','missing-creator')$$,'42501','creator not found','missing creator is rejected');
set local role anon;select throws_ok($$select public.create_recovery_pass('Anonymous','anonymous-pass')$$,'42501',null,'anonymous execution is denied');
set local role postgres;delete from public.creator_onboarding where creator_id=(select id from public.creators where owner_user_id='12600000-0000-4000-8000-000000000001');
set local role authenticated;select set_config('request.jwt.claim.sub','12600000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.create_recovery_pass('Recovery Owner','must-roll-back')$$,'P0002','creator onboarding state not found','onboarding failure is detected');
select is((select public_slug from public.creators where owner_user_id=auth.uid()),'fresh-recovery','onboarding failure rolls back creator update');
select*from finish();rollback;
