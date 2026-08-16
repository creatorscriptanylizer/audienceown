-- Stage 11.13: authoritative, role-specific provider connection entitlements.
begin;

create table public.creator_plan_entitlements (
  creator_id uuid primary key references public.creators(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'trialing', 'active', 'past_due', 'unpaid', 'incomplete', 'canceled')),
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  source text not null default 'internal' check (source in ('internal', 'billing_provider')),
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.creator_plan_entitlements is
  'Trusted billing projection. Missing, inactive, delinquent, incomplete, or canceled state fails closed to Free.';

create trigger creator_plan_entitlements_updated before update on public.creator_plan_entitlements
for each row execute function public.set_updated_at();

alter table public.creator_plan_entitlements enable row level security;
alter table public.creator_plan_entitlements force row level security;
revoke all on public.creator_plan_entitlements from public, anon, authenticated;
grant select, insert, update, delete on public.creator_plan_entitlements to service_role;

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
begin
  if p_role not in ('official', 'backup') then
    raise exception 'invalid connection role' using errcode = '22023';
  end if;
  if auth.role() <> 'service_role'
     and not public.has_creator_permission(p_creator_id, 'emergency_manage') then
    raise exception 'access denied' using errcode = '42501';
  end if;

  select e.plan, e.subscription_status
    into resolved_plan, resolved_status
  from public.creator_plan_entitlements e
  where e.creator_id = p_creator_id;

  resolved_plan := case
    when resolved_plan = 'pro' and resolved_status in ('trialing', 'active') then 'pro'
    else 'free'
  end;
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
    'allowed', connection_limit is null or connection_count < connection_limit
  );
end
$$;

revoke all on function public.get_provider_connection_entitlement(uuid, text) from public, anon;
grant execute on function public.get_provider_connection_entitlement(uuid, text) to authenticated, service_role;

create or replace function public.enforce_provider_connection_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  entitlement jsonb;
begin
  -- Meta reconnect uses a short-lived asset-selection row. It is exempt only
  -- when it points at an exact owned connection with the same role.
  if new.provider_status = 'asset_selection_required'
     and new.provider_metadata ? 'reconnectTargetId'
     and exists (
       select 1 from public.connected_accounts target
       where target.id = (new.provider_metadata->>'reconnectTargetId')::uuid
         and target.creator_id = new.creator_id
         and target.account_type = new.account_type
         and target.platform in ('facebook', 'instagram')
     ) then
    return new;
  end if;

  -- SQL migrations and trusted maintenance do not carry a request JWT. Runtime
  -- browser/service clients do, and are always enforced through this trigger.
  if auth.role() not in ('authenticated', 'service_role') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.creator_id::text || ':' || new.account_type, 0));
  entitlement := public.get_provider_connection_entitlement(new.creator_id, new.account_type);
  if not (entitlement->>'allowed')::boolean then
    raise exception 'connection_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end
$$;

revoke all on function public.enforce_provider_connection_entitlement() from public, anon, authenticated;

create trigger enforce_provider_connection_entitlement
before insert on public.connected_accounts
for each row execute function public.enforce_provider_connection_entitlement();

commit;
