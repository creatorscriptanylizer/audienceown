begin;

alter table public.follower_category_preferences drop constraint if exists follower_category_preferences_category_key_check;
alter table public.follower_category_preferences add constraint follower_category_preferences_category_key_check
  check(category_key in('recovery','videos','livestreams','podcasts','products','events','announcements'));

create or replace function public.get_public_recovery_pass_enrollment(p_slug text)
returns jsonb language sql stable security definer set search_path='' as $$
  with creator as (
    select id,public_slug from public.creators
    where public_slug=p_slug and public_profile_enabled and recovery_pass_enabled
  ), eligible as (
    select a.id,a.platform,a.label,a.external_account_name,a.url,a.account_type,
      encode(extensions.digest(a.id::text||':'||c.public_slug,'sha256'),'hex') reference
    from creator c join public.connected_accounts a on a.creator_id=c.id
    where a.is_public and a.url is not null and a.account_type='official'
      and coalesce(a.connection_health,'disconnected') not in('revoked','expired')
      and coalesce(a.provider_status,'configuration_pending')<>'revoked'
    union all
    select a.id,a.platform,a.label,a.external_account_name,a.url,a.account_type,
      encode(extensions.digest(a.id::text||':'||c.public_slug,'sha256'),'hex') reference
    from creator c join public.recovery_networks n on n.creator_id=c.id
    join public.recovery_network_destinations d on d.recovery_network_id=n.id
    join public.connected_accounts a on a.id=d.recovery_connected_account_id and a.creator_id=c.id
    where a.is_public and a.url is not null and a.account_type='backup'
      and coalesce(a.connection_health,'disconnected') not in('revoked','expired')
      and coalesce(a.provider_status,'configuration_pending')<>'revoked'
  )
  select case when exists(select 1 from creator) then jsonb_build_object('accounts',coalesce((
    select jsonb_agg(jsonb_build_object(
      'reference',reference,'provider',platform,'label',coalesce(external_account_name,label),
      'handle',external_account_name,'profileUrl',url,
      'role',case account_type when 'official' then 'main' else 'recovery' end
    ) order by case account_type when 'official' then 0 else 1 end,platform,label)
    from (select distinct on(id) * from eligible order by id) public_accounts
  ),'[]'::jsonb)) else null end
$$;

revoke all on function public.get_public_recovery_pass_enrollment(text) from public;
grant execute on function public.get_public_recovery_pass_enrollment(text) to anon,authenticated;

