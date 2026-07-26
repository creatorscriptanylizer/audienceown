begin;
select plan(5);
select tests.create_supabase_user('creator_a');
select tests.create_supabase_user('creator_b');
select tests.authenticate_as('creator_a');
update public.creators set public_slug='creator-a', display_name='Creator A'
  where owner_user_id=tests.get_supabase_uid('creator_a');
select tests.authenticate_as('creator_b');
update public.creators set public_slug='creator-b', display_name='Creator B'
  where owner_user_id=tests.get_supabase_uid('creator_b');
select is((select count(*)::int from public.creators),1,'Creator B reads only their creator');
select lives_ok($$ update public.creators set public_bio='mine' where public_slug='creator-b' $$,'Creator B updates own creator');
select is((select count(*)::int from public.creators where public_slug='creator-a'),0,'Creator B cannot read Creator A');
select is((select count(*)::int from public.creators where public_slug='creator-a' and public_bio='hacked'),0,'Creator B cannot modify Creator A');
select throws_ok($$ select email_ciphertext from public.follower_contacts $$,'42501',null,'Creators cannot read encrypted contacts directly');
select * from finish();
rollback;
