begin;

create table public.creator_team_members(
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(creator_id,user_id),
  check(permissions <@ array['emergency_manage','emergency_approve','emergency_activate'])
);

create table public.creator_emergencies(
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  emergency_type text not null check(emergency_type in(
    'account_hacked','account_banned','account_suspended','account_changed',
    'fake_account_warning','scam_warning','other')),
  lifecycle_status text not null default 'draft' check(lifecycle_status in(
    'draft','pending_verification','pending_approval','ready','active','resolved','cancelled')),
  severity text not null default 'important' check(severity in('informational','important','critical')),
  title text not null check(char_length(title) between 1 and 160),
  message text not null check(char_length(message) between 1 and 5000),
  requested_by uuid not null references auth.users(id) on delete restrict,
  content_revision integer not null default 1,
  approved_revision integer,
  creator_update_id uuid references public.creator_updates(id) on delete restrict,
  submitted_at timestamptz,
  activated_at timestamptz,
  resolved_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index creator_emergencies_creator_status_idx on public.creator_emergencies(creator_id,lifecycle_status,updated_at desc);
create unique index one_active_creator_emergency on public.creator_emergencies(creator_id) where lifecycle_status='active';

create table public.emergency_affected_accounts(
  id uuid primary key default gen_random_uuid(),
  emergency_id uuid not null references public.creator_emergencies(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete restrict,
  provider text not null check(char_length(provider) between 1 and 40),
  stable_provider_account_id text not null check(char_length(stable_provider_account_id) between 1 and 255),
  display_handle text not null check(char_length(display_handle) between 1 and 120),
  canonical_profile_url text not null check(canonical_profile_url ~ '^https://'),
  created_at timestamptz not null default now(),
  unique(emergency_id,provider,stable_provider_account_id)
);

create table public.emergency_replacement_accounts(
  id uuid primary key default gen_random_uuid(),
  emergency_id uuid not null references public.creator_emergencies(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  provider text not null check(char_length(provider) between 1 and 40),
  stable_provider_account_id text not null check(char_length(stable_provider_account_id) between 1 and 255),
  display_handle text not null check(char_length(display_handle) between 1 and 120),
  canonical_profile_url text not null check(canonical_profile_url ~ '^https://'),
  verification_state text not null default 'pending' check(verification_state in('pending','verified','rejected','revoked')),
  verification_method text check(verification_method is null or verification_method in('oauth','provider_api','dns','manual_review')),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete restrict,
  official boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(emergency_id,provider,stable_provider_account_id),
  check(not official or (verification_state='verified' and verified_at is not null and verified_by is not null))
);

create table public.emergency_approvals(
  id uuid primary key default gen_random_uuid(),
  emergency_id uuid not null references public.creator_emergencies(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  revision integer not null,
  decision text not null check(decision in('approved','rejected','invalidated')),
  decided_by uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now(),
  invalidated_at timestamptz,
  reason text check(reason is null or char_length(reason)<=500),
  unique(emergency_id,revision,decided_by)
);

create table public.emergency_alert_snapshots(
  id uuid primary key default gen_random_uuid(),
  emergency_id uuid not null references public.creator_emergencies(id) on delete restrict,
  creator_id uuid not null references public.creators(id) on delete restrict,
  creator_update_id uuid not null unique references public.creator_updates(id) on delete restrict,
  revision integer not null,
  emergency_type text not null,
  severity text not null,
  title text not null,
  message text not null,
  affected_accounts jsonb not null,
  replacement_accounts jsonb not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.emergency_events(
  id bigint generated always as identity primary key,
  emergency_id uuid not null references public.creator_emergencies(id) on delete restrict,
  creator_id uuid not null references public.creators(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check(char_length(event_type) between 1 and 80),
  from_status text,
  to_status text,
  revision integer not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index emergency_events_incident_idx on public.emergency_events(emergency_id,id);

create or replace function public.has_creator_permission(p_creator_id uuid,p_permission text)
returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.creators c where c.id=p_creator_id and c.owner_user_id=auth.uid())
or exists(select 1 from public.creator_team_members m where m.creator_id=p_creator_id and m.user_id=auth.uid()
and p_permission=any(m.permissions))$$;
revoke all on function public.has_creator_permission(uuid,text) from public,anon;
grant execute on function public.has_creator_permission(uuid,text) to authenticated,service_role;

create or replace function public.emergency_append_event(p_emergency_id uuid,p_event_type text,p_from text,p_to text,p_metadata jsonb default '{}')
returns void language plpgsql security definer set search_path='' as $$
declare e public.creator_emergencies%rowtype;begin
select * into e from public.creator_emergencies where id=p_emergency_id;
insert into public.emergency_events(emergency_id,creator_id,actor_user_id,event_type,from_status,to_status,revision,metadata)
values(e.id,e.creator_id,auth.uid(),p_event_type,p_from,p_to,e.content_revision,coalesce(p_metadata,'{}'));
end$$;
revoke all on function public.emergency_append_event(uuid,text,text,text,jsonb) from public,anon,authenticated;

create or replace function public.invalidate_emergency_approval()
returns trigger language plpgsql security definer set search_path='' as $$
begin
if new.title is distinct from old.title or new.message is distinct from old.message
or new.severity is distinct from old.severity or new.emergency_type is distinct from old.emergency_type then
  if old.lifecycle_status not in('draft','pending_verification','pending_approval','ready') then
    raise exception 'active or closed emergency content is immutable' using errcode='55000';
  end if;
  new.content_revision=old.content_revision+1;new.approved_revision=null;
  if old.lifecycle_status in('ready','pending_approval') then new.lifecycle_status='pending_approval';end if;
  update public.emergency_approvals set decision='invalidated',invalidated_at=now()
  where emergency_id=old.id and decision='approved' and invalidated_at is null;
end if;return new;end$$;
create trigger invalidate_emergency_approval before update on public.creator_emergencies
for each row execute function public.invalidate_emergency_approval();
create trigger creator_emergencies_updated before update on public.creator_emergencies
for each row execute function public.set_updated_at();
create trigger emergency_replacement_accounts_updated before update on public.emergency_replacement_accounts
for each row execute function public.set_updated_at();

create or replace function public.prevent_emergency_history_mutation()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'emergency history is immutable' using errcode='55000';end$$;
create trigger immutable_emergency_snapshots before update or delete on public.emergency_alert_snapshots
for each row execute function public.prevent_emergency_history_mutation();
create trigger append_only_emergency_events before update or delete on public.emergency_events
for each row execute function public.prevent_emergency_history_mutation();

create or replace function public.create_emergency(
 p_type text,p_severity text,p_title text,p_message text,p_affected_account uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid;e_id uuid;a public.connected_accounts%rowtype;begin
select id into cid from public.creators where owner_user_id=auth.uid();
if cid is null then raise exception 'creator required' using errcode='42501';end if;
select * into a from public.connected_accounts where id=p_affected_account and creator_id=cid and account_type='official';
if not found then raise exception 'affected account invalid' using errcode='23514';end if;
insert into public.creator_emergencies(creator_id,emergency_type,severity,title,message,requested_by)
values(cid,p_type,p_severity,btrim(p_title),btrim(p_message),auth.uid()) returning id into e_id;
insert into public.emergency_affected_accounts(emergency_id,creator_id,connected_account_id,provider,stable_provider_account_id,display_handle,canonical_profile_url)
values(e_id,cid,a.id,a.platform,a.id::text,a.label,a.url);
perform public.emergency_append_event(e_id,'created',null,'draft','{}');return e_id;end$$;
revoke all on function public.create_emergency(text,text,text,text,uuid) from public,anon;
grant execute on function public.create_emergency(text,text,text,text,uuid) to authenticated;

create or replace function public.update_emergency(
 p_emergency_id uuid,p_type text,p_severity text,p_title text,p_message text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.creator_emergencies%rowtype;begin
select * into e from public.creator_emergencies where id=p_emergency_id for update;
if not found or not public.has_creator_permission(e.creator_id,'emergency_manage') then raise exception 'access denied' using errcode='42501';end if;
if e.lifecycle_status not in('draft','pending_verification','pending_approval','ready') then raise exception 'incident is not editable' using errcode='55000';end if;
update public.creator_emergencies set emergency_type=p_type,severity=p_severity,title=btrim(p_title),message=btrim(p_message) where id=e.id;
perform public.emergency_append_event(e.id,'content_updated',e.lifecycle_status,
(select lifecycle_status from public.creator_emergencies where id=e.id),'{}');
return jsonb_build_object('status',(select lifecycle_status from public.creator_emergencies where id=e.id),
'revision',(select content_revision from public.creator_emergencies where id=e.id));end$$;
revoke all on function public.update_emergency(uuid,text,text,text,text) from public,anon;
grant execute on function public.update_emergency(uuid,text,text,text,text) to authenticated;

create or replace function public.add_emergency_replacement(
 p_emergency_id uuid,p_provider text,p_account_id text,p_handle text,p_url text
) returns uuid language plpgsql security definer set search_path='' as $$
declare e public.creator_emergencies%rowtype;r_id uuid;begin
select * into e from public.creator_emergencies where id=p_emergency_id for update;
if not found or not public.has_creator_permission(e.creator_id,'emergency_manage') then raise exception 'access denied' using errcode='42501';end if;
insert into public.emergency_replacement_accounts(emergency_id,creator_id,provider,stable_provider_account_id,display_handle,canonical_profile_url)
values(e.id,e.creator_id,p_provider,p_account_id,p_handle,p_url)
on conflict(emergency_id,provider,stable_provider_account_id) do update set display_handle=excluded.display_handle,
canonical_profile_url=excluded.canonical_profile_url,verification_state='pending',verification_method=null,verified_at=null,verified_by=null,official=false
returning id into r_id;
update public.creator_emergencies set content_revision=content_revision+1,approved_revision=null,
lifecycle_status=case when lifecycle_status in('pending_approval','ready') then 'pending_verification' else lifecycle_status end where id=e.id;
update public.emergency_approvals set decision='invalidated',invalidated_at=now()
where emergency_id=e.id and decision='approved' and invalidated_at is null;
perform public.emergency_append_event(e.id,'replacement_added',e.lifecycle_status,
case when e.lifecycle_status in('pending_approval','ready') then 'pending_verification' else e.lifecycle_status end,jsonb_build_object('replacement_id',r_id));
return r_id;end$$;
revoke all on function public.add_emergency_replacement(uuid,text,text,text,text) from public,anon;
grant execute on function public.add_emergency_replacement(uuid,text,text,text,text) to authenticated;

create or replace function public.submit_emergency(p_emergency_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.creator_emergencies%rowtype;next text;begin
select * into e from public.creator_emergencies where id=p_emergency_id for update;
if not found or not public.has_creator_permission(e.creator_id,'emergency_manage') then raise exception 'access denied' using errcode='42501';end if;
if e.lifecycle_status not in('draft','pending_verification','pending_approval','ready') then raise exception 'invalid transition' using errcode='55000';end if;
next:=case when exists(select 1 from public.emergency_replacement_accounts r where r.emergency_id=e.id and r.verification_state<>'verified')
then 'pending_verification' else 'pending_approval' end;
update public.creator_emergencies set lifecycle_status=next,submitted_at=now() where id=e.id;
perform public.emergency_append_event(e.id,'submitted',e.lifecycle_status,next,'{}');
return jsonb_build_object('status',next);end$$;
revoke all on function public.submit_emergency(uuid) from public,anon;
grant execute on function public.submit_emergency(uuid) to authenticated;

create or replace function public.verify_emergency_replacement(
 p_emergency_id uuid,p_provider text,p_account_id text,p_handle text,p_url text,p_method text,p_official boolean default true
) returns uuid language plpgsql security definer set search_path='' as $$
declare e public.creator_emergencies%rowtype;r_id uuid;begin
select * into e from public.creator_emergencies where id=p_emergency_id for update;
if not found or not public.has_creator_permission(e.creator_id,'emergency_manage') then raise exception 'access denied' using errcode='42501';end if;
if p_method not in('oauth','provider_api','dns','manual_review') then raise exception 'verification method invalid' using errcode='23514';end if;
insert into public.emergency_replacement_accounts(emergency_id,creator_id,provider,stable_provider_account_id,display_handle,
canonical_profile_url,verification_state,verification_method,verified_at,verified_by,official)
values(e.id,e.creator_id,p_provider,p_account_id,p_handle,p_url,'verified',p_method,now(),auth.uid(),p_official)
on conflict(emergency_id,provider,stable_provider_account_id) do update set display_handle=excluded.display_handle,
canonical_profile_url=excluded.canonical_profile_url,verification_state='verified',verification_method=excluded.verification_method,
verified_at=now(),verified_by=auth.uid(),official=excluded.official returning id into r_id;
update public.creator_emergencies set content_revision=content_revision+1,approved_revision=null,
lifecycle_status=case when lifecycle_status='pending_verification' then 'pending_approval' else lifecycle_status end where id=e.id;
update public.emergency_approvals set decision='invalidated',invalidated_at=now()
where emergency_id=e.id and decision='approved' and invalidated_at is null;
perform public.emergency_append_event(e.id,'replacement_verified',e.lifecycle_status,
case when e.lifecycle_status='pending_verification' then 'pending_approval' else e.lifecycle_status end,jsonb_build_object('replacement_id',r_id));
return r_id;end$$;
revoke all on function public.verify_emergency_replacement(uuid,text,text,text,text,text,boolean) from public,anon;
grant execute on function public.verify_emergency_replacement(uuid,text,text,text,text,text,boolean) to authenticated;

create or replace function public.approve_emergency(p_emergency_id uuid,p_reason text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.creator_emergencies%rowtype;begin
select * into e from public.creator_emergencies where id=p_emergency_id for update;
if not found or not public.has_creator_permission(e.creator_id,'emergency_approve') then raise exception 'approval access denied' using errcode='42501';end if;
if e.lifecycle_status<>'pending_approval' then raise exception 'invalid transition' using errcode='55000';end if;
if e.severity='critical' and e.requested_by=auth.uid() then raise exception 'critical requester cannot self-approve' using errcode='42501';end if;
insert into public.emergency_approvals(emergency_id,creator_id,revision,decision,decided_by,reason)
values(e.id,e.creator_id,e.content_revision,'approved',auth.uid(),p_reason);
update public.creator_emergencies set lifecycle_status='ready',approved_revision=content_revision where id=e.id;
perform public.emergency_append_event(e.id,'approved','pending_approval','ready','{}');
return jsonb_build_object('status','ready','revision',e.content_revision);end$$;
revoke all on function public.approve_emergency(uuid,text) from public,anon;
grant execute on function public.approve_emergency(uuid,text) to authenticated;

create or replace function public.activate_emergency(p_emergency_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.creator_emergencies%rowtype;a public.emergency_affected_accounts%rowtype;u_id uuid;reauth timestamptz;begin
select * into e from public.creator_emergencies where id=p_emergency_id for update;
if not found or not public.has_creator_permission(e.creator_id,'emergency_activate') then raise exception 'activation access denied' using errcode='42501';end if;
if e.lifecycle_status<>'ready' or e.approved_revision is distinct from e.content_revision then raise exception 'current approval required' using errcode='55000';end if;
if exists(select 1 from public.emergency_replacement_accounts r where r.emergency_id=e.id and r.official and r.verification_state<>'verified')
then raise exception 'official replacement must be verified' using errcode='23514';end if;
if e.severity='critical' then
  begin reauth:=to_timestamp((auth.jwt()->>'reauthenticated_at')::double precision);exception when others then reauth:=null;end;
  if reauth is null or reauth<now()-interval '15 minutes' then raise exception 'recent reauthentication required' using errcode='42501';end if;
end if;
select * into a from public.emergency_affected_accounts where emergency_id=e.id order by created_at limit 1;
insert into public.creator_updates(creator_id,broadcast_type,broadcast_intent,affected_platform_connection_id,status,title,subject,
preview_text,content,cta_label,cta_url)
values(e.creator_id,'account_update',
case e.emergency_type when 'account_hacked' then 'account_hacked'::public.broadcast_intent
when 'account_banned' then 'account_banned'::public.broadcast_intent
when 'fake_account_warning' then 'impersonation_warning'::public.broadcast_intent
when 'account_changed' then 'platform_migration'::public.broadcast_intent else 'account_inaccessible'::public.broadcast_intent end,
a.connected_account_id,'draft',e.title,e.title,left(e.message,200),e.message,'View official update',
(select canonical_profile_url from public.emergency_replacement_accounts where emergency_id=e.id and official and verification_state='verified' limit 1))
returning id into u_id;
insert into public.emergency_alert_snapshots(emergency_id,creator_id,creator_update_id,revision,emergency_type,severity,title,message,
affected_accounts,replacement_accounts,created_by)
values(e.id,e.creator_id,u_id,e.content_revision,e.emergency_type,e.severity,e.title,e.message,
(select coalesce(jsonb_agg(to_jsonb(x)-'id'-'creator_id'-'emergency_id'),'[]') from public.emergency_affected_accounts x where x.emergency_id=e.id),
(select coalesce(jsonb_agg(to_jsonb(x)-'id'-'creator_id'-'emergency_id'-'verified_by'),'[]') from public.emergency_replacement_accounts x where x.emergency_id=e.id and x.verification_state='verified'),
auth.uid());
update public.creator_emergencies set lifecycle_status='active',activated_at=now(),creator_update_id=u_id where id=e.id;
perform public.emergency_append_event(e.id,'activated','ready','active',jsonb_build_object('creator_update_id',u_id));
return jsonb_build_object('status','active','creator_update_id',u_id,'creator_id',e.creator_id);end$$;
revoke all on function public.activate_emergency(uuid) from public,anon;
grant execute on function public.activate_emergency(uuid) to authenticated;

create or replace function public.close_emergency(p_emergency_id uuid,p_action text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.creator_emergencies%rowtype;target text;begin
select * into e from public.creator_emergencies where id=p_emergency_id for update;
if not found or not public.has_creator_permission(e.creator_id,'emergency_manage') then raise exception 'access denied' using errcode='42501';end if;
if p_action='resolve' and e.lifecycle_status='active' then target:='resolved';
elsif p_action='cancel' and e.lifecycle_status in('draft','pending_verification','pending_approval','ready') then target:='cancelled';
else raise exception 'invalid transition' using errcode='55000';end if;
update public.creator_emergencies set lifecycle_status=target,resolved_at=case when target='resolved' then now() end,
cancelled_at=case when target='cancelled' then now() end where id=e.id;
perform public.emergency_append_event(e.id,target,e.lifecycle_status,target,'{}');
return jsonb_build_object('status',target);end$$;
revoke all on function public.close_emergency(uuid,text) from public,anon;
grant execute on function public.close_emergency(uuid,text) to authenticated;

alter table public.creator_team_members enable row level security;
alter table public.creator_emergencies enable row level security;
alter table public.emergency_affected_accounts enable row level security;
alter table public.emergency_replacement_accounts enable row level security;
alter table public.emergency_approvals enable row level security;
alter table public.emergency_alert_snapshots enable row level security;
alter table public.emergency_events enable row level security;
alter table public.creator_team_members force row level security;
alter table public.creator_emergencies force row level security;
alter table public.emergency_affected_accounts force row level security;
alter table public.emergency_replacement_accounts force row level security;
alter table public.emergency_approvals force row level security;
alter table public.emergency_alert_snapshots force row level security;
alter table public.emergency_events force row level security;

create policy "creator reads team" on public.creator_team_members for select to authenticated
using(user_id=auth.uid() or public.has_creator_permission(creator_id,'emergency_manage'));
create policy "authorized reads emergencies" on public.creator_emergencies for select to authenticated
using(public.has_creator_permission(creator_id,'emergency_manage') or public.has_creator_permission(creator_id,'emergency_approve'));
create policy "public reads active emergencies" on public.creator_emergencies for select to anon using(lifecycle_status='active'
and exists(select 1 from public.creators c where c.id=creator_id and c.public_profile_enabled));
create policy "authorized reads affected accounts" on public.emergency_affected_accounts for select to authenticated
using(public.has_creator_permission(creator_id,'emergency_manage') or public.has_creator_permission(creator_id,'emergency_approve'));
create policy "public reads active affected accounts" on public.emergency_affected_accounts for select to anon
using(exists(select 1 from public.creator_emergencies e where e.id=emergency_id and e.lifecycle_status='active'));
create policy "authorized reads replacements" on public.emergency_replacement_accounts for select to authenticated
using(public.has_creator_permission(creator_id,'emergency_manage') or public.has_creator_permission(creator_id,'emergency_approve'));
create policy "public reads verified active replacements" on public.emergency_replacement_accounts for select to anon
using(verification_state='verified' and official and exists(select 1 from public.creator_emergencies e where e.id=emergency_id and e.lifecycle_status='active'));
create policy "authorized reads approvals" on public.emergency_approvals for select to authenticated
using(public.has_creator_permission(creator_id,'emergency_manage') or public.has_creator_permission(creator_id,'emergency_approve'));
create policy "authorized reads snapshots" on public.emergency_alert_snapshots for select to authenticated
using(public.has_creator_permission(creator_id,'emergency_manage') or public.has_creator_permission(creator_id,'emergency_approve'));
create policy "authorized reads events" on public.emergency_events for select to authenticated
using(public.has_creator_permission(creator_id,'emergency_manage') or public.has_creator_permission(creator_id,'emergency_approve'));

revoke all on public.creator_team_members,public.creator_emergencies,public.emergency_affected_accounts,
public.emergency_replacement_accounts,public.emergency_approvals,public.emergency_alert_snapshots,public.emergency_events
from public,anon,authenticated;
grant select on public.creator_team_members,public.emergency_approvals,public.emergency_alert_snapshots,public.emergency_events to authenticated;
grant select on public.creator_emergencies,public.emergency_affected_accounts,public.emergency_replacement_accounts to authenticated;
grant select(id,creator_id,emergency_type,lifecycle_status,severity,title,message,activated_at,updated_at) on public.creator_emergencies to anon;
grant select(id,emergency_id,provider,display_handle,canonical_profile_url) on public.emergency_affected_accounts to anon;
grant select(id,emergency_id,provider,display_handle,canonical_profile_url,verification_state,official,verified_at) on public.emergency_replacement_accounts to anon;
grant select,insert,update,delete on public.creator_team_members,public.creator_emergencies,public.emergency_affected_accounts,
public.emergency_replacement_accounts,public.emergency_approvals,public.emergency_alert_snapshots,public.emergency_events to service_role;

commit;
