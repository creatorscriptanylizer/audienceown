begin;

alter table public.creator_updates
  add column content_revision integer not null default 0 check(content_revision>=0),
  add column deterministic_title text,
  add column deterministic_content text,
  add column ai_enhanced_at timestamptz,
  add column ai_prompt_version text;
update public.creator_updates set deterministic_title=title,deterministic_content=content
where source_provider is not null;

create or replace function public.track_creator_update_revision()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.title is distinct from old.title or new.content is distinct from old.content
    or new.subject is distinct from old.subject or new.cta_url is distinct from old.cta_url then
    new.content_revision=old.content_revision+1;
  end if;
  return new;
end$$;
create trigger track_creator_update_revision before update on public.creator_updates
for each row execute function public.track_creator_update_revision();
revoke all on function public.track_creator_update_revision() from public,anon,authenticated;

create table public.creator_ai_settings(
  creator_id uuid primary key references public.creators(id) on delete cascade,
  enabled boolean not null default false,
  provider text not null default 'openai' check(provider='openai'),
  preferred_model text not null default 'gpt-4o-mini' check(char_length(preferred_model) between 1 and 80),
  preferred_variant text not null default 'standard' check(preferred_variant in ('concise','standard','detailed','email','browser','sms','recovery')),
  tone text not null default 'natural' check(tone in ('natural','energetic','professional','conversational','concise','educational')),
  audience_description text not null default '' check(char_length(audience_description)<=500),
  preferred_terminology text not null default '' check(char_length(preferred_terminology)<=500),
  phrases_to_avoid text not null default '' check(char_length(phrases_to_avoid)<=500),
  cta_style text not null default '' check(char_length(cta_style)<=300),
  custom_voice_instructions text not null default '' check(char_length(custom_voice_instructions)<=1500),
  include_emojis boolean not null default false,
  include_hashtags boolean not null default false,
  preserve_source_title boolean not null default true,
  approval_required boolean not null default true,
  ai_auto_send_enabled boolean not null default false,
  ai_required boolean not null default false,
  monthly_generation_limit integer not null default 50 check(monthly_generation_limit between 0 and 10000),
  monthly_budget_minor_units integer not null default 1000 check(monthly_budget_minor_units between 0 and 10000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger creator_ai_settings_updated before update on public.creator_ai_settings
for each row execute function public.set_updated_at();

create table public.ai_draft_enhancement_jobs(
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  creator_update_id uuid not null references public.creator_updates(id) on delete cascade,
  source_provider text,
  source_object_type text,
  source_event_type text,
  status text not null default 'pending' check(status in ('pending','processing','completed','retryable_failure','permanent_failure','skipped','cancelled')),
  prompt_version text not null,
  requested_variants text[] not null,
  base_content_revision integer not null,
  preferred_variant text not null,
  attempt_count integer not null default 0 check(attempt_count>=0),
  max_attempts integer not null default 3 check(max_attempts between 1 and 5),
  next_attempt_at timestamptz not null default now(),
  lease_owner uuid,
  lease_expires_at timestamptz,
  last_error_code text,
  last_error_message text check(char_length(last_error_message)<=500),
  result_applied boolean not null default false,
  stale_result boolean not null default false,
  auto_send_requested boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(cardinality(requested_variants)>0 and requested_variants <@ array['concise','standard','detailed','email','browser','sms','recovery'])
);
create unique index one_active_ai_job_per_update_prompt on public.ai_draft_enhancement_jobs(creator_update_id,prompt_version)
where status in ('pending','processing','retryable_failure');
create index ai_jobs_claim_idx on public.ai_draft_enhancement_jobs(next_attempt_at,created_at)
where status in ('pending','retryable_failure','processing');
create trigger ai_draft_enhancement_jobs_updated before update on public.ai_draft_enhancement_jobs
for each row execute function public.set_updated_at();

create table public.ai_draft_variants(
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  creator_update_id uuid not null references public.creator_updates(id) on delete cascade,
  enhancement_job_id uuid not null references public.ai_draft_enhancement_jobs(id) on delete cascade,
  variant_type text not null check(variant_type in ('concise','standard','detailed','email','browser','sms','recovery')),
  title text not null check(char_length(title) between 1 and 160),
  body text not null check(char_length(body) between 1 and 20000),
  call_to_action text check(call_to_action is null or char_length(call_to_action)<=120),
  source_url text check(source_url is null or source_url ~ '^https://'),
  provider text not null check(provider in ('openai','deterministic')),
  model text not null check(char_length(model) between 1 and 80),
  prompt_version text not null,
  input_tokens integer check(input_tokens is null or input_tokens>=0),
  output_tokens integer check(output_tokens is null or output_tokens>=0),
  estimated_cost_minor_units integer check(estimated_cost_minor_units is null or estimated_cost_minor_units>=0),
  selected boolean not null default false,
  created_at timestamptz not null default now(),
  unique(enhancement_job_id,variant_type)
);
create unique index one_selected_ai_variant_per_update on public.ai_draft_variants(creator_update_id) where selected;

create table public.ai_usage_events(
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  enhancement_job_id uuid not null references public.ai_draft_enhancement_jobs(id) on delete cascade,
  provider text not null check(provider in ('openai','deterministic')),
  model text not null,
  operation text not null check(operation in ('draft_enhancement','deterministic_fallback')),
  input_tokens integer check(input_tokens is null or input_tokens>=0),
  output_tokens integer check(output_tokens is null or output_tokens>=0),
  estimated_cost_minor_units integer check(estimated_cost_minor_units is null or estimated_cost_minor_units>=0),
  success boolean not null,
  error_code text,
  created_at timestamptz not null default now(),
  unique(enhancement_job_id,operation)
);

alter table public.creator_ai_settings enable row level security;
alter table public.creator_ai_settings force row level security;
alter table public.ai_draft_enhancement_jobs enable row level security;
alter table public.ai_draft_enhancement_jobs force row level security;
alter table public.ai_draft_variants enable row level security;
alter table public.ai_draft_variants force row level security;
alter table public.ai_usage_events enable row level security;
alter table public.ai_usage_events force row level security;
create policy "owner manages ai settings" on public.creator_ai_settings for all to authenticated
using(exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=auth.uid()))
with check(exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=auth.uid()));
create policy "owner reads ai jobs" on public.ai_draft_enhancement_jobs for select to authenticated
using(exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=auth.uid()));
create policy "owner reads ai variants" on public.ai_draft_variants for select to authenticated
using(exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=auth.uid()));
create policy "owner reads ai usage" on public.ai_usage_events for select to authenticated
using(exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=auth.uid()));
revoke all on public.creator_ai_settings,public.ai_draft_enhancement_jobs,public.ai_draft_variants,public.ai_usage_events from public,anon,authenticated;
grant select,insert,update on public.creator_ai_settings to authenticated;
grant select on public.ai_draft_enhancement_jobs,public.ai_draft_variants,public.ai_usage_events to authenticated;
grant select,insert,update on public.creator_ai_settings,public.ai_draft_enhancement_jobs,public.ai_draft_variants,public.ai_usage_events to service_role;

