-- Stage 8.1: continuous, policy-driven maintenance of verified ecosystem destinations.
alter table public.creator_ecosystem_destinations
  add column if not exists automation_enabled boolean not null default true,
  add column if not exists auto_apply_safe_changes boolean not null default true,
  add column if not exists sync_priority text not null default 'normal' check(sync_priority in('low','normal','high','emergency')),
  add column if not exists sync_revision bigint not null default 1 check(sync_revision>0),
  add column if not exists current_fingerprint text,
  add column if not exists last_observed_fingerprint text,
  add column if not exists consecutive_failures integer not null default 0 check(consecutive_failures>=0),
  add column if not exists last_successful_sync_at timestamptz,
  add column if not exists last_attempted_sync_at timestamptz,
  add column if not exists next_sync_at timestamptz,
  add column if not exists sync_lease_owner text,
  add column if not exists sync_lease_expires_at timestamptz,
  add column if not exists last_failure_class text,
  add column if not exists last_failure_code text,
  add column if not exists last_authoritative_event_at timestamptz,
  add column if not exists automation_paused_at timestamptz,
  add column if not exists automation_pause_reason text;

create index ecosystem_automation_due_idx on public.creator_ecosystem_destinations(sync_priority,next_sync_at nulls first)
  where automation_enabled and automation_paused_at is null and archived_at is null;

-- Stage 8.0 bumped identity revision for every sync bookkeeping update. Automation
-- narrows that trigger to fields that can change public identity or trust.
drop trigger if exists ecosystem_destination_revision on public.creator_ecosystem_destinations;
create trigger ecosystem_destination_revision_insert after insert on public.creator_ecosystem_destinations for each row execute function public.bump_identity_revision();
create trigger ecosystem_destination_revision_delete after delete on public.creator_ecosystem_destinations for each row execute function public.bump_identity_revision();
create trigger ecosystem_destination_revision_update after update on public.creator_ecosystem_destinations
for each row when(
 old.display_name is distinct from new.display_name or old.display_handle is distinct from new.display_handle or
 old.canonical_url is distinct from new.canonical_url or old.hostname is distinct from new.hostname or old.verification_status is distinct from new.verification_status or
 old.official is distinct from new.official or old.primary_for_type is distinct from new.primary_for_type or old.public_visible is distinct from new.public_visible or
 old.archived_at is distinct from new.archived_at
) execute function public.bump_identity_revision();

create table public.ecosystem_sync_observations(
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.creators(id) on delete cascade,
 destination_id uuid not null references public.creator_ecosystem_destinations(id) on delete cascade, provider text not null,
 source text not null check(source in('polling','provider_webhook','domain_check','feed_check','app_manifest_check','creator_requested','operator_requested')),
 source_event_id text, observation_type text not null, severity text not null check(severity in('info','low','medium','high','critical')),
 previous_fingerprint text,current_fingerprint text,normalized_changes jsonb not null default'{}' check(jsonb_typeof(normalized_changes)='object'),
 authoritative boolean not null,observed_at timestamptz not null default now(),processed_at timestamptz,
 status text not null default'new' check(status in('new','processed','ignored','superseded','failed')),created_at timestamptz not null default now(),
 unique(provider,source_event_id)
);
create index ecosystem_observation_queue_idx on public.ecosystem_sync_observations(status,observed_at) where status='new';

