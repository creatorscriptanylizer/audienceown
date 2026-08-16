begin;
select plan(8);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,
created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change) values
('00000000-0000-0000-0000-000000000000','13600000-0000-4000-8000-000000000001','authenticated','authenticated',
'instagram-persistence@example.com',crypt('pw',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
update public.creators set public_slug='instagram-persistence' where owner_user_id='13600000-0000-4000-8000-000000000001';
select set_config('tests.instagram_creator',(select id::text from public.creators where public_slug='instagram-persistence'),true);

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);

select lives_ok($$
  insert into public.connected_accounts(
    id,creator_id,platform,account_type,label,url,is_primary,is_public,external_account_id,
    external_account_name,external_account_url,provider_metadata,requested_scopes,granted_scopes,
    watch_enabled,webhook_enabled,connection_health,provider_status
  ) values (
    '13610000-0000-4000-8000-000000000001',current_setting('tests.instagram_creator')::uuid,
    'instagram','official','@nana_friggy','https://www.instagram.com/nana_friggy/',false,true,
    '89141400000000000','@nana_friggy','https://www.instagram.com/nana_friggy/',
    '{"loginMethod":"instagram_login","canonicalIdSource":"me.user_id"}',
    array['instagram_business_basic'],array['instagram_business_basic'],false,false,'healthy','app_review_required'
  )
$$,'Instagram OAuth connection persists with its capability status');

select is((select connection_health from public.connected_accounts where id='13610000-0000-4000-8000-000000000001'),
  'healthy','OAuth connection health remains healthy');
select is((select provider_status from public.connected_accounts where id='13610000-0000-4000-8000-000000000001'),
  'app_review_required','provider capability review state remains distinct');

select lives_ok($$
  insert into public.platform_connection_secrets(platform_connection_id,access_token_ciphertext,refresh_token_ciphertext,token_scope,token_type)
  values('13610000-0000-4000-8000-000000000001','encrypted-access-token','encrypted-refresh-token','instagram_business_basic','bearer')
$$,'credential persists after its connection');
select is((select platform_connection_id from public.platform_connection_secrets where platform_connection_id='13610000-0000-4000-8000-000000000001'),
  '13610000-0000-4000-8000-000000000001'::uuid,'credential references the Instagram connection');
select is((select count(*)::integer from public.connected_accounts where creator_id=current_setting('tests.instagram_creator')::uuid
  and platform='instagram' and external_account_id='89141400000000000'),1,'OAuth identity has exactly one connection');
select is((select count(*)::integer from public.platform_connection_secrets s left join public.connected_accounts a on a.id=s.platform_connection_id
  where a.id is null),0,'there are no orphan credentials');
select throws_ok($$insert into public.connected_accounts(creator_id,platform,account_type,label,url,connection_health,provider_status)
  values(current_setting('tests.instagram_creator')::uuid,'instagram','backup','invalid','https://www.instagram.com/invalid/','healthy','arbitrary')$$,
  '23514',null,'arbitrary provider status remains rejected');

select * from finish();
rollback;
