begin;

create table public.browser_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  recovery_method_id uuid not null unique
    references public.follower_recovery_methods(id) on delete cascade,
  endpoint_ciphertext text not null,
  endpoint_hash text not null unique,
  p256dh_ciphertext text not null,
  auth_ciphertext text not null,
  expiration_time timestamptz,
  user_agent_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer not null default 0 check (failure_count >= 0)
);

comment on table public.browser_push_subscriptions is
  'Server-only encrypted Web Push subscriptions. Browser roles receive safe method metadata only.';
comment on column public.follower_recovery_methods.provider_identifier is
  'For web_push methods, an opaque browser_push_subscriptions id used by trusted delivery workers.';

create index browser_push_subscriptions_active_method_idx
  on public.browser_push_subscriptions(recovery_method_id)
  where revoked_at is null;

create trigger browser_push_subscriptions_updated
before update on public.browser_push_subscriptions
for each row execute function public.set_updated_at();

alter table public.browser_push_subscriptions enable row level security;
alter table public.browser_push_subscriptions force row level security;
revoke all on public.browser_push_subscriptions from public, anon, authenticated;
grant all on public.browser_push_subscriptions to service_role;

create or replace function public.protect_browser_push_subscription()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.recovery_method_id := old.recovery_method_id;
    new.endpoint_hash := old.endpoint_hash;
    new.created_at := old.created_at;
  end if;
  return new;
end
$$;
revoke all on function public.protect_browser_push_subscription()
  from public, anon, authenticated;
create trigger protect_browser_push_subscription
before update on public.browser_push_subscriptions
for each row execute function public.protect_browser_push_subscription();

create or replace function public.delivery_provider_for_transport(
  p_transport public.delivery_transport
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_transport = 'email' then 'resend'
    when p_transport = 'browser_notification' then 'web-push'
    else 'unsupported'
  end
$$;
revoke all on function public.delivery_provider_for_transport(public.delivery_transport)
  from public, anon, authenticated;

commit;
