begin;

-- Fail closed if historic rows cannot satisfy the tightened invariants. Nothing is
-- deleted or guessed by this migration.
do $audit$
begin
  if exists (
    select 1 from public.follower_category_preferences
    where category_key not in ('recovery','videos','livestreams','announcements','products')
  ) then
    raise exception 'security audit: invalid follower category keys require manual review';
  end if;
  if exists (
    select 1 from public.follower_connections
    where consented_at is null or consent_source is null
  ) then
    raise exception 'security audit: connection consent metadata requires manual review';
  end if;
end
$audit$;

-- Backfill the canonical five-category model without changing optional choices.
insert into public.follower_category_preferences (follower_connection_id, category_key, enabled)
select id, 'recovery', true from public.follower_connections
on conflict (follower_connection_id, category_key)
do update set enabled = true
where public.follower_category_preferences.enabled is false
  and exists (
    select 1 from public.follower_connections fc
    where fc.id = excluded.follower_connection_id and fc.status = 'active'
  );

insert into public.follower_category_preferences (follower_connection_id, category_key, enabled)
select fc.id, category.category_key,
  case category.category_key
    when 'videos' then coalesce(np.new_content, false)
    when 'announcements' then coalesce(np.creator_announcements, false)
    else false
  end
from public.follower_connections fc
cross join (values ('videos'),('livestreams'),('announcements'),('products')) category(category_key)
left join public.follower_notification_preferences np on np.follower_connection_id = fc.id
on conflict (follower_connection_id, category_key) do nothing;

alter table public.follower_category_preferences
  drop constraint if exists follower_category_preferences_category_key_check;
alter table public.follower_category_preferences
  add constraint follower_category_preferences_category_key_check
  check (category_key in ('recovery','videos','livestreams','announcements','products'));

alter table public.follower_connections
  add column if not exists preference_token_expires_at timestamptz,
  add column if not exists unsubscribe_token_expires_at timestamptz,
  add column if not exists management_tokens_revoked_at timestamptz;

update public.follower_connections
set preference_token_expires_at = coalesce(preference_token_expires_at, now() + interval '1 year'),
    unsubscribe_token_expires_at = coalesce(unsubscribe_token_expires_at, now() + interval '1 year');

alter table public.follower_connections
  alter column preference_token_expires_at set default (now() + interval '1 year'),
  alter column preference_token_expires_at set not null,
  alter column unsubscribe_token_expires_at set default (now() + interval '1 year'),
  alter column unsubscribe_token_expires_at set not null;

update public.follower_connections
set activated_at = coalesce(activated_at, consented_at),
    deactivated_at = case when status = 'deactivated' then coalesce(deactivated_at, updated_at) else null end,
    unsubscribed_at = case when status = 'unsubscribed' then coalesce(unsubscribed_at, updated_at) else null end;

alter table public.follower_connections
  drop constraint if exists follower_connections_state_timestamps_check;
alter table public.follower_connections
  add constraint follower_connections_state_timestamps_check check (
    (status = 'active' and activated_at is not null and deactivated_at is null and unsubscribed_at is null)
    or (status = 'paused' and activated_at is not null and deactivated_at is null and unsubscribed_at is null)
    or (status = 'deactivated' and deactivated_at is not null and unsubscribed_at is null)
    or (status = 'unsubscribed' and unsubscribed_at is not null)
  );

create or replace function public.protect_recovery_connection()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.source_platform := old.source_platform;
    new.source_campaign := old.source_campaign;
    new.source_referrer := old.source_referrer;
    new.landing_path := old.landing_path;
  end if;
  if new.status in ('active','paused') then
    new.activated_at := coalesce(new.activated_at, new.consented_at, now());
    new.deactivated_at := null;
    new.unsubscribed_at := null;
  elsif new.status = 'deactivated' then
    new.deactivated_at := coalesce(new.deactivated_at, now());
    new.unsubscribed_at := null;
  elsif new.status = 'unsubscribed' then
    new.unsubscribed_at := coalesce(new.unsubscribed_at, now());
  end if;
  return new;
end
$$;
comment on function public.protect_recovery_connection() is
  'Preserves immutable first-touch attribution and maintains status timestamps.';
revoke all on function public.protect_recovery_connection() from public, anon, authenticated;
drop trigger if exists protect_recovery_connection on public.follower_connections;
create trigger protect_recovery_connection
before insert or update on public.follower_connections
for each row execute function public.protect_recovery_connection();

create or replace function public.ensure_mandatory_recovery_preference()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.follower_category_preferences
    (follower_connection_id, category_key, enabled)
  select
    new.id,
    category.category_key,
    category.enabled
  from (
    values
      ('recovery', true),
      ('videos', false),
      ('livestreams', false),
      ('announcements', false),
      ('products', false)
  ) as category(category_key, enabled)
  on conflict (follower_connection_id, category_key)
  do update
  set enabled = case
    when excluded.category_key = 'recovery' then true
    else public.follower_category_preferences.enabled
  end;

  return new;
end
$$;
comment on function public.ensure_mandatory_recovery_preference() is
  'Ensures every active Recovery Pass has all five canonical categories and retains mandatory recovery notifications.';
revoke all on function public.ensure_mandatory_recovery_preference() from public, anon, authenticated;
drop trigger if exists ensure_mandatory_recovery_preference on public.follower_connections;
create trigger ensure_mandatory_recovery_preference
after insert or update of status on public.follower_connections
for each row when (new.status = 'active')
execute function public.ensure_mandatory_recovery_preference();

