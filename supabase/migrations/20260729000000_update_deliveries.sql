begin;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'delivery_status'
  ) then
    create type public.delivery_status as enum (
      'queued',
      'sending',
      'sent',
      'delivered',
      'failed',
      'skipped',
      'cancelled'
    );
  end if;
end
$$;

create table public.update_deliveries (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.creator_updates(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  connection_id uuid not null references public.follower_connections(id) on delete restrict,
  contact_id uuid not null references public.follower_contacts(id) on delete restrict,
  recipient_email text not null,
  preference_category text not null,
  status public.delivery_status not null default 'queued',
  provider_message_id text,
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  queued_at timestamptz not null default now(),
  sending_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  skipped_at timestamptz,
  failure_code text,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint update_deliveries_update_connection_unique unique(update_id, connection_id),
  constraint update_deliveries_email_normalized check (
    recipient_email = lower(btrim(recipient_email))
    and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint update_deliveries_attempt_count check (attempt_count >= 0),
  constraint update_deliveries_preference_category check (
    preference_category in ('recovery', 'videos', 'livestreams', 'announcements', 'products')
  ),
  constraint update_deliveries_sending_time check (status <> 'sending' or sending_at is not null),
  constraint update_deliveries_sent_time check (status <> 'sent' or sent_at is not null),
  constraint update_deliveries_delivered_time check (status <> 'delivered' or delivered_at is not null),
  constraint update_deliveries_failed_time check (status <> 'failed' or failed_at is not null),
  constraint update_deliveries_cancelled_time check (status <> 'cancelled' or cancelled_at is not null),
  constraint update_deliveries_skipped_time check (status <> 'skipped' or skipped_at is not null)
);

create index update_deliveries_update_idx on public.update_deliveries(update_id);
create index update_deliveries_creator_idx on public.update_deliveries(creator_id);
create index update_deliveries_update_status_idx on public.update_deliveries(update_id, status);
create index update_deliveries_creator_created_idx on public.update_deliveries(creator_id, created_at desc);
create index update_deliveries_status_queued_idx on public.update_deliveries(status, queued_at);
create index update_deliveries_provider_message_idx on public.update_deliveries(provider_message_id)
  where provider_message_id is not null;
create index update_deliveries_connection_idx on public.update_deliveries(connection_id);

create or replace function public.expected_update_preference(update_type public.broadcast_type)
returns text
language sql
immutable
set search_path = ''
as $$
  select case update_type
    when 'new_content' then 'videos'
    when 'announcement' then 'announcements'
    when 'livestream' then 'livestreams'
    when 'event' then 'announcements'
    when 'product_launch' then 'products'
    when 'account_update' then 'recovery'
  end
$$;
revoke all on function public.expected_update_preference(public.broadcast_type) from public, anon, authenticated;

create or replace function public.protect_update_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  update_creator_id uuid;
  update_type public.broadcast_type;
  connection_creator_id uuid;
  connection_contact_id uuid;
  connection_status text;
begin
  if tg_op = 'DELETE' then
    if auth.role() = 'authenticated' then
      raise exception 'delivery history cannot be deleted by creators' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.update_id <> old.update_id then
      raise exception 'update_id cannot be changed' using errcode = '42501';
    end if;
    if new.creator_id <> old.creator_id then
      raise exception 'creator_id cannot be changed' using errcode = '42501';
    end if;
    if new.connection_id <> old.connection_id then
      raise exception 'connection_id cannot be changed' using errcode = '42501';
    end if;
    if new.contact_id <> old.contact_id then
      raise exception 'contact_id cannot be changed' using errcode = '42501';
    end if;
    if old.status <> 'queued' and new.recipient_email <> old.recipient_email then
      raise exception 'recipient_email cannot change after sending begins' using errcode = '42501';
    end if;

    if old.status = 'delivered' and new.status <> old.status
      or old.status in ('failed', 'skipped', 'cancelled') and new.status <> old.status
      or old.status = 'sent' and new.status not in ('sent', 'delivered')
      or old.status = 'sending' and new.status not in ('sending', 'sent', 'failed', 'cancelled')
      or old.status = 'queued' and new.status not in ('queued', 'sending', 'skipped', 'cancelled') then
      raise exception 'invalid delivery status transition' using errcode = '23514';
    end if;

    if auth.role() = 'authenticated'
      and not (old.status = 'queued' and new.status = 'cancelled') then
      raise exception 'creators may only cancel queued deliveries' using errcode = '42501';
    end if;
  end if;

  select u.creator_id, u.broadcast_type
  into update_creator_id, update_type
  from public.creator_updates u
  where u.id = new.update_id;

  if update_creator_id is null or new.creator_id <> update_creator_id then
    raise exception 'creator_id must match update owner' using errcode = '23514';
  end if;

  select fc.creator_id, fc.follower_contact_id, fc.status
  into connection_creator_id, connection_contact_id, connection_status
  from public.follower_connections fc
  where fc.id = new.connection_id;

  if connection_creator_id is null
    or connection_creator_id <> new.creator_id
    or connection_contact_id <> new.contact_id then
    raise exception 'delivery connection does not belong to creator/contact' using errcode = '23514';
  end if;

  if connection_status <> 'active' then
    raise exception 'delivery connection must be active' using errcode = '23514';
  end if;

  if new.preference_category <> public.expected_update_preference(update_type) then
    raise exception 'preference category does not match update type' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.follower_category_preferences p
    where p.follower_connection_id = new.connection_id
      and p.category_key = new.preference_category
      and p.enabled is true
  ) then
    raise exception 'recipient preference is disabled' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.follower_recovery_methods m
    where m.follower_contact_id = new.contact_id
      and m.method_type = 'email'
      and m.method_status = 'verified'
      and m.destination_hash = encode(extensions.digest(new.recipient_email, 'sha256'), 'hex')
  ) then
    raise exception 'recipient email is not verified' using errcode = '23514';
  end if;

  return new;
