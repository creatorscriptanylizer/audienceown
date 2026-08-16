-- Reconcile deployments where creator_updates predated updates_foundation.
-- CREATE TABLE IF NOT EXISTS does not add missing columns, defaults, or checks.
begin;

alter table public.creator_updates
  add column if not exists cancelled_at timestamptz,
  alter column title set default '',
  alter column subject set default '',
  alter column preview_text set default '',
  alter column content set default '';

update public.creator_updates
set preview_text = ''
where preview_text is null;

alter table public.creator_updates
  alter column preview_text set not null;

do $alignment$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.creator_updates'::regclass
      and conname = 'creator_updates_cta_url_https'
  ) then
    alter table public.creator_updates
      add constraint creator_updates_cta_url_https check (
        cta_url is null or btrim(cta_url) = '' or cta_url ~ '^https://'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.creator_updates'::regclass
      and conname = 'creator_updates_scheduled_time'
  ) then
    alter table public.creator_updates
      add constraint creator_updates_scheduled_time check (
        status <> 'scheduled' or scheduled_for is not null
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.creator_updates'::regclass
      and conname = 'creator_updates_delivery_content'
  ) then
    alter table public.creator_updates
      add constraint creator_updates_delivery_content check (
        status not in ('queued', 'sending', 'sent')
        or (btrim(subject) <> '' and btrim(content) <> '')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.creator_updates'::regclass
      and conname = 'creator_updates_sent_time'
  ) then
    alter table public.creator_updates
      add constraint creator_updates_sent_time check (
        status <> 'sent' or sent_at is not null
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.creator_updates'::regclass
      and conname = 'creator_updates_cancelled_time'
  ) then
    alter table public.creator_updates
      add constraint creator_updates_cancelled_time check (
        status <> 'cancelled' or cancelled_at is not null
      );
  end if;
end
$alignment$;

commit;
