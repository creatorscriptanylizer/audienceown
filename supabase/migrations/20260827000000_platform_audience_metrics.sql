-- Stage 8.8 authoritative, aggregate-only platform audience metrics.
begin;

create table public.provider_audience_metrics(
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.creators(id) on delete cascade,
 connection_id uuid references public.connected_accounts(id) on delete cascade, asset_binding_id uuid references public.provider_asset_bindings(id) on delete cascade,
 provider text not null check(provider in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','threads','pinterest','discord')),
 account_category text not null check(char_length(btrim(account_category)) between 1 and 80), audience_count bigint check(audience_count is null or audience_count>=0),
 audience_unit text check(audience_unit is null or audience_unit in('followers','subscribers','members','listeners','connections')),
 status text not null check(status in('available','hidden','permission_required','review_required','access_limited','unsupported','not_connected','not_selected','stale','error','not_synced')),
 approximate boolean not null default false, source_observed_at timestamptz, synchronized_at timestamptz not null default now(), next_sync_at timestamptz,
 last_success_at timestamptz, consecutive_failures integer not null default 0 check(consecutive_failures>=0), lease_owner uuid, lease_expires_at timestamptz,
 error_code text check(error_code is null or error_code~'^[a-z0-9_]{1,80}$'), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(connection_id is not null or asset_binding_id is not null), check((status='available')=(audience_count is not null and audience_unit is not null))
);
create unique index provider_audience_metrics_connection_uidx on public.provider_audience_metrics(creator_id,provider,connection_id) where asset_binding_id is null;
create unique index provider_audience_metrics_asset_uidx on public.provider_audience_metrics(creator_id,provider,asset_binding_id) where asset_binding_id is not null;
create index provider_audience_metrics_due_idx on public.provider_audience_metrics(next_sync_at) where next_sync_at is not null;
create trigger provider_audience_metrics_updated before update on public.provider_audience_metrics for each row execute function public.set_updated_at();

create table public.provider_audience_metric_snapshots(
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.creators(id) on delete cascade,
 metric_id uuid not null references public.provider_audience_metrics(id) on delete cascade, provider text not null,
 audience_count bigint not null check(audience_count>=0), audience_unit text not null check(audience_unit in('followers','subscribers','members','listeners','connections')),
 observed_on date not null, source_observed_at timestamptz, approximate boolean not null default false, created_at timestamptz not null default now(), unique(metric_id,observed_on)
);
create index provider_audience_snapshots_creator_idx on public.provider_audience_metric_snapshots(creator_id,provider,observed_on desc);

-- A Recovery Pass preference points at an existing canonical account/destination.
-- It stores no fan address and does not duplicate provider identity.
create table public.follower_recovery_destination_preferences(
 id uuid primary key default gen_random_uuid(),
 creator_id uuid not null references public.creators(id) on delete cascade,
 follower_connection_id uuid not null references public.follower_connections(id) on delete cascade,
 connected_account_id uuid references public.connected_accounts(id) on delete cascade,
 identity_account_id uuid references public.creator_identity_accounts(id) on delete cascade,
 ecosystem_destination_id uuid references public.creator_ecosystem_destinations(id) on delete cascade,
 status text not null default 'active' check(status in('active','opted_out','suppressed')),
 selected_at timestamptz not null default now(), opted_out_at timestamptz, updated_at timestamptz not null default now(),
 check(num_nonnulls(connected_account_id,identity_account_id,ecosystem_destination_id)=1),
 check((status='opted_out')=(opted_out_at is not null))
);
create unique index follower_recovery_destination_connection_uidx on public.follower_recovery_destination_preferences(follower_connection_id,connected_account_id) where connected_account_id is not null;
create unique index follower_recovery_destination_identity_uidx on public.follower_recovery_destination_preferences(follower_connection_id,identity_account_id) where identity_account_id is not null;
create unique index follower_recovery_destination_ecosystem_uidx on public.follower_recovery_destination_preferences(follower_connection_id,ecosystem_destination_id) where ecosystem_destination_id is not null;
create index follower_recovery_destination_creator_idx on public.follower_recovery_destination_preferences(creator_id,status,selected_at desc);
create trigger follower_recovery_destination_preferences_updated before update on public.follower_recovery_destination_preferences for each row execute function public.set_updated_at();

create or replace function public.validate_recovery_destination_preference_scope() returns trigger language plpgsql set search_path='' as $$begin
 if not exists(select 1 from public.follower_connections f where f.id=new.follower_connection_id and f.creator_id=new.creator_id) then raise exception 'connection scope invalid' using errcode='23514'; end if;
 if new.connected_account_id is not null and not exists(select 1 from public.connected_accounts a where a.id=new.connected_account_id and a.creator_id=new.creator_id and a.account_type='backup') then raise exception 'backup account required' using errcode='23514'; end if;
 if new.identity_account_id is not null and not exists(select 1 from public.creator_identity_accounts a where a.id=new.identity_account_id and a.creator_id=new.creator_id and not a.official and a.verification_status='verified' and a.account_kind='replacement_account') then raise exception 'verified replacement required' using errcode='23514'; end if;
 if new.ecosystem_destination_id is not null and not exists(select 1 from public.creator_ecosystem_destinations d where d.id=new.ecosystem_destination_id and d.creator_id=new.creator_id and d.verification_status='verified' and d.archived_at is null and d.revoked_at is null) then raise exception 'verified recovery destination required' using errcode='23514'; end if;
 return new;
end$$;
create trigger validate_recovery_destination_preference before insert or update on public.follower_recovery_destination_preferences for each row execute function public.validate_recovery_destination_preference_scope();

create or replace function public.claim_provider_audience_metrics(p_limit integer default 20,p_lease_owner uuid default gen_random_uuid()) returns setof public.provider_audience_metrics language plpgsql security definer set search_path='' as $$begin
 if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
 return query with claimed as(select m.id from public.provider_audience_metrics m where(m.next_sync_at is null or m.next_sync_at<=now())and(m.lease_expires_at is null or m.lease_expires_at<=now()) order by m.next_sync_at nulls first,m.synchronized_at for update skip locked limit greatest(1,least(p_limit,100))) update public.provider_audience_metrics m set lease_owner=p_lease_owner,lease_expires_at=now()+interval'5 minutes' from claimed where m.id=claimed.id returning m.*;
end$$;

create or replace function public.upsert_provider_audience_metric(p_creator_id uuid,p_connection_id uuid,p_asset_binding_id uuid,p_provider text,p_account_category text,p_count bigint,p_unit text,p_status text,p_approximate boolean,p_source_observed_at timestamptz,p_next_sync_at timestamptz,p_error_code text default null) returns uuid language plpgsql security definer set search_path='' as $$declare result uuid;begin
 if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
 if p_count is not null and p_count<0 then raise exception 'invalid count' using errcode='23514'; end if;
 select id into result from public.provider_audience_metrics where creator_id=p_creator_id and provider=p_provider and ((p_asset_binding_id is not null and asset_binding_id=p_asset_binding_id)or(p_asset_binding_id is null and connection_id=p_connection_id)) for update;
 if result is null then insert into public.provider_audience_metrics(creator_id,connection_id,asset_binding_id,provider,account_category,audience_count,audience_unit,status,approximate,source_observed_at,synchronized_at,next_sync_at,last_success_at,error_code) values(p_creator_id,p_connection_id,p_asset_binding_id,p_provider,p_account_category,p_count,p_unit,p_status,p_approximate,p_source_observed_at,now(),p_next_sync_at,case when p_status='available'then now()end,p_error_code) returning id into result;
 else update public.provider_audience_metrics set audience_count=p_count,audience_unit=p_unit,status=p_status,approximate=p_approximate,source_observed_at=p_source_observed_at,synchronized_at=now(),next_sync_at=p_next_sync_at,last_success_at=case when p_status='available'then now()else last_success_at end,consecutive_failures=case when p_status in('available','hidden')then 0 else consecutive_failures+1 end,lease_owner=null,lease_expires_at=null,error_code=p_error_code where id=result; end if;
 return result;
end$$;

create or replace function public.append_provider_audience_snapshot(p_metric_id uuid) returns boolean language plpgsql security definer set search_path='' as $$declare inserted integer;begin
 if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
 insert into public.provider_audience_metric_snapshots(creator_id,metric_id,provider,audience_count,audience_unit,observed_on,source_observed_at,approximate) select creator_id,id,provider,audience_count,audience_unit,coalesce(source_observed_at,now())::date,source_observed_at,approximate from public.provider_audience_metrics where id=p_metric_id and status='available' on conflict(metric_id,observed_on)do nothing;get diagnostics inserted=row_count;return inserted=1;
end$$;

create or replace function public.get_creator_platform_audience_metrics() returns table(provider text,account_category text,audience_count bigint,audience_unit text,status text,approximate boolean,source_observed_at timestamptz,synchronized_at timestamptz,next_sync_at timestamptz,growth_percent numeric,trend bigint[]) language sql stable security definer set search_path='' as $$
 select m.provider,m.account_category,m.audience_count,m.audience_unit,m.status,m.approximate,m.source_observed_at,m.synchronized_at,m.next_sync_at,
 case when comparison.audience_count>0 then round((m.audience_count-comparison.audience_count)::numeric/comparison.audience_count,4)else null end,
 case when history.points>=3 and history.days>=2 then history.values else null end
 from public.provider_audience_metrics m
 left join lateral(select s.audience_count from public.provider_audience_metric_snapshots s where s.metric_id=m.id order by s.observed_on asc limit 1)comparison on true
 left join lateral(select count(*) points,count(distinct s.observed_on)days,array_agg(s.audience_count order by s.observed_on)values from public.provider_audience_metric_snapshots s where s.metric_id=m.id)history on true
 where public.has_creator_permission(m.creator_id,'emergency_manage')
$$;

create or replace function public.get_creator_recovery_destination_breakdown() returns table(destination_id uuid,provider text,display_name text,display_handle text,role text,verification_state text,opted_in_fan_count bigint,coverage_percent numeric,synchronized_at timestamptz,href text) language sql stable security definer set search_path='' as $$
 with allowed_creator as(select c.id from public.creators c where public.has_creator_permission(c.id,'emergency_manage') limit 1),
 usable_preferences as(
  select distinct p.follower_connection_id,p.connected_account_id,p.identity_account_id,p.ecosystem_destination_id
  from public.follower_recovery_destination_preferences p join public.follower_connections f on f.id=p.follower_connection_id and f.creator_id=p.creator_id
  join allowed_creator c on c.id=p.creator_id where p.status='active' and f.status='active'
 ), protected as(select count(distinct follower_connection_id)::bigint total from usable_preferences),
 destinations as(
  select a.id destination_id,a.platform provider,a.label display_name,null::text display_handle,'backup'::text role,
   case when coalesce(i.verification_status,'unverified')='verified' then 'verified' when coalesce(i.verification_status,'unverified')='revoked' then 'revoked' when coalesce(i.verification_status,'unverified')='needs_attention' then 'needs_attention' else 'unverified' end verification_state,
   a.updated_at synchronized_at
  from public.connected_accounts a join allowed_creator c on c.id=a.creator_id
  left join public.creator_identity_accounts i on i.source_connection_id=a.id and i.creator_id=a.creator_id
  where a.account_type='backup'
  union all
  select i.id,i.provider,coalesce(i.display_name,i.display_handle,i.provider),i.display_handle,
   case when exists(select 1 from public.creator_identity_relationships r where r.target_account_id=i.id and r.relationship_type='emergency_replacement_for' and r.status='active') then 'emergency_replacement' else 'recovery_destination' end,
   case when i.verification_status='verified' then 'verified' when i.verification_status='revoked' then 'revoked' when i.verification_status='needs_attention' then 'needs_attention' else 'unverified' end,i.last_synced_at
  from public.creator_identity_accounts i join allowed_creator c on c.id=i.creator_id where not i.official and i.account_kind='replacement_account' and i.verification_status not in('archived','revoked')
  union all
  select e.id,e.provider,e.display_name,e.display_handle,'recovery_destination',case when e.verification_status='verified' then 'verified' when e.verification_status='revoked' then 'revoked' when e.verification_status='needs_attention' then 'needs_attention' else 'unverified' end,e.last_synced_at
  from public.creator_ecosystem_destinations e join allowed_creator c on c.id=e.creator_id where e.archived_at is null and e.revoked_at is null and e.verification_status<>'archived'
 )
 select d.destination_id,d.provider,d.display_name,d.display_handle,d.role,d.verification_state,count(distinct p.follower_connection_id)::bigint,
  case when protected.total=0 then null else round(count(distinct p.follower_connection_id)::numeric*100/protected.total,1) end,d.synchronized_at,'/dashboard/platforms'::text
 from destinations d cross join protected left join usable_preferences p on p.connected_account_id=d.destination_id or p.identity_account_id=d.destination_id or p.ecosystem_destination_id=d.destination_id
 group by d.destination_id,d.provider,d.display_name,d.display_handle,d.role,d.verification_state,d.synchronized_at,protected.total order by count(distinct p.follower_connection_id) desc,d.display_name limit 100
$$;

create or replace function public.get_creator_protected_fan_count() returns bigint language sql stable security definer set search_path='' as $$
 select count(distinct p.follower_connection_id)::bigint from public.follower_recovery_destination_preferences p
 join public.follower_connections f on f.id=p.follower_connection_id and f.creator_id=p.creator_id
 where public.has_creator_permission(p.creator_id,'emergency_manage') and p.status='active' and f.status='active'
   and (p.connected_account_id is not null
    or exists(select 1 from public.creator_identity_accounts i where i.id=p.identity_account_id and i.verification_status='verified' and i.revoked_at is null and i.archived_at is null)
    or exists(select 1 from public.creator_ecosystem_destinations e where e.id=p.ecosystem_destination_id and e.verification_status='verified' and e.revoked_at is null and e.archived_at is null))
$$;

create or replace function public.get_creator_recent_recovery_opt_ins(p_limit integer default 5) returns table(preference_id uuid,selected_at timestamptz,destination_count bigint,provider text) language sql stable security definer set search_path='' as $$
 select (array_agg(p.id order by p.selected_at desc))[1],max(p.selected_at),count(distinct coalesce(p.connected_account_id,p.identity_account_id,p.ecosystem_destination_id)),case when count(distinct coalesce(p.connected_account_id,p.identity_account_id,p.ecosystem_destination_id))=1 then min(coalesce(a.platform,i.provider,e.provider)) end
 from public.follower_recovery_destination_preferences p join public.follower_connections f on f.id=p.follower_connection_id and f.creator_id=p.creator_id
 left join public.connected_accounts a on a.id=p.connected_account_id left join public.creator_identity_accounts i on i.id=p.identity_account_id left join public.creator_ecosystem_destinations e on e.id=p.ecosystem_destination_id
 where public.has_creator_permission(p.creator_id,'emergency_manage') and p.status='active' and f.status='active' group by p.follower_connection_id order by max(p.selected_at) desc limit greatest(1,least(p_limit,20))
$$;

alter table public.provider_audience_metrics enable row level security;alter table public.provider_audience_metrics force row level security;
alter table public.provider_audience_metric_snapshots enable row level security;alter table public.provider_audience_metric_snapshots force row level security;
alter table public.follower_recovery_destination_preferences enable row level security;alter table public.follower_recovery_destination_preferences force row level security;
create policy "creator audience metric reads" on public.provider_audience_metrics for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
create policy "creator audience snapshot reads" on public.provider_audience_metric_snapshots for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
create policy "creator recovery destination preference reads" on public.follower_recovery_destination_preferences for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
revoke all on public.provider_audience_metrics,public.provider_audience_metric_snapshots from public,anon,authenticated;
grant select on public.provider_audience_metrics,public.provider_audience_metric_snapshots to authenticated;grant select,insert,update,delete on public.provider_audience_metrics,public.provider_audience_metric_snapshots to service_role;
revoke all on public.follower_recovery_destination_preferences from public,anon,authenticated;grant select on public.follower_recovery_destination_preferences to authenticated;grant select,insert,update,delete on public.follower_recovery_destination_preferences to service_role;
revoke all on function public.validate_recovery_destination_preference_scope() from public,anon,authenticated;
revoke all on function public.claim_provider_audience_metrics(integer,uuid),public.upsert_provider_audience_metric(uuid,uuid,uuid,text,text,bigint,text,text,boolean,timestamptz,timestamptz,text),public.append_provider_audience_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.claim_provider_audience_metrics(integer,uuid),public.upsert_provider_audience_metric(uuid,uuid,uuid,text,text,bigint,text,text,boolean,timestamptz,timestamptz,text),public.append_provider_audience_snapshot(uuid) to service_role;
revoke all on function public.get_creator_platform_audience_metrics() from public,anon;grant execute on function public.get_creator_platform_audience_metrics() to authenticated;
revoke all on function public.get_creator_recovery_destination_breakdown(),public.get_creator_recent_recovery_opt_ins(integer),public.get_creator_protected_fan_count() from public,anon;grant execute on function public.get_creator_recovery_destination_breakdown(),public.get_creator_recent_recovery_opt_ins(integer),public.get_creator_protected_fan_count() to authenticated;
commit;
