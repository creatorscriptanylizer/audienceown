begin;create extension if not exists pgtap with schema extensions;set local role postgres;set local search_path=public,extensions;select plan(5);
select col_is_null('public','creators','public_slug','creator slug is nullable before Recovery Pass selection');
insert into auth.users(id,email,raw_user_meta_data)values('12300000-0000-4000-8000-000000000001','fresh-creator@example.test','{}');
select is((select public_slug from public.creators where owner_user_id='12300000-0000-4000-8000-000000000001'),null,'new creator receives no generated slug');
select is((select display_name from public.creators where owner_user_id='12300000-0000-4000-8000-000000000001'),'fresh-creator','display name may still use the email name');
update public.creators set public_slug='chosen-name'where owner_user_id='12300000-0000-4000-8000-000000000001';
select is((select public_slug from public.creators where owner_user_id='12300000-0000-4000-8000-000000000001'),'chosen-name','chosen Recovery Pass slug persists exactly');
select throws_ok($$update public.creators set public_slug='admin'where owner_user_id='12300000-0000-4000-8000-000000000001'$$,'23514',null,'reserved slug remains blocked');
select*from finish();rollback;
