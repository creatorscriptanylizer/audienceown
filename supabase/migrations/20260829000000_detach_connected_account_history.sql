begin;

-- Plans and incident snapshots are creator history. They need a live official
-- account to be created or used, but disconnecting one must not erase them.
alter table public.emergency_plans alter column affected_account_id drop not null;

-- ON DELETE SET NULL is implemented as an UPDATE and therefore runs the
-- broadcast validation trigger. Permit only the service-role transition that
-- detaches a formerly targeted account; ordinary emergency creation and edits
-- must still provide a live official account.
create or replace function public.validate_broadcast_studio_target()
returns trigger language plpgsql security definer set search_path='' as $$
declare platform_creator_id uuid;platform_account_type text;is_emergency boolean;platform_allowed boolean;
is_trusted_legacy_insert boolean:=false;is_account_detach boolean:=false;
begin
if new.broadcast_intent is null then
 if coalesce(auth.role(),'') in('authenticated','anon') and new.broadcast_type='account_update' then raise exception 'broadcast intent is required' using errcode='23502';end if;
 is_trusted_legacy_insert:=true;
 new.broadcast_intent:=case new.broadcast_type when 'account_update' then 'account_inaccessible'::public.broadcast_intent when 'new_content' then 'new_video'::public.broadcast_intent when 'livestream' then 'livestream'::public.broadcast_intent when 'event' then 'event'::public.broadcast_intent when 'product_launch' then 'product_release'::public.broadcast_intent else 'general_announcement'::public.broadcast_intent end;
end if;
is_emergency:=new.broadcast_intent in('account_hacked','account_banned','account_inaccessible','impersonation_warning','platform_migration');
platform_allowed:=is_emergency or new.broadcast_intent in('new_video','livestream');
is_account_detach:=tg_op='UPDATE' and coalesce(auth.role(),'')='service_role' and old.affected_platform_connection_id is not null and new.affected_platform_connection_id is null;
if new.broadcast_type<>public.broadcast_type_for_intent(new.broadcast_intent) then raise exception 'broadcast type must match intent' using errcode='23514';end if;
if is_emergency and new.affected_platform_connection_id is null and not is_trusted_legacy_insert and not is_account_detach then raise exception 'platform emergencies require an affected platform' using errcode='23514';end if;
if new.affected_platform_connection_id is not null and not platform_allowed then raise exception 'this broadcast intent does not accept platform targeting' using errcode='23514';end if;
if new.affected_platform_connection_id is not null then
 select account.creator_id,account.account_type into platform_creator_id,platform_account_type from public.connected_accounts account where account.id=new.affected_platform_connection_id;
 if platform_creator_id is null or platform_creator_id<>new.creator_id then raise exception 'affected platform must belong to creator' using errcode='23514';end if;
 if platform_account_type<>'official' then raise exception 'affected platform must be an official account' using errcode='23514';end if;
end if;
if tg_op='UPDATE' and old.status='scheduled' and not is_account_detach and(new.broadcast_intent is distinct from old.broadcast_intent or new.affected_platform_connection_id is distinct from old.affected_platform_connection_id) then raise exception 'scheduled broadcast targeting cannot change' using errcode='42501';end if;
return new;end$$;

create or replace function public.validate_emergency_plan_scope()
returns trigger language plpgsql security definer set search_path='' as $$begin
if tg_op='UPDATE' and (new.id<>old.id or new.creator_id<>old.creator_id or new.created_by<>old.created_by or new.created_at<>old.created_at) then raise exception 'plan ownership is immutable' using errcode='42501';end if;
if tg_op='UPDATE' and auth.role()='authenticated' and (new.readiness_status is distinct from old.readiness_status or new.readiness_result is distinct from old.readiness_result or new.last_validated_at is distinct from old.last_validated_at) then raise exception 'plan readiness is server maintained' using errcode='42501';end if;
if tg_op='INSERT' and new.affected_account_id is null then raise exception 'affected account required' using errcode='23514';end if;
if new.affected_account_id is not null and not exists(select 1 from public.connected_accounts a where a.id=new.affected_account_id and a.creator_id=new.creator_id and a.account_type='official') then raise exception 'affected account invalid' using errcode='23514';end if;
if new.template_id is not null and not exists(select 1 from public.emergency_templates t where t.id=new.template_id and t.creator_id=new.creator_id) then raise exception 'template invalid' using errcode='23514';end if;
if tg_op='INSERT' then new.readiness_status:='incomplete';new.readiness_result:='{"blockers":[],"warnings":[]}';new.last_validated_at:=null;
elsif new.affected_account_id is null and old.affected_account_id is not null then
new.readiness_status:='needs_attention';new.readiness_result:='{"blockers":["The affected account was disconnected. Choose another official account."],"warnings":[]}';new.last_validated_at:=now();
elsif row(new.template_id,new.affected_account_id,new.emergency_type,new.severity,new.title,new.message,new.proposed_replacement_provider,new.proposed_replacement_handle,new.proposed_replacement_url)
is distinct from row(old.template_id,old.affected_account_id,old.emergency_type,old.severity,old.title,old.message,old.proposed_replacement_provider,old.proposed_replacement_handle,old.proposed_replacement_url) then
new.readiness_status:='incomplete';new.readiness_result:='{"blockers":[],"warnings":[]}';new.last_validated_at:=null;end if;
return new;end$$;

alter table public.emergency_affected_accounts drop constraint emergency_affected_accounts_connected_account_id_fkey;
alter table public.emergency_affected_accounts add constraint emergency_affected_accounts_connected_account_id_fkey foreign key(connected_account_id) references public.connected_accounts(id) on delete set null;
alter table public.creator_updates drop constraint creator_updates_affected_platform_connection_id_fkey;
alter table public.creator_updates add constraint creator_updates_affected_platform_connection_id_fkey foreign key(affected_platform_connection_id) references public.connected_accounts(id) on delete set null;
alter table public.emergency_plans drop constraint emergency_plans_affected_account_id_fkey;
alter table public.emergency_plans add constraint emergency_plans_affected_account_id_fkey foreign key(affected_account_id) references public.connected_accounts(id) on delete set null;

commit;