end
$$;
comment on function public.protect_update_delivery() is
  'Preserves delivery identity, ownership, eligibility, and forward-only status transitions.';
revoke all on function public.protect_update_delivery() from public, anon, authenticated;

create trigger protect_update_delivery
before insert or update or delete on public.update_deliveries
for each row execute function public.protect_update_delivery();

create trigger update_deliveries_updated
before update on public.update_deliveries
for each row execute function public.set_updated_at();

alter table public.update_deliveries enable row level security;
alter table public.update_deliveries force row level security;

create policy "owner reads update deliveries" on public.update_deliveries
for select to authenticated
using (
  exists (
    select 1
    from public.creator_updates u
    join public.creators c on c.id = u.creator_id
    where u.id = update_id and c.owner_user_id = auth.uid()
  )
);

create policy "owner creates update deliveries" on public.update_deliveries
for insert to authenticated
with check (
  exists (
    select 1
    from public.creator_updates u
    join public.creators c on c.id = u.creator_id
    where u.id = update_id
      and u.creator_id = creator_id
      and c.owner_user_id = auth.uid()
  )
);

create policy "owner cancels queued update deliveries" on public.update_deliveries
for update to authenticated
using (
  status = 'queued'
  and exists (
    select 1
    from public.creator_updates u
    join public.creators c on c.id = u.creator_id
    where u.id = update_id and c.owner_user_id = auth.uid()
  )
)
with check (
  status = 'cancelled'
  and exists (
    select 1
    from public.creator_updates u
    join public.creators c on c.id = u.creator_id
    where u.id = update_id
      and u.creator_id = creator_id
      and c.owner_user_id = auth.uid()
  )
);

revoke all on public.update_deliveries from public, anon, authenticated;
grant select, insert, update on public.update_deliveries to authenticated;

create or replace function public.create_update_delivery_queue(
  p_update_id uuid,
  p_creator_id uuid,
  p_recipients jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if not exists (
    select 1
    from public.creator_updates u
    where u.id = p_update_id
      and u.creator_id = p_creator_id
      and (
        auth.role() <> 'authenticated'
        or exists (
          select 1 from public.creators c
          where c.id = p_creator_id and c.owner_user_id = auth.uid()
        )
      )
  ) then
    raise exception 'update not found or not owned' using errcode = '42501';
  end if;

  insert into public.update_deliveries (
    update_id,
    creator_id,
    connection_id,
    contact_id,
    recipient_email,
    preference_category
  )
  select
    p_update_id,
    p_creator_id,
    recipient.connection_id,
    recipient.contact_id,
    lower(btrim(recipient.recipient_email)),
    public.expected_update_preference(u.broadcast_type)
  from public.creator_updates u
  cross join lateral jsonb_to_recordset(coalesce(p_recipients, '[]'::jsonb))
    as recipient(connection_id uuid, contact_id uuid, recipient_email text)
  join public.follower_connections fc
    on fc.id = recipient.connection_id
    and fc.creator_id = p_creator_id
    and fc.follower_contact_id = recipient.contact_id
    and fc.status = 'active'
  join public.follower_category_preferences preference
    on preference.follower_connection_id = fc.id
    and preference.category_key = public.expected_update_preference(u.broadcast_type)
    and preference.enabled is true
  join public.follower_recovery_methods method
    on method.follower_contact_id = recipient.contact_id
    and method.method_type = 'email'
    and method.method_status = 'verified'
    and method.destination_hash = encode(
      extensions.digest(lower(btrim(recipient.recipient_email)), 'sha256'),
      'hex'
    )
  where u.id = p_update_id
    and u.creator_id = p_creator_id
  on conflict (update_id, connection_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end
$$;
comment on function public.create_update_delivery_queue(uuid, uuid, jsonb) is
  'Atomically inserts an idempotent delivery queue after trigger-level ownership and eligibility checks.';
revoke all on function public.create_update_delivery_queue(uuid, uuid, jsonb) from public, anon;
grant execute on function public.create_update_delivery_queue(uuid, uuid, jsonb) to authenticated, service_role;

commit;