create or replace function public.activate_public_recovery_pass(
  p_slug text,p_preference_token_hash text,p_account_references text[],p_optional_preferences text[]
) returns jsonb language plpgsql security definer set search_path='' as $$
declare creator_row public.creators%rowtype; connection_row public.follower_connections%rowtype;
  account_row public.connected_accounts%rowtype; reference text; category text;
  main_ids uuid[]:='{}'; recovery_ids uuid[]:='{}'; selected_count integer:=0;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501';end if;
  if cardinality(coalesce(p_account_references,'{}'))<1 then raise exception 'at least one account is required' using errcode='23514';end if;
  if cardinality(p_account_references)<>cardinality(array(select distinct unnest(p_account_references))) then raise exception 'duplicate account selection' using errcode='23514';end if;
  if exists(select 1 from unnest(coalesce(p_optional_preferences,'{}')) value where value not in('videos','livestreams','podcasts','products','events','announcements')) then raise exception 'invalid preference' using errcode='23514';end if;
  select * into creator_row from public.creators where public_slug=p_slug and public_profile_enabled and recovery_pass_enabled for share;
  if not found then raise exception 'Recovery Pass unavailable' using errcode='23514';end if;
  select * into connection_row from public.follower_connections where creator_id=creator_row.id and preference_token_hash=p_preference_token_hash for update;
  if not found or connection_row.management_tokens_revoked_at is not null or connection_row.preference_token_expires_at<=now() then raise exception 'verified connection required' using errcode='23514';end if;
  if not exists(select 1 from public.follower_recovery_methods where id=connection_row.selected_recovery_method_id and follower_contact_id=connection_row.follower_contact_id and method_status='verified') then raise exception 'verified delivery method required' using errcode='23514';end if;
  foreach reference in array p_account_references loop
    select a.* into account_row from public.connected_accounts a where a.creator_id=creator_row.id and a.is_public and a.url is not null
      and encode(extensions.digest(a.id::text||':'||creator_row.public_slug,'sha256'),'hex')=reference
      and ((a.account_type='official') or (a.account_type='backup' and exists(select 1 from public.recovery_networks n join public.recovery_network_destinations d on d.recovery_network_id=n.id where n.creator_id=creator_row.id and d.recovery_connected_account_id=a.id)))
      and coalesce(a.connection_health,'disconnected') not in('revoked','expired') and coalesce(a.provider_status,'configuration_pending')<>'revoked';
    if not found then raise exception 'invalid account selection' using errcode='23514';end if;
    if account_row.account_type='official' then main_ids:=array_append(main_ids,account_row.id);else recovery_ids:=array_append(recovery_ids,account_row.id);end if;
    selected_count:=selected_count+1;
  end loop;
  if selected_count<1 then raise exception 'at least one account is required' using errcode='23514';end if;
  update public.follower_connections set status='active',activated_at=coalesce(activated_at,now()),deactivated_at=null,unsubscribed_at=null where id=connection_row.id;
  delete from public.follower_connection_account_memberships where follower_connection_id=connection_row.id and not(connected_account_id=any(main_ids));
  insert into public.follower_connection_account_memberships(creator_id,follower_connection_id,connected_account_id) select creator_row.id,connection_row.id,value from unnest(main_ids)value on conflict do nothing;
  update public.follower_recovery_destination_preferences set status='opted_out',opted_out_at=now() where follower_connection_id=connection_row.id and creator_id=creator_row.id and connected_account_id is not null and not(connected_account_id=any(recovery_ids));
  insert into public.follower_recovery_destination_preferences(creator_id,follower_connection_id,connected_account_id,status,selected_at,opted_out_at)
    select creator_row.id,connection_row.id,value,'active',now(),null from unnest(recovery_ids)value
    on conflict(follower_connection_id,connected_account_id) where connected_account_id is not null do update set status='active',selected_at=now(),opted_out_at=null;
  insert into public.follower_category_preferences(follower_connection_id,category_key,enabled) values(connection_row.id,'recovery',true)
    on conflict(follower_connection_id,category_key) do update set enabled=true;
  foreach category in array array['videos','livestreams','podcasts','products','events','announcements'] loop
    insert into public.follower_category_preferences(follower_connection_id,category_key,enabled) values(connection_row.id,category,category=any(coalesce(p_optional_preferences,'{}')))
      on conflict(follower_connection_id,category_key) do update set enabled=excluded.enabled;
  end loop;
  return jsonb_build_object('membership','active','selectedAccounts',selected_count,'recoveryAlerts',true);
end$$;

revoke all on function public.activate_public_recovery_pass(text,text,text[],text[]) from public,anon,authenticated;
grant execute on function public.activate_public_recovery_pass(text,text,text[],text[]) to service_role;

create table public.email_verification_challenges(
  id uuid primary key,
  creator_id uuid not null references public.creators(id) on delete cascade,
  follower_connection_id uuid references public.follower_connections(id) on delete cascade,
  email_hash text not null check(char_length(email_hash)=64),
  email_ciphertext text not null,
  email_masked text not null check(char_length(email_masked)<=254),
  code_hash text not null check(char_length(code_hash)=64),
  source_ip_hash text,
  source_platform text not null,
  source_referrer text,
  landing_path text,
  expires_at timestamptz not null,
  resend_available_at timestamptz not null,
  attempt_count integer not null default 0 check(attempt_count between 0 and 6),
  resend_count integer not null default 0 check(resend_count between 0 and 3),
  verified_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  replaced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(expires_at>created_at),
  check(num_nonnulls(completed_at,cancelled_at,replaced_at)<=1)
);
create index email_verification_email_rate_idx on public.email_verification_challenges(email_hash,created_at desc);
create index email_verification_ip_rate_idx on public.email_verification_challenges(source_ip_hash,created_at desc) where source_ip_hash is not null;
create unique index email_verification_one_active_idx on public.email_verification_challenges(creator_id,email_hash)
  where completed_at is null and cancelled_at is null and replaced_at is null;
