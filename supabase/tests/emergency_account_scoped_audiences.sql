begin;
select plan(5);
select has_table('public','follower_connection_account_memberships','Main-account opt-ins are normalized');
select has_table('public','follower_recovery_destination_preferences','Recovery-account opt-ins are normalized');
select has_function('public','enforce_new_video_publishing_target',array[]::text[],'delivery account-scope guard exists');
select function_privs_are('public','enforce_new_video_publishing_target',array[]::text[],'anon',array[]::text[],'anon cannot execute guard');
select function_privs_are('public','enforce_new_video_publishing_target',array[]::text[],'authenticated',array[]::text[],'authenticated cannot execute guard');
select * from finish();
rollback;