create or replace function public.enqueue_ai_draft_enhancement(
  p_update_id uuid,p_prompt_version text,p_requested_variants text[] default array['standard','concise','browser','sms','recovery'],
  p_auto_send_requested boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare u public.creator_updates%rowtype;s public.creator_ai_settings%rowtype;j public.ai_draft_enhancement_jobs%rowtype;
  month_count integer;month_cost bigint;
begin
  select * into u from public.creator_updates where id=p_update_id for update;
  if not found then raise exception 'update not found' using errcode='P0002';end if;
  if auth.role()='authenticated' and not exists(select 1 from public.creators c where c.id=u.creator_id and c.owner_user_id=auth.uid())
    then raise exception 'update access denied' using errcode='42501';end if;
  select * into s from public.creator_ai_settings where creator_id=u.creator_id;
  if not found or not s.enabled then return jsonb_build_object('status','skipped','reason','ai_disabled');end if;
  if u.status<>'draft' then return jsonb_build_object('status','skipped','reason','draft_ineligible');end if;
  select count(*),coalesce(sum(estimated_cost_minor_units),0) into month_count,month_cost from public.ai_usage_events
    where creator_id=u.creator_id and created_at>=date_trunc('month',now()) and operation='draft_enhancement';
  if month_count>=s.monthly_generation_limit then return jsonb_build_object('status','skipped','reason','monthly_limit_reached');end if;
  if month_cost>=s.monthly_budget_minor_units then return jsonb_build_object('status','skipped','reason','monthly_budget_reached');end if;
  insert into public.ai_draft_enhancement_jobs(creator_id,creator_update_id,source_provider,status,prompt_version,
    requested_variants,base_content_revision,preferred_variant,auto_send_requested)
  values(u.creator_id,u.id,u.source_provider,'pending',p_prompt_version,p_requested_variants,u.content_revision,s.preferred_variant,
    p_auto_send_requested and s.ai_auto_send_enabled)
  on conflict(creator_update_id,prompt_version) where status in ('pending','processing','retryable_failure')
    do update set auto_send_requested=public.ai_draft_enhancement_jobs.auto_send_requested or excluded.auto_send_requested,
      updated_at=public.ai_draft_enhancement_jobs.updated_at returning * into j;
  return jsonb_build_object('status',j.status,'job_id',j.id,'created',j.created_at=j.updated_at);
end$$;
revoke all on function public.enqueue_ai_draft_enhancement(uuid,text,text[],boolean) from public,anon;
grant execute on function public.enqueue_ai_draft_enhancement(uuid,text,text[],boolean) to authenticated,service_role;

create or replace function public.claim_ai_draft_enhancement_jobs(p_limit integer default 5,p_lease_seconds integer default 120,p_lease_owner uuid default gen_random_uuid())
returns setof public.ai_draft_enhancement_jobs language plpgsql security definer set search_path='' as $$
begin if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501';end if;
return query with candidates as(select j.id from public.ai_draft_enhancement_jobs j
 where ((j.status in('pending','retryable_failure') and j.next_attempt_at<=now()) or(j.status='processing' and j.lease_expires_at<now()))
 and j.attempt_count<j.max_attempts order by j.next_attempt_at,j.created_at for update skip locked limit greatest(1,least(p_limit,25)))
update public.ai_draft_enhancement_jobs j set status='processing',attempt_count=j.attempt_count+1,started_at=coalesce(j.started_at,now()),
lease_owner=p_lease_owner,lease_expires_at=now()+make_interval(secs=>greatest(30,least(p_lease_seconds,600)))
from candidates where j.id=candidates.id returning j.*;end$$;
revoke all on function public.claim_ai_draft_enhancement_jobs(integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.claim_ai_draft_enhancement_jobs(integer,integer,uuid) to service_role;

create or replace function public.complete_ai_draft_enhancement(
 p_job_id uuid,p_lease_owner uuid,p_provider text,p_model text,p_variants jsonb,p_input_tokens integer,
 p_output_tokens integer,p_estimated_cost integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.ai_draft_enhancement_jobs%rowtype;u public.creator_updates%rowtype;v jsonb;selected_id uuid;
  selected_title text;selected_body text;selected_cta text;selected_url text;applied boolean:=false;stale boolean:=false;
begin if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501';end if;
select * into j from public.ai_draft_enhancement_jobs where id=p_job_id for update;
if not found then raise exception 'job not found' using errcode='P0002';end if;
if j.status='completed' then return jsonb_build_object('status','completed','applied',j.result_applied,'stale',j.stale_result);end if;
if j.status<>'processing' or j.lease_owner is distinct from p_lease_owner or j.lease_expires_at<now()
 then raise exception 'job lease lost' using errcode='55000';end if;
for v in select value from jsonb_array_elements(p_variants) loop
 insert into public.ai_draft_variants(creator_id,creator_update_id,enhancement_job_id,variant_type,title,body,call_to_action,
 source_url,provider,model,prompt_version,input_tokens,output_tokens,estimated_cost_minor_units)
 values(j.creator_id,j.creator_update_id,j.id,v->>'variantType',v->>'title',v->>'body',nullif(v->>'callToAction',''),
 nullif(v->>'sourceUrl',''),p_provider,p_model,j.prompt_version,p_input_tokens,p_output_tokens,p_estimated_cost)
 on conflict(enhancement_job_id,variant_type) do nothing;
end loop;
select id,title,body,call_to_action,source_url into selected_id,selected_title,selected_body,selected_cta,selected_url
from public.ai_draft_variants where enhancement_job_id=j.id and variant_type=j.preferred_variant;
select * into u from public.creator_updates where id=j.creator_update_id for update;
if u.status='draft' and u.content_revision=j.base_content_revision then
 update public.ai_draft_variants set selected=(id=selected_id) where creator_update_id=u.id;
 update public.creator_updates set title=selected_title,subject=left(selected_title,160),preview_text=left(selected_body,200),
 content=selected_body,cta_label=coalesce(selected_cta,cta_label),cta_url=coalesce(selected_url,cta_url),
 ai_enhanced_at=now(),ai_prompt_version=j.prompt_version where id=u.id;
 applied:=true;
else stale:=true;end if;
insert into public.ai_usage_events(creator_id,enhancement_job_id,provider,model,operation,input_tokens,output_tokens,
 estimated_cost_minor_units,success) values(j.creator_id,j.id,p_provider,p_model,'draft_enhancement',p_input_tokens,p_output_tokens,p_estimated_cost,true)
on conflict(enhancement_job_id,operation) do nothing;
update public.ai_draft_enhancement_jobs set status='completed',completed_at=now(),lease_owner=null,lease_expires_at=null,
result_applied=applied,stale_result=stale where id=j.id;
return jsonb_build_object('status','completed','applied',applied,'stale',stale);end$$;
revoke all on function public.complete_ai_draft_enhancement(uuid,uuid,text,text,jsonb,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.complete_ai_draft_enhancement(uuid,uuid,text,text,jsonb,integer,integer,integer) to service_role;

create or replace function public.fail_ai_draft_enhancement(p_job_id uuid,p_lease_owner uuid,p_error_code text,p_error_message text,p_retryable boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.ai_draft_enhancement_jobs%rowtype;next_status text;
begin if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501';end if;
select * into j from public.ai_draft_enhancement_jobs where id=p_job_id and status='processing' and lease_owner=p_lease_owner for update;
if not found then raise exception 'job lease lost' using errcode='55000';end if;
next_status:=case when p_retryable and j.attempt_count<j.max_attempts then 'retryable_failure' else 'permanent_failure' end;
update public.ai_draft_enhancement_jobs set status=next_status,last_error_code=p_error_code,last_error_message=left(p_error_message,500),
next_attempt_at=now()+make_interval(secs=>least(3600,30*power(2,j.attempt_count)::integer)),lease_owner=null,lease_expires_at=null,
failed_at=case when next_status='permanent_failure' then now() end where id=j.id;
return jsonb_build_object('status',next_status);end$$;
revoke all on function public.fail_ai_draft_enhancement(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.fail_ai_draft_enhancement(uuid,uuid,text,text,boolean) to service_role;

create or replace function public.select_ai_draft_variant(p_update_id uuid,p_variant_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u public.creator_updates%rowtype;v public.ai_draft_variants%rowtype;
begin select * into u from public.creator_updates where id=p_update_id for update;
if not found or not exists(select 1 from public.creators c where c.id=u.creator_id and c.owner_user_id=auth.uid())
 then raise exception 'update access denied' using errcode='42501';end if;
if u.status<>'draft' then raise exception 'draft is not editable' using errcode='55000';end if;
select * into v from public.ai_draft_variants where id=p_variant_id and creator_update_id=u.id;
if not found then raise exception 'variant not found' using errcode='P0002';end if;
update public.ai_draft_variants set selected=(id=v.id) where creator_update_id=u.id;
update public.creator_updates set title=v.title,subject=left(v.title,160),preview_text=left(v.body,200),content=v.body,
cta_label=coalesce(v.call_to_action,cta_label),cta_url=coalesce(v.source_url,cta_url),ai_enhanced_at=now(),ai_prompt_version=v.prompt_version where id=u.id;
return jsonb_build_object('status','selected','variant_id',v.id);end$$;
revoke all on function public.select_ai_draft_variant(uuid,uuid) from public,anon;
grant execute on function public.select_ai_draft_variant(uuid,uuid) to authenticated;

create or replace function public.cancel_ai_draft_enhancement(p_update_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cid uuid;affected integer;begin select id into cid from public.creators where owner_user_id=auth.uid();
update public.ai_draft_enhancement_jobs set status='cancelled',lease_owner=null,lease_expires_at=null
where creator_update_id=p_update_id and creator_id=cid and status in('pending','processing','retryable_failure');
get diagnostics affected=row_count;return jsonb_build_object('status','cancelled','jobs',affected);end$$;
revoke all on function public.cancel_ai_draft_enhancement(uuid) from public,anon;
grant execute on function public.cancel_ai_draft_enhancement(uuid) to authenticated;

create or replace function public.get_ai_usage_summary()
returns jsonb language plpgsql security definer set search_path='' as $$
declare cid uuid;result jsonb;begin select id into cid from public.creators where owner_user_id=auth.uid();
if cid is null then raise exception 'creator required' using errcode='42501';end if;
select jsonb_build_object('jobs_queued',(select count(*) from public.ai_draft_enhancement_jobs where creator_id=cid),
'jobs_completed',(select count(*) from public.ai_draft_enhancement_jobs where creator_id=cid and status='completed'),
'retryable_failures',(select count(*) from public.ai_draft_enhancement_jobs where creator_id=cid and status='retryable_failure'),
'permanent_failures',(select count(*) from public.ai_draft_enhancement_jobs where creator_id=cid and status='permanent_failure'),
'stale_results',(select count(*) from public.ai_draft_enhancement_jobs where creator_id=cid and stale_result),
'variants_generated',(select count(*) from public.ai_draft_variants where creator_id=cid),
'input_tokens',coalesce(sum(input_tokens),0),'output_tokens',coalesce(sum(output_tokens),0),
'estimated_cost_minor_units',coalesce(sum(estimated_cost_minor_units),0)) into result from public.ai_usage_events
where creator_id=cid and created_at>=date_trunc('month',now());return result;end$$;
revoke all on function public.get_ai_usage_summary() from public,anon;
grant execute on function public.get_ai_usage_summary() to authenticated;

create or replace function public.maybe_enqueue_ai_for_social_draft()
returns trigger language plpgsql security definer set search_path='' as $$
begin if new.source_provider is not null and new.status='draft' and exists(select 1 from public.creator_ai_settings s where s.creator_id=new.creator_id and s.enabled)
then perform public.enqueue_ai_draft_enhancement(new.id,'social-draft-v1',array['standard','concise','detailed','browser','sms','recovery'],false);end if;return new;end$$;
create trigger enqueue_ai_after_social_draft after insert on public.creator_updates
for each row execute function public.maybe_enqueue_ai_for_social_draft();
revoke all on function public.maybe_enqueue_ai_for_social_draft() from public,anon,authenticated;

commit;
