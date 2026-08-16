-- Preserve the default inactive status when a creator has no billing row.
begin;

create or replace function public.get_provider_connection_entitlement(
  p_creator_id uuid,
  p_role text
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  resolved_plan text := 'free';
  resolved_status text := 'inactive';
  connection_count integer := 0;
  connection_limit integer := 1;
  owner_id uuid;
  qa_override boolean := false;
begin
  if p_role not in ('official', 'backup') then
    raise exception 'invalid connection role' using errcode = '22023';
  end if;
  if auth.role() <> 'service_role'
     and not public.has_creator_permission(p_creator_id, 'emergency_manage') then
    raise exception 'access denied' using errcode = '42501';
  end if;

  select c.owner_user_id into owner_id
  from public.creators c
  where c.id = p_creator_id;

  select coalesce(e.plan, 'free'), coalesce(e.subscription_status, 'inactive')
    into resolved_plan, resolved_status
  from public.creator_plan_entitlements e
  where e.creator_id = p_creator_id;

  if not found then
    resolved_plan := 'free';
    resolved_status := 'inactive';
  end if;

  resolved_plan := case
    when resolved_plan = 'pro' and resolved_status in ('trialing', 'active') then 'pro'
    else 'free'
  end;

  if public.is_local_qa_database() and public.is_app_admin(owner_id) then
    select exists (
      select 1
      from public.qa_entitlement_overrides q
      where q.user_id = owner_id
        and q.plan = 'pro'
        and q.environment in ('development', 'test')
    ) into qa_override;
  end if;

  if qa_override then
    resolved_plan := 'pro';
  end if;

  connection_limit := case when resolved_plan = 'pro' then null else 1 end;

  select count(*)::integer into connection_count
  from public.connected_accounts a
  where a.creator_id = p_creator_id and a.account_type = p_role;

  return jsonb_build_object(
    'plan', resolved_plan,
    'subscriptionStatus', resolved_status,
    'role', p_role,
    'currentCount', connection_count,
    'limit', connection_limit,
    'allowed', connection_limit is null or connection_count < connection_limit,
    'qaOverride', qa_override
  );
end
$$;

revoke all on function public.get_provider_connection_entitlement(uuid, text) from public, anon;
grant execute on function public.get_provider_connection_entitlement(uuid, text) to authenticated, service_role;

commit;
