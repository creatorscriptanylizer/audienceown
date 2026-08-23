begin;

do $$declare shared_count integer;begin
 select count(*) into shared_count from(
  select recovery_connected_account_id from public.recovery_network_destinations
  group by recovery_connected_account_id having count(*)>1
 )shared;
 if shared_count>0 then
  raise exception 'exclusive Recovery ownership migration blocked: % shared Recovery account(s) require deliberate resolution',shared_count using errcode='P0001';
 end if;
end$$;

alter table public.recovery_network_destinations
 add constraint recovery_network_destinations_recovery_account_key unique(recovery_connected_account_id);

create or replace function public.set_recovery_network_destinations(p_creator_id uuid,p_recovery_network_id uuid,p_recovery_account_ids uuid[])
returns integer language plpgsql security definer set search_path='' as $$declare recovery_id uuid;normalized uuid[];result_count integer;begin
 if not exists(select 1 from public.creators where id=p_creator_id and owner_user_id=auth.uid())then raise exception 'access denied' using errcode='42501';end if;
 if not exists(select 1 from public.recovery_networks where id=p_recovery_network_id and creator_id=p_creator_id)then raise exception 'Recovery Network not found' using errcode='23514';end if;
 select coalesce(array_agg(distinct value),'{}'::uuid[])into normalized from unnest(coalesce(p_recovery_account_ids,'{}'::uuid[]))value;
 foreach recovery_id in array normalized loop
  if not exists(select 1 from public.connected_accounts where id=recovery_id and creator_id=p_creator_id and account_type='backup' and connection_health not in('revoked','expired') and provider_status<>'revoked')then raise exception 'active creator-owned Recovery account required' using errcode='23514';end if;
  if exists(select 1 from public.recovery_network_destinations where recovery_connected_account_id=recovery_id and recovery_network_id<>p_recovery_network_id)then raise exception 'recovery_account_already_assigned' using errcode='P0001';end if;
 end loop;
 delete from public.recovery_network_destinations where recovery_network_id=p_recovery_network_id and not(recovery_connected_account_id=any(normalized));
 begin
  insert into public.recovery_network_destinations(recovery_network_id,recovery_connected_account_id)
  select p_recovery_network_id,value from unnest(normalized)value
  on conflict(recovery_network_id,recovery_connected_account_id)do nothing;
 exception when unique_violation then
  raise exception 'recovery_account_already_assigned' using errcode='P0001';
 end;
 select count(*)into result_count from public.recovery_network_destinations where recovery_network_id=p_recovery_network_id;return result_count;
end$$;

create or replace function public.assign_recovery_account_to_network(p_creator_id uuid,p_recovery_network_id uuid,p_recovery_account_id uuid)
returns void language plpgsql security definer set search_path='' as $$begin
 if coalesce(auth.role(),'')<>'service_role' and not exists(select 1 from public.creators where id=p_creator_id and owner_user_id=auth.uid())then raise exception 'access denied' using errcode='42501';end if;
 if not exists(select 1 from public.recovery_networks where id=p_recovery_network_id and creator_id=p_creator_id)then raise exception 'Recovery Network not found' using errcode='23514';end if;
 if not exists(select 1 from public.connected_accounts where id=p_recovery_account_id and creator_id=p_creator_id and account_type='backup' and connection_health not in('revoked','expired') and provider_status<>'revoked')then raise exception 'active creator-owned Recovery account required' using errcode='23514';end if;
 if exists(select 1 from public.recovery_network_destinations where recovery_connected_account_id=p_recovery_account_id and recovery_network_id=p_recovery_network_id)then return;end if;
 begin
  insert into public.recovery_network_destinations(recovery_network_id,recovery_connected_account_id)values(p_recovery_network_id,p_recovery_account_id);
 exception when unique_violation then
  raise exception 'recovery_account_already_assigned' using errcode='P0001';
 end;
end$$;

revoke all on function public.assign_recovery_account_to_network(uuid,uuid,uuid) from public,anon;
grant execute on function public.assign_recovery_account_to_network(uuid,uuid,uuid) to authenticated,service_role;

comment on table public.recovery_network_destinations is 'Recovery connected accounts exclusively owned by one persistent Recovery Network.';

commit;
