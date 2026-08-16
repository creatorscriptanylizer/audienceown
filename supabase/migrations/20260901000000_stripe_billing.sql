begin;

alter table public.creator_plan_entitlements drop constraint creator_plan_entitlements_subscription_status_check;
alter table public.creator_plan_entitlements add constraint creator_plan_entitlements_subscription_status_check
check(subscription_status in('inactive','trialing','active','past_due','unpaid','incomplete','incomplete_expired','paused','canceled'));

create table public.creator_billing_subscriptions(
 creator_id uuid primary key references public.creators(id)on delete cascade,
 stripe_customer_id text not null unique check(stripe_customer_id~'^cus_[A-Za-z0-9]+$'),
 stripe_subscription_id text unique check(stripe_subscription_id is null or stripe_subscription_id~'^sub_[A-Za-z0-9]+$'),
 stripe_price_id text check(stripe_price_id is null or stripe_price_id~'^price_[A-Za-z0-9]+$'),
 plan text not null default'free'check(plan in('free','pro')),
 billing_interval text check(billing_interval is null or billing_interval in('monthly','yearly')),
 status text not null default'inactive'check(status in('inactive','trialing','active','past_due','unpaid','incomplete','incomplete_expired','paused','canceled')),
 current_period_start timestamptz,current_period_end timestamptz,cancel_at_period_end boolean not null default false,
 cancel_at timestamptz,trial_end timestamptz,last_stripe_event_created bigint not null default 0,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index creator_billing_status_idx on public.creator_billing_subscriptions(status,current_period_end);
create trigger creator_billing_subscriptions_updated before update on public.creator_billing_subscriptions for each row execute function public.set_updated_at();

create table public.stripe_webhook_events(
 stripe_event_id text primary key check(stripe_event_id~'^evt_[A-Za-z0-9]+$'),event_type text not null,
 event_created bigint not null check(event_created>0),processed_at timestamptz not null default now()
);

alter table public.creator_billing_subscriptions enable row level security;alter table public.creator_billing_subscriptions force row level security;
alter table public.stripe_webhook_events enable row level security;alter table public.stripe_webhook_events force row level security;
revoke all on public.creator_billing_subscriptions,public.stripe_webhook_events from public,anon,authenticated;
grant select,insert,update,delete on public.creator_billing_subscriptions,public.stripe_webhook_events to service_role;

create or replace function public.apply_stripe_subscription_event(p_event_id text,p_event_type text,p_event_created bigint,p_creator_id uuid,p_customer_id text,p_subscription_id text,p_price_id text,p_interval text,p_status text,p_period_start timestamptz,p_period_end timestamptz,p_cancel_at_period_end boolean,p_cancel_at timestamptz,p_trial_end timestamptz)returns boolean language plpgsql security definer set search_path=''as $$declare applied boolean:=false;resolved_plan text;begin
 if auth.role()<>'service_role'then raise exception'service role required'using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_creator_id::text||':billing',0));
 insert into public.stripe_webhook_events(stripe_event_id,event_type,event_created)values(p_event_id,p_event_type,p_event_created)on conflict do nothing;
 if not found then return false;end if;
 if p_status not in('trialing','active','past_due','unpaid','incomplete','incomplete_expired','paused','canceled')or p_interval not in('monthly','yearly')then raise exception'invalid billing state'using errcode='22023';end if;
 resolved_plan:=case when p_status in('trialing','active')then'pro'else'free'end;
 insert into public.creator_billing_subscriptions(creator_id,stripe_customer_id,stripe_subscription_id,stripe_price_id,plan,billing_interval,status,current_period_start,current_period_end,cancel_at_period_end,cancel_at,trial_end,last_stripe_event_created)
 values(p_creator_id,p_customer_id,p_subscription_id,p_price_id,resolved_plan,p_interval,p_status,p_period_start,p_period_end,p_cancel_at_period_end,p_cancel_at,p_trial_end,p_event_created)
 on conflict(creator_id)do update set stripe_customer_id=excluded.stripe_customer_id,stripe_subscription_id=excluded.stripe_subscription_id,stripe_price_id=excluded.stripe_price_id,plan=excluded.plan,billing_interval=excluded.billing_interval,status=excluded.status,current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,cancel_at=excluded.cancel_at,trial_end=excluded.trial_end,last_stripe_event_created=excluded.last_stripe_event_created
 where excluded.last_stripe_event_created>=public.creator_billing_subscriptions.last_stripe_event_created returning true into applied;
 if applied then insert into public.creator_plan_entitlements(creator_id,plan,subscription_status,cancel_at_period_end,current_period_end,source,source_reference)values(p_creator_id,resolved_plan,p_status,p_cancel_at_period_end,p_period_end,'billing_provider',p_subscription_id)on conflict(creator_id)do update set plan=excluded.plan,subscription_status=excluded.subscription_status,cancel_at_period_end=excluded.cancel_at_period_end,current_period_end=excluded.current_period_end,source='billing_provider',source_reference=excluded.source_reference;end if;
 return coalesce(applied,false);
end$$;
revoke all on function public.apply_stripe_subscription_event(text,text,bigint,uuid,text,text,text,text,text,timestamptz,timestamptz,boolean,timestamptz,timestamptz)from public,anon,authenticated;
grant execute on function public.apply_stripe_subscription_event(text,text,bigint,uuid,text,text,text,text,text,timestamptz,timestamptz,boolean,timestamptz,timestamptz)to service_role;
commit;
