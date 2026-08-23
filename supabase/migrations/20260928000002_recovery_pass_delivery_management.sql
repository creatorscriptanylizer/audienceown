begin;
create or replace function public.get_recovery_pass_member_state(p_slug text,p_preference_token_hash text)
returns jsonb language plpgsql stable security definer set search_path='' as $$declare creator_row public.creators%rowtype;connection_row public.follower_connections%rowtype;begin
 if auth.role()<>'service_role'then raise exception 'service role required'using errcode='42501';end if;
 select * into creator_row from public.creators where public_slug=p_slug and public_profile_enabled and recovery_pass_enabled;if not found then return null;end if;
 select * into connection_row from public.follower_connections where creator_id=creator_row.id and preference_token_hash=p_preference_token_hash and management_tokens_revoked_at is null and preference_token_expires_at>now();if not found then return null;end if;
 return jsonb_build_object('membershipStatus',connection_row.status,
  'accounts',coalesce((select jsonb_agg(jsonb_build_object('reference',encode(extensions.digest(a.id::text||':'||creator_row.public_slug,'sha256'),'hex'),'provider',a.platform,'label',coalesce(a.external_account_name,a.label),'handle',a.external_account_name,'profileUrl',a.url,'role',case a.account_type when'official'then'main'else'recovery'end))from public.connected_accounts a where exists(select 1 from public.follower_connection_account_memberships m where m.follower_connection_id=connection_row.id and m.connected_account_id=a.id)or exists(select 1 from public.follower_recovery_destination_preferences p where p.follower_connection_id=connection_row.id and p.connected_account_id=a.id and p.status='active')),'[]'::jsonb),
  'preferences',coalesce((select jsonb_object_agg(category_key,enabled)from public.follower_category_preferences where follower_connection_id=connection_row.id),'{}'::jsonb),
  'deliveryMethods',coalesce((select jsonb_agg(jsonb_build_object('reference',encode(extensions.digest(id::text||':'||p_slug,'sha256'),'hex'),'type',method_type,'status',method_status,'masked',destination_masked,'selected',id=connection_row.selected_recovery_method_id))from public.follower_recovery_methods where follower_contact_id=connection_row.follower_contact_id and method_status='verified'),'[]'::jsonb),
  'recoveryAlerts',exists(select 1 from public.follower_category_preferences where follower_connection_id=connection_row.id and category_key='recovery'and enabled));end$$;
revoke all on function public.get_recovery_pass_member_state(text,text)from public,anon,authenticated;
grant execute on function public.get_recovery_pass_member_state(text,text)to service_role;

create or replace function public.remove_recovery_pass_delivery(p_slug text,p_preference_token_hash text,p_method_reference text)
returns boolean language plpgsql security definer set search_path='' as $$
declare connection_row public.follower_connections%rowtype;method_row public.follower_recovery_methods%rowtype;verified_count integer;
begin
 if auth.role()<>'service_role'then raise exception 'service role required'using errcode='42501';end if;
 select f.* into connection_row from public.follower_connections f join public.creators c on c.id=f.creator_id where c.public_slug=p_slug and f.preference_token_hash=p_preference_token_hash and f.status='active' and f.management_tokens_revoked_at is null and f.preference_token_expires_at>now() for update of f;
 if not found then raise exception 'active member required'using errcode='23514';end if;
 select * into method_row from public.follower_recovery_methods where follower_contact_id=connection_row.follower_contact_id and method_status='verified' and encode(extensions.digest(id::text||':'||p_slug,'sha256'),'hex')=p_method_reference for update;
 if not found then raise exception 'delivery method unavailable'using errcode='23514';end if;
 select count(*)into verified_count from public.follower_recovery_methods where follower_contact_id=connection_row.follower_contact_id and method_status='verified';
 if verified_count<=1 or connection_row.selected_recovery_method_id=method_row.id then raise exception 'final or selected delivery method cannot be removed'using errcode='23514';end if;
 update public.follower_recovery_methods set method_status='revoked',consent_revoked_at=now(),opt_out_reason='follower_removed'where id=method_row.id;
 return true;
end$$;
revoke all on function public.remove_recovery_pass_delivery(text,text,text)from public,anon,authenticated;
grant execute on function public.remove_recovery_pass_delivery(text,text,text)to service_role;
commit;
