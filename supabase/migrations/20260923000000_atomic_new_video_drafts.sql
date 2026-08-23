begin;

-- Keep the code/schema contract safe for databases upgrading directly from the
-- original multi-account targeting migration.
alter table public.creator_update_publishing_accounts
  drop constraint if exists creator_update_publishing_accounts_targeting_rule_snapshot_check;
alter table public.creator_update_publishing_accounts
  add constraint creator_update_publishing_accounts_targeting_rule_snapshot_check
  check (targeting_rule_snapshot in ('account_followers','video_opt_ins','recovery_pass_video_opt_in'));

create or replace function public.create_new_video_draft_with_publishing_accounts(
  p_creator_id uuid,
  p_draft jsonb,
  p_accounts jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
  selected jsonb;
begin
  if jsonb_typeof(p_accounts) <> 'array' or jsonb_array_length(p_accounts) = 0 then
    raise exception 'new video publishing accounts required' using errcode = '23514';
  end if;

  insert into public.creator_updates (
    creator_id, broadcast_type, broadcast_intent,
    affected_platform_connection_id, title, subject, preview_text, content,
    cta_label, cta_url
  ) values (
    p_creator_id,
    (p_draft->>'broadcast_type')::public.broadcast_type,
    'new_video'::public.broadcast_intent,
    null,
    coalesce(p_draft->>'title',''),
    coalesce(p_draft->>'subject',''),
    coalesce(p_draft->>'preview_text',''),
    coalesce(p_draft->>'content',''),
    nullif(p_draft->>'cta_label',''),
    nullif(p_draft->>'cta_url','')
  ) returning id into created_id;

  for selected in select value from jsonb_array_elements(p_accounts)
  loop
    insert into public.creator_update_publishing_accounts (
      update_id, connected_account_id, connected_account_reference,
      role_snapshot, targeting_rule_snapshot, provider_snapshot,
      account_display_snapshot, account_handle_snapshot
    ) values (
      created_id,
      (selected->>'id')::uuid,
      (selected->>'id')::uuid,
      selected->>'role',
      'recovery_pass_video_opt_in',
      selected->>'provider',
      selected->>'displayName',
      nullif(selected->>'handle','')
    );
  end loop;

  return created_id;
end;
$$;

revoke all on function public.create_new_video_draft_with_publishing_accounts(uuid,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.create_new_video_draft_with_publishing_accounts(uuid,jsonb,jsonb)
  to service_role;

comment on function public.create_new_video_draft_with_publishing_accounts(uuid,jsonb,jsonb) is
  'Atomically creates a New Video draft and its publishing-context snapshots. Inputs are resolved and validated by the authenticated server action; table triggers enforce creator/account scope.';

commit;