create or replace function public.reject_disabled_active_recovery()
returns trigger
language plpgsql
set search_path = ''
as $$
declare connection_status text;
begin
  if tg_op = 'DELETE' then
    if old.category_key <> 'recovery' then return old; end if;
  elsif new.category_key <> 'recovery' then
    return new;
  end if;
  select status into connection_status
  from public.follower_connections
  where id = case when tg_op = 'DELETE' then old.follower_connection_id else new.follower_connection_id end;
  if connection_status = 'active'
    and (tg_op = 'DELETE' or (tg_op <> 'DELETE' and new.enabled is not true)) then
    raise exception 'recovery preference is mandatory for an active Recovery Pass'
      using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;
comment on function public.reject_disabled_active_recovery() is
  'Database enforcement for the non-optional recovery category on active passes.';
revoke all on function public.reject_disabled_active_recovery() from public, anon, authenticated;
drop trigger if exists reject_disabled_active_recovery on public.follower_category_preferences;
create trigger reject_disabled_active_recovery
before insert or update or delete on public.follower_category_preferences
for each row execute function public.reject_disabled_active_recovery();

-- Public discovery is exposed only through explicit safe-column views.
drop policy if exists "published creator public read" on public.creators;
drop policy if exists "public reads public connected accounts" on public.connected_accounts;
revoke all on public.creators from anon;
revoke all on public.connected_accounts from anon;

-- Authenticated creators need table privileges in addition to RLS policies.
-- RLS still determines which specific rows each creator may access.
grant select, update on public.creators to authenticated;
grant select, insert, update, delete on public.connected_accounts to authenticated;

create or replace view public.public_creator_profiles
with (security_barrier = true)
as
select display_name, public_slug, public_bio, profile_image_path, banner_image_path,
       recovery_pass_enabled, announcement_title, announcement_body,
       announcement_cta_label, announcement_cta_url, announcement_published_at,
       created_at, updated_at
from public.creators
where public_profile_enabled is true;

create or replace view public.public_connected_accounts
with (security_barrier = true)
as
select c.public_slug, a.platform, a.label, a.url, a.is_primary, a.position
from public.connected_accounts a
join public.creators c on c.id = a.creator_id
where c.public_profile_enabled is true
  and a.is_public is true
  and a.account_type = 'official';

revoke all on public.public_creator_profiles from public, anon, authenticated;
revoke all on public.public_connected_accounts from public, anon, authenticated;
grant select on public.public_creator_profiles to anon, authenticated;
grant select on public.public_connected_accounts to anon, authenticated;

-- Browser roles receive only the operations and columns used by owner dashboards.
revoke all on public.follower_contacts from public, anon, authenticated;
revoke all on public.follower_connections from public, anon, authenticated;
revoke all on public.follower_recovery_methods from public, anon, authenticated;
revoke all on public.follower_notification_preferences from public, anon, authenticated;
revoke all on public.follower_category_preferences from public, anon, authenticated;
grant select (id, creator_id, follower_contact_id, status, consented_at, activated_at,
  deactivated_at, unsubscribed_at, source_platform, created_at, updated_at)
  on public.follower_connections to authenticated;
grant select (follower_connection_id, creator_announcements, new_content,
  important_account_updates, updated_at)
  on public.follower_notification_preferences to authenticated;
grant select (follower_connection_id, category_key, enabled)
  on public.follower_category_preferences to authenticated;
grant select (follower_contact_id, method_type, method_status, destination_masked)
  on public.follower_recovery_methods to authenticated;

alter table public.creators enable row level security;
alter table public.creators force row level security;
alter table public.connected_accounts enable row level security;
alter table public.connected_accounts force row level security;
alter table public.follower_contacts enable row level security;
alter table public.follower_contacts force row level security;
alter table public.follower_connections enable row level security;
alter table public.follower_connections force row level security;
alter table public.follower_recovery_methods enable row level security;
alter table public.follower_recovery_methods force row level security;
alter table public.follower_notification_preferences enable row level security;
alter table public.follower_notification_preferences force row level security;
alter table public.follower_category_preferences enable row level security;
alter table public.follower_category_preferences force row level security;

create index if not exists connected_accounts_creator_position_idx
  on public.connected_accounts(creator_id, position);
create index if not exists follower_connections_contact_idx
  on public.follower_connections(follower_contact_id);
create index if not exists follower_category_preferences_enabled_category_idx
  on public.follower_category_preferences(category_key, follower_connection_id)
  where enabled is true;

-- The bucket is private. Owners receive signed URLs; anonymous reads are limited
-- to objects currently referenced by a published creator profile.
create or replace function public.is_published_creator_media(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.creators c
    where c.public_profile_enabled is true
      and (c.profile_image_path = object_name or c.banner_image_path = object_name)
  )
$$;
comment on function public.is_published_creator_media(text) is
  'Narrow public storage predicate; exposes no creator row or owner identifier.';
revoke all on function public.is_published_creator_media(text) from public;
grant execute on function public.is_published_creator_media(text) to anon, authenticated;

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'creator-media';

drop policy if exists "creator media public read" on storage.objects;
drop policy if exists "creator media insert" on storage.objects;
drop policy if exists "creator media update" on storage.objects;
drop policy if exists "creator media delete" on storage.objects;

create policy "creator media intended read" on storage.objects
for select to public
using (
  bucket_id = 'creator-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_published_creator_media(name)
  )
);
create policy "creator media owner insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'creator-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] in ('profile','banner')
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
);
create policy "creator media owner update" on storage.objects
for update to authenticated
using (bucket_id = 'creator-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (
  bucket_id = 'creator-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] in ('profile','banner')
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
);
create policy "creator media owner delete" on storage.objects
for delete to authenticated
using (bucket_id = 'creator-media' and (storage.foldername(name))[1] = auth.uid()::text);

revoke all on function public.set_updated_at() from public, anon, authenticated;

commit;
