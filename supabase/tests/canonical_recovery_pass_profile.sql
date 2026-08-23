begin;
select plan(12);

select has_column('public','creators','recovery_pass_name','creators has canonical Recovery Pass name');
select has_column('public','creators','public_tagline','creators has public tagline');
select col_not_null('public','creators','recovery_pass_name','Recovery Pass name is required');
select col_is_null('public','creators','public_tagline','tagline is optional');
select has_function('public','get_public_recovery_pass_profile',array['text'],'public-safe profile RPC exists');
select function_returns('public','get_public_recovery_pass_profile',array['text'],'jsonb','public-safe profile RPC returns jsonb');

select ok((select relrowsecurity and relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'and c.relname='creators'),'creator RLS remains enabled and forced');
select ok((select prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname='get_public_recovery_pass_profile'),'public profile RPC is security definer');
select is((select proconfig[1] from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname='get_public_recovery_pass_profile'),'search_path=""','public profile RPC pins an empty search path');

select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select lives_ok($$select public.get_public_recovery_pass_profile('missing-profile')$$,'anonymous callers may safely read the bounded RPC');
select throws_ok($$update public.creators set recovery_pass_name='forbidden'$$,'42501',null,'anonymous callers cannot mutate creator profiles');

reset role;
insert into auth.users(id,email,raw_user_meta_data)values('15400000-0000-4000-8000-000000000001','profile-trigger@example.com','{"name":"Profile Trigger"}'::jsonb);
select is((select recovery_pass_name from public.creators where owner_user_id='15400000-0000-4000-8000-000000000001'),'Profile Trigger''s Recovery Pass','new auth users receive a canonical Recovery Pass name');

select * from finish();
rollback;
