begin;
select plan(9);

select has_function('public','get_live_recovery_analytics',array['uuid'],'incident aggregate RPC exists');
select function_privs_are('public','get_live_recovery_analytics',array['uuid'],'anon',array[]::text[],'anonymous callers cannot execute live analytics');
select function_privs_are('public','get_live_recovery_analytics',array['uuid'],'authenticated',array['EXECUTE'],'authenticated creators may execute live analytics');
select is((select prosecdef from pg_proc where oid='public.get_live_recovery_analytics(uuid)'::regprocedure),true,'RPC is security definer');
select is((select proconfig[1] from pg_proc where oid='public.get_live_recovery_analytics(uuid)'::regprocedure),'search_path='::text,'RPC has an empty fixed search path');
select like(pg_get_functiondef('public.get_live_recovery_analytics(uuid)'::regprocedure),'%count(distinct connection_id)%','recipient counts are distinct across transports and retries');
select like(pg_get_functiondef('public.get_live_recovery_analytics(uuid)'::regprocedure),'%status in (''sending'',''accepted'',''delivered'',''bounced'',''complained'')%','queued-only deliveries are excluded from sent');
select unlike(pg_get_functiondef('public.get_live_recovery_analytics(uuid)'::regprocedure),'%destination_hash%','RPC does not serialize destination identity');
select unlike(pg_get_functiondef('public.get_live_recovery_analytics(uuid)'::regprocedure),'%provider_message_id%','RPC does not serialize provider delivery identifiers');

select * from finish();
rollback;
