begin;

create or replace function public.complete_whatsapp_recovery_verification(
  p_session_id uuid,p_recovery_method_id uuid,p_destination_hash text,p_preference_token_hash text,
  p_unsubscribe_token_hash text,p_token_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path='' as $$
declare session_row public.whatsapp_verification_sessions%rowtype;method_row public.follower_recovery_methods%rowtype;connection_row public.follower_connections%rowtype;
begin
  if auth.role()<>'service_role' then raise exception 'WhatsApp verification requires service role' using errcode='42501';end if;
  select * into session_row from public.whatsapp_verification_sessions where id=p_session_id for update;
  if not found or session_row.completed_at is not null or session_row.cancelled_at is not null or session_row.replaced_at is not null
    or session_row.expires_at<=now() or session_row.provider_verified_at is null or session_row.recovery_method_id<>p_recovery_method_id
    then raise exception 'WhatsApp verification session is not completable' using errcode='23514';end if;
  select * into method_row from public.follower_recovery_methods where id=p_recovery_method_id and method_type='whatsapp' and destination_hash=p_destination_hash for update;
  if not found or method_row.consent_purpose<>'recovery_alerts_whatsapp' or method_row.consent_version is null or method_row.consented_at is null
    or method_row.consent_source is null or method_row.consent_revoked_at is not null then raise exception 'WhatsApp-specific consent is required' using errcode='23514';end if;
  select * into connection_row from public.follower_connections where creator_id=session_row.creator_id and follower_contact_id=method_row.follower_contact_id for update;
  if found and (connection_row.status not in('active','paused') or connection_row.management_tokens_revoked_at is not null)
    then raise exception 'Follower relationship is inactive' using errcode='23514';end if;
  insert into public.follower_connections(creator_id,follower_contact_id,status,consented_at,activated_at,preference_token_hash,unsubscribe_token_hash,preference_token_expires_at,unsubscribe_token_expires_at,management_tokens_revoked_at,consent_source,source_platform,source_referrer,landing_path)
    values(session_row.creator_id,method_row.follower_contact_id,'paused',now(),now(),p_preference_token_hash,p_unsubscribe_token_hash,p_token_expires_at,p_token_expires_at,null,'creator_recovery_pass',session_row.source_platform,session_row.source_referrer,session_row.landing_path)
    on conflict(creator_id,follower_contact_id) do update set preference_token_hash=excluded.preference_token_hash,unsubscribe_token_hash=excluded.unsubscribe_token_hash,preference_token_expires_at=excluded.preference_token_expires_at,unsubscribe_token_expires_at=excluded.unsubscribe_token_expires_at
    returning * into connection_row;
  update public.follower_recovery_methods set method_status='verified',verified_at=now(),opted_out_at=null,opt_out_reason=null,consent_revoked_at=null where id=method_row.id;
  update public.follower_connections set selected_recovery_method_id=method_row.id where id=connection_row.id;
  update public.whatsapp_verification_sessions set completed_at=now() where id=session_row.id and completed_at is null;
  return connection_row.id;
end$$;

revoke all on function public.complete_whatsapp_recovery_verification(uuid,uuid,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.complete_whatsapp_recovery_verification(uuid,uuid,text,text,text,timestamptz) to service_role;

commit;
