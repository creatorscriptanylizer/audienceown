begin;

create table public.creator_update_recovery_destinations (
  update_id uuid not null references public.creator_updates(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  provider_snapshot text not null,
  account_display_snapshot text not null,
  destination_url_snapshot text not null check (destination_url_snapshot ~ '^https://'),
  created_at timestamptz not null default now(),
  primary key (update_id, connected_account_id)
);

create index creator_update_recovery_destinations_creator_idx
  on public.creator_update_recovery_destinations(creator_id, update_id);

create or replace function public.validate_creator_update_recovery_destination()
returns trigger language plpgsql set search_path='' as $$
declare affected_main uuid;
begin
  select affected_platform_connection_id into affected_main
  from public.creator_updates
  where id=new.update_id and creator_id=new.creator_id
    and broadcast_intent in ('account_hacked','account_banned','account_inaccessible','impersonation_warning','platform_migration');
  if affected_main is null then
    raise exception 'Recovery communication update required' using errcode='23514';
  end if;
  if not exists(
    select 1 from public.connected_accounts account
    where account.id=new.connected_account_id and account.creator_id=new.creator_id
      and account.account_type='backup'
      and account.connection_health not in ('revoked','expired')
      and account.provider_status<>'revoked'
      and account.url is not null and account.url ~ '^https://'
      and account.platform=new.provider_snapshot
      and coalesce(account.external_account_name,account.label)=new.account_display_snapshot
      and account.url=new.destination_url_snapshot
  ) then
    raise exception 'Active creator-owned Recovery account required' using errcode='23514';
  end if;
  if not exists(
    select 1 from public.recovery_networks network
    join public.recovery_network_destinations destination on destination.recovery_network_id=network.id
    where network.creator_id=new.creator_id and network.main_connected_account_id=affected_main
      and destination.recovery_connected_account_id=new.connected_account_id
  ) then
    raise exception 'Recovery destination must belong to affected Main account network' using errcode='23514';
  end if;
  return new;
end$$;

create trigger validate_creator_update_recovery_destination
before insert or update on public.creator_update_recovery_destinations
for each row execute function public.validate_creator_update_recovery_destination();

alter table public.creator_update_recovery_destinations enable row level security;
alter table public.creator_update_recovery_destinations force row level security;

create policy "owners read update Recovery destinations"
on public.creator_update_recovery_destinations for select to authenticated
using (exists(
  select 1 from public.creator_updates update_row
  join public.creators creator on creator.id=update_row.creator_id
  where update_row.id=update_id and update_row.creator_id=creator_id and creator.owner_user_id=auth.uid()
));

revoke all on public.creator_update_recovery_destinations from public,anon,authenticated;
grant select on public.creator_update_recovery_destinations to authenticated;
grant select,insert,update,delete on public.creator_update_recovery_destinations to service_role;

create or replace function public.replace_creator_update_recovery_destinations(
  p_update_id uuid, p_creator_id uuid, p_destination_ids uuid[]
) returns integer language plpgsql security definer set search_path='' as $$
declare normalized uuid[]; destination_count integer;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  select coalesce(array_agg(distinct value),'{}'::uuid[]) into normalized
  from unnest(coalesce(p_destination_ids,'{}'::uuid[])) value;
  if cardinality(normalized)=0 then raise exception 'At least one Recovery destination is required' using errcode='23514'; end if;
  delete from public.creator_update_recovery_destinations where update_id=p_update_id and creator_id=p_creator_id;
  insert into public.creator_update_recovery_destinations(
    update_id,creator_id,connected_account_id,provider_snapshot,account_display_snapshot,destination_url_snapshot
  ) select p_update_id,p_creator_id,account.id,account.platform,
      coalesce(account.external_account_name,account.label),account.url
    from public.connected_accounts account where account.id=any(normalized);
  get diagnostics destination_count=row_count;
  if destination_count<>cardinality(normalized) then raise exception 'Invalid Recovery destination set' using errcode='23514'; end if;
  return destination_count;
end$$;

create or replace function public.create_recovery_communication_draft(
  p_creator_id uuid, p_draft jsonb, p_destination_ids uuid[]
) returns uuid language plpgsql security definer set search_path='' as $$
declare created_id uuid;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  insert into public.creator_updates(
    creator_id,broadcast_type,broadcast_intent,affected_platform_connection_id,title,subject,preview_text,content,cta_label,cta_url,source_metadata
  ) values (
    p_creator_id,(p_draft->>'broadcast_type')::public.broadcast_type,(p_draft->>'broadcast_intent')::public.broadcast_intent,
    (p_draft->>'affected_platform_connection_id')::uuid,coalesce(p_draft->>'title',''),coalesce(p_draft->>'subject',''),
    coalesce(p_draft->>'preview_text',''),coalesce(p_draft->>'content',''),nullif(p_draft->>'cta_label',''),
    nullif(p_draft->>'cta_url',''),coalesce(p_draft->'source_metadata','{}'::jsonb)
  ) returning id into created_id;
  perform public.replace_creator_update_recovery_destinations(created_id,p_creator_id,p_destination_ids);
  return created_id;
end$$;

create or replace function public.update_recovery_communication_draft(
  p_update_id uuid, p_creator_id uuid, p_draft jsonb, p_destination_ids uuid[]
) returns uuid language plpgsql security definer set search_path='' as $$
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  update public.creator_updates set
    broadcast_type=(p_draft->>'broadcast_type')::public.broadcast_type,
    broadcast_intent=(p_draft->>'broadcast_intent')::public.broadcast_intent,
    affected_platform_connection_id=(p_draft->>'affected_platform_connection_id')::uuid,
    title=coalesce(p_draft->>'title',''),subject=coalesce(p_draft->>'subject',''),
    preview_text=coalesce(p_draft->>'preview_text',''),content=coalesce(p_draft->>'content',''),
    cta_label=nullif(p_draft->>'cta_label',''),cta_url=nullif(p_draft->>'cta_url',''),
    source_metadata=coalesce(p_draft->'source_metadata','{}'::jsonb)
  where id=p_update_id and creator_id=p_creator_id and status in ('draft','cancelled');
  if not found then raise exception 'Editable Recovery communication required' using errcode='23514'; end if;
  perform public.replace_creator_update_recovery_destinations(p_update_id,p_creator_id,p_destination_ids);
  return p_update_id;
end$$;

revoke all on function public.validate_creator_update_recovery_destination() from public,anon,authenticated;
revoke all on function public.replace_creator_update_recovery_destinations(uuid,uuid,uuid[]) from public,anon,authenticated;
revoke all on function public.create_recovery_communication_draft(uuid,jsonb,uuid[]) from public,anon,authenticated;
revoke all on function public.update_recovery_communication_draft(uuid,uuid,jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.replace_creator_update_recovery_destinations(uuid,uuid,uuid[]) to service_role;
grant execute on function public.create_recovery_communication_draft(uuid,jsonb,uuid[]) to service_role;
grant execute on function public.update_recovery_communication_draft(uuid,uuid,jsonb,uuid[]) to service_role;

comment on table public.creator_update_recovery_destinations is
  'Canonical trusted Recovery destinations selected for a Recovery communication; snapshots preserve delivery history.';

commit;
