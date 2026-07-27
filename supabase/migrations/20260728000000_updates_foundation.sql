begin;

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'broadcast_type') then
    create type public.broadcast_type as enum (
      'new_content',
      'announcement',
      'livestream',
      'event',
      'product_launch',
      'account_update'
    );
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'broadcast_status') then
    create type public.broadcast_status as enum (
      'draft',
      'scheduled',
      'queued',
      'sending',
      'sent',
      'cancelled',
      'failed'
    );
  end if;
end
$$;

create table if not exists public.creator_updates (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  broadcast_type public.broadcast_type not null,
  status public.broadcast_status not null default 'draft',
  title text not null default '',
  subject text not null default '',
  preview_text text not null default '',
  content text not null default '',
  cta_label text,
  cta_url text,
  scheduled_for timestamptz,
  queued_at timestamptz,
  sent_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_updates_cta_url_https check (
    cta_url is null or btrim(cta_url) = '' or cta_url ~ '^https://'
  ),
  constraint creator_updates_scheduled_time check (
    status <> 'scheduled' or scheduled_for is not null
  ),
  constraint creator_updates_delivery_content check (
    status not in ('queued', 'sending', 'sent')
    or (btrim(subject) <> '' and btrim(content) <> '')
  ),
  constraint creator_updates_sent_time check (
    status <> 'sent' or sent_at is not null
  ),
  constraint creator_updates_cancelled_time check (
    status <> 'cancelled' or cancelled_at is not null
  )
);

create index if not exists creator_updates_creator_idx
  on public.creator_updates(creator_id);
create index if not exists creator_updates_creator_status_idx
  on public.creator_updates(creator_id, status);
create index if not exists creator_updates_creator_updated_idx
  on public.creator_updates(creator_id, updated_at desc);
create index if not exists creator_updates_scheduled_for_idx
  on public.creator_updates(scheduled_for)
  where status = 'scheduled';

create or replace function public.protect_creator_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if current_user = 'authenticated' and old.status <> 'draft' then
      raise exception 'only draft updates may be deleted' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and new.creator_id <> old.creator_id then
    raise exception 'creator_id cannot be changed' using errcode = '42501';
  end if;

  if new.status = 'scheduled'
    and (
      tg_op = 'INSERT'
      or old.status is distinct from new.status
      or old.scheduled_for is distinct from new.scheduled_for
    )
    and (new.scheduled_for is null or new.scheduled_for <= now()) then
    raise exception 'scheduled_for must be in the future' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and current_user = 'authenticated' then
    if old.status in ('sent', 'queued', 'sending', 'failed') then
      raise exception 'this update is not editable' using errcode = '42501';
    end if;

    if old.status = 'scheduled' and (
      new.status <> 'cancelled'
      or new.broadcast_type is distinct from old.broadcast_type
      or new.title is distinct from old.title
      or new.subject is distinct from old.subject
      or new.preview_text is distinct from old.preview_text
      or new.content is distinct from old.content
      or new.cta_label is distinct from old.cta_label
      or new.cta_url is distinct from old.cta_url
      or new.scheduled_for is distinct from old.scheduled_for
      or new.queued_at is distinct from old.queued_at
      or new.sent_at is distinct from old.sent_at
    ) then
      raise exception 'scheduled updates may only be cancelled' using errcode = '42501';
    end if;

    if old.status in ('draft', 'cancelled')
      and new.status not in ('draft', 'cancelled', 'scheduled') then
      raise exception 'invalid client status transition' using errcode = '42501';
    end if;
  end if;

  return new;
end
$$;
comment on function public.protect_creator_update() is
  'Preserves update ownership and restricts creator-side workflow transitions.';
revoke all on function public.protect_creator_update() from public, anon, authenticated;

drop trigger if exists protect_creator_update on public.creator_updates;
create trigger protect_creator_update
before insert or update or delete on public.creator_updates
for each row execute function public.protect_creator_update();

drop trigger if exists creator_updates_updated on public.creator_updates;
create trigger creator_updates_updated
before update on public.creator_updates
for each row execute function public.set_updated_at();

alter table public.creator_updates enable row level security;
alter table public.creator_updates force row level security;

create policy "owner reads updates" on public.creator_updates
for select to authenticated
using (
  exists (
    select 1 from public.creators c
    where c.id = creator_id and c.owner_user_id = auth.uid()
  )
);

create policy "owner creates updates" on public.creator_updates
for insert to authenticated
with check (
  exists (
    select 1 from public.creators c
    where c.id = creator_id and c.owner_user_id = auth.uid()
  )
);

create policy "owner updates editable updates" on public.creator_updates
for update to authenticated
using (
  status in ('draft', 'cancelled', 'scheduled')
  and exists (
    select 1 from public.creators c
    where c.id = creator_id and c.owner_user_id = auth.uid()
  )
)
with check (
  status in ('draft', 'cancelled', 'scheduled')
  and exists (
    select 1 from public.creators c
    where c.id = creator_id and c.owner_user_id = auth.uid()
  )
);

create policy "owner deletes draft updates" on public.creator_updates
for delete to authenticated
using (
  status = 'draft'
  and exists (
    select 1 from public.creators c
    where c.id = creator_id and c.owner_user_id = auth.uid()
  )
);

revoke all on public.creator_updates from public, anon, authenticated;
grant select, insert, update, delete on public.creator_updates to authenticated;

commit;