create table public.ecosystem_automation_incidents(
 id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creators(id) on delete cascade,
 destination_id uuid not null references public.creator_ecosystem_destinations(id) on delete cascade,
 observation_id uuid not null references public.ecosystem_sync_observations(id) on delete restrict,
 incident_type text not null,severity text not null check(severity in('low','medium','high','critical')),
 status text not null default'open' check(status in('open','acknowledged','investigating','resolved','dismissed')),
 title text not null,summary text not null,correlation_key text not null,trust_evaluation_id uuid references public.creator_trust_evaluations(id) on delete set null,
 security_alert_id uuid references public.creator_security_alerts(id) on delete set null,acknowledged_by uuid references auth.users(id) on delete set null,
 acknowledged_at timestamptz,resolved_at timestamptz,resolution_code text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index ecosystem_incident_open_correlation_idx on public.ecosystem_automation_incidents(correlation_key)
 where status in('open','acknowledged','investigating');

create table public.ecosystem_automation_actions(
 id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creators(id) on delete cascade,
 destination_id uuid not null references public.creator_ecosystem_destinations(id) on delete cascade,
 incident_id uuid references public.ecosystem_automation_incidents(id) on delete set null,
 observation_id uuid references public.ecosystem_sync_observations(id) on delete set null,
 action_type text not null,actor_type text not null check(actor_type in('automation','creator','operator','provider_webhook')),
 actor_user_id uuid references auth.users(id) on delete set null,status text not null,result_code text,
 metadata jsonb not null default'{}' check(jsonb_typeof(metadata)='object'),created_at timestamptz not null default now()
);
create index ecosystem_actions_destination_idx on public.ecosystem_automation_actions(destination_id,created_at desc);

create trigger ecosystem_incidents_updated before update on public.ecosystem_automation_incidents for each row execute function public.set_updated_at();
create trigger ecosystem_actions_immutable before update or delete on public.ecosystem_automation_actions for each row execute function public.prevent_emergency_history_mutation();

create or replace function public.claim_ecosystem_automation_destinations(p_limit integer default 20,p_lease_owner text default gen_random_uuid()::text)
returns setof public.creator_ecosystem_destinations language plpgsql security definer set search_path='' as $$begin
 if auth.role()<>'service_role' then raise exception'service role required' using errcode='42501';end if;
 return query with c as(select d.id from public.creator_ecosystem_destinations d where d.automation_enabled and d.automation_paused_at is null and d.archived_at is null
 and d.verification_status in('verified','needs_attention','unavailable','revoked') and(d.next_sync_at is null or d.next_sync_at<=now())
 and(d.sync_lease_expires_at is null or d.sync_lease_expires_at<now()) order by case d.sync_priority when'emergency'then 0 when'high'then 1 when'normal'then 2 else 3 end,d.official desc,d.primary_for_type desc,d.next_sync_at nulls first
 for update skip locked limit greatest(1,least(p_limit,100))) update public.creator_ecosystem_destinations d set sync_lease_owner=p_lease_owner,sync_lease_expires_at=now()+interval'3 minutes',last_attempted_sync_at=now() from c where d.id=c.id returning d.*;
end$$;

create or replace function public.ingest_ecosystem_observation(p_destination_id uuid,p_source text,p_source_event_id text,p_observation_type text,p_severity text,p_previous_fingerprint text,p_current_fingerprint text,p_normalized_changes jsonb,p_authoritative boolean,p_observed_at timestamptz default now())
returns uuid language plpgsql security definer set search_path='' as $$declare d public.creator_ecosystem_destinations%rowtype;oid uuid;begin
 if auth.role()<>'service_role' then raise exception'service role required' using errcode='42501';end if;
 select*into d from public.creator_ecosystem_destinations where id=p_destination_id;if not found then raise exception'destination not found' using errcode='P0002';end if;
 insert into public.ecosystem_sync_observations(creator_id,destination_id,provider,source,source_event_id,observation_type,severity,previous_fingerprint,current_fingerprint,normalized_changes,authoritative,observed_at)
 values(d.creator_id,d.id,d.provider,p_source,p_source_event_id,p_observation_type,p_severity,p_previous_fingerprint,p_current_fingerprint,coalesce(p_normalized_changes,'{}'),p_authoritative,coalesce(p_observed_at,now()))
 on conflict(provider,source_event_id) where source_event_id is not null do update set source_event_id=excluded.source_event_id returning id into oid;
 update public.creator_ecosystem_destinations set last_observed_fingerprint=p_current_fingerprint,last_authoritative_event_at=case when p_authoritative then p_observed_at else last_authoritative_event_at end where id=d.id;return oid;
end$$;

create or replace function public.process_ecosystem_observation(p_observation_id uuid,p_policy_version text,p_classification text,p_safe_auto_apply boolean,p_suppress boolean,p_revoke boolean,p_needs_attention boolean,p_incident_required boolean,p_alert_required boolean,p_retry_required boolean,p_retry_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path='' as $$declare o public.ecosystem_sync_observations%rowtype;d public.creator_ecosystem_destinations%rowtype;iid uuid;aid uuid;changed boolean:=false;stable text;begin
 if auth.role()<>'service_role' then raise exception'service role required' using errcode='42501';end if;select*into o from public.ecosystem_sync_observations where id=p_observation_id for update;
 if not found then raise exception'observation not found' using errcode='P0002';end if;if o.status='processed'then return jsonb_build_object('status','already_processed');end if;
 select*into d from public.creator_ecosystem_destinations where id=o.destination_id for update;stable:=nullif(o.normalized_changes#>>'{stableExternalId,current}','');
 if stable is not null and d.stable_external_id is not null and stable<>d.stable_external_id then p_safe_auto_apply:=false;p_suppress:=true;p_needs_attention:=true;p_incident_required:=true;p_classification:='stable_identity_conflict';end if;
 if p_safe_auto_apply and d.auto_apply_safe_changes then update public.creator_ecosystem_destinations set display_name=coalesce(nullif(o.normalized_changes#>>'{displayName,current}',''),display_name),display_handle=coalesce(nullif(o.normalized_changes#>>'{displayHandle,current}',''),display_handle),canonical_url=coalesce(nullif(o.normalized_changes#>>'{canonicalUrl,current}',''),canonical_url),hostname=coalesce(nullif(o.normalized_changes#>>'{hostname,current}',''),hostname),current_fingerprint=o.current_fingerprint,sync_revision=sync_revision+1 where id=d.id;changed:=true;end if;
 update public.creator_ecosystem_destinations set verification_status=case when p_revoke then'revoked' when p_needs_attention then'needs_attention' when p_classification='verification_recovered'then'verified' else verification_status end,official=case when p_suppress then false else official end,public_visible=case when p_suppress then false else public_visible end,primary_for_type=case when p_suppress then false else primary_for_type end,revoked_at=case when p_revoke then now() when p_classification='verification_recovered'then null else revoked_at end,last_failure_class=case when p_retry_required then p_classification else null end,consecutive_failures=case when p_retry_required then consecutive_failures+1 else 0 end,last_successful_sync_at=case when p_retry_required then last_successful_sync_at else now() end,next_sync_at=coalesce(p_retry_at,now()+interval'24 hours'),sync_lease_owner=null,sync_lease_expires_at=null where id=d.id;
 if p_incident_required then insert into public.ecosystem_automation_incidents(creator_id,destination_id,observation_id,incident_type,severity,title,summary,correlation_key)values(d.creator_id,d.id,o.id,p_classification,case when o.severity in('high','critical')then o.severity else'medium'end,'Ecosystem destination needs attention','An authoritative ecosystem change requires review.',d.creator_id||':'||d.id||':'||p_classification) on conflict(correlation_key)where status in('open','acknowledged','investigating')do update set observation_id=excluded.observation_id,updated_at=now() returning id into iid;end if;
 if p_alert_required and iid is not null then insert into public.creator_security_alerts(creator_id,alert_type,severity,title,message,action_url)select d.creator_id,'ecosystem_'||p_classification,case when o.severity='critical'then'critical'else'high'end,'Ecosystem automation alert','A verified destination requires your attention.','/dashboard/ecosystem' where not exists(select 1 from public.ecosystem_automation_incidents where id=iid and security_alert_id is not null)returning id into aid;update public.ecosystem_automation_incidents set security_alert_id=coalesce(security_alert_id,aid)where id=iid;end if;
 if changed or p_suppress or p_revoke or p_classification='verification_recovered' then update public.creator_authenticity_profiles set presentation_revision=presentation_revision+1,issuance_lease_expires_at=null where creator_id=d.creator_id;end if;
 insert into public.ecosystem_automation_actions(creator_id,destination_id,incident_id,observation_id,action_type,actor_type,status,result_code,metadata)values(d.creator_id,d.id,iid,o.id,case when p_suppress then'public_presentation_suppressed'when changed then'metadata_updated'else case when p_retry_required then'sync_retried'else'authenticity_refresh_queued'end end,'automation','completed',p_classification,jsonb_build_object('policyVersion',p_policy_version));
 update public.ecosystem_sync_observations set status='processed',processed_at=now()where id=o.id;return jsonb_build_object('status','processed','incidentId',iid,'changed',changed,'suppressed',p_suppress);
end$$;

create or replace function public.queue_ecosystem_resync(p_destination_id uuid)returns void language plpgsql security definer set search_path=''as $$declare d public.creator_ecosystem_destinations%rowtype;begin select*into d from public.creator_ecosystem_destinations where id=p_destination_id for update;if not found or(auth.role()<>'service_role'and not public.has_creator_permission(d.creator_id,'emergency_manage'))then raise exception'access denied'using errcode='42501';end if;update public.creator_ecosystem_destinations set next_sync_at=now(),sync_lease_owner=null,sync_lease_expires_at=null where id=d.id;insert into public.ecosystem_automation_actions(creator_id,destination_id,action_type,actor_type,actor_user_id,status)values(d.creator_id,d.id,'sync_retried',case when auth.role()='service_role'then'operator'else'creator'end,auth.uid(),'queued');end$$;
create or replace function public.pause_ecosystem_automation(p_destination_id uuid,p_reason text default'creator_paused')returns void language plpgsql security definer set search_path=''as $$declare d public.creator_ecosystem_destinations%rowtype;begin select*into d from public.creator_ecosystem_destinations where id=p_destination_id for update;if not found or not public.has_creator_permission(d.creator_id,'emergency_manage')then raise exception'access denied'using errcode='42501';end if;update public.creator_ecosystem_destinations set automation_paused_at=now(),automation_pause_reason=left(coalesce(p_reason,'creator_paused'),200),sync_lease_owner=null,sync_lease_expires_at=null where id=d.id;insert into public.ecosystem_automation_actions(creator_id,destination_id,action_type,actor_type,actor_user_id,status)values(d.creator_id,d.id,'automation_paused','creator',auth.uid(),'completed');end$$;
create or replace function public.resume_ecosystem_automation(p_destination_id uuid)returns void language plpgsql security definer set search_path=''as $$declare d public.creator_ecosystem_destinations%rowtype;begin select*into d from public.creator_ecosystem_destinations where id=p_destination_id for update;if not found or not public.has_creator_permission(d.creator_id,'emergency_manage')then raise exception'access denied'using errcode='42501';end if;update public.creator_ecosystem_destinations set automation_paused_at=null,automation_pause_reason=null,next_sync_at=now()where id=d.id;insert into public.ecosystem_automation_actions(creator_id,destination_id,action_type,actor_type,actor_user_id,status)values(d.creator_id,d.id,'automation_resumed','creator',auth.uid(),'completed');end$$;
create or replace function public.update_ecosystem_automation_incident(p_incident_id uuid,p_action text,p_resolution_code text default null)returns void language plpgsql security definer set search_path=''as $$declare i public.ecosystem_automation_incidents%rowtype;begin select*into i from public.ecosystem_automation_incidents where id=p_incident_id for update;if not found or not public.has_creator_permission(i.creator_id,'emergency_manage')then raise exception'access denied'using errcode='42501';end if;if p_action='acknowledge'and i.status='open'then update public.ecosystem_automation_incidents set status='acknowledged',acknowledged_by=auth.uid(),acknowledged_at=now()where id=i.id;elsif p_action='dismiss'and i.status in('open','acknowledged')and i.severity in('low','medium')then update public.ecosystem_automation_incidents set status='dismissed',resolved_at=now(),resolution_code='creator_dismissed'where id=i.id;elsif p_action='resolve'and i.status in('open','acknowledged','investigating')and exists(select 1 from public.creator_ecosystem_destinations d where d.id=i.destination_id and d.verification_status='verified'and d.last_failure_class is null)then update public.ecosystem_automation_incidents set status='resolved',resolved_at=now(),resolution_code=coalesce(p_resolution_code,'authoritative_recovery')where id=i.id;else raise exception'incident action not allowed'using errcode='23514';end if;insert into public.ecosystem_automation_actions(creator_id,destination_id,incident_id,action_type,actor_type,actor_user_id,status)values(i.creator_id,i.destination_id,i.id,'incident_'||p_action,'creator',auth.uid(),'completed');end$$;

alter table public.ecosystem_sync_observations enable row level security;alter table public.ecosystem_sync_observations force row level security;
alter table public.ecosystem_automation_incidents enable row level security;alter table public.ecosystem_automation_incidents force row level security;
alter table public.ecosystem_automation_actions enable row level security;alter table public.ecosystem_automation_actions force row level security;
create policy "creator automation observation reads" on public.ecosystem_sync_observations for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
create policy "creator automation incident reads" on public.ecosystem_automation_incidents for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
create policy "creator automation action reads" on public.ecosystem_automation_actions for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
revoke all on public.ecosystem_sync_observations,public.ecosystem_automation_incidents,public.ecosystem_automation_actions from public,anon,authenticated;
grant select on public.ecosystem_sync_observations,public.ecosystem_automation_incidents,public.ecosystem_automation_actions to authenticated;
grant select,insert,update,delete on public.ecosystem_sync_observations,public.ecosystem_automation_incidents,public.ecosystem_automation_actions to service_role;
revoke all on function public.claim_ecosystem_automation_destinations(integer,text),public.ingest_ecosystem_observation(uuid,text,text,text,text,text,text,jsonb,boolean,timestamptz),public.process_ecosystem_observation(uuid,text,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.claim_ecosystem_automation_destinations(integer,text),public.ingest_ecosystem_observation(uuid,text,text,text,text,text,text,jsonb,boolean,timestamptz),public.process_ecosystem_observation(uuid,text,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,timestamptz) to service_role;
revoke all on function public.queue_ecosystem_resync(uuid),public.pause_ecosystem_automation(uuid,text),public.resume_ecosystem_automation(uuid),public.update_ecosystem_automation_incident(uuid,text,text) from public,anon;
grant execute on function public.queue_ecosystem_resync(uuid),public.pause_ecosystem_automation(uuid,text),public.resume_ecosystem_automation(uuid),public.update_ecosystem_automation_incident(uuid,text,text) to authenticated,service_role;
