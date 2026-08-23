begin;

create table public.recovery_networks(
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  main_connected_account_id uuid references public.connected_accounts(id) on delete set null,
  position integer not null default 0 check(position>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(main_connected_account_id),
  unique(creator_id,position)
);

create table public.recovery_network_destinations(
  recovery_network_id uuid not null references public.recovery_networks(id) on delete cascade,
  recovery_connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(recovery_network_id,recovery_connected_account_id)
);

create index recovery_networks_creator_idx on public.recovery_networks(creator_id,position);
create index recovery_network_destinations_recovery_idx on public.recovery_network_destinations(recovery_connected_account_id);
create trigger recovery_networks_updated before update on public.recovery_networks for each row execute function public.set_updated_at();

create or replace function public.validate_recovery_network()
returns trigger language plpgsql set search_path='' as $$begin
 if new.main_connected_account_id is not null and not exists(
   select 1 from public.connected_accounts a where a.id=new.main_connected_account_id and a.creator_id=new.creator_id and a.account_type='official'
 )then raise exception 'active creator-owned Main account required' using errcode='23514';end if;
 return new;end$$;
create trigger validate_recovery_network before insert or update on public.recovery_networks for each row execute function public.validate_recovery_network();

create or replace function public.validate_recovery_network_destination()
returns trigger language plpgsql set search_path='' as $$declare owner_id uuid;begin
 select creator_id into owner_id from public.recovery_networks where id=new.recovery_network_id;
 if owner_id is null or not exists(
   select 1 from public.connected_accounts a where a.id=new.recovery_connected_account_id and a.creator_id=owner_id and a.account_type='backup' and a.connection_health not in('revoked','expired') and a.provider_status<>'revoked'
 )then raise exception 'active creator-owned Recovery account required' using errcode='23514';end if;
 return new;end$$;
create trigger validate_recovery_network_destination before insert or update on public.recovery_network_destinations for each row execute function public.validate_recovery_network_destination();

insert into public.recovery_networks(creator_id,main_connected_account_id,position,created_at)
select a.creator_id,a.id,row_number()over(partition by a.creator_id order by a.is_primary desc,a.position,a.created_at,a.id)-1,a.created_at
from public.connected_accounts a where a.account_type='official';

insert into public.recovery_network_destinations(recovery_network_id,recovery_connected_account_id,created_at)
select n.id,legacy.recovery_connected_account_id,legacy.created_at
from public.main_account_recovery_destinations legacy
join public.recovery_networks n on n.creator_id=legacy.creator_id and n.main_connected_account_id=legacy.main_connected_account_id
on conflict do nothing;

create or replace function public.set_recovery_network_destinations(p_creator_id uuid,p_recovery_network_id uuid,p_recovery_account_ids uuid[])
returns integer language plpgsql security definer set search_path='' as $$declare recovery_id uuid;normalized uuid[];result_count integer;begin
 if not exists(select 1 from public.creators where id=p_creator_id and owner_user_id=auth.uid())then raise exception 'access denied' using errcode='42501';end if;
 if not exists(select 1 from public.recovery_networks where id=p_recovery_network_id and creator_id=p_creator_id)then raise exception 'Recovery Network not found' using errcode='23514';end if;
 select coalesce(array_agg(distinct value),'{}'::uuid[])into normalized from unnest(coalesce(p_recovery_account_ids,'{}'::uuid[]))value;
 foreach recovery_id in array normalized loop
  if not exists(select 1 from public.connected_accounts where id=recovery_id and creator_id=p_creator_id and account_type='backup' and connection_health not in('revoked','expired') and provider_status<>'revoked')then raise exception 'active creator-owned Recovery account required' using errcode='23514';end if;
 end loop;
 delete from public.recovery_network_destinations where recovery_network_id=p_recovery_network_id and not(recovery_connected_account_id=any(normalized));
 insert into public.recovery_network_destinations(recovery_network_id,recovery_connected_account_id)select p_recovery_network_id,value from unnest(normalized)value on conflict do nothing;
 select count(*)into result_count from public.recovery_network_destinations where recovery_network_id=p_recovery_network_id;return result_count;end$$;

create or replace function public.assign_main_to_recovery_network(p_creator_id uuid,p_recovery_network_id uuid,p_main_account_id uuid)
returns void language plpgsql security definer set search_path='' as $$begin
 if coalesce(auth.role(),'')<>'service_role' and not exists(select 1 from public.creators where id=p_creator_id and owner_user_id=auth.uid())then raise exception 'access denied' using errcode='42501';end if;
 if not exists(select 1 from public.connected_accounts where id=p_main_account_id and creator_id=p_creator_id and account_type='official')then raise exception 'active creator-owned Main account required' using errcode='23514';end if;
 delete from public.recovery_networks generated where generated.creator_id=p_creator_id and generated.main_connected_account_id=p_main_account_id and generated.id<>p_recovery_network_id and not exists(select 1 from public.recovery_network_destinations d where d.recovery_network_id=generated.id);
 update public.recovery_networks set main_connected_account_id=p_main_account_id where id=p_recovery_network_id and creator_id=p_creator_id and main_connected_account_id is null;
 if not found then raise exception 'Recovery Network is no longer empty' using errcode='23505';end if;
end$$;

create or replace function public.create_recovery_network_for_main()
returns trigger language plpgsql security definer set search_path='' as $$declare next_position integer;begin
 if new.account_type<>'official'then return new;end if;
 if exists(select 1 from public.recovery_networks where main_connected_account_id=new.id)then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended(new.creator_id::text||':recovery-network-position',0));
 select coalesce(max(position)+1,0)into next_position from public.recovery_networks where creator_id=new.creator_id;
 insert into public.recovery_networks(creator_id,main_connected_account_id,position)values(new.creator_id,new.id,next_position);return new;end$$;
create trigger create_recovery_network_for_main after insert on public.connected_accounts for each row execute function public.create_recovery_network_for_main();

alter table public.recovery_networks enable row level security;alter table public.recovery_networks force row level security;
alter table public.recovery_network_destinations enable row level security;alter table public.recovery_network_destinations force row level security;
create policy "owner reads recovery networks" on public.recovery_networks for select to authenticated using(exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=auth.uid()));
create policy "owner reads recovery network destinations" on public.recovery_network_destinations for select to authenticated using(exists(select 1 from public.recovery_networks n join public.creators c on c.id=n.creator_id where n.id=recovery_network_id and c.owner_user_id=auth.uid()));
revoke all on public.recovery_networks,public.recovery_network_destinations from public,anon,authenticated;
grant select on public.recovery_networks,public.recovery_network_destinations to authenticated;
grant select,insert,update,delete on public.recovery_networks,public.recovery_network_destinations to service_role;
revoke all on function public.set_recovery_network_destinations(uuid,uuid,uuid[]) from public,anon;grant execute on function public.set_recovery_network_destinations(uuid,uuid,uuid[]) to authenticated;
revoke all on function public.assign_main_to_recovery_network(uuid,uuid,uuid) from public,anon;grant execute on function public.assign_main_to_recovery_network(uuid,uuid,uuid) to authenticated,service_role;
revoke all on function public.create_recovery_network_for_main() from public,anon,authenticated;

comment on table public.recovery_networks is 'Stable creator-owned Recovery Network slots with a replaceable Main assignment.';
comment on table public.recovery_network_destinations is 'Reusable Recovery connected accounts assigned to persistent Recovery Network slots.';

commit;