create trigger email_verification_challenges_updated before update on public.email_verification_challenges
  for each row execute function public.set_updated_at();
alter table public.email_verification_challenges enable row level security;
alter table public.email_verification_challenges force row level security;
revoke all on public.email_verification_challenges from public,anon,authenticated;
grant select,insert,update,delete on public.email_verification_challenges to service_role;

create or replace function public.complete_email_recovery_verification(
  p_challenge_id uuid,p_preference_token_hash text,p_unsubscribe_token_hash text,p_token_expires_at timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare challenge_row public.email_verification_challenges%rowtype;contact_row public.follower_contacts%rowtype;
  method_row public.follower_recovery_methods%rowtype;connection_row public.follower_connections%rowtype;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501';end if;
  select * into challenge_row from public.email_verification_challenges where id=p_challenge_id for update;
  if not found or challenge_row.verified_at is null or challenge_row.completed_at is not null or challenge_row.cancelled_at is not null
    or challenge_row.replaced_at is not null or challenge_row.expires_at<=now() then raise exception 'email challenge is not completable' using errcode='23514';end if;
  if challenge_row.follower_connection_id is not null then
    select * into connection_row from public.follower_connections where id=challenge_row.follower_connection_id and creator_id=challenge_row.creator_id for update;
    if not found then raise exception 'member connection unavailable' using errcode='23514';end if;
    update public.follower_contacts set email_hash=challenge_row.email_hash,email_ciphertext=challenge_row.email_ciphertext,email_masked=challenge_row.email_masked where id=connection_row.follower_contact_id returning * into contact_row;
    update public.follower_recovery_methods set method_status='revoked' where follower_contact_id=contact_row.id and method_type='email' and destination_hash<>challenge_row.email_hash and method_status='verified';
  else
    insert into public.follower_contacts(email_hash,email_ciphertext,email_masked)
      values(challenge_row.email_hash,challenge_row.email_ciphertext,challenge_row.email_masked)
      on conflict(email_hash) do update set email_ciphertext=excluded.email_ciphertext,email_masked=excluded.email_masked
      returning * into contact_row;
  end if;
  insert into public.follower_recovery_methods(follower_contact_id,method_type,method_status,destination_hash,destination_masked,verified_at,consented_at,consent_source)
    values(contact_row.id,'email','verified',challenge_row.email_hash,challenge_row.email_masked,now(),now(),'creator_recovery_pass')
    on conflict(follower_contact_id,method_type,destination_hash) do update set method_status='verified',destination_masked=excluded.destination_masked,verified_at=now(),consented_at=now()
    returning * into method_row;
  insert into public.follower_connections(creator_id,follower_contact_id,status,consented_at,activated_at,preference_token_hash,unsubscribe_token_hash,preference_token_expires_at,unsubscribe_token_expires_at,management_tokens_revoked_at,consent_source,source_platform,source_referrer,landing_path)
    values(challenge_row.creator_id,contact_row.id,'paused',now(),now(),p_preference_token_hash,p_unsubscribe_token_hash,p_token_expires_at,p_token_expires_at,null,'creator_recovery_pass',challenge_row.source_platform,challenge_row.source_referrer,challenge_row.landing_path)
    on conflict(creator_id,follower_contact_id) do update set preference_token_hash=excluded.preference_token_hash,unsubscribe_token_hash=excluded.unsubscribe_token_hash,preference_token_expires_at=excluded.preference_token_expires_at,unsubscribe_token_expires_at=excluded.unsubscribe_token_expires_at,management_tokens_revoked_at=null
    returning * into connection_row;
  update public.follower_connections set selected_recovery_method_id=method_row.id where id=connection_row.id;
  update public.email_verification_challenges set completed_at=now() where id=challenge_row.id;
  return jsonb_build_object('connection','verified_pending_activation','method','email','masked',challenge_row.email_masked);
end$$;
revoke all on function public.complete_email_recovery_verification(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.complete_email_recovery_verification(uuid,text,text,timestamptz) to service_role;

create or replace function public.get_recovery_pass_member_state(p_slug text,p_preference_token_hash text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare creator_row public.creators%rowtype;connection_row public.follower_connections%rowtype;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501';end if;
  select * into creator_row from public.creators where public_slug=p_slug and public_profile_enabled and recovery_pass_enabled;
  if not found then return null;end if;
  select * into connection_row from public.follower_connections where creator_id=creator_row.id and preference_token_hash=p_preference_token_hash
    and management_tokens_revoked_at is null and preference_token_expires_at>now();
  if not found then return null;end if;
  return jsonb_build_object(
    'membershipStatus',connection_row.status,
    'accounts',coalesce((select jsonb_agg(jsonb_build_object('reference',encode(extensions.digest(a.id::text||':'||creator_row.public_slug,'sha256'),'hex'),'provider',a.platform,'label',coalesce(a.external_account_name,a.label),'handle',a.external_account_name,'profileUrl',a.url,'role',case a.account_type when'official'then'main'else'recovery'end)) from public.connected_accounts a where exists(select 1 from public.follower_connection_account_memberships m where m.follower_connection_id=connection_row.id and m.connected_account_id=a.id) or exists(select 1 from public.follower_recovery_destination_preferences p where p.follower_connection_id=connection_row.id and p.connected_account_id=a.id and p.status='active')),'[]'::jsonb),
    'preferences',coalesce((select jsonb_object_agg(category_key,enabled) from public.follower_category_preferences where follower_connection_id=connection_row.id),'{}'::jsonb),
    'deliveryMethods',coalesce((select jsonb_agg(jsonb_build_object('reference',encode(extensions.digest(id::text||':'||p_slug,'sha256'),'hex'),'type',method_type,'status',method_status,'masked',destination_masked,'selected',id=connection_row.selected_recovery_method_id)) from public.follower_recovery_methods where follower_contact_id=connection_row.follower_contact_id and method_status='verified'),'[]'::jsonb),
    'recoveryAlerts',exists(select 1 from public.follower_category_preferences where follower_connection_id=connection_row.id and category_key='recovery' and enabled)
  );
end$$;
revoke all on function public.get_recovery_pass_member_state(text,text) from public,anon,authenticated;
grant execute on function public.get_recovery_pass_member_state(text,text) to service_role;

create or replace function public.leave_public_recovery_pass(p_slug text,p_preference_token_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare connection_id uuid;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501';end if;
  select f.id into connection_id from public.follower_connections f join public.creators c on c.id=f.creator_id
    where c.public_slug=p_slug and f.preference_token_hash=p_preference_token_hash and f.management_tokens_revoked_at is null and f.preference_token_expires_at>now() for update of f;
  if connection_id is null then return false;end if;
  update public.follower_connections set status='deactivated',management_tokens_revoked_at=now() where id=connection_id;
  update public.follower_category_preferences set enabled=false where follower_connection_id=connection_id;
  update public.follower_recovery_destination_preferences set status='opted_out',opted_out_at=now() where follower_connection_id=connection_id and status='active';
  return true;
end$$;
revoke all on function public.leave_public_recovery_pass(text,text) from public,anon,authenticated;
grant execute on function public.leave_public_recovery_pass(text,text) to service_role;

commit;
