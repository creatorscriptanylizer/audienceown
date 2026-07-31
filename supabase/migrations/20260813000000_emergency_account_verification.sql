begin;

-- Stage 5.0's creator-supplied verification RPC is retired. All successful
-- verification now enters through server-side provider/manual-review paths.
revoke execute on function public.verify_emergency_replacement(uuid,text,text,text,text,text,boolean) from authenticated;

alter table public.creator_team_members drop constraint if exists creator_team_members_permissions_check;
alter table public.creator_team_members add constraint creator_team_members_permissions_check
  check(permissions <@ array['emergency_manage','emergency_approve','emergency_activate','emergency_verify']);

alter table public.emergency_replacement_accounts
  add column connected_account_id uuid references public.connected_accounts(id) on delete set null,
  add column active_verification_id uuid,
  add column verification_confidence text check(verification_confidence is null or verification_confidence in('low','medium','high')),
  add column last_revalidated_at timestamptz,
  add column next_revalidation_at timestamptz,
  add column revalidation_status text not null default 'not_due' check(revalidation_status in('not_due','due','claimed','healthy','changed','revoked','unavailable','failed')),
  add column last_revalidation_error text,
  add column verification_lease_owner uuid,
  add column verification_lease_expires_at timestamptz;
alter table public.emergency_replacement_accounts drop constraint if exists emergency_replacement_accounts_verification_method_check;
alter table public.emergency_replacement_accounts add constraint emergency_replacement_accounts_verification_method_check
  check(verification_method is null or verification_method in('provider_oauth','existing_connected_account','provider_api','profile_challenge','domain_challenge','manual_review'));

create table public.emergency_account_verifications(
 id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creators(id) on delete cascade,
 emergency_id uuid references public.creator_emergencies(id) on delete cascade,
 replacement_account_id uuid not null references public.emergency_replacement_accounts(id) on delete cascade,
 connected_account_id uuid references public.connected_accounts(id) on delete set null,
 provider text not null check(char_length(btrim(provider)) between 1 and 40),
 method text not null check(method in('provider_oauth','existing_connected_account','provider_api','profile_challenge','domain_challenge','manual_review')),
 confidence text not null check(confidence in('low','medium','high')),
 status text not null default 'pending' check(status in('pending','awaiting_challenge','verified','failed','expired','revoked','cancelled')),
 external_account_id text,external_account_name text,canonical_profile_url text check(canonical_profile_url is null or canonical_profile_url~'^https://'),
 challenge_hash text,challenge_expires_at timestamptz,challenge_attempts integer not null default 0 check(challenge_attempts between 0 and 20),
 max_challenge_attempts integer not null default 5 check(max_challenge_attempts between 1 and 20),challenge_consumed_at timestamptz,
 requested_by uuid not null references auth.users(id) on delete restrict,verified_by uuid references auth.users(id) on delete restrict,
 requested_at timestamptz not null default now(),verified_at timestamptz,failed_at timestamptz,revoked_at timestamptz,
 failure_code text check(failure_code is null or char_length(failure_code)<=80),evidence_metadata jsonb not null default '{}',
 last_revalidated_at timestamptz,next_revalidation_at timestamptz,revalidation_status text not null default 'not_due'
   check(revalidation_status in('not_due','due','claimed','healthy','changed','revoked','unavailable','failed')),
 last_revalidation_error text check(last_revalidation_error is null or char_length(last_revalidation_error)<=160),
 lease_owner uuid,lease_expires_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(jsonb_typeof(evidence_metadata)='object'),check(challenge_hash is null or challenge_hash~'^[0-9a-f]{64}$'),
 check(method<>'manual_review' or confidence<>'high'),
 check(status<>'verified' or (verified_at is not null and verified_by is not null and external_account_id is not null and canonical_profile_url is not null))
);
alter table public.emergency_replacement_accounts add constraint emergency_replacement_active_verification_fk
 foreign key(active_verification_id) references public.emergency_account_verifications(id) on delete set null;
