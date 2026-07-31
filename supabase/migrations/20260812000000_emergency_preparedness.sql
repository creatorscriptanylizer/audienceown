begin;

create table public.emergency_templates(
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  name text not null check(char_length(btrim(name)) between 1 and 120),
  emergency_type text not null check(emergency_type in('account_hacked','account_banned','account_suspended','account_changed','fake_account_warning','scam_warning','other')),
  severity text not null check(severity in('informational','important','critical')),
  title_template text not null check(char_length(btrim(title_template)) between 1 and 160),
  message_template text not null check(char_length(btrim(message_template)) between 1 and 5000),
  default_affected_account_id uuid references public.connected_accounts(id) on delete set null,
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index emergency_templates_creator_name_idx on public.emergency_templates(creator_id,lower(btrim(name)));

create table public.emergency_plans(
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  template_id uuid references public.emergency_templates(id) on delete set null,
  name text not null check(char_length(btrim(name)) between 1 and 120),
  affected_account_id uuid not null references public.connected_accounts(id) on delete restrict,
  emergency_type text not null check(emergency_type in('account_hacked','account_banned','account_suspended','account_changed','fake_account_warning','scam_warning','other')),
  severity text not null check(severity in('informational','important','critical')),
  title text not null check(char_length(btrim(title)) between 1 and 160),
  message text not null check(char_length(btrim(message)) between 1 and 5000),
  proposed_replacement_provider text check(proposed_replacement_provider is null or char_length(btrim(proposed_replacement_provider)) between 1 and 40),
  proposed_replacement_handle text check(proposed_replacement_handle is null or char_length(btrim(proposed_replacement_handle)) between 1 and 120),
  proposed_replacement_url text check(proposed_replacement_url is null or proposed_replacement_url ~ '^https://'),
  notes text check(notes is null or char_length(notes)<=5000),
  readiness_status text not null default 'incomplete' check(readiness_status in('incomplete','ready','needs_attention')),
  readiness_result jsonb not null default '{"blockers":[],"warnings":[]}',
  last_validated_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index emergency_plans_creator_name_idx on public.emergency_plans(creator_id,lower(btrim(name)));

create table public.emergency_drills(
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  source_template_id uuid references public.emergency_templates(id) on delete set null,
  source_plan_id uuid references public.emergency_plans(id) on delete set null,
  drill_mode text not null default 'readiness' check(drill_mode in('readiness','full_activation')),
  status text not null default 'draft' check(status in('draft','running','passed','failed','cancelled')),
  idempotency_key text check(idempotency_key is null or char_length(idempotency_key) between 8 and 200),
  started_by uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  result jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create unique index emergency_drills_idempotency_idx on public.emergency_drills(creator_id,idempotency_key) where idempotency_key is not null;

alter table public.creator_emergencies add column source_template_id uuid references public.emergency_templates(id) on delete set null;
alter table public.creator_emergencies add column source_plan_id uuid references public.emergency_plans(id) on delete set null;
alter table public.creator_emergencies add column creation_key text;
create unique index creator_emergencies_creation_key_idx on public.creator_emergencies(creator_id,creation_key) where creation_key is not null;

create or replace function public.validate_emergency_template_scope()
returns trigger language plpgsql security definer set search_path='' as $$begin
if tg_op='UPDATE' and (new.creator_id<>old.creator_id or new.created_by<>old.created_by) then raise exception 'template ownership is immutable' using errcode='42501';end if;
if new.default_affected_account_id is not null and not exists(select 1 from public.connected_accounts a where a.id=new.default_affected_account_id and a.creator_id=new.creator_id and a.account_type='official') then raise exception 'default account invalid' using errcode='23514';end if;
return new;end$$;
create trigger emergency_template_scope before insert or update on public.emergency_templates for each row execute function public.validate_emergency_template_scope();
revoke all on function public.validate_emergency_template_scope() from public,anon,authenticated;

create or replace function public.validate_emergency_plan_scope()
returns trigger language plpgsql security definer set search_path='' as $$begin
if tg_op='UPDATE' and (new.id<>old.id or new.creator_id<>old.creator_id or new.created_by<>old.created_by or new.created_at<>old.created_at) then raise exception 'plan ownership is immutable' using errcode='42501';end if;
if tg_op='UPDATE' and auth.role()='authenticated' and (new.readiness_status is distinct from old.readiness_status or new.readiness_result is distinct from old.readiness_result or new.last_validated_at is distinct from old.last_validated_at) then raise exception 'plan readiness is server maintained' using errcode='42501';end if;
if not exists(select 1 from public.connected_accounts a where a.id=new.affected_account_id and a.creator_id=new.creator_id and a.account_type='official') then raise exception 'affected account invalid' using errcode='23514';end if;
if new.template_id is not null and not exists(select 1 from public.emergency_templates t where t.id=new.template_id and t.creator_id=new.creator_id) then raise exception 'template invalid' using errcode='23514';end if;
if tg_op='INSERT' then new.readiness_status:='incomplete';new.readiness_result:='{"blockers":[],"warnings":[]}';new.last_validated_at:=null;
elsif row(new.template_id,new.affected_account_id,new.emergency_type,new.severity,new.title,new.message,new.proposed_replacement_provider,new.proposed_replacement_handle,new.proposed_replacement_url)
is distinct from row(old.template_id,old.affected_account_id,old.emergency_type,old.severity,old.title,old.message,old.proposed_replacement_provider,old.proposed_replacement_handle,old.proposed_replacement_url) then
new.readiness_status:='incomplete';new.readiness_result:='{"blockers":[],"warnings":[]}';new.last_validated_at:=null;end if;
return new;end$$;
create trigger emergency_plan_scope before insert or update on public.emergency_plans for each row execute function public.validate_emergency_plan_scope();
revoke all on function public.validate_emergency_plan_scope() from public,anon,authenticated;

create or replace function public.validate_emergency_drill_scope()
returns trigger language plpgsql security definer set search_path='' as $$begin
if tg_op='UPDATE' and (new.creator_id<>old.creator_id or new.started_by<>old.started_by or new.source_plan_id is distinct from old.source_plan_id or new.source_template_id is distinct from old.source_template_id) then raise exception 'drill ownership and source are immutable' using errcode='42501';end if;
if tg_op='INSERT' then new.status:='draft';new.result:='{}';new.completed_at:=null;end if;
if new.source_plan_id is not null and not exists(select 1 from public.emergency_plans p where p.id=new.source_plan_id and p.creator_id=new.creator_id) then raise exception 'plan invalid' using errcode='23514';end if;
if new.source_template_id is not null and not exists(select 1 from public.emergency_templates t where t.id=new.source_template_id and t.creator_id=new.creator_id) then raise exception 'template invalid' using errcode='23514';end if;
return new;end$$;
create trigger emergency_drill_scope before insert or update on public.emergency_drills for each row execute function public.validate_emergency_drill_scope();
revoke all on function public.validate_emergency_drill_scope() from public,anon,authenticated;

create trigger emergency_templates_updated before update on public.emergency_templates for each row execute function public.set_updated_at();
create trigger emergency_plans_updated before update on public.emergency_plans for each row execute function public.set_updated_at();

create or replace function public.create_prepared_emergency(
  p_plan_id uuid default null,p_template_id uuid default null,p_affected_account uuid default null,p_creation_key text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid;e_id uuid;a public.connected_accounts%rowtype;p public.emergency_plans%rowtype;t public.emergency_templates%rowtype;
etype text;eseverity text;etitle text;emessage text;account_id uuid;begin
if p_plan_id is not null then select * into p from public.emergency_plans where id=p_plan_id;cid:=p.creator_id;
elsif p_template_id is not null then select * into t from public.emergency_templates where id=p_template_id and active;cid:=t.creator_id;
else raise exception 'prepared source required' using errcode='23514';end if;
if cid is null or not public.has_creator_permission(cid,'emergency_manage') then raise exception 'access denied' using errcode='42501';end if;
if p_creation_key is not null then select e.id into e_id from public.creator_emergencies e where e.creator_id=cid and e.creation_key=p_creation_key;
if e_id is not null then return e_id;end if;end if;
if p_plan_id is not null then
  if p.readiness_status<>'ready' then raise exception 'plan is not ready' using errcode='55000';end if;
  etype:=p.emergency_type;eseverity:=p.severity;etitle:=p.title;emessage:=p.message;account_id:=p.affected_account_id;p_template_id:=p.template_id;
elsif p_template_id is not null then
  etype:=t.emergency_type;eseverity:=t.severity;etitle:=t.title_template;emessage:=t.message_template;account_id:=coalesce(p_affected_account,t.default_affected_account_id);
end if;
select * into a from public.connected_accounts where id=account_id and creator_id=cid and account_type='official';
if not found then raise exception 'affected account invalid' using errcode='23514';end if;
insert into public.creator_emergencies(creator_id,emergency_type,severity,title,message,requested_by,source_template_id,source_plan_id,creation_key)
values(cid,etype,eseverity,btrim(etitle),btrim(emessage),auth.uid(),p_template_id,p_plan_id,p_creation_key) returning id into e_id;
insert into public.emergency_affected_accounts(emergency_id,creator_id,connected_account_id,provider,stable_provider_account_id,display_handle,canonical_profile_url)
values(e_id,cid,a.id,a.platform,a.id::text,a.label,a.url);
perform public.emergency_append_event(e_id,case when p_plan_id is not null then 'created_from_plan' else 'created_from_template' end,null,'draft',
jsonb_strip_nulls(jsonb_build_object('source_template_id',p_template_id,'source_plan_id',p_plan_id)));
return e_id;end$$;
revoke all on function public.create_prepared_emergency(uuid,uuid,uuid,text) from public,anon;
grant execute on function public.create_prepared_emergency(uuid,uuid,uuid,text) to authenticated;

alter table public.emergency_templates enable row level security;alter table public.emergency_templates force row level security;
alter table public.emergency_plans enable row level security;alter table public.emergency_plans force row level security;
alter table public.emergency_drills enable row level security;alter table public.emergency_drills force row level security;

create policy "managers read templates" on public.emergency_templates for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
create policy "managers create templates" on public.emergency_templates for insert to authenticated with check(public.has_creator_permission(creator_id,'emergency_manage') and created_by=auth.uid());
create policy "managers update templates" on public.emergency_templates for update to authenticated using(public.has_creator_permission(creator_id,'emergency_manage')) with check(public.has_creator_permission(creator_id,'emergency_manage'));
create policy "managers read plans" on public.emergency_plans for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
create policy "managers create plans" on public.emergency_plans for insert to authenticated with check(public.has_creator_permission(creator_id,'emergency_manage') and created_by=auth.uid());
create policy "managers update plans" on public.emergency_plans for update to authenticated using(public.has_creator_permission(creator_id,'emergency_manage')) with check(public.has_creator_permission(creator_id,'emergency_manage'));
create policy "managers read drills" on public.emergency_drills for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
create policy "managers create drills" on public.emergency_drills for insert to authenticated with check(public.has_creator_permission(creator_id,'emergency_manage') and started_by=auth.uid());
create policy "managers update drills" on public.emergency_drills for update to authenticated using(public.has_creator_permission(creator_id,'emergency_manage')) with check(public.has_creator_permission(creator_id,'emergency_manage'));

revoke all on public.emergency_templates,public.emergency_plans,public.emergency_drills from public,anon,authenticated;
grant select,insert on public.emergency_templates,public.emergency_plans,public.emergency_drills to authenticated;
grant update(name,emergency_type,severity,title_template,message_template,default_affected_account_id,active) on public.emergency_templates to authenticated;
grant update on public.emergency_plans to authenticated;
grant select,insert,update,delete on public.emergency_templates,public.emergency_plans,public.emergency_drills to service_role;

commit;
