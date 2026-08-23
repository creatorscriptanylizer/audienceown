begin;
select plan(4);
select has_table('public','follower_connection_account_memberships','Main account opt-ins exist');
select has_table('public','follower_recovery_destination_preferences','Recovery account opt-ins exist');
select has_function('public','enforce_new_video_publishing_target',array[]::text[],'shared delivery scope guard exists');
select function_privs_are('public','enforce_new_video_publishing_target',array[]::text[],'authenticated',array[]::text[],'guard is not client callable');
select * from finish();
rollback;
