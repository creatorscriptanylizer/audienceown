begin;
select set_config('request.jwt.claim.role','service_role',true);

do $$
declare c public.creators%rowtype;a public.connected_accounts%rowtype;contact_id uuid;method_id uuid;connection_id uuid;
  token_hash text:=encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex');account_ref text;result jsonb;
begin
  select * into c from public.creators where public_profile_enabled and recovery_pass_enabled order by created_at limit 1;
  if not found then raise exception 'fixture creator required';end if;
  select * into a from public.connected_accounts where creator_id=c.id and account_type='official'and is_public and url is not null limit 1;
  if not found then raise exception 'fixture Main account required';end if;
  account_ref:=encode(extensions.digest(a.id::text||':'||c.public_slug,'sha256'),'hex');
  insert into public.follower_contacts(email_hash,email_ciphertext,email_masked)values(encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex'),'test-ciphertext','t•••@example.test')returning id into contact_id;
  insert into public.follower_recovery_methods(follower_contact_id,method_type,method_status,destination_hash,destination_masked,verified_at,consented_at)
    values(contact_id,'email','verified',encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex'),'t•••@example.test',now(),now())returning id into method_id;
  insert into public.follower_connections(creator_id,follower_contact_id,status,consented_at,activated_at,selected_recovery_method_id,preference_token_hash,unsubscribe_token_hash,preference_token_expires_at,unsubscribe_token_expires_at,consent_source)
    values(c.id,contact_id,'paused',now(),now(),method_id,token_hash,encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex'),now()+interval'1 day',now()+interval'1 day','creator_recovery_pass')returning id into connection_id;
  begin perform public.activate_public_recovery_pass(c.public_slug,token_hash,'{}'::text[],'{}'::text[]);raise exception 'empty account activation unexpectedly succeeded';exception when check_violation then null;end;
  begin perform public.activate_public_recovery_pass(c.public_slug,token_hash,array[repeat('0',64)],'{}'::text[]);raise exception 'invalid account activation unexpectedly succeeded';exception when check_violation then null;end;
  result:=public.activate_public_recovery_pass(c.public_slug,token_hash,array[account_ref],'{}'::text[]);
  if result->>'membership'<>'active'or result->>'recoveryAlerts'<>'true'then raise exception 'activation result invalid';end if;
  if not exists(select 1 from public.follower_connection_account_memberships where follower_connection_id=connection_id and connected_account_id=a.id)then raise exception 'Main membership missing';end if;
  begin update public.follower_category_preferences set enabled=false where follower_connection_id=connection_id and category_key='recovery';raise exception 'mandatory recovery disabling unexpectedly succeeded';exception when check_violation then null;end;
end$$;

do $$
declare c public.creators%rowtype;challenge_id uuid:=gen_random_uuid();token_hash text:=encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex');result jsonb;connection_status text;
begin
 select * into c from public.creators where public_profile_enabled and recovery_pass_enabled order by created_at limit 1;
 insert into public.email_verification_challenges(id,creator_id,email_hash,email_ciphertext,email_masked,code_hash,source_platform,expires_at,resend_available_at,verified_at)
 values(challenge_id,c.id,encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex'),'verified-email-ciphertext','v•••@example.test',repeat('a',64),'direct',now()+interval'10 minutes',now(),now());
 result:=public.complete_email_recovery_verification(challenge_id,token_hash,encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex'),now()+interval'1 day');
 if result->>'method'<>'email'then raise exception 'verified email completion failed';end if;
 select f.status into connection_status from public.follower_connections f join public.follower_contacts contact on contact.id=f.follower_contact_id where f.creator_id=c.id and contact.email_masked='v•••@example.test';
 if connection_status<>'paused'then raise exception 'verification activated membership before Stage 5';end if;
 if not exists(select 1 from public.email_verification_challenges where id=challenge_id and completed_at is not null)then raise exception 'email OTP was not single use';end if;
end$$;

rollback;