create index emergency_verification_replacement_idx on public.emergency_account_verifications(replacement_account_id,created_at desc);
create index emergency_verification_creator_idx on public.emergency_account_verifications(creator_id,created_at desc);
create index emergency_verification_status_idx on public.emergency_account_verifications(status);
create index emergency_verification_challenge_expiry_idx on public.emergency_account_verifications(challenge_expires_at) where status='awaiting_challenge';
create index emergency_verification_identity_idx on public.emergency_account_verifications(provider,external_account_id) where external_account_id is not null;
create index emergency_verification_verified_idx on public.emergency_account_verifications(verified_at desc) where status='verified';
create unique index emergency_verification_one_active_method_idx on public.emergency_account_verifications(replacement_account_id,method)
 where status in('pending','awaiting_challenge','verified');
create unique index emergency_verification_one_challenge_idx on public.emergency_account_verifications(replacement_account_id)
 where status='awaiting_challenge';

create table public.emergency_authorization_sessions(
 id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creators(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,emergency_id uuid references public.creator_emergencies(id) on delete cascade,
 content_revision integer,purpose text not null check(purpose in('approve_critical_incident','activate_critical_incident','verify_replacement_account','change_active_replacement','resolve_critical_incident')),
 assurance_level text not null check(assurance_level in('recent_login','password','mfa','passkey')),
 issued_at timestamptz not null default now(),expires_at timestamptz not null,consumed_at timestamptz,revoked_at timestamptz,
 session_fingerprint_hash text not null check(session_fingerprint_hash~'^[0-9a-f]{64}$'),created_at timestamptz not null default now(),
 check(expires_at>issued_at and expires_at<=issued_at+interval '30 minutes')
);
create index emergency_auth_user_idx on public.emergency_authorization_sessions(creator_id,user_id,purpose,expires_at desc);
create unique index emergency_auth_live_fingerprint_idx on public.emergency_authorization_sessions(session_fingerprint_hash) where consumed_at is null and revoked_at is null;

alter table public.emergency_approvals add column snapshot_hash text,add column policy_version text,add column verification_id uuid references public.emergency_account_verifications(id) on delete restrict;
alter table public.emergency_alert_snapshots add column verification_id uuid references public.emergency_account_verifications(id) on delete restrict,
 add column verification_method text,add column verification_confidence text,add column stable_provider_account_id text,
 add column policy_version text,add column authorization_assurance_level text,add column approver_ids uuid[] not null default '{}',
 add column content_hash text,add column destination_hash text;

create or replace function public.emergency_snapshot_hash(p_emergency_id uuid) returns text language sql stable security definer set search_path='' as $$
 select encode(extensions.digest(convert_to(concat_ws('|',e.emergency_type,e.severity,e.title,e.message,e.content_revision,
  coalesce(string_agg(concat_ws(':',r.id,r.provider,r.stable_provider_account_id,r.canonical_profile_url,r.verification_state,r.verification_confidence,v.id,v.status,v.confidence),',' order by r.id),'')),'utf8'),'sha256'),'hex')
 from public.creator_emergencies e left join public.emergency_replacement_accounts r on r.emergency_id=e.id
 left join public.emergency_account_verifications v on v.id=r.active_verification_id where e.id=p_emergency_id group by e.id $$;
revoke all on function public.emergency_snapshot_hash(uuid) from public,anon;grant execute on function public.emergency_snapshot_hash(uuid) to authenticated,service_role;

create or replace function public.bind_emergency_approval_policy() returns trigger language plpgsql security definer set search_path='' as $$begin
 new.snapshot_hash:=public.emergency_snapshot_hash(new.emergency_id);new.policy_version:='2026-08-13.1';
 select r.active_verification_id into new.verification_id from public.emergency_replacement_accounts r where r.emergency_id=new.emergency_id and r.official order by r.created_at limit 1;return new;end$$;
create trigger bind_emergency_approval_policy before insert on public.emergency_approvals for each row execute function public.bind_emergency_approval_policy();

create or replace function public.validate_emergency_activation_policy() returns trigger language plpgsql security definer set search_path='' as $$declare current_hash text;begin
 if new.lifecycle_status='active' and old.lifecycle_status is distinct from 'active' then current_hash:=public.emergency_snapshot_hash(new.id);
  if not exists(select 1 from public.emergency_approvals a where a.emergency_id=new.id and a.decision='approved' and a.invalidated_at is null and a.revision=new.content_revision and a.snapshot_hash=current_hash and a.policy_version='2026-08-13.1') then raise exception 'approved snapshot or policy is stale' using errcode='55000';end if;
  if new.severity='critical' and exists(select 1 from public.emergency_replacement_accounts r left join public.emergency_account_verifications v on v.id=r.active_verification_id where r.emergency_id=new.id and r.official and(r.verification_confidence is distinct from 'high' or v.status is distinct from 'verified' or v.external_account_id is null)) then raise exception 'critical replacement requires high-confidence stable verification' using errcode='23514';end if;
 end if;return new;end$$;
create trigger validate_emergency_activation_policy before update on public.creator_emergencies for each row execute function public.validate_emergency_activation_policy();

create or replace function public.bind_emergency_snapshot_security() returns trigger language plpgsql security definer set search_path='' as $$declare r public.emergency_replacement_accounts%rowtype;v public.emergency_account_verifications%rowtype;begin
 select * into r from public.emergency_replacement_accounts where emergency_id=new.emergency_id and official order by created_at limit 1;if found then select * into v from public.emergency_account_verifications where id=r.active_verification_id;
 new.verification_id:=v.id;new.verification_method:=v.method;new.verification_confidence:=v.confidence;new.stable_provider_account_id:=v.external_account_id;new.destination_hash:=encode(extensions.digest(convert_to(r.canonical_profile_url,'utf8'),'sha256'),'hex');end if;
 new.policy_version:='2026-08-13.1';new.content_hash:=encode(extensions.digest(convert_to(concat_ws('|',new.emergency_type,new.severity,new.title,new.message,new.revision),'utf8'),'sha256'),'hex');
 select coalesce(array_agg(a.decided_by order by a.decided_by),'{}') into new.approver_ids from public.emergency_approvals a where a.emergency_id=new.emergency_id and a.decision='approved' and a.invalidated_at is null;return new;end$$;
create trigger bind_emergency_snapshot_security before insert on public.emergency_alert_snapshots for each row execute function public.bind_emergency_snapshot_security();

create or replace function public.invalidate_emergency_verification_approval(p_emergency_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$begin
 update public.creator_emergencies set approved_revision=null,lifecycle_status=case when lifecycle_status='ready' then 'pending_verification' else lifecycle_status end where id=p_emergency_id and lifecycle_status not in('resolved','cancelled');
 update public.emergency_approvals set decision='invalidated',invalidated_at=now() where emergency_id=p_emergency_id and decision='approved' and invalidated_at is null;
 perform public.emergency_append_event(p_emergency_id,'approval_invalidated',null,null,jsonb_build_object('reason',left(p_reason,80)));
end$$;revoke all on function public.invalidate_emergency_verification_approval(uuid,text) from public,anon,authenticated;

create or replace function public.record_emergency_verification(p_replacement_id uuid,p_method text,p_confidence text,p_external_id text,
 p_external_name text,p_canonical_url text,p_connected_account_id uuid default null,p_evidence jsonb default '{}') returns uuid
language plpgsql security definer set search_path='' as $$declare r public.emergency_replacement_accounts%rowtype;v_id uuid;begin
 if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501';end if;
 select * into r from public.emergency_replacement_accounts where id=p_replacement_id for update;if not found then raise exception 'replacement not found' using errcode='P0002';end if;
 if p_confidence not in('low','medium','high') or p_method not in('provider_oauth','existing_connected_account','provider_api','profile_challenge','domain_challenge','manual_review') then raise exception 'verification invalid' using errcode='23514';end if;
 if exists(select 1 from public.emergency_affected_accounts a where a.emergency_id=r.emergency_id and a.provider=r.provider and a.stable_provider_account_id=p_external_id) then raise exception 'replacement matches affected account' using errcode='23514';end if;
 update public.emergency_account_verifications set status='revoked',revoked_at=now(),failure_code='superseded' where replacement_account_id=r.id and status in('pending','awaiting_challenge','verified');
 insert into public.emergency_account_verifications(creator_id,emergency_id,replacement_account_id,connected_account_id,provider,method,confidence,status,external_account_id,external_account_name,canonical_profile_url,requested_by,verified_by,verified_at,evidence_metadata,next_revalidation_at)
 values(r.creator_id,r.emergency_id,r.id,p_connected_account_id,r.provider,p_method,p_confidence,'verified',p_external_id,left(p_external_name,255),p_canonical_url,coalesce(auth.uid(),(p_evidence->>'requested_by')::uuid),coalesce(auth.uid(),(p_evidence->>'requested_by')::uuid),now(),coalesce(p_evidence,'{}')-array['token','access_token','refresh_token','raw_response','profile','requested_by'],now()+interval '24 hours') returning id into v_id;
 update public.emergency_replacement_accounts set stable_provider_account_id=p_external_id,display_handle=left(p_external_name,120),canonical_profile_url=p_canonical_url,verification_state='verified',verification_method=p_method,verification_confidence=p_confidence,verified_at=now(),verified_by=coalesce(auth.uid(),(p_evidence->>'requested_by')::uuid),official=true,connected_account_id=p_connected_account_id,active_verification_id=v_id,next_revalidation_at=now()+interval '24 hours',revalidation_status='not_due' where id=r.id;
 perform public.invalidate_emergency_verification_approval(r.emergency_id,'replacement_verification_changed');
 update public.creator_emergencies set lifecycle_status='pending_approval' where id=r.emergency_id and lifecycle_status='pending_verification';
 perform public.emergency_append_event(r.emergency_id,'replacement_verified',null,null,jsonb_build_object('replacement_id',r.id,'verification_id',v_id,'method',p_method,'confidence',p_confidence));return v_id;end$$;
revoke all on function public.record_emergency_verification(uuid,text,text,text,text,text,uuid,jsonb) from public,anon,authenticated;grant execute on function public.record_emergency_verification(uuid,text,text,text,text,text,uuid,jsonb) to service_role;

create or replace function public.consume_emergency_authorization(p_session_id uuid,p_purpose text,p_emergency_id uuid,p_revision integer) returns text
language plpgsql security definer set search_path='' as $$declare s public.emergency_authorization_sessions%rowtype;begin
 select * into s from public.emergency_authorization_sessions where id=p_session_id for update;
 if not found or s.user_id<>auth.uid() or s.purpose<>p_purpose or s.emergency_id is distinct from p_emergency_id or s.content_revision is distinct from p_revision then raise exception 'authorization invalid' using errcode='42501';end if;
 if s.consumed_at is not null or s.revoked_at is not null or s.expires_at<=now() then raise exception 'authorization unavailable' using errcode='55000';end if;
 update public.emergency_authorization_sessions set consumed_at=now() where id=s.id;
 perform public.emergency_append_event(p_emergency_id,'authorization_consumed',null,null,jsonb_build_object('purpose',p_purpose,'assurance_level',s.assurance_level));return s.assurance_level;end$$;
revoke all on function public.consume_emergency_authorization(uuid,text,uuid,integer) from public,anon;grant execute on function public.consume_emergency_authorization(uuid,text,uuid,integer) to authenticated,service_role;

-- Activation and critical authorization consumption are one PostgreSQL
-- transaction. The legacy one-argument RPC is not a browser-callable bypass.
revoke execute on function public.activate_emergency(uuid) from authenticated;
create or replace function public.activate_emergency(p_emergency_id uuid,p_authorization_session_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.creator_emergencies%rowtype;a public.emergency_affected_accounts%rowtype;
 approval public.emergency_approvals%rowtype;auth_session public.emergency_authorization_sessions%rowtype;
 replacement public.emergency_replacement_accounts%rowtype;verification public.emergency_account_verifications%rowtype;
 u_id uuid;current_hash text;assurance text;begin
 select * into e from public.creator_emergencies where id=p_emergency_id for update;
 if not found or not public.has_creator_permission(e.creator_id,'emergency_activate') then raise exception 'activation access denied' using errcode='42501';end if;
 if e.lifecycle_status='active' and e.creator_update_id is not null then
  if p_authorization_session_id is not null then select * into auth_session from public.emergency_authorization_sessions where id=p_authorization_session_id for update;
   if not found or auth_session.user_id<>auth.uid() or auth_session.consumed_at is not null or auth_session.revoked_at is not null or auth_session.expires_at<=now() then raise exception 'authorization unavailable' using errcode='55000';end if;end if;
  return jsonb_build_object('status','active','creator_update_id',e.creator_update_id,'creator_id',e.creator_id,'idempotent',true);end if;
 if e.lifecycle_status<>'ready' or e.approved_revision is distinct from e.content_revision then raise exception 'current approval required' using errcode='55000';end if;
 current_hash:=public.emergency_snapshot_hash(e.id);
 select * into approval from public.emergency_approvals where emergency_id=e.id and decision='approved' and invalidated_at is null and revision=e.content_revision order by decided_at desc limit 1 for update;
 if not found or approval.policy_version is distinct from '2026-08-13.1' or approval.snapshot_hash is distinct from current_hash then raise exception 'approved snapshot or policy is stale' using errcode='55000';end if;
 select * into replacement from public.emergency_replacement_accounts where emergency_id=e.id and official order by created_at limit 1 for update;
 if found then select * into verification from public.emergency_account_verifications where id=replacement.active_verification_id for update;
  if replacement.verification_state<>'verified' or verification.status is distinct from 'verified' or verification.external_account_id is null or verification.external_account_id is distinct from replacement.stable_provider_account_id or verification.revoked_at is not null then raise exception 'official replacement must be verified' using errcode='23514';end if;
  if e.severity='critical' and verification.confidence<>'high' then raise exception 'critical replacement requires high-confidence stable verification' using errcode='23514';end if;
 end if;
 if e.severity='critical' then
  if p_authorization_session_id is null then raise exception 'critical authorization required' using errcode='42501';end if;
  select * into auth_session from public.emergency_authorization_sessions where id=p_authorization_session_id for update;
  if not found or auth_session.creator_id<>e.creator_id or auth_session.user_id<>auth.uid() or auth_session.emergency_id is distinct from e.id or auth_session.purpose<>'activate_critical_incident' or auth_session.content_revision is distinct from e.content_revision then raise exception 'authorization invalid' using errcode='42501';end if;
  if auth_session.assurance_level not in('recent_login','password','mfa','passkey') then raise exception 'authorization assurance insufficient' using errcode='42501';end if;
  if auth_session.consumed_at is not null or auth_session.revoked_at is not null or auth_session.expires_at<=now() then raise exception 'authorization unavailable' using errcode='55000';end if;
  assurance:=auth_session.assurance_level;
 elsif p_authorization_session_id is not null then raise exception 'authorization session not accepted for non-critical activation' using errcode='55000';end if;
 select * into a from public.emergency_affected_accounts where emergency_id=e.id order by created_at limit 1;
 insert into public.creator_updates(creator_id,broadcast_type,broadcast_intent,affected_platform_connection_id,status,title,subject,preview_text,content,cta_label,cta_url)
 values(e.creator_id,'account_update',case e.emergency_type when 'account_hacked' then 'account_hacked'::public.broadcast_intent when 'account_banned' then 'account_banned'::public.broadcast_intent when 'fake_account_warning' then 'impersonation_warning'::public.broadcast_intent when 'account_changed' then 'platform_migration'::public.broadcast_intent else 'account_inaccessible'::public.broadcast_intent end,a.connected_account_id,'draft',e.title,e.title,left(e.message,200),e.message,'View official update',replacement.canonical_profile_url) returning id into u_id;
 insert into public.emergency_alert_snapshots(emergency_id,creator_id,creator_update_id,revision,emergency_type,severity,title,message,affected_accounts,replacement_accounts,created_by,authorization_assurance_level)
 values(e.id,e.creator_id,u_id,e.content_revision,e.emergency_type,e.severity,e.title,e.message,
 (select coalesce(jsonb_agg(to_jsonb(x)-'id'-'creator_id'-'emergency_id'),'[]') from public.emergency_affected_accounts x where x.emergency_id=e.id),
 (select coalesce(jsonb_agg(to_jsonb(x)-'id'-'creator_id'-'emergency_id'-'verified_by'),'[]') from public.emergency_replacement_accounts x where x.emergency_id=e.id and x.verification_state='verified'),auth.uid(),assurance);
 update public.creator_emergencies set lifecycle_status='active',activated_at=now(),creator_update_id=u_id where id=e.id;
 if e.severity='critical' then update public.emergency_authorization_sessions set consumed_at=now() where id=auth_session.id;
  perform public.emergency_append_event(e.id,'authorization_consumed',null,null,jsonb_build_object('purpose',auth_session.purpose,'assurance_level',auth_session.assurance_level));end if;
 perform public.emergency_append_event(e.id,'activated','ready','active',jsonb_build_object('creator_update_id',u_id));
 return jsonb_build_object('status','active','creator_update_id',u_id,'creator_id',e.creator_id,'idempotent',false);end$$;
revoke all on function public.activate_emergency(uuid,uuid) from public,anon;
grant execute on function public.activate_emergency(uuid,uuid) to authenticated;

create or replace function public.revoke_emergency_verification(p_emergency_id uuid,p_replacement_id uuid) returns void
language plpgsql security definer set search_path='' as $$declare r public.emergency_replacement_accounts%rowtype;begin
 select * into r from public.emergency_replacement_accounts where id=p_replacement_id and emergency_id=p_emergency_id for update;
 if not found then raise exception 'replacement not found' using errcode='P0002';end if;
 if not public.has_creator_permission(r.creator_id,'emergency_manage') then raise exception 'access denied' using errcode='42501';end if;
 update public.emergency_account_verifications set status='revoked',revoked_at=now(),failure_code='creator_revoked' where id=r.active_verification_id and status='verified';
 update public.emergency_replacement_accounts set verification_state='revoked',official=false,revalidation_status='revoked' where id=r.id;
 perform public.invalidate_emergency_verification_approval(r.emergency_id,'verification_revoked');perform public.emergency_append_event(r.emergency_id,'verification_revoked',null,null,jsonb_build_object('replacement_id',r.id));end$$;
revoke all on function public.revoke_emergency_verification(uuid,uuid) from public,anon;grant execute on function public.revoke_emergency_verification(uuid,uuid) to authenticated,service_role;

create or replace function public.claim_emergency_verifications(p_limit integer default 20,p_lease_owner uuid default gen_random_uuid()) returns setof public.emergency_account_verifications
language plpgsql security definer set search_path='' as $$begin if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501';end if;
 return query with c as(select v.id from public.emergency_account_verifications v where v.status='verified' and v.next_revalidation_at<=now() and(v.lease_expires_at is null or v.lease_expires_at<now()) order by v.next_revalidation_at for update skip locked limit greatest(1,least(p_limit,100)))
 update public.emergency_account_verifications v set lease_owner=p_lease_owner,lease_expires_at=now()+interval '3 minutes',revalidation_status='claimed' from c where v.id=c.id returning v.*;end$$;
revoke all on function public.claim_emergency_verifications(integer,uuid) from public,anon,authenticated;grant execute on function public.claim_emergency_verifications(integer,uuid) to service_role;

create or replace function public.apply_emergency_revalidation(p_verification_id uuid,p_external_id text,p_name text,p_url text,p_outcome text,p_error text default null) returns jsonb
language plpgsql security definer set search_path='' as $$declare v public.emergency_account_verifications%rowtype;r public.emergency_replacement_accounts%rowtype;begin
 if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501';end if;select * into v from public.emergency_account_verifications where id=p_verification_id for update;select * into r from public.emergency_replacement_accounts where id=v.replacement_account_id for update;
 if p_outcome='healthy' and p_external_id=v.external_account_id then update public.emergency_account_verifications set external_account_name=left(p_name,255),canonical_profile_url=p_url,last_revalidated_at=now(),next_revalidation_at=now()+interval '24 hours',revalidation_status='healthy',last_revalidation_error=null,lease_owner=null,lease_expires_at=null where id=v.id;
 update public.emergency_replacement_accounts set display_handle=left(p_name,120),canonical_profile_url=p_url,last_revalidated_at=now(),next_revalidation_at=now()+interval '24 hours',revalidation_status='healthy',last_revalidation_error=null where id=r.id;perform public.emergency_append_event(r.emergency_id,'identity_revalidated',null,null,jsonb_build_object('verification_id',v.id));return jsonb_build_object('status','healthy');end if;
 update public.emergency_account_verifications set status='revoked',revoked_at=now(),revalidation_status=case when p_external_id is distinct from v.external_account_id then 'changed' else 'revoked' end,last_revalidation_error=left(p_error,160),lease_owner=null,lease_expires_at=null where id=v.id;
 update public.emergency_replacement_accounts set verification_state='revoked',official=false,revalidation_status=case when p_external_id is distinct from v.external_account_id then 'changed' else 'revoked' end,last_revalidation_error=left(p_error,160) where id=r.id;
 perform public.invalidate_emergency_verification_approval(r.emergency_id,'stable_identity_changed');perform public.emergency_append_event(r.emergency_id,case when p_external_id is distinct from v.external_account_id then 'identity_changed' else 'verification_revoked' end,null,null,jsonb_build_object('verification_id',v.id));return jsonb_build_object('status','revoked');end$$;
revoke all on function public.apply_emergency_revalidation(uuid,text,text,text,text,text) from public,anon,authenticated;grant execute on function public.apply_emergency_revalidation(uuid,text,text,text,text,text) to service_role;

create trigger emergency_verifications_updated before update on public.emergency_account_verifications for each row execute function public.set_updated_at();
alter table public.emergency_account_verifications enable row level security;alter table public.emergency_account_verifications force row level security;
alter table public.emergency_authorization_sessions enable row level security;alter table public.emergency_authorization_sessions force row level security;
create policy "authorized reads verifications" on public.emergency_account_verifications for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage') or public.has_creator_permission(creator_id,'emergency_verify'));
create policy "users read own authorizations" on public.emergency_authorization_sessions for select to authenticated using(user_id=auth.uid() and public.has_creator_permission(creator_id,'emergency_manage'));
revoke all on public.emergency_account_verifications,public.emergency_authorization_sessions from public,anon,authenticated;
grant select on public.emergency_account_verifications,public.emergency_authorization_sessions to authenticated;
grant select,insert,update,delete on public.emergency_account_verifications,public.emergency_authorization_sessions to service_role;

commit;
