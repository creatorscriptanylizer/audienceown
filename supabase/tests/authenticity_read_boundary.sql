begin;
select plan(8);

insert into auth.users(id,email) values
  ('91300000-0000-4000-8000-000000000001','authenticity-read-boundary@example.test');
update public.creators
set display_name='Read Boundary Creator',public_slug='authenticity-read-boundary',public_profile_enabled=true
where owner_user_id='91300000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','91300000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"91300000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select is((select count(*)::integer from public.creator_identity_profiles),0,'creator starts without an identity profile');
select is((select count(*)::integer from public.creator_authenticity_profiles),0,'creator starts without an authenticity profile');

-- These are the exact authenticated page reads. Neither an absent private row nor
-- the absent public projection is allowed to initialize backend state.
select is((select row_to_json(p)::text from public.creator_authenticity_profiles p limit 1),null::text,'private page read returns no row');
select is(public.get_public_creator_authenticity('authenticity-read-boundary'),null::jsonb,'public projection returns canonical absence');
select is((select count(*)::integer from public.creator_identity_profiles),0,'page reads create no identity profile');
select is((select count(*)::integer from public.creator_authenticity_profiles),0,'page reads create no authenticity profile');

select public.ensure_creator_identity_profile();
select public.ensure_creator_authenticity_profile();
select public.ensure_creator_identity_profile();
select public.ensure_creator_authenticity_profile();

select is((select count(*)::integer from public.creator_identity_profiles),1,'explicit repeated setup creates one owned identity profile');
select is((select count(*)::integer from public.creator_authenticity_profiles),1,'explicit repeated setup creates one owned authenticity profile');

select * from finish();
rollback;
